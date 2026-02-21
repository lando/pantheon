'use strict';

/**
 * Utility functions for the Lando Pantheon plugin.
 * Provides helpers for building services, managing authentication,
 * and interacting with Pantheon's platform features.
 * @module pantheon/lib/utils
 */

// Modules
const _ = require('lodash');
const crypto = require('crypto');
const fs = require('fs');
const getDrush = require('./core-utils').getDrush;
const getPhar = require('./core-utils').getPhar;
const PantheonApiClient = require('./client');
const path = require('path');
const yaml = require('js-yaml');

// Constants
const DRUSH_VERSION = '8.5.0';
const BACKDRUSH_VERSION = '1.2.0';
const PANTHEON_CACHE_HOST = 'cache';
const PANTHEON_CACHE_PORT = '6379';
const PANTHEON_CACHE_PASSWORD = 'pantheon';
const PANTHEON_EDGE_HTTP_RESP_HDR_LEN = '25k';
const PANTHEON_INDEX_HOST = 'index';
const PANTHEON_INDEX_SCHEME = 'http';
const PATH = [
  '/app/vendor/bin',
  '/usr/local/sbin',
  '/usr/local/bin',
  '/usr/sbin',
  '/usr/bin',
  '/sbin',
  '/bin',
  '/var/www/.composer/vendor/bin',
  '/srv/bin',
];

// Things
const backdrushUrl = `https://github.com/backdrop-contrib/drush/archive/${BACKDRUSH_VERSION}.tar.gz`;
const wpCliUrl = 'https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar';
const wpStatusCheck = ['php', '/usr/local/bin/wp', '--allow-root', '--info'];
const backdrushInstall = [
  'curl', '-fsSL', backdrushUrl, '|', 'tar', '-xz', '--strip-components=1', '-C', '/var/www/.drush', '&&',
  'drush', 'cc', 'drush',
].join(' ');

/**
 * Default Pressflow and Backdrop database configuration
 * @type {Object}
 */
const pantheonDatabases = {
  default: {
    default: {
      driver: 'mysql',
      prefix: '',
      database: 'pantheon',
      username: 'pantheon',
      password: 'pantheon',
      host: 'database',
      port: 3306,
    },
  },
};

/**
 * Checks if a framework is WordPress-based
 * @param {string} framework - The framework to check
 * @return {boolean} True if framework is WordPress or WordPress Network
 */
const isWordPressy = framework => {
  return ['wordpress', 'wordpress_network'].includes(framework);
};

/**
 * Gets the appropriate files directory path for a given framework
 * @param {string} framework - The framework type
 * @return {string} The files directory path
 */
const getFilemount = framework => {
  switch (framework) {
    case 'backdrop': return 'files';
    case 'drupal': return 'sites/default/files';
    case 'drupal8': return 'sites/default/files';
    case 'drupal9': return 'sites/default/files';
    case 'wordpress':
    case 'wordpress_network':
      return 'wp-content/uploads';
    default: return 'sites/default/files';
  }
};

/**
 * Creates a SHA-256 hash of the input
 * @param {string} u - String to hash
 * @return {string} The hashed string
 */
const getHash = u => crypto.createHash('sha256').update(u).digest('hex');

/**
 * Generates Pantheon-specific settings for Backdrop/Pressflow
 * @param {Object} options - Configuration options
 * @param {string} options.id - The site ID
 * @param {string} options.solrTag - Solr version tag
 * @return {Object} Pantheon settings object
 */
const getPantheonSettings = options => ({
  databases: pantheonDatabases,
  conf: {
    'pressflow_smart_start': true,
    'pantheon_binding': 'lando',
    'pantheon_site_uuid': options.id,
    'pantheon_environment': 'lando',
    'pantheon_tier': 'lando',
    'pantheon_index_host': PANTHEON_INDEX_HOST,
    'pantheon_index_port': options.solrTag.substring(0, 1) === '8' ? '8983' : '449',
    'pantheon_index_scheme': PANTHEON_INDEX_SCHEME,
    'redis_client_host': PANTHEON_CACHE_HOST,
    'redis_client_port': PANTHEON_CACHE_PORT,
    'redis_client_password': PANTHEON_CACHE_PASSWORD,
    'file_public_path': 'sites/default/files',
    'file_private_path': 'sites/default/files/private',
    'file_directory_path': 'sites/default/files',
    'file_temporary_path': '/tmp',
    'file_directory_temp': '/tmp',
    'css_gzip_compression': false,
    'js_gzip_compression': false,
    'page_compression': false,
  },
  drupal_hash_salt: getHash(JSON.stringify(pantheonDatabases)),
  config_directory_name: 'config',
});

