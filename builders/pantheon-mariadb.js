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
    portforward: true,
  },
  builder: (parent, config) => class PantheonMariadb extends LandoMariadb.builder(parent, LandoMariadb.config) {
    constructor(id, options = {}) {
      super(id, _.merge({}, config, options), {services: _.set({}, options.name)});
    };
  },
};
