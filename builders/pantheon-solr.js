'use strict';

const LandoSolr = require('@lando/solr/builders/solr.js');

// Builder
module.exports = {
  name: 'pantheon-solr',
  parent: '_service',
  builder: (parent, config) => class PantheonSolr extends LandoSolr.builder(parent, LandoSolr.config) {
    constructor(id, options = {}) {
      super(id, options);
    };
  },
};