/**
 * Gets build steps for a given framework and Drush version
 * @param {string} framework - The framework type
 * @param {number} [drush=8] - Drush version to use
 * @return {Array} Array of build step commands
 */
exports.getPantheonBuildSteps = (framework, drush = 8) => {
  if (isWordPressy(framework)) {
    return [getPhar(wpCliUrl, '/tmp/wp-cli.phar', '/usr/local/bin/wp', wpStatusCheck)];
  } else {
    const build = [];
    // Figure out drush
    if (drush > 8) {
      // Single step: disable audit, install drush (capture exit code), re-enable audit, exit with drush install code
      // Note: audit.block-insecure was introduced in Composer 2.4+, so we use || true to handle older versions
      build.push(
        [
          '(', 'composer', 'config', '-g', 'audit.block-insecure', 'false', '||', 'true', ')', '&&',
          'composer', 'global', 'require', `drush/drush:^${drush}`, '-n', ';',
          '_ec=$?', ';',
          '(', 'composer', 'config', '-g', 'audit.block-insecure', 'true', '||', 'true', ')', ';',
          'exit', '$_ec',
        ].join(' '),
      );
    } else {
      build.push(getDrush(DRUSH_VERSION));
    }
    build.push(['drush', '--version']);
    // And then hit up other framework specific stuff
    if (framework === 'drupal8') {
      build.push(getPhar(
        'https://drupalconsole.com/installer',
        '/tmp/drupal.phar',
        '/usr/local/bin/drupal'),
      );
    }
    if (framework === 'backdrop') {
      build.push(backdrushInstall);
    }
    return build;
  }
};

/**
 * Gets Tika 3 installation build step command
 * Downloads and installs Tika 3 to /opt/pantheon/tika/tika.jar
 * @return {string} Build step command string
 */
exports.getTika3BuildStep = () => {
  const tikaUrl = 'https://archive.apache.org/dist/tika/3.2.0/tika-app-3.2.0.jar';
  const tikaPath = '/opt/pantheon/tika/tika.jar';
  return [
    'mkdir -p /opt/pantheon/tika',
    `curl -fsSL "${tikaUrl}" -o "${tikaPath}"`,
    `chmod +x "${tikaPath}"`,
  ].join(' && ');
};

/**
 * Configuration for Pantheon Redis cache service
 * @type {Object}
 */
exports.getPantheonCache = {
  services: {
    cache: {
      type: 'pantheon-redis:6',
      password: PANTHEON_CACHE_PASSWORD,
      persist: true,
      portforward: true,
    },
  },
  tooling: {
    'redis-cli': {service: 'cache'},
  },
};

/**
 * Merges and processes Pantheon YAML configuration files
 * @param {string[]} [files=['pantheon.upstream.yml', 'pantheon.yml']] - YAML files to process
 * @return {Object} Merged configuration object
 */
exports.getPantheonConfig = (files = ['pantheon.upstream.yml', 'pantheon.yml']) => _(files)
  .filter(file => fs.existsSync(file))
  .map(file => yaml.load(fs.readFileSync(file)))
  .thru(data => _.merge({}, ...data))
  .thru(data => {
    // Set the php version
    data.php = _.toString(_.get(data, 'php_version', '8.3'));
    // Set the webroot
    data.webroot = (_.get(data, 'web_docroot', false)) ? 'web' : '.';
    // Set the drush version
    data.drush = _.toString(_.get(data, 'drush_version', '8'));
    // if drush version is less than 8, use 8 anyway
    if (data.drush < 8) data.drush = 8;
    // @DEPRECATED: Pantheon php_runtime_generation: 1 is deprecated and will be removed April 2026.
    const phpRuntimeGen = _.get(data, 'php_runtime_generation', 2);
    data.generation = phpRuntimeGen === 1 ? '4' : '5';
    // Set the tika version if specified in pantheon.yml
    const tikaVersion = _.get(data, 'tika_version');
    if (tikaVersion !== undefined) {
      data.tikaVersion = _.toInteger(tikaVersion);
    }
    // return
    return data;
  })
  .value();

/**
 * Builds configuration for Pantheon Varnish edge service
 * @param {Object} options - Configuration options
 * @param {string} options.confDest - Path to configuration destination
 * @return {Object} Edge service configuration
 */
