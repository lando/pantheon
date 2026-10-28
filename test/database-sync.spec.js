'use strict';

const {expect} = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const recipe = require('../builders/pantheon');

const scripts = path.resolve(__dirname, '..', 'scripts');

describe('database sync', () => {
  let directory;
  let env;
  const calls = () => fs.existsSync(env.TEST_LOG) ?
    fs.readFileSync(env.TEST_LOG, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
  const run = (direction, overrides = {}) => {
    const result = spawnSync('bash', [path.join(scripts, `${direction}.sh`), '--code=none', '--files=none', '--database=dev'], {
      env: {...env, ...overrides}, encoding: 'utf8', timeout: 4000,
    });
    expect(result.error).to.equal(undefined);
    expect(fs.readdirSync(env.TMPDIR)).to.deep.equal([]);
    return result;
  };
  const unsuccessful = result => {
    expect(result.status, result.stdout + result.stderr).to.not.equal(0);
    expect(result.stdout).not.to.include('completed successfully');
  };

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pantheon-sync-'));
    fs.mkdirSync(path.join(directory, 'tmp'));
    const fixture = path.join(__dirname, 'fixtures', 'database-command.js');
    ['git', 'mysql', 'mysqldump', 'terminus', 'test-source', 'pv', 'cat', 'auth.sh'].forEach(command => {
      fs.symlinkSync(fixture, path.join(directory, command));
    });
    fs.writeFileSync(path.join(directory, 'log.sh'),
      'lando_pink() { echo "$@"; }; lando_green() { echo "$@"; }; lando_red() { echo "$@"; }');
    env = {
      ...process.env, PATH: `${directory}:${process.env.PATH}`, LANDO_PANTHEON_HELPERS_DIR: directory,
      LANDO_MOUNT: directory, LANDO_DB_SERVICE_TYPE: 'mysql:8.4', LANDO_DB_PULL_COMMAND: 'test-source',
      LANDO_DB_PULL_COMMAND_OPTIONS: '', LANDO_DB_USER_TABLE: 'users', PANTHEON_SITE_NAME: 'fixture',
      TMPDIR: path.join(directory, 'tmp'), TEST_LOG: path.join(directory, 'calls.jsonl'), FRAMEWORK: 'drupal',
    };
  });

  afterEach(() => fs.rmSync(directory, {recursive: true, force: true}));

  describe('effective engine propagation', () => {
    const build = (database, options = {}, services = {}) => {
      fs.writeFileSync(path.join(directory, 'pantheon.yml'), database ? `database:\n  type: ${database}\n  version: 8.4\n` : '');
      class Parent {
        constructor(id, config) {
          this.config = config;
        }
      }
      const Pantheon = recipe.builder(Parent, recipe.config);
      return new Pantheon('fixture', {
        root: directory, app: 'fixture', cache: false, edge: false, index: false,
        _app: {config: {services}, meta: {}, _config: {domain: 'lndo.site'}}, ...options,
      }).config;
    };

    it('passes MySQL 8.4 to pull, push and switch without a global appserver option', () => {
      const config = build('mysql');
      ['pull', 'push', 'switch'].forEach(command => {
        expect(config.tooling[command].env.LANDO_DB_SERVICE_TYPE).to.equal('mysql:8.4');
      });
      expect(config.services.appserver).not.to.have.property('database_engine');
      expect(config.services.database.type).to.equal('mysql:8.4');
    });

    it('preserves the default MariaDB engine', () => {
      expect(build().tooling.pull.env.LANDO_DB_SERVICE_TYPE).to.equal('pantheon-mariadb:10.3');
    });

    it('honors recipe service overrides and final Landofile service overrides', () => {
      const options = {services: {database: {type: 'mariadb:10.11'}}};
      expect(build('mysql', options).tooling.pull.env.LANDO_DB_SERVICE_TYPE).to.equal('mariadb:10.11');
      const config = build('mysql', options, {database: {type: 'mysql:8.0'}});
      ['pull', 'push', 'switch'].forEach(command => {
        expect(config.tooling[command].env.LANDO_DB_SERVICE_TYPE).to.equal('mysql:8.0');
      });
      expect(build(undefined, {}, {database: {type: 'mysql:8.4'}}).tooling.push.env.LANDO_DB_SERVICE_TYPE).to.equal('mysql:8.4');
    });
  });

  describe('client capabilities', () => {
    [
      ['mysql from 11.4.9-MariaDB, client 15.2', 'true', true],
      ['mysql  Ver 15.1 Distrib 10.11.11-MariaDB', 'true', true],
      ['mysql  Ver 15.1 Distrib 10.6.20-MariaDB', 'true', true],
      ['mysql  Ver 15.1 Distrib 5.5.68-MariaDB', 'false', false],
      ['mysql  Ver 8.4.5 for Linux on x86_64 (MySQL Community Server - GPL)', 'true', false],
      ['mysql  Ver 14.14 Distrib 5.7.44', 'true', false],
    ].forEach(([version, supported, bypass]) => {
      ['mysql', 'mysqldump'].forEach(client => {
        it(`selects only supported local flags for ${client}: ${version}`, () => {
          const command = '. "$1/pantheon-local-database.sh"; pantheon_local_database_args "$2"; ' +
            'printf "<%s>" "${PANTHEON_LOCAL_DATABASE_ARGS[@]}"';
          const result = spawnSync('bash', ['-c', command, 'test', scripts, client], {
            env: {...env, TEST_CLIENT_VERSION: version, TEST_CLIENT_SSL: supported}, encoding: 'utf8',
          });
          expect(result.status).to.equal(0);
          const flags = [...(bypass ? ['--ssl-verify-server-cert=0'] : []), ...(client === 'mysqldump' ? ['--no-tablespaces'] : [])];
          expect(result.stdout).to.equal(flags.length ? flags.map(flag => `<${flag}>`).join('') : '<>');
        });
      });
    });
  });

  ['pull', 'push'].forEach(direction => {
    ['mysql:8.4', 'pantheon-mariadb:10.6', 'pantheon-mariadb-arm:10.3', 'mysql:8.0'].forEach(type => {
      it(`${direction}: limits compatibility flags to local MySQL 8.4 (${type})`, () => {
        const result = run(direction, {LANDO_DB_SERVICE_TYPE: type});
        expect(result.status, result.stderr).to.equal(0);
        const commands = calls().filter(call => ['mysql', 'mysqldump'].includes(call.command) && !call.probe);
        const local = commands.filter(call => !call.remote);
        expect(local.length).to.be.greaterThan(0);
        local.forEach(call => {
          expect(call.args.includes('--ssl-verify-server-cert=0')).to.equal(type === 'mysql:8.4');
          expect(call.args.includes('--no-tablespaces')).to.equal(direction === 'push' && type === 'mysql:8.4');
        });
        commands.filter(call => call.remote).forEach(call => {
          expect(call.args).to.deep.equal(['--host=remote', '--password=remote secret', '--ssl-ca=/remote/ca.pem', 'pantheon']);
        });
        const imports = commands.filter(call => call.input && !call.drop);
        expect(imports.map(call => call.input)).to.deep.equal([direction === 'pull' ? 'PRIMARY_COMPLETE\n' : 'LOCAL_COMPLETE\n']);
        if (type !== 'mysql:8.4') expect(calls().filter(call => call.probe)).to.have.length(0);
      });
    });

    it(`${direction}: does not send MariaDB options to Oracle clients`, () => {
      expect(run(direction, {TEST_CLIENT_VERSION: 'mysql Ver 8.4.5 (MySQL Community Server - GPL)'}).status).to.equal(0);
      calls().forEach(call => expect(call.args).not.to.include('--ssl-verify-server-cert=0'));
    });

    ['TEST_IMPORT_FAIL', 'TEST_PIPE_FAIL', 'TEST_CONNECTION_FAIL', 'TEST_VERSION_FAIL', 'TEST_HELP_FAIL'].forEach(failure => {
      it(`${direction}: propagates ${failure} without reporting success`, () => unsuccessful(run(direction, {[failure]: '7'})));
    });
  });

  [true, false].forEach(mysqlIsMariaDB => {
    it(`probes mysql and mysqldump independently when only ${mysqlIsMariaDB ? 'mysql' : 'mysqldump'} is MariaDB`, () => {
      const maria = 'mysql from 11.4.9-MariaDB, client 15.2';
      const oracle = 'mysql Ver 8.4.5 (MySQL Community Server - GPL)';
      const versions = {
        TEST_MYSQL_VERSION: mysqlIsMariaDB ? maria : oracle,
        TEST_MYSQLDUMP_VERSION: mysqlIsMariaDB ? oracle : maria,
      };
      expect(run('pull', versions).status).to.equal(0);
      expect(run('push', versions).status).to.equal(0);
      calls().filter(call => !call.probe && !call.remote && ['mysql', 'mysqldump'].includes(call.command)).forEach(call => {
        expect(call.args.includes('--ssl-verify-server-cert=0')).to.equal(call.command === 'mysql' ? mysqlIsMariaDB : !mysqlIsMariaDB);
      });
    });
  });

  it('pull: retries a failed source dump and imports only the complete fallback, preserving remote TLS/quoting', () => {
    expect(run('pull', {TEST_SOURCE_FAIL: '9'}).status).to.equal(0);
    const fallback = calls().find(call => call.command === 'mysqldump');
    expect(fallback.args).to.deep.equal([
      '--no-autocommit', '--single-transaction', '--opt', '-Q',
      '--host=remote', '--password=remote secret', '--ssl-ca=/remote/ca.pem', 'pantheon',
    ]);
    expect(calls().filter(call => call.input && !call.drop).map(call => call.input)).to.deep.equal(['FALLBACK_COMPLETE\n']);
  });

  it('pull: reports a failed fallback import instead of success', () => {
    unsuccessful(run('pull', {TEST_SOURCE_FAIL: '9', TEST_IMPORT_FAIL: '8'}));
  });

  it('pull: does not wipe or import when both sources fail after producing partial SQL', () => {
    unsuccessful(run('pull', {TEST_SOURCE_FAIL: '9', TEST_FALLBACK_FAIL: '8'}));
    expect(calls().filter(call => call.command === 'mysql' && !call.probe)).to.have.length(0);
  });

  ['TEST_QUERY_FAIL', 'TEST_DROP_FAIL'].forEach(failure => {
    it(`pull: aborts on ${failure} before importing`, () => {
      unsuccessful(run('pull', {[failure]: '6'}));
      expect(calls().filter(call => call.input && !call.drop)).to.have.length(0);
    });
  });

  it('push: never starts the remote import when the local dump fails after partial output', () => {
    unsuccessful(run('push', {TEST_DUMP_FAIL: '4'}));
    expect(calls().filter(call => call.command === 'mysql')).to.have.length(0);
  });
});
