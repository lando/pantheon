'use strict';

const _ = require('lodash');
const LandoLamp = require('@lando/lamp/builders/lamp.js');

// Builder
module.exports = {
  name: 'pantheon-lamp',
  parent: '_recipe',
  builder: (parent, config) => class PantheonLamp extends LandoLamp.builder(parent, LandoLamp.config) {
    constructor(id, options = {}) {
      console.log(LandoLamp.config); 
      super(id, options, {services: _.set({}, options.name)});
    };
  },
};