exports.getPantheonEdge = options => ({
  proxyService: 'edge',
  services: {
    edge: {
      type: 'pantheon-varnish:6.0',
      backends: ['appserver_nginx'],
      ssl: true,
      config: {vcl: path.join(options.confDest, 'pantheon-v6.vcl')},
      overrides: {
        environment: {
          VARNISHD_PARAM_HTTP_RESP_HDR_LEN: PANTHEON_EDGE_HTTP_RESP_HDR_LEN,
        },
      },
    },
  },
  tooling: {
    varnishadm: {service: 'edge', user: 'root'},
  },
});

/**
 * Gets Pantheon environment variables
 * @param {Object} options - Configuration options
 * @param {string} options.app - Application name
 * @param {string} options.framework - Framework type
 * @param {string} options.id - Site ID
 * @param {string} options.site - Site name
 * @param {string} options.root - Root directory
 * @param {string} options.solrTag - Solr version tag
 * @return {Object} Environment variables
 */
exports.getPantheonEnvironment = options => ({
  AUTH_KEY: getHash(JSON.stringify(pantheonDatabases)),
  AUTH_SALT: getHash(options.app + options.framework),
  BACKDROP_SETTINGS: JSON.stringify(getPantheonSettings(options)),
  CACHE_HOST: PANTHEON_CACHE_HOST,
  CACHE_PORT: PANTHEON_CACHE_PORT,
  CACHE_PASSWORD: PANTHEON_CACHE_PASSWORD,
  COMPOSER_HOME: '/var/www/.composer',
  DB_HOST: 'database',
  DB_PORT: 3306,
  DB_USER: 'pantheon',
  DB_PASSWORD: 'pantheon',
  DB_NAME: 'pantheon',
  DOCROOT: '/',
  DRUPAL_HASH_SALT: getHash(JSON.stringify(pantheonDatabases)),
  drush_version: options.drush_version,
  FRAMEWORK: options.framework,
  FILEMOUNT: getFilemount(options.framework),
  LOGGED_IN_KEY: getHash(options.app),
  LOGGED_IN_SALT: getHash(options.root + options.app),
  NONCE_SALT: getHash(options.root + options.root),
  NONCE_KEY: getHash(options.root + options.framework),
  PATH: PATH.join(':'),
  PANTHEON_ENVIRONMENT: 'lando',
  PANTHEON_INDEX_HOST: PANTHEON_INDEX_HOST,
  PANTHEON_INDEX_PORT: options.solrTag.substring(0, 1) === '8' ? '8983' : '449',
  PANTHEON_INDEX_SCHEME: PANTHEON_INDEX_SCHEME,
  PANTHEON_INDEX_PATH: '/',
  PANTHEON_INDEX_CORE: '/lando',
  PANTHEON_INDEX_SCHEMA: 'solr/#/lando/schema',
  PANTHEON_SITE: options.id,
  PANTHEON_SITE_NAME: options.site,
  php_version: options.php_version,
  PRESSFLOW_SETTINGS: JSON.stringify(getPantheonSettings(options)),
  TERMINUS_ENV: 'dev',
  TERMINUS_HIDE_UPDATE_MESSAGE: 1,
  // TERMINUS_ORG: ''
  TERMINUS_SITE: options.site,
  LANDO_TERMINUS_TOKEN: _.get(options, '_app.meta.token'),
  TERMINUS_USER: _.get(options, '_app.meta.email'),
  SECURE_AUTH_KEY: getHash(options.app),
  SECURE_AUTH_SALT: getHash(options.app + options.root),
});

/**
 * Builds configuration for Pantheon Solr index service
 * @param {Object} options - Configuration options
 * @param {Object} [options.search] - Search configuration
 * @param {string} [options.search.version='3'] - Solr version
 * @param {string} options.solrTag - Solr image tag
 * @param {string} options.confDest - Configuration destination path
 * @return {Object} Index service configuration
 */
exports.getPantheonIndex = options => {
  const searchVersion = _.toString(_.get(options, 'search.version', '3'));
  if (searchVersion === '8') {
    return {
      services: {
        index: {
          type: 'pantheon-solr:8.8.2',
          portforward: true,
          core: 'lando',
          overrides: {
            image: `devwithlando/pantheon-index:${options.solrTag}`,
            volumes: [
              `${options.confDest}/jetty.xml:/opt/solr-8.8.2/server/etc/jetty.xml`,
            ],
          },
        },
      },
    };
  } else {
    return {
      services: {
        index: {
          type: 'pantheon-solr:custom',
          overrides: {
            image: `devwithlando/pantheon-index:${options.solrTag}`,
            ports: ['449'],
            command: '/bin/bash -c "/helpers/add-cert.sh && /start.sh"',
            environment: {
              LANDO_NO_USER_PERMS: 'NOTGONNAGOIT',
            },
          },
        },
      },
    };
  }
};

