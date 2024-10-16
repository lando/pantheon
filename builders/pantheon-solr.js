'use strict';

const LandoSolr = require('@lando/solr/builders/solr.js');

// Builder
module.exports = {
  name: 'pantheon-solr',
  parent: '_service',
  config: {
    ssl: true,
    sslExpose: false,
  },
  builder: (parent, config) => class PantheonSolr extends LandoSolr.builder(parent, LandoSolr.config) {
    constructor(id, options = {}) {
      super(id, {...config, ...options});
    };
  },
};
