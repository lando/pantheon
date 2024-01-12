'use strict';

// Modules
const _ = require('lodash');
const path = require('path');

// Builder
module.exports = {
  name: 'pantheon-mariadb-arm',
  config: {
    version: '10.3', // @todo: this will probably be 10.3, check D6 support.
    supported: ['10.6', '10.4', '10.3', '10.1'],
    legacy: ['10.1'],
    pinPairs: {
      '10.6': 'mariadb:10.6.7',
      '10.4': 'mariadb:10.4.21',
      '10.3': 'mariadb:10.3.31',
      '10.1': 'mariadb:10.1.48',
    },
    patchesSupported: true,
    confSrc: path.resolve(__dirname, '..', 'config'),
    creds: {
      database: 'pantheon',
      password: 'pantheon',
      user: 'pantheon',
    },
    port: '3306',
    defaultFiles: {
      database: 'my_custom.cnf',
    },
    remoteFiles: {
      database: '/etc/mysql/cnf.d/my_custom.cnf',
    },
  },
  parent: '_service',
  builder: (parent, config) => class PantheonMariaDbArm extends parent {
    constructor(id, options = {}) {
      options = _.merge({}, config, options);

      // Change the me user
      options.meUser = 'mysql';

      if (!options.healthcheck) options.healthcheck = require('../utils/get-mariadb-healthcheck')(options);

      const mariadb = {
        image: `mariadb:${options.version}`,
        command: 'docker-entrypoint.sh mysqld',
        environment: {
          MARIADB_ALLOW_EMPTY_ROOT_PASSWORD: 'yes',
          MYSQL_ALLOW_EMPTY_PASSWORD: 'yes',
          // MARIADB_EXTRA_FLAGS for things like coallation?
          MARIADB_DATABASE: options.creds.database,
          // Duplicated to help sql-export.sh know which DB to pull.
          MYSQL_DATABASE: options.creds.database,
          MARIADB_PASSWORD: options.creds.password,
          MARIADB_USER: options.creds.user,
          LANDO_NEEDS_EXEC: 'DOEEET',
          LANDO_WEBROOT_USER: 'mysql',
          LANDO_WEBROOT_GROUP: 'mysql',
          LANDO_WEBROOT_UID: '999',
          LANDO_WEBROOT_GID: '999',
        },
        volumes: [
          `${options.confDest}/launch.sh:/launch.sh`,
          `${options.confDest}/${options.defaultFiles.database}:${options.remoteFiles.database}`,
          `${options.data}:/var/lib/mysql`,
        ],
      };
      // Send it downstream
      super(id, options, {services: _.set({}, options.name, mariadb)});
    };
  },
};
