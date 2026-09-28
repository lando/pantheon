'use strict';

// Modules
const _ = require('lodash');
const path = require('path');
const pull = require('./pull');
const push = require('./push');
const change = require('./switch');
const mysql = require('./mysql');
const php = require('./php');
const utils = require('./utils');

/**
 * Resolves service, search, database, and proxy options after pantheon.yml is merged.
 * Returns a new object and does not mutate `options`.
 *
 * @param {object} options merged recipe options
 * @param {object} [context] host and composer inputs that are not read from disk here
 * @param {boolean} [context.isArmed=false] whether the host is ARM
 * @param {object} [context.composerConfig=null] parsed composer.json, when the file exists
 * @return {object} resolved recipe options
 */
const resolveOptions = (options, {isArmed = false, composerConfig = null} = {}) => {
  let resolved = _.merge({}, options);

  // Bump the tags if we are ARMed and on an approved version.
  // Search 8/9 below overwrites this, matching the historical constructor order.
  if (isArmed) resolved.solrTag = '3.6-3';

  if (composerConfig) {
    resolved.drush_version = _.get(composerConfig, `require['drush/drush']`, resolved.drush);
  }

  // Pantheon has begun specifying the database version in the pantheon.yml via this key.
  const dbVersion = _.get(resolved, 'database.version', '10.3');
  const dbService = isArmed ? 'pantheon-mariadb-arm' : 'pantheon-mariadb';
  const searchVersion = _.toString(_.get(resolved, 'search.version', '3'));
  if (searchVersion === '8') resolved.solrTag = '8.8-4';
  if (searchVersion === '9') resolved.solrTag = '9.10-1';
  resolved.database = `${dbService}:${dbVersion}`;
  resolved.defaultFiles.vhosts = `${resolved.framework}.conf.tpl`;

  if (resolved.cache) resolved = _.merge({}, resolved, utils.getPantheonCache);
  if (resolved.edge) resolved = _.merge({}, resolved, utils.getPantheonEdge(resolved));
  if (resolved.index) resolved = _.merge({}, resolved, utils.getPantheonIndex(resolved));

  if (!_.has(resolved, 'proxyService')) {
    resolved.proxyService = 'appserver_nginx';
  }
  resolved.proxy = _.set(resolved.proxy, resolved.proxyService, [`${resolved.app}.${resolved._app._config.domain}`]);

  return resolved;
};

/**
 * Builds recipe tooling, including framework commands and the terminus token env.
 * Returns a new tooling object and does not mutate `options`.
 *
 * @param {object} options resolved recipe options
 * @param {Array} tokens sorted Pantheon and Terminus tokens
 * @return {object} tooling map
 */
const getTooling = (options, tokens) => {
  const metaToken = _.get(options, '_app.meta.token', null);
  const tokenEnv = metaToken !== null ?
    {LANDO_TERMINUS_TOKEN: metaToken} :
    {};

  // Assignment, not merge: these commands replace any user tooling of the same name.
  const tooling = _.merge({}, options.tooling);
  tooling.pull = pull.getPantheonPull(options, tokens);
  tooling.push = push.getPantheonPush(options, tokens);
  tooling.switch = change.getPantheonSwitch(options, tokens);
  tooling.mysql = mysql.getPantheonMySql;
  tooling.php = php.getPantheonPhp;
  tooling.composer = php.getPantheonComposer;
  tooling['db-export [file]'] = mysql.getPantheonDbExport;
  tooling['db-import <file>'] = mysql.getPantheonDbImport;

  const merged = _.merge({}, tooling, utils.getPantheonTooling(options.framework));
  // Inject token into the environment for all relevant tooling defined by recipe.
  ['push', 'pull', 'switch'].forEach(command => {
    merged[command].env = _.merge({}, tokenEnv, merged[command].env);
  });
  return merged;
};

/**
 * Builds the appserver build and run steps for the recipe.
 * Returns new arrays and does not mutate `options`.
 *
 * @param {object} options resolved recipe options
 * @return {object} build, build_root, and run_root arrays
 */
const getBuildSteps = options => {
  // Framework steps run first; user build steps follow.
  const build = utils.getPantheonBuildSteps(options.framework, options.drush).concat(options.build);
  // NOTE: pantheon.sh is prepended onto build_root (not /scripts) so it can reset the CA
  // before the other build steps.
  const buildRoot = options.build_root.concat(['/helpers/pantheon.sh']);
  const runRoot = options.run_root.concat(['/helpers/binding.sh']);
  build.push('/helpers/auth.sh');
  if (options.build_step) build.unshift('composer install');
  if (options.tikaVersion === 3) {
    buildRoot.push(utils.getTika3BuildStep());
  }
  return {build, build_root: buildRoot, run_root: runRoot};
};

/**
 * Maps recipe config files onto a service config object.
 * An explicit `config.<type>` wins over `defaultFiles`.
 *
 * @param {object} options resolved recipe options
 * @param {Array} [types=['php', 'server', 'vhosts']] config file types to include
 * @return {object} service config paths
 */
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

/**
 * Appserver and database service definitions for the recipe.
 *
 * @param {object} options resolved recipe options
 * @return {object} appserver and database services
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
    search: options.search,
    php: options.php,
    php_version: options.php_version,
    version: options.php,
    id: options.id,
    site: options.site,
    framework: options.framework,
    drush_version: options.drush_version,
    root: options.root,
    generation: options.generation,
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

/**
 * Resolves DRUSH_OPTIONS_URI from an explicit drush_uri or the active proxy URL.
 *
 * @param {object} options recipe options after services have been merged
 * @return {string|null} URI string, or null when no URI can be derived
 */
const getDrushUri = options => {
  let drushUri = options.drush_uri;
  if (!drushUri) {
    const proxyUrl = options.proxy[options.proxyService]?.[0];
    if (proxyUrl) {
      const proxyServiceSsl = options.services[options.proxyService]?.ssl;
      const ssl = proxyServiceSsl !== undefined ? proxyServiceSsl : options.services.appserver?.ssl;
      const protocol = ssl ? 'https' : 'http';
      // Include port if non-standard (e.g. proxy on 444 instead of 443)
      const ports = _.get(options, '_app._config.proxyLastPorts');
      let port = '';
      if (ports) {
        const activePort = ssl ? ports.https : ports.http;
        if (activePort && ((ssl && activePort != 443) || (!ssl && activePort != 80))) {
          port = `:${activePort}`;
        }
      }
      drushUri = `${protocol}://${proxyUrl}${port}`;
    }
  }
  return drushUri || null;
};

module.exports = {
  resolveOptions,
  getTooling,
  getBuildSteps,
  getServices,
  getServiceConfig,
  getDrushUri,
};
