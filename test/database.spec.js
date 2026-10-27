'use strict';

const fs = require('fs');
const path = require('path');
const chai = require('chai');
const yaml = require('js-yaml');
const {getPantheonDatabase} = require('../lib/utils');

chai.should();
const expect = chai.expect;

describe('database', () => {
  describe('#getPantheonDatabase', () => {
    it('should default to pantheon-mariadb 10.3 when database is not set', () => {
      getPantheonDatabase(undefined).should.deep.equal({engine: 'mariadb', type: 'pantheon-mariadb:10.3', cnf: 'mysql.cnf'});
      getPantheonDatabase({}).type.should.equal('pantheon-mariadb:10.3');
    });

    it('should keep the MariaDB version when only version is set', () => {
      const {database} = yaml.load('database:\n  version: 10.6\n');
      getPantheonDatabase(database).type.should.equal('pantheon-mariadb:10.6');
    });

    it('should use pantheon-mariadb-arm on ARM', () => {
      getPantheonDatabase({version: 10.6}, true).type.should.equal('pantheon-mariadb-arm:10.6');
      getPantheonDatabase({type: 'mariadb'}, true).type.should.equal('pantheon-mariadb-arm:10.3');
    });

    it('should use mysql 8.4 and the 8.4 cnf for an unquoted pantheon.yml version', () => {
      const {database} = yaml.load('database:\n  type: mysql\n  version: 8.4\n');
      getPantheonDatabase(database).should.deep.equal({engine: 'mysql', type: 'mysql:8.4', cnf: 'mysql84.cnf'});
    });

    it('should use mysql 8.4 on ARM too', () => {
      getPantheonDatabase({type: 'MySQL', version: '8.4'}, true).type.should.equal('mysql:8.4');
    });

    it('should throw for any other mysql version', () => {
      expect(() => getPantheonDatabase({type: 'mysql', version: 8.0})).to.throw(/requires database.version 8.4/);
      expect(() => getPantheonDatabase({type: 'mysql'})).to.throw(/requires database.version 8.4/);
    });

    it('should throw for version 8.4 without type mysql', () => {
      expect(() => getPantheonDatabase({version: 8.4})).to.throw(/Set database.type to mysql/);
      expect(() => getPantheonDatabase({type: 'mariadb', version: 8.4})).to.throw(/Set database.type to mysql/);
    });

    it('should throw for an unknown type', () => {
      expect(() => getPantheonDatabase({type: 'postgres', version: 16})).to.throw(/postgres is not supported/);
    });

    it('should set READ-COMMITTED in the mysql 8.4 server cnf', () => {
      const cnf = fs.readFileSync(path.join(__dirname, '..', 'config', 'mysql84.cnf'), 'utf8');
      cnf.should.match(/transaction_isolation\s*=\s*READ-COMMITTED/);
    });
  });
});
