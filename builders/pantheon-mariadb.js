'use strict';

const _ = require('lodash');
const LandoMariadb = require('@lando/mariadb/builders/mariadb.js');

// Builder
module.exports = {
  name: 'pantheon-mariadb',
  parent: '_service',
  config: {
    creds: {
      database: 'pantheon',
      password: 'pantheon',
      user: 'pantheon',
    },
  },
  builder: (parent, config) => class PantheonMariadb extends LandoMariadb.builder(parent, LandoMariadb.config) {
    constructor(id, options = {}) {
      options = _.merge({}, config, options);
      super(id, options);
    };
  },
};
