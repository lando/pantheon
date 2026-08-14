'use strict';

const chai = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');
const frontendBuild = require('../lib/frontend-build');
const utils = require('../lib/utils');

chai.should();

describe('frontend_build', () => {
  let tempDir;

  const writeYaml = (name, content) => {
    const file = path.join(tempDir, name);
    fs.writeFileSync(file, content);
    return file;
  };

  const writeLock = (relPath, lockfile) => {
    const dir = path.join(tempDir, relPath);
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(path.join(dir, lockfile), '');
    return dir;
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-pantheon-frontend-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, {recursive: true, force: true});
  });

  describe('#parseFrontendBuild', () => {
    it('should return null when frontend_build is absent', () => {
      chai.expect(frontendBuild.parseFrontendBuild([{php_version: '8.3'}])).to.equal(null);
    });

    it('should default node 26 and build command build', () => {
      const parsed = frontendBuild.parseFrontendBuild([{
        frontend_build: {paths: [{path: 'web/themes/custom/foo'}]},
      }]);

      parsed.nodeVersion.should.equal('26');
      parsed.paths.should.have.length(1);
      parsed.paths[0].should.include({
        path: 'web/themes/custom/foo',
        nodeVersion: '26',
        major: 26,
        buildCommand: 'build',
      });
    });

    it('should accept a string path entry', () => {
      const parsed = frontendBuild.parseFrontendBuild([{
        frontend_build: {paths: ['web/themes/custom/foo']},
      }]);

      parsed.paths[0].path.should.equal('web/themes/custom/foo');
    });

    it('should refuse unsupported node majors', () => {
      chai.expect(() => frontendBuild.parseFrontendBuild([{
        frontend_build: {paths: [{path: 'theme', node_version: 20}]},
      }])).to.throw('theme: node_version 20 is not supported');
    });

    it('should refuse mixed node majors', () => {
      chai.expect(() => frontendBuild.parseFrontendBuild([{
        frontend_build: {
          paths: [
            {path: 'theme-a', node_version: 22},
            {path: 'theme-b', node_version: 26},
          ],
        },
      }])).to.throw('mixed Node majors');
    });

    it('should let later yaml win the same path and keep extra paths', () => {
      const parsed = frontendBuild.parseFrontendBuild([
        {
          frontend_build: {
            paths: [
              {path: 'theme-a', node_version: 22, build_command: 'compile'},
              {path: 'theme-b', node_version: 22},
            ],
          },
        },
        {
          frontend_build: {
            paths: [{path: 'theme-a', node_version: 22, build_command: 'build'}],
          },
        },
      ]);

      parsed.nodeVersion.should.equal('22');
      parsed.paths.map(item => item.path).should.deep.equal(['theme-a', 'theme-b']);
      parsed.paths[0].should.include({nodeVersion: '22', buildCommand: 'build'});
    });
  });

  describe('#detectPackageManager', () => {
    it('should prefer bun, then pnpm, yarn, npm', () => {
      const dir = path.join(tempDir, 'theme');
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, 'package-lock.json'), '');
      frontendBuild.detectPackageManager(dir).should.equal('npm');
      fs.writeFileSync(path.join(dir, 'yarn.lock'), '');
      frontendBuild.detectPackageManager(dir).should.equal('yarn');
      fs.writeFileSync(path.join(dir, 'pnpm-lock.yaml'), '');
      frontendBuild.detectPackageManager(dir).should.equal('pnpm');
      fs.writeFileSync(path.join(dir, 'bun.lock'), '');
      frontendBuild.detectPackageManager(dir).should.equal('bun');
    });

    it('should return null when no lockfile exists', () => {
      const dir = path.join(tempDir, 'empty');
      fs.mkdirSync(dir);
      chai.expect(frontendBuild.detectPackageManager(dir)).to.equal(null);
    });
  });

  describe('#resolveFrontendBuild', () => {
    it('should attach the lockfile package manager', () => {
      writeLock('web/themes/custom/foo', 'pnpm-lock.yaml');
      const parsed = frontendBuild.parseFrontendBuild([{
        frontend_build: {paths: [{path: 'web/themes/custom/foo'}]},
      }]);

      const plan = frontendBuild.resolveFrontendBuild(parsed, tempDir);
      plan.paths[0].manager.should.equal('pnpm');
    });

    it('should name the path when a lockfile is missing', () => {
      fs.mkdirSync(path.join(tempDir, 'web/themes/custom/foo'), {recursive: true});
      const parsed = frontendBuild.parseFrontendBuild([{
        frontend_build: {paths: [{path: 'web/themes/custom/foo'}]},
      }]);

      chai.expect(() => frontendBuild.resolveFrontendBuild(parsed, tempDir))
        .to.throw('web/themes/custom/foo: no lockfile');
    });
  });

  describe('#getBuildCommands', () => {
    it('should install missing package managers and build each path', () => {
      writeLock('theme-a', 'yarn.lock');
      writeLock('theme-b', 'package-lock.json');
      const parsed = frontendBuild.parseFrontendBuild([{
        frontend_build: {
          paths: [
            {path: 'theme-a', build_command: 'build'},
            {path: 'theme-b', build_command: 'compile'},
          ],
        },
      }]);
      const plan = frontendBuild.resolveFrontendBuild(parsed, tempDir);
      const commands = frontendBuild.getBuildCommands(plan);

      commands[0].should.include('npm install --global yarn');
      commands[1].should.include('/app/theme-a');
      commands[1].should.include('yarn install --frozen-lockfile');
      commands[1].should.include('yarn run');
      commands[1].should.include('build');
      commands[2].should.include('/app/theme-b');
      commands[2].should.include('npm ci');
      commands[2].should.include('npm run');
      commands[2].should.include('compile');
    });
  });

  describe('#getPantheonFrontend', () => {
    it('should add a node sidecar and daily tooling', () => {
      writeLock('web/themes/custom/foo', 'pnpm-lock.yaml');
      const parsed = frontendBuild.parseFrontendBuild([{
        frontend_build: {paths: [{path: 'web/themes/custom/foo'}]},
      }]);
      const extra = frontendBuild.getPantheonFrontend(
        frontendBuild.resolveFrontendBuild(parsed, tempDir),
      );

      extra.services.frontend.type.should.equal('pantheon-node:26');
      extra.tooling.pnpm.service.should.equal('frontend');
      chai.expect(extra.tooling.pnpm.dir).to.equal(undefined);
      extra.tooling['frontend-build'].cmd.should.include('pnpm run');
    });
  });

  describe('#getPantheonConfig', () => {
    it('should parse frontend_build from pantheon.yml', () => {
      const file = writeYaml('pantheon.yml', yaml.dump({
        php_version: '8.3',
        frontend_build: {
          paths: [{path: 'web/themes/custom/foo', node_version: 24}],
        },
      }));

      const config = utils.getPantheonConfig([file]);
      config.frontendBuild.nodeVersion.should.equal('24');
      config.frontendBuild.paths[0].path.should.equal('web/themes/custom/foo');
    });

    it('should leave frontendBuild null when unset', () => {
      const file = writeYaml('pantheon.yml', 'php_version: 8.3\n');
      const config = utils.getPantheonConfig([file]);
      chai.expect(config.frontendBuild).to.equal(null);
    });
  });
});
