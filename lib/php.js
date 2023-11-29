'use strict';

/*
 * Helpers to get composer/php tooling.
 */
exports.getPantheonComposer = {
  service: 'appserver',
  cmd: 'composer --ansi',
};

exports.getPantheonPhp = {
  service: 'appserver',
  cmd: 'php',
};
