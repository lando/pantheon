'use strict';

const LandoVarnish = require('@lando/varnish/builders/varnish.js');

// Builder
module.exports = {
  name: 'pantheon-varnish',
  parent: '_lando',
  builder: (parent, config) => class PantheonVarnish extends LandoVarnish.builder(parent, LandoVarnish.config) {
    constructor(id, options = {}, factory) {
      super(id, options, factory);
    };
  },
};
