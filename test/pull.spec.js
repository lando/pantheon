'use strict';

const chai = require('chai');
const {getPantheonPull} = require('../lib/pull');
chai.should();
const {expect} = chai;

describe('pull', () => {
  const options = {id: 'site-id', env: 'dev', framework: 'drupal8', _app: {meta: {}, log: {}}};

  it('builds appserver tooling with lazy environment choices', () => {
    const result = getPantheonPull(options);

    result.should.include({cmd: '/helpers/pull.sh', service: 'appserver', level: 'app'});
    result.stdio.should.deep.equal(['inherit', 'pipe', 'pipe']);
    result.options.should.include.all.keys('auth', 'code', 'database', 'files', 'rsync');
    ['code', 'database', 'files'].forEach(key => {
      result.options[key].should.include({passthrough: true});
      result.options[key].interactive.should.include({type: 'list', default: 'dev'});
      expect(result.options[key].interactive.choices).to.be.a('function');
    });
    result.options.rsync.should.include({passthrough: true, boolean: true, default: false});
  });

  [
    ['drupal8', 'terminus remote:drush', '-- sql-dump --structure-tables-list=cache,cache_*', 'users'],
    ['wordpress', 'terminus remote:wp', '-- db export -', 'wp_users'],
  ].forEach(([framework, command, flags, table]) => {
    it(`passes the database command through the environment for ${framework}`, () => {
      const result = getPantheonPull({...options, framework});

      result.env.should.deep.equal({
        LANDO_DB_PULL_COMMAND: command, LANDO_DB_PULL_COMMAND_OPTIONS: flags, LANDO_DB_USER_TABLE: table,
      });
    });
  });

  it('merges cached authentication without losing the base option settings', () => {
    const result = getPantheonPull({...options, _app: {meta: {email: 'me@x.test', token: 'cached'}}});

    result.options.auth.should.include({default: 'cached', defaultDescription: 'me@x.test', passthrough: true, string: true});
    expect(result.options.auth.interactive.when()).to.equal(false);
  });

  it('merges interactive authentication when only saved accounts are available', () => {
    const result = getPantheonPull(options, [{email: 'me@x.test', token: 'saved'}]);

    result.options.auth.interactive.choices.should.deep.equal([
      {name: 'me@x.test', value: 'saved'}, {name: 'add or refresh a token', value: 'more'},
    ]);
    expect(result.options.auth.interactive.when()).to.equal(true);
    result.options['machine-token'].interactive.should.include({name: 'auth', type: 'password'});
  });
});
