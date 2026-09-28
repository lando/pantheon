'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync, spawnSync} = require('child_process');
const {expect} = require('chai');

// These scripts run inside the Linux appserver as /helpers/*.sh; Windows runners only have Git Bash,
// which rewrites /tmp and quotes paths differently, so the harness runs on Linux only.
const describeLinux = process.platform === 'linux' ? describe : describe.skip;

const fixtures = path.join(__dirname, 'fixtures');
const skipAll = ['--code=none', '--database=none', '--files=none'];

describeLinux('container sync scripts', () => {
  let root;
  let binDir;
  let mount;
  let mockLog;
  let stashedLandofile;
  let originalStash;

  /**
   * Run real Git only inside the disposable app repository.
   * @param {string[]} args Git arguments.
   * @return {string} Git output.
   */
  const git = args => execFileSync('git', args, {
    cwd: mount, encoding: 'utf8', env: {...process.env, GIT_MASTER: '1'},
  });

  /**
   * Run a container script with local helpers and external command mocks.
   * @param {string} script Script basename.
   * @param {string[]} args Script arguments.
   * @param {{[key: string]: string}} env Environment overrides.
   * @return {{status: number|null, stdout: string, stderr: string, log: string}} Execution result.
   */
  const runScript = (script, args, env = {}) => {
    const result = spawnSync('bash', [path.join(__dirname, '..', 'scripts', script), ...args], {
      cwd: mount,
      encoding: 'utf8',
      timeout: 8000,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        GIT_MASTER: '1',
        LANDO_LOG_HELPER: path.join(binDir, 'log helper'),
        PANTHEON_AUTH_SCRIPT: path.join(binDir, 'auth helper'),
        PANTHEON_PULL_SCRIPT: path.join(binDir, 'pull helper'),
        MOCK_LOG: mockLog,
        MOCK_TERMINUS_FAIL_ON: '',
        MOCK_PULL_DELETE_LANDOFILE: '',
        LANDO_MOUNT: mount,
        LANDO_WEBROOT: path.join(mount, 'web'),
        FILEMOUNT: 'sites/default/files',
        TERMINUS_USER: 'me@x.test',
        PANTHEON_SITE_NAME: 'mysite',
        PANTHEON_SITE: 'site-id',
        FRAMEWORK: 'drupal8',
        LANDO_DB_PULL_COMMAND: 'terminus remote:drush',
        LANDO_DB_PULL_COMMAND_OPTIONS: '-- sql-dump --structure-tables-list=cache,cache_*',
        LANDO_DB_USER_TABLE: 'users',
        NO_DB: '',
        NO_FILES: '',
        ...env,
      },
    });
    if (result.error) throw result.error;
    return {status: result.status, stdout: result.stdout, stderr: result.stderr, log: fs.readFileSync(mockLog, 'utf8')};
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'pantheon-scripts-'));
    binDir = path.join(root, 'bin');
    mount = path.join(root, 'app');
    mockLog = path.join(root, 'commands.log');
    fs.mkdirSync(binDir);
    fs.mkdirSync(mount);
    fs.writeFileSync(mockLog, '');
    const mocks = {
      'terminus': 'mock-terminus.sh',
      'log helper': 'log.sh',
      'auth helper': 'mock-auth.sh',
      'pull helper': 'mock-pull.sh',
    };
    ['mysql', 'mysqldump', 'pv', 'rsync', 'drush', 'wp', 'gunzip', 'tar', 'curl', 'ssh'].forEach(command => {
      mocks[command] = 'mock-command.sh';
    });
    Object.entries(mocks).forEach(([command, fixture]) => {
      const destination = path.join(binDir, command);
      fs.copyFileSync(path.join(fixtures, fixture), destination);
      fs.chmodSync(destination, 0o755);
    });
    git(['init', '-q']);
    git(['checkout', '-q', '-b', 'master']);
    git(['config', '--local', 'user.email', 'me@x.test']);
    git(['config', '--local', 'user.name', 'Script Test']);
    git(['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-q', '--allow-empty', '-m', 'init']);
    stashedLandofile = undefined;
    originalStash = undefined;
  });

  afterEach(() => {
    if (stashedLandofile) {
      if (originalStash === undefined) fs.rmSync(stashedLandofile, {force: true});
      else fs.writeFileSync(stashedLandofile, originalStash);
    }
    fs.rmSync(root, {recursive: true, force: true});
  });

  describe('pull.sh', () => {
    it('skips remote commands and authentication when all transfers and auth are disabled', () => {
      const result = runScript('pull.sh', [...skipAll, '--no-auth']);
      expect(result.status, result.stderr).to.equal(0);
      expect(result.log).to.equal('');
    });

    it('authenticates when --no-auth is omitted', () => {
      const result = runScript('pull.sh', skipAll);
      expect(result.status, result.stderr).to.equal(0);
      expect(result.log).to.equal('auth me@x.test mysite\n');
    });

    it('drops local tables and imports the selected database when a database is requested', () => {
      const result = runScript('pull.sh', ['--database=feature', '--code=none', '--files=none', '--no-auth']);
      expect(result.status, result.stderr).to.equal(0);
      expect(result.log).to.include('terminus env:info mysite.feature\n');
      expect(result.log).to.include('terminus remote:drush mysite.feature -- sql-dump --structure-tables-list=cache,cache_*\n');
      expect(result.log).to.match(
        /mysql stdin:.*SET FOREIGN_KEY_CHECKS=0;\n\s*DROP VIEW IF EXISTS `users`;\n\s*DROP TABLE IF EXISTS `users`;/,
      );
    });

    it('uses the expected excludes and source/destination when rsync is requested', () => {
      const result = runScript('pull.sh', ['--files=dev', '--code=none', '--database=none', '--rsync', '--no-auth']);
      expect(result.status, result.stderr).to.equal(0);
      const rsync = result.log.split('\n').find(line => line.startsWith('rsync '));
      expect(rsync).to.include('--chmod=u=rwx,g=rx,o=rx --copy-unsafe-links --size-only --ipv4 --progress');
      ['js', 'css', 'ctools', 'imagecache', 'xmlsitemap', 'backup_migrate', 'php/twig/*', 'styles', 'less'].forEach(exclude => {
        expect(rsync).to.include(`--exclude ${exclude} `);
      });
      expect(rsync).to.include(`-e ssh -p 2222 dev.site-id@appserver.dev.site-id.drush.in:files/ ${mount}/web/sites/default/files`);
      expect(result.log).not.to.include('terminus backup:get');
    });

    [['master', 'dev'], ['feature-x', 'feature-x']].forEach(([branch, environment]) => {
      it(`defaults the database to ${environment} when the branch is ${branch}`, () => {
        if (branch !== 'master') git(['checkout', '-q', '-b', branch]);
        const result = runScript('pull.sh', ['--code=none', '--files=none', '--no-auth']);
        expect(result.status, result.stderr).to.equal(0);
        expect(result.log).to.include(`terminus env:info mysite.${environment}\n`);
      });
    });

    it('forwards verbosity when -vv is supplied', () => {
      const result = runScript('pull.sh', ['--database=feature', '--code=none', '--files=none', '--no-auth', '-vv']);
      expect(result.status, result.stderr).to.equal(0);
      expect(result.log).to.include('terminus env:info -vv mysite.feature\n');
    });

    it('stops before importing when environment validation fails', () => {
      const result = runScript('pull.sh', ['--database=feature', '--code=none', '--files=none', '--no-auth'], {
        MOCK_TERMINUS_FAIL_ON: 'env:info',
      });
      expect(result.status).to.equal(1);
      expect(result.log).to.include('terminus env:info mysite.feature\n');
      expect(result.log).not.to.match(/^mysql |^terminus remote:drush /m);
    });
  });

  describe('push.sh', () => {
    [['code', 'live'], ['database', 'test'], ['files', 'live']].forEach(([component, environment]) => {
      it(`rejects ${component} when the target is ${environment}`, () => {
        const result = runScript('push.sh', [...skipAll, `--${component}=${environment}`]);
        expect(result.status).to.equal(1);
        expect(result.stdout + result.stderr).to.include(`Cannot push the ${component} to the test or live environments`);
        expect(result.log).to.equal('');
      });
    });

    it('only authenticates when all transfers are disabled', () => {
      const result = runScript('push.sh', [...skipAll, '--message=test message']);
      expect(result.status, result.stderr).to.equal(0);
      expect(result.log).to.equal('auth me@x.test mysite\n');
    });

    it('pipes the local dump to remote mysql when a database is requested', () => {
      const result = runScript('push.sh', ['--database=feature', '--code=none', '--files=none']);
      expect(result.status, result.stderr).to.equal(0);
      expect(result.log).to.include('terminus connection:info mysite.feature --field=mysql_command\n');
      expect(result.log).to.include(
        'mysqldump -u pantheon -ppantheon -h database --no-autocommit --single-transaction --opt -Q pantheon\n',
      );
      expect(result.log).to.include('mysql --host=remote.invalid --user=remote pantheon\n');
      expect(result.log).to.include('mysql stdin: SELECT 1;\n');
    });
  });

  describe('switch.sh', () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(mount, '.lando.yml'), 'name: shell-fixture\n');
      stashedLandofile = '/tmp/.lando.yml.feature-x';
      if (fs.existsSync(stashedLandofile)) originalStash = fs.readFileSync(stashedLandofile);
    });

    it('forwards the selected environment and skips when database and files are disabled', () => {
      const result = runScript('switch.sh', ['--env=feature-x', '--no-db', '--no-files']);
      expect(result.status, result.stderr).to.equal(0);
      expect(result.log).to.equal(
        'auth me@x.test mysite feature-x\npull --code=feature-x --files=none --database=none --rsync --no-auth\n',
      );
    });

    it('restores the Landofile when the pull removes it', () => {
      const result = runScript('switch.sh', ['--env=feature-x', '--no-db', '--no-files'], {MOCK_PULL_DELETE_LANDOFILE: '1'});
      expect(result.status, result.stderr).to.equal(0);
      expect(fs.readFileSync(stashedLandofile, 'utf8')).to.equal('name: shell-fixture\n');
      expect(fs.readFileSync(path.join(mount, '.lando.yml'), 'utf8')).to.equal('name: shell-fixture\n');
    });

    it('pulls the selected database when --no-db is omitted', () => {
      const result = runScript('switch.sh', ['--env=feature-x', '--no-files']);
      expect(result.status, result.stderr).to.equal(0);
      expect(result.log).to.include('pull --code=feature-x --files=none --database=feature-x --rsync --no-auth\n');
    });
  });
}).timeout(10000);
