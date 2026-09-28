'use strict';

const chai = require('chai');
const getHealthcheck = require('../utils/get-mariadb-healthcheck');
chai.should();

describe('get-mariadb-healthcheck', () => {
  it('uses the supplied host and credentials for a silent table query', () => {
    const options = {name: 'replica', creds: {user: 'reader', password: 'secret', database: 'content'}};

    const command = getHealthcheck(options);

    command.should.equal('mysql --host=replica --user=reader --database=content --password=secret --silent --execute "SHOW TABLES;"');
  });
});
