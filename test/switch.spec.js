'use strict';

const chai = require('chai');
const {getPantheonSwitch} = require('../lib/switch');
chai.should();
const {expect} = chai;

describe('switch', () => {
  const options = {id: 'site-id', env: 'feature', framework: 'drupal8', _app: {meta: {}, log: {}}};

  it('builds appserver tooling with optional database and file opt-outs', () => {
    const result = getPantheonSwitch(options);

    result.should.include({cmd: '/helpers/switch.sh', service: 'appserver', level: 'app'});
    result.stdio.should.deep.equal(['inherit', 'pipe', 'pipe']);
    result.options['no-db'].should.include({boolean: true, default: false});
    result.options['no-files'].should.include({boolean: true, default: false});
    result.options.env.interactive.default.should.equal('feature');
    expect(result.options.env.interactive.choices).to.be.a('function');
  });

  [
    ['drupal8', 'terminus remote:drush', '-- sql-dump --structure-tables-list=cache,cache_*', 'users'],
    ['wordpress_network', 'terminus remote:wp', '-- db export -', 'wp_users'],
  ].forEach(([framework, command, flags, table]) => {
    it(`sets database pull environment variables for ${framework}`, () => {
      const result = getPantheonSwitch({...options, framework});

      result.env.should.deep.equal({
        LANDO_DB_PULL_COMMAND: command, LANDO_DB_PULL_COMMAND_OPTIONS: flags, LANDO_DB_USER_TABLE: table,
      });
    });
  });
});
