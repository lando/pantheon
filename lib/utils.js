'use strict';

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
const DRUSH_VERSION = '8.3.5';
const BACKDRUSH_VERSION = '1.2.0';
const PANTHEON_CACHE_HOST = 'cache';
const PANTHEON_CACHE_PORT = '6379';
const PANTHEON_CACHE_PASSWORD = '';
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

// Pressflow and backdrop database settings
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

const isWordPressy = framework => {
  return ['wordpress', 'wordpress_network'].includes(framework);
};

/*
 * Helper to get filemount by framework
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


/*
 * Hash helper
 */
const getHash = u => crypto.createHash('sha256').update(u).digest('hex');

/*
 * Helper to get pantheon settings
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
    'pantheon_index_port': options.solrTag === '8' ? '443' : '449',
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

/*
 * Helper to get build steps
 */
exports.getPantheonBuildSteps = (framework, drush = 8) => {
  if (isWordPressy(framework)) {
    return [getPhar(wpCliUrl, '/tmp/wp-cli.phar', '/usr/local/bin/wp', wpStatusCheck)];
  } else {
    const build = [];
    // Figure out drush
    if (drush > 8) build.push(['composer', 'global', 'require', `drush/drush:^${drush}`, '-n']);
    else build.push(getDrush(DRUSH_VERSION));
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

/*
 * Helper to build cache service
 */
exports.getPantheonCache = isArmed => {
  const cacheVersion = isArmed ? 'redis:6' : 'redis:2.8';
  return {
    services: {
      cache: {
        type: cacheVersion,
        persist: true,
        portforward: true,
      },
    },
    tooling: {
      'redis-cli': {service: 'cache'},
    },
  };
};

/*
 * Helper to merge in pantheon yamls
 */
exports.getPantheonConfig = (files = ['pantheon.upstream.yml', 'pantheon.yml']) => _(files)
  .filter(file => fs.existsSync(file))
  .map(file => yaml.safeLoad(fs.readFileSync(file)))
  .thru(data => _.merge({}, ...data))
  .thru(data => {
    // Set the php version
    // @TODO: what is the best version here?
    data.php = _.toString(_.get(data, 'php_version', '5.6'));
    // Set the webroot
    data.webroot = (_.get(data, 'web_docroot', false)) ? 'web' : '.';
    // Set the drush version
    data.drush = _.toString(_.get(data, 'drush_version', '8'));
    // if drush version is less than 8, use 8 anyway
    if (data.drush < 8) data.drush = 8;
    // return
    return data;
  })
  .value();

/*
 * Helper to build edge service
 */
exports.getPantheonEdge = options => ({
  proxyService: 'edge',
  services: {
    edge: {
      type: 'varnish:4.1',
      backends: ['appserver_nginx'],
      ssl: true,
      config: {vcl: path.join(options.confDest, 'pantheon.vcl')},
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

/*
 * Helper to get pantheon envvars
 */
exports.getPantheonEnvironment = options => ({
  AUTH_KEY: getHash(JSON.stringify(pantheonDatabases)),
  AUTH_SALT: getHash(options.app + options.framework),
  BACKDROP_SETTINGS: JSON.stringify(getPantheonSettings(options)),
  CACHE_HOST: PANTHEON_CACHE_HOST,
  CACHE_PORT: PANTHEON_CACHE_PORT,
  CACHE_PASSWORD: PANTHEON_CACHE_PASSWORD,
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
  PANTHEON_INDEX_PORT: options.solrTag === '8' ? '8983' : '449',
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

/*
 * Helper to build index service
 */
exports.getPantheonIndex = options => {
  if (options.solrTag === '8') {
    return {
      services: {
        index: {
          type: 'solr:8.11.2',
          portforward: true,
          overrides: {
            volumes: [
              `${options.confDest}/jetty.xml:/opt/solr-8.11.2/server/etc/jetty.xml`,
            ],
          },
        },
      },
    };
  } else {
    return {
      services: {
        index: {
          type: 'solr:custom',
          overrides: {
            image: `devwithlando/pantheon-index:${tag}`,
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

/*
 * Helper to build index service
 */
exports.getPantheonInquirerEnvs = (token, site, nopes = [], log = console.log) => {
  const api = new PantheonApiClient(token, log);
  return api.auth().then(() => api.getSiteEnvs(site)
  .map(env => ({name: env.id, value: env.id}))
  .filter(env => !_.includes(nopes, env.value))
  .then(envs => _.flatten([envs, [{name: 'none', value: 'none'}]])))
  .catch(err => {
    throw (_.has(err, 'response.data')) ? new Error(err.response.data) : err;
  });
};

/*
 * Helper to get tooling
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

/*
 * Helper to get terminus tokens
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

/*
 * Helper to get the framework type
 */
exports.frameworkType = (framework = 'drupal8') => {
  if (_.startsWith(framework, 'wordpress')) return 'pressy';
  else return 'drupaly';
};

/*
 * Helper to build db pull command
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

/*
 * Helper to return most recent tokens
 */
exports.sortTokens = (...sources) => _(_.flatten([...sources]))
  .sortBy('date')
  .groupBy('email')
  .map(tokens => _.last(tokens))
  .compact()
  .value();

/*
 * Helper to build db pull command
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
