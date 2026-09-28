'use strict';

const chai = require('chai');
const mysql = require('../lib/mysql');
chai.should();

describe('mysql tooling', () => {
  [
    ['getPantheonMySql', 'mysql -uroot'],
    ['getPantheonDbExport', '/helpers/sql-export.sh'],
    ['getPantheonDbImport', '/helpers/sql-import.sh'],
  ].forEach(([name, cmd]) => {
    it(`${name} targets the selected host and defaults to database`, () => {
      const task = mysql[name];

      task.should.include({service: ':host', cmd});
      task.options.host.default.should.equal('database');
      task.options.host.alias.should.deep.equal(['h']);
    });
  });

  it('exports as root with an option to write to stdout', () => {
    const task = mysql.getPantheonDbExport;

    task.user.should.equal('root');
    task.options.should.have.all.keys('host', 'stdout');
  });

  it('imports as root with a boolean option to preserve existing data', () => {
    const task = mysql.getPantheonDbImport;

    task.user.should.equal('root');
    task.options['no-wipe'].boolean.should.equal(true);
  });
});
