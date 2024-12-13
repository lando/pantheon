'use strict';

// Modules
const _ = require('lodash');
const os = require('os');
const path = require('path');
const PantheonApiClient = require('./../lib/client');
const utils = require('./../lib/utils');
const url = require('url');
const fs = require('fs');

// Pantheon
const pantheonTokenCache = 'pantheon.tokens';
const pantheonLandoKey = 'pantheon.lando.id_rsa';
const pantheonLandoKeyComment = 'lando@' + os.hostname();
let pantheonSites = [];

// Helper to parse a pantheon site into a git url
const getGitUrl = site => url.format({
  auth: `codeserver.dev.${site.id}`,
  protocol: 'ssh:',
  slashes: true,
  hostname: `codeserver.dev.${site.id}.drush.in`,
  port: '2222',
  pathname: '/~/repository.git',
});

// Helper to get tokens
const getTokens = (home, tokens = []) => _(utils.sortTokens(utils.getTerminusTokens(home), tokens))
  .map(token => ({name: token.email, value: token.token}))
  .thru(tokens => tokens.concat([{name: 'add or refresh a token', value: 'more'}]))
  .value();

// Helper to determine whether to show list of pre-used tokens or not
const showTokenList = (data, tokens = []) => data === 'pantheon' && !_.isEmpty(tokens);

// Helper to determine whether to show token password entry or not
const showTokenEntry = (data, answer, tokens = []) => data === 'pantheon' && (_.isEmpty(tokens) || answer === 'more');

// Helper to get sites for autocomplete - simplify Promise chain
const getAutoCompleteSites = async (answers, lando, input = null) => {
  if (!_.isEmpty(pantheonSites)) {
    return pantheonSites.filter(site => _.startsWith(site.name, input));
  }

  // get client
  const api = new PantheonApiClient(answers['pantheon-auth'], lando.log);
  // auth it
  await api.auth();
  // get sites
  const sites = await api.getSites();

  // return them
  pantheonSites = sites.map(site => ({name: site.name, value: site.name}));
  return pantheonSites;
};

/*
 * Init Lamp
 */
module.exports = {
  name: 'pantheon',
  options: lando => ({
    'pantheon-auth': {
      describe: 'A Pantheon machine token',
      string: true,
      interactive: {
        type: 'list',
        choices: getTokens(lando.config.home, lando.cache.get(pantheonTokenCache)),
        message: 'Select a Pantheon account',
        when: answers => showTokenList(answers.recipe, lando.cache.get(pantheonTokenCache)),
        weight: 510,
      },
    },
    'pantheon-auth-token': {
      hidden: true,
      interactive: {
        name: 'pantheon-auth',
        type: 'password',
        message: 'Enter a Pantheon machine token',
        when: answers => showTokenEntry(answers.recipe, answers['pantheon-auth'], lando.cache.get(pantheonTokenCache)),
        weight: 520,
      },
    },
    'pantheon-site': {
      describe: 'A Pantheon site machine name',
      string: true,
      interactive: {
        type: 'autocomplete',
        message: 'Which site?',
        source: async (answers, input) => {
          return await getAutoCompleteSites(answers, lando, input);
        },
        when: answers => answers.recipe === 'pantheon',
        weight: 530,
      },
    },
  }),
  overrides: {
    name: {
      when: answers => {
        answers.name = answers['pantheon-site'];
        return false;
      },
    },
    webroot: {
      when: () => false,
    },
  },
  sources: [{
    name: 'pantheon',
    label: 'pantheon',
    overrides: {
      recipe: {
        when: answers => {
          answers.recipe = 'pantheon';
          return false;
        },
      },
    },
    build: () => ([
      {name: 'wait-for-user', cmd: '/helpers/pantheon-wait-for-user.sh'},
      {name: 'generate-key', cmd: `/helpers/generate-key.sh ${pantheonLandoKey} ${pantheonLandoKeyComment}`},
      {name: 'post-key', func: async (options, lando) => {
        // key and client
        const api = new PantheonApiClient(options['pantheon-auth'], lando.log);
        const pubKey = path.join(lando.config.userConfRoot, 'keys', `${pantheonLandoKey}.pub`);

        await api.auth();
        return await api.postKey(pubKey);
      }},
      {name: 'get-git-url', func: async (options, lando) => {
        const api = new PantheonApiClient(options['pantheon-auth'], lando.log);

        await api.auth();
        const site = await api.getSite(options['pantheon-site'], false);

        options['pantheon-git-url'] = getGitUrl(site);
      }},
      {name: 'reload-keys', cmd: '/helpers/load-keys.sh --silent', user: 'root'},
      {name: 'clone-repo', cmd: options => `/helpers/get-remote-url.sh ${options['pantheon-git-url']}`, remove: 'true'},
    ]),
  }],
  build: async (options, lando) => {
    const api = new PantheonApiClient(options['pantheon-auth'], lando.log);
    const pubKey = path.join(lando.config.userConfRoot, 'keys', `${pantheonLandoKey}.pub`);

    // If we don't have the keys, generate them
    if (!fs.existsSync(pubKey)) {
      await lando.engine.run({
        id: 'generate-key',
        cmd: `/helpers/generate-key.sh ${pantheonLandoKey} ${pantheonLandoKeyComment}`,
        compose: utils.generateComposeFiles(options, lando),
        project: lando.config.landoFileConfig.project,
        opts: {
          mode: 'attach',
          services: ['init'],
        },
      });
    }

    // Authenticate and post keys
    await api.auth();
    await api.postKey(pubKey);

    // Get site and user info
    const [site, user] = await Promise.all([
      api.getSite(options['pantheon-site']),
      api.getUser(),
    ]);

    // Error if site doesn't exist
    if (_.isEmpty(site)) {
      throw new Error(`${site} does not appear to be a Pantheon site!`);
    }

    // This is a good token, lets update our cache
    const cache = {
      token: options['pantheon-auth'],
      email: user.email,
      date: _.toInteger(_.now() / 1000),
    };

    // Update lando's store of pantheon machine tokens
    const tokens = lando.cache.get(pantheonTokenCache) || [];
    lando.cache.set(pantheonTokenCache, utils.sortTokens(tokens, [cache]), {persist: true});

    // Update app metadata
    const metaData = lando.cache.get(`${options.name}.meta.cache`);
    lando.cache.set(`${options.name}.meta.cache`, _.merge({}, metaData, cache), {persist: true});

    // Return config to be added to the landofile
    return {
      config: {
        framework: _.get(site, 'framework', 'drupal'),
        site: _.get(site, 'name', options.name),
        id: _.get(site, 'id', 'lando'),
      },
    };
  },
};
