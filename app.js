'use strict';

// Modules
const _ = require('lodash');
const PantheonApiClient = require('./lib/client');
const utils = require('./lib/utils');

/**
 * Pantheon plugin for Lando that handles authentication and token management
 * between Lando and Pantheon hosting platform.
 *
 * @param {Object} app - The Lando app object
 * @param {Object} lando - The Lando config object
 * @return {void}
 */
module.exports = (app, lando) => {
  // Add additional things to cleanse
  app.log.alsoSanitize('pantheon-auth');

  // Only do this on pantheon recipes
  if (_.get(app, 'config.recipe') === 'pantheon') {
    // Set the app caches, validate tokens and update token cache
    _.forEach(['pull', 'push', 'switch'], command => {
      /**
       * Post-command handler for Pantheon authentication
       * Validates and updates Pantheon machine tokens after certain commands
       *
       * @param {Object} config - Command configuration
       * @param {Object} answers - User provided answers/input
       * @return {Promise} Resolves when token validation and caching is complete
       */
      app.events.on(`post-${command}`, (config, answers) => {
        // get existing token and email
        const {token, email} = lando.cache.get(app.metaCache);
        // Only run if answer.auth is set, the tokens are different or the email is blank
        // this allows these commands to all be overriden without causing a failure here
        if (answers.auth && (answers.auth !== token || !email)) {
         const api = new PantheonApiClient(answers.auth, app.log);
          return api.auth().then(async () => {
            const results = await api.getUser();
            const cache = {token: answers.auth, email: results.email, date: _.toInteger(_.now() / 1000)};
            // Reset this apps metacache
            lando.cache.set(app.metaCache, _.merge({}, app.meta, cache), {persist: true});
            // Set lando's store of pantheon machine tokens
            lando.cache.set(app.pantheonTokenCache, utils.sortTokens(app.pantheonTokens, [cache]), {persist: true});
            // Wipe out the apps tooling cache to reset with the new MT
            lando.cache.remove(`${app.name}.tooling.cache`);
          })
          // Throw some sort of error
          // NOTE: this provides some error handling when we are completely non-interactive
          .catch(err => {
            throw (_.has(err, 'response.data')) ? new Error(err.response.data) : err;
          });
        }
      });
    });

    /**
     * Pre-init handler to load Pantheon tokens and metadata
     * Sets up token caches and loads existing tokens before landofile initialization
     */
    app.events.on('pre-init', 1, () => {
      app.pantheonTokenCache = 'pantheon.tokens';
      app.pantheonTokens = lando.cache.get(app.pantheonTokenCache) || [];
      app.terminusTokens = utils.getTerminusTokens(lando.config.home);
    });
  }
};
