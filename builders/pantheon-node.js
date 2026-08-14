'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const LandoNode = require('@lando/node/builders/node.js');
const landoNodePath = path.resolve(path.dirname(require.resolve('@lando/node/builders/node.js')), '..');

const EXTRA_VERSIONS = [
  '26', '26.7', '26.6', '26.5', '26.4', '26.3', '26.2', '26.1',
  '24', '24.19',
  '22', '22.23',
];

const loadScripts = options => {
  const lando = _.get(options, '_app._lando');
  if (lando && fs.existsSync(path.join(landoNodePath, 'scripts'))) {
    const confDir = path.join(lando.config.userConfRoot, 'scripts');
    const dest = lando.utils.moveConfig(path.join(landoNodePath, 'scripts'), confDir);
    lando.utils.makeExecutable(fs.readdirSync(dest), dest);
  }
};

const nodeConfig = _.merge({}, LandoNode.config, {
  supported: _.uniq(EXTRA_VERSIONS.concat(LandoNode.config.supported || [])),
});

module.exports = {
  name: 'pantheon-node',
  parent: '_appserver',
  builder: parent => class PantheonNode extends LandoNode.builder(parent, nodeConfig) {
    constructor(id, options = {}, factory) {
      loadScripts(options);
      super(id, options, factory);
    }
  },
};
