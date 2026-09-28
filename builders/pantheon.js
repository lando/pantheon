'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const utils = require('../lib/utils');
const frontendBuild = require('../lib/frontend-build');
const recipe = require('../lib/recipe');

/*
 * Build Drupal 7
 */
module.exports = {
  name: 'pantheon',
  parent: '_recipe',
  config: {
    build: [],
    build_root: [],
    run_root: [],
    cache: true,
    confSrc: path.resolve(__dirname, '..', 'config'),
    defaultFiles: {
      php: 'php.ini',
      database: 'mysql.cnf',
      server: 'nginx.conf.tpl',
    },
    drush_uri: null,
    edge: true,
    env: 'dev',
    framework: 'drupal',
    index: true,
    solrTag: 'latest',
    services: {
      appserver: {volumes: []},
    },
    tag: '2',
    tooling: {terminus: {
      service: 'appserver',
    }},
    xdebug: false,
    webroot: '.',
    proxy: {},
  },
  builder: (parent, config) => class LandoPantheon extends parent {
    constructor(id, options = {}) {
      // Merge in pantheon ymlz
      options = _.merge({}, config, options, utils.getPantheonConfig([
        path.join(options.root, 'pantheon.upstream.yml'),
        path.join(options.root, 'pantheon.yml'),
      ]));

      // Filesystem reads stay here; everything after this is pure.
      const isArmed = _.get(options, '_app._config.isArmed', false);
      const composerFile = path.join(options.root, 'composer.json');
      const composerConfig = fs.existsSync(composerFile) ? require(composerFile) : null;

      options = recipe.resolveOptions(options, {isArmed, composerConfig});

      // Handle other stuff
      const tokens = utils.sortTokens(options._app.pantheonTokens, options._app.terminusTokens);
      options.tooling = recipe.getTooling(options, tokens);
      Object.assign(options, recipe.getBuildSteps(options));

      if (options.frontendBuild) {
        const plan = frontendBuild.resolveFrontendBuild(options.frontendBuild, options.root);
        const extra = frontendBuild.getPantheonFrontend(plan);
        options.services = _.merge({}, options.services, extra.services);
        options.tooling = _.merge({}, options.tooling, extra.tooling);
      }

      // Add appserver and database services.
      options.services = _.merge({}, recipe.getServices(options), options.services);

      // Set DRUSH_OPTIONS_URI based on drush_uri config or proxy settings
      const drushUri = recipe.getDrushUri(options);
      if (drushUri) {
        _.set(options, 'services.appserver.overrides.environment.DRUSH_OPTIONS_URI', drushUri);
      }

      // Send downstream
      super(id, options);
    }
  },
};
