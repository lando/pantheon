'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const php = require('../lib/php');
const pull = require('../lib/pull');
const push = require('../lib/push');
const change = require('../lib/switch');
const mysql = require('../lib/mysql');
const utils = require('../lib/utils');

const setTooling = (options, tokens) => {
  const metaToken = _.get(
    options,
    '_app.meta.token',
    null,
  );
  const tokenEnv = metaToken !== null ?
    {LANDO_TERMINUS_TOKEN: metaToken}
    : {};
  // Add in push/pull/switch
  options.tooling.pull = pull.getPantheonPull(options, tokens);
  options.tooling.push = push.getPantheonPush(options, tokens);
  options.tooling.switch = change.getPantheonSwitch(options, tokens);
  options.tooling.mysql = mysql.getPantheonMySql;
  options.tooling.php = php.getPantheonPhp;
  options.tooling.composer = php.getPantheonComposer;
  options.tooling['db-export [file]'] = mysql.getPantheonDbExport;
  options.tooling['db-import <file>'] = mysql.getPantheonDbImport;

  // Add in the framework-correct tooling
  options.tooling = _.merge({}, options.tooling, utils.getPantheonTooling(options.framework));
  // Inject token into the environment for all relevant tooling defined by recipe.
  ['push', 'pull', 'switch'].forEach(command => {
    options.tooling[command].env = _.merge({}, tokenEnv, options.tooling[command].env);
  });
  return options;
};

const setBuildSteps = options => {
  // Get build steps
  options.build = utils.getPantheonBuildSteps(options.framework, options.drush).concat(options.build);
  // Add in our pantheon scripts
  // NOTE: We do this here instead of in /scripts because we need to guarantee
  // it runs before the other build steps so it can reset our CA correctly
  options.build_root.push('/helpers/pantheon.sh');
  options.build.push('/helpers/auth.sh');
  options.run_root.push('/helpers/binding.sh');
  // Add composer install step
  if (options.build_step) options.build.unshift('composer install');
  return options;
};

/*
 * Helper to get services
 */
const getServices = options => ({
  appserver: {
    build_as_root_internal: options.build_root,
    build_internal: options.build,
    composer: options.composer,
    composer_version: options.composer_version,
    config: getServiceConfig(options),
    run_as_root_internal: options.run_root,
    ssl: true,
    type: `pantheon-php:${options.php}`,
    xdebug: options.xdebug,
    webroot: options.webroot,
    solrTag: options.solrTag,
    php: options.php,
    php_version: options.php_version,
    version: options.php,
    id: options.id,
    site: options.site,
    framework: options.framework,
    drush_version: options.drush_version,
    root: options.root,
  },
  database: {
    type: options.database,
    config: getServiceConfig(options, ['database']),
    portforward: true,
    creds: {
        database: 'pantheon',
        password: 'pantheon',
        user: 'pantheon',
    },
  },
});

const getServiceConfig = (options, types = ['php', 'server', 'vhosts']) => {
  const config = {};
  _.forEach(types, type => {
    if (_.has(options, `config.${type}`)) {
      config[type] = options.config[type];
    } else if (!_.has(options, `config.${type}`) && _.has(options, `defaultFiles.${type}`)) {
      if (_.has(options, 'confDest')) {
        config[type] = path.join(options.confDest, options.defaultFiles[type]);
      }
    }
  });
  return config;
};

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
    unarmedVersions: ['5.3', '5.5'],
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

      // Get the armed status
      const isArmed = _.get(options, '_app._config.isArmed', false);

      // Bump the tags if we are ARMed and on an approved version
      if (isArmed) options.solrTag = '3.6-3';

      // Reset the drush version if we have a composer.json entry
      const composerFile = path.join(options.root, 'composer.json');
      if (fs.existsSync(composerFile)) {
        const composerConfig = require(composerFile);
        options.drush_version = _.get(composerConfig, `require['drush/drush']`, options.drush);
      }

      // Pantheon has begun specifying the database version in the pantheon.yml via this key.
      const dbVersion = _.get(options, 'database.version', '10.3');
      const dbService = isArmed ? 'pantheon-mariadb-arm' : 'pantheon-mariadb';
      // Set the search version
      const searchVersion = _.toString(_.get(options, 'search.version', '3'));
      // Set solrtag if search is set to solr8.
      if (searchVersion === '8') options.solrTag = '8.8-4';
      options.database = `${dbService}:${dbVersion}`;
      // Set correct things based on framework
      options.defaultFiles.vhosts = `${options.framework}.conf.tpl`;

      // Add in cache if applicable
      if (options.cache) options = _.merge({}, options, utils.getPantheonCache);
      // Add in edge if applicable
      if (options.edge) options = _.merge({}, options, utils.getPantheonEdge(options));
      // Add in index if applicable
      if (options.index) options = _.merge({}, options, utils.getPantheonIndex(options));

      if (!_.has(options, 'proxyService')) {
        options.proxyService = 'appserver_nginx';
      }
      options.proxy = _.set(options.proxy, options.proxyService, [`${options.app}.${options._app._config.domain}`]);

      // Handle other stuff
      const tokens = utils.sortTokens(options._app.pantheonTokens, options._app.terminusTokens);
      options = setTooling(options, tokens);
      options = setBuildSteps(options);

      // Add appserver and database services.
      options.services = _.merge({}, getServices(options), options.services);

      // Send downstream
      super(id, options);
    };
  },
};
