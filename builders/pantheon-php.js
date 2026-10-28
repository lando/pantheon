'use strict';

const _ = require('lodash');
const path = require('path');
const LandoPhp = require('@lando/php/builders/php.js');
const utils = require('./../lib/utils.js');

// Builder
module.exports = {
  name: 'pantheon-php',
  parent: '_appserver',
  defaults: {
    generation: '5',
  },
  builder: (parent, defaults) => class PantheonPhp extends LandoPhp.builder(parent, LandoPhp.config) {
    constructor(id, options = {}, factory) {
      // rebase option on defaults
      options = _.merge({}, defaults, options);

      // js-yaml parses unquoted x.0 PHP versions as the integer x.
      options.php = String(options.php);
      if (/^\d+$/.test(options.php)) options.php = `${options.php}.0`;

      // getPantheonConfig already warns and falls back. This is a silent
      // second line of defense if the builder is invoked without it.
      const resolvedGen = utils.resolveGeneration(String(options.php), String(options.generation));
      if (resolvedGen !== null) options.generation = resolvedGen;

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

      super(id, options, factory);
    }
  },
};