/**
 * Helper to get list of Pantheon environments for inquirer prompts
 *
 * @param {string} token - Pantheon machine token
 * @param {string} site - Site name or ID
 * @param {Array} nopes - List of environments to exclude
 * @param {Function} log - Logger function
 * @return {Promise<Array>} Array of environment choices for inquirer
 */
exports.getPantheonInquirerEnvs = async (token, site, nopes = [], log = console.log) => {
  try {
    const api = new PantheonApiClient(token, log);
    await api.auth();
    const envs = await api.getSiteEnvs(site);

    // Format environments as inquirer choices
    const choices = envs
      .map(env => ({
        name: env.id,
        value: env.id,
      }))
      .filter(env => !_.includes(nopes, env.value));

    // Add 'none' option and return flattened array
    return _.flatten([choices, [{name: 'none', value: 'none'}]]);
  } catch (err) {
    // Format error message
    if (_.has(err, 'response.data')) {
      throw new Error(err.response.data);
    }
    throw err;
  }
};

/**
 * Gets framework-specific tooling configuration
 * @param {string} framework - Framework type
 * @return {Object} Tooling configuration
 */
exports.getPantheonTooling = framework => {
  if (isWordPressy(framework)) return {wp: {service: 'appserver'}};
  else {
    const tooling = {drush: {service: 'appserver'}};
    if (framework === 'drupal8') {
      tooling.drupal = {service: 'appserver', description: 'Runs drupal console commands'};
    }
    return tooling;
  }
};

/**
 * Gets Terminus tokens from the filesystem
 * @param {string} home - Home directory path
 * @return {Array} Array of parsed token objects
 */
exports.getTerminusTokens = home => {
  if (fs.existsSync(path.join(home, '.terminus', 'cache', 'tokens'))) {
    return _(fs.readdirSync(path.join(home, '.terminus', 'cache', 'tokens')))
      .map(tokenFile => path.join(home, '.terminus', 'cache', 'tokens', tokenFile))
      .map(file => {
        try {
          return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (error) {
          throw Error(`The file ${file} is not valid JSON`);
        }
      })
      .value();
  } else {
    return [];
  }
};

/**
 * Gets the framework type (pressy or drupaly)
 * @param {string} [framework='drupal8'] - Framework name
 * @return {string} Framework type
 */
exports.frameworkType = (framework = 'drupal8') => {
  if (_.startsWith(framework, 'wordpress')) return 'pressy';
  else return 'drupaly';
};

/**
 * Builds database pull command based on framework
 * @param {Object} options - Command options
 * @param {string} [options.framework='drupal8'] - Framework type
 * @return {Object} Command configuration
 */
exports.buildDbPullCommand = ({framework = 'drupal8'} = {}) => {
  // Wordpress
  if (exports.frameworkType(framework) === 'pressy') {
    return {
      command: 'terminus remote:wp',
      options: '-- db export -',
    };
  }

  // Drupaly
  return {
    command: 'terminus remote:drush',
    options: '-- sql-dump --structure-tables-list=cache,cache_*',
  };
};

/**
 * Sorts and deduplicates tokens by email, keeping most recent
 * @param {...Array} sources - Arrays of token objects
 * @return {Array} Sorted and deduplicated tokens
 */
exports.sortTokens = (...sources) => _(_.flatten([...sources]))
  .sortBy('date')
  .groupBy('email')
  .map(tokens => _.last(tokens))
  .compact()
  .value();

/**
 * Generates Docker Compose configuration files
 * @param {Object} options - Configuration options
 * @param {Object} lando - Lando instance
 * @return {Promise} Promise that resolves when files are written
 */
exports.generateComposeFiles = (options, lando) => {
  const LandoInit = lando.factory.get('_init');
  const initData = new LandoInit(
    lando.config.userConfRoot,
    lando.config.home,
    options.destination,
    _.cloneDeep(lando.config.appEnv),
    _.cloneDeep(lando.config.appLabels),
    _.get(options, 'initImage', 'devwithlando/util:4'),
  );
  const initDir = path.join(lando.config.userConfRoot, 'init', options.name);
  return lando.utils.dumpComposeData(initData, initDir);
};
