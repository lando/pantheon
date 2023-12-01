'use strict';

/*
 * Helper to get the `lando mysql` command for the Pantheon recipe.
 */
exports.getPantheonMySql = {
  service: ':host',
  description: 'Drops into a MySQL shell on a Pantheon database service',
  cmd: 'mysql -uroot',
  options: {
    host: {
      description: 'The database service to use',
      default: 'database',
      alias: ['h'],
    },
  },
};

/*
 * Helper to get the `lando db-export` command for the Pantheon recipe.
 */
exports.getPantheonDbExport = {
  service: ':host',
  description: 'Exports database from a database service to a file',
  cmd: '/helpers/sql-export.sh',
  user: 'root',
  options: {
    host: {
      description: 'The database service to use',
      default: 'database',
      alias: ['h'],
    },
    stdout: {
      description: 'Dump database to stdout',
    },
  },
};

/*
 * Helper to get the `lando db-export` command for the Pantheon recipe.
 */
exports.getPantheonDbImport = {
  service: ':host',
  description: 'Imports a dump file into a database service',
  cmd: '/helpers/sql-import.sh',
  user: 'root',
  options: {
    'host': {
      description: 'The database service to use',
      default: 'database',
      alias: ['h'],
    },
    'no-wipe': {
      description: 'Do not destroy the existing database before an import',
      boolean: true,
    },
  },
};
