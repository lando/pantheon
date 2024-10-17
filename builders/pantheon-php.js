'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const LandoPhp = require('@lando/php/builders/php.js');
const utils = require('./../lib/utils.js');

const loadScripts = options => {
  const lando = _.get(options, '_app._lando');
  const landoPhpScriptsPath = path.join(path.dirname(require.resolve('@lando/php/package.json')), 'scripts');

  // Move the script to the confDir and make executable.
  if (fs.existsSync(landoPhpScriptsPath)) {
    const confDir = path.join(lando.config.userConfRoot, 'scripts');
    const dest = lando.utils.moveConfig(landoPhpScriptsPath, confDir);
    lando.utils.makeExecutable(fs.readdirSync(dest), dest);
    lando.log.debug('automoved scripts from %s to %s and set to mode 755', landoPhpScriptsPath, confDir);
  }
};

// Builder
module.exports = {
  name: 'pantheon-php',
  parent: '_appserver',
  defaults: {
    generation: '4',
  },
  builder: (parent, defaults) => class PantheonPhp extends LandoPhp.builder(parent, LandoPhp.config) {
    constructor(id, options = {}, factory) {
      // rebase option on defaults
      options = _.merge({}, defaults, options);

      // Normalize because 7.0/8.0 right away gets handled strangely by js-yaml
      if (options.php === '7' || options.php === 7) options.php = '7.0';
      if (options.php === '8' || options.php === 8) options.php = '8.0';

      // main event
      options.version = options.php;
      options.image = `devwithlando/pantheon-appserver:${options.php}-${options.generation}`;
      options.via = 'nginx:1.25';

      // Add in the prepend.php
      // @TODO: this throws a weird DeprecationWarning: 'root' is deprecated, use 'global' for reasons not immediately clear
      // So we are doing this a little weirdly to avoid hat until we can track things down better
      options.volumes.push(`${options.confDest}/prepend.php:/srv/includes/prepend.php`);

      // Add in our environment
      options.environment = utils.getPantheonEnvironment(options);
      options.confSrc = path.resolve(__dirname, '..', 'config');
      options.nginxServiceType = 'pantheon-nginx';
      loadScripts(options);

      super(id, options, factory);
    };
  },
};
