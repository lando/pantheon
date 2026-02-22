'use strict';

// checks to see if a setting is disabled
module.exports = options => {
  return [
    'mysql',
    `--host=${options.name}`,
    `--user=${options.creds.user}`,
    `--database=${options.creds.database}`,
    `--password=${options.creds.password}`,
    '--silent',
    '--execute',
    '"SHOW TABLES;"',
  ].join(' ');
};
