'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const axios = require('axios');

// Set a limit on amount of sites
const MAX_SITES = 5000;

/**
 * Helper to collect relevant error data from API responses
 *
 * @param {Error} err - The error object from the API response
 * @return {Object} Formatted error data object containing code, message and details
 */
const getErrorData = (err = {}) => ({
  code: _.get(err, 'response.status', 200),
  codeText: _.get(err, 'response.statusText'),
  method: _.upperCase(_.get(err, 'response.config.method'), 'GET'),
  path: _.get(err, 'response.config.url'),
  response: _.get(err, 'response.data'),
});

/**
 * Helper to make HTTP requests to the Pantheon API
 *
 * @param {Object} request - Axios request instance
 * @param {Object} log - Logger instance
 * @param {string} verb - HTTP method to use (get, post, etc)
 * @param {Array} pathname - URL path segments to join
 * @param {Object} data - Request payload data
 * @param {Object} options - Additional request options
 * @return {Promise<Object>} Response data from API
 */
const pantheonRequest = (request, log, verb, pathname, data = {}, options = {}) => {
  // Log the actual request we are about to make
  log.verbose('making %s request to %s', verb, `${_.get(request, 'defaults.baseURL')}${pathname.join('/')}`);
  log.debug('request sent data with %j', options, _.clone(data));

  // Attempt the request and retry a few times
  return new Promise((resolve, reject) => request[verb](pathname.join('/'), data, options)
    .then(response => {
      log.verbose('response recieved: %s with code %s', response.statusText, response.status);
      log.silly('response data', response.data);
      resolve(response.data);
    })
    .catch(err => {
      const data = getErrorData(err);
      const msg = [
        `${data.method} request to ${data.path} failed with code ${data.code}: ${data.codeText}.`,
        `The server responded with the message ${data.response}.`,
      ];
      // @NOTE: it's not clear to me why we make this into a message instead of passing through
      // the entire data object, possibly the reason has been lost to the sands of time
      reject(new Error(msg.join(' ')));
    }));
};

/**
 * Client for interacting with Pantheon's Terminus API
 * Handles authentication and API requests for sites, environments, and user data
 * @todo: add some validation around the session eg throw an error if we make a request
 * with a unauthorized client
 * @todo: we can remove the mode from here and just extend this in other things
 */
module.exports = class PantheonApiClient {
  /**
   * Create a new Pantheon API client instance
   *
   * @param {string} token - Pantheon machine token for authentication
   * @param {Function} log - Logging function to use
   * @param {string} mode - Client mode ('node' or 'browser')
   */
  constructor(token = '', log = console.log, mode = 'node') {
    this.baseURL = 'https://terminus.pantheon.io/api/';
    this.log = log;
    this.token = token;
    this.mode = mode;
  }

  /**
   * Authenticate with Pantheon using machine token
   *
   * @param {string} token - Pantheon machine token
   * @return {Promise<Object>} Session data from successful auth
   */
  async auth(token = this.token) {
    const data = {machine_token: token, client: 'terminus'};
    const options = (this.mode === 'node') ? {headers: {'User-Agent': 'Terminus/Lando'}} : {};
    const upath = ['authorize', 'machine-token'];

    return await pantheonRequest(axios.create({baseURL: this.baseURL}), this.log, 'post', upath, data, options).then(data => {
      this.token = token;
      this.session = data;
      const headers = {'Content-Type': 'application/json'};
      // Add header if we are in node mode, otherwise assume its set upstream in the browser
      if (this.mode === 'node') headers['X-Pantheon-Session'] = data.session;
      this.request = axios.create({baseURL: this.baseURL, headers});
      return data;
    });
  }

  /**
   * Get information about a specific Pantheon site
   *
   * @param {string} site - Site name or ID
   * @param {boolean} full - Whether to return full site details
   * @return {Promise<Object>} Site information
   */
  async getSite(site, full = true) {
    return await pantheonRequest(this.request, this.log, 'get', ['site-names', site]).then(site => {
      // if not full then just return the lookup
      if (!full) return site;
      // otherwise return the full site
      return pantheonRequest(this.request, this.log, 'get', ['sites', site.id]);
    });
  }

  /**
   * Get all sites available to the authenticated user
   * Combines sites from both user memberships and organization memberships
   *
   * @return {Promise<Array>} Array of site objects
   */
  async getSites() {
    // Call to get user sites
    const pantheonUserSites = async () => {
      const getSites = ['users', _.get(this.session, 'user_id'), 'memberships', 'sites'];
      return pantheonRequest(this.request, this.log, 'get', getSites, {params: {limit: MAX_SITES}})
        .then(sites => _.map(sites, site => _.merge(site, site.site)));
    };
    // Call to get org sites
    const pantheonOrgSites = async () => {
      const getOrgs = ['users', _.get(this.session, 'user_id'), 'memberships', 'organizations'];
      return pantheonRequest(this.request, this.log, 'get', getOrgs).then(orgs => {
        return Promise.all(orgs.filter(org => org.role !== 'unprivileged').map(async org => {
          const getOrgsSites = ['organizations', org.id, 'memberships', 'sites'];
          return pantheonRequest(this.request, this.log, 'get', getOrgsSites, {params: {limit: MAX_SITES}})
            .then(sites => sites.map(site => _.merge(site, site.site)));
        }))
        .then(sites => _.flatten(sites));
      });
    };

    // Run both requests
    return await Promise.all([pantheonUserSites(), pantheonOrgSites()])
      // Combine, cache and all the things
      .then(sites => _.compact(_.sortBy(_.uniqBy(_.flatten(sites), 'name'), 'name')))
      // Filter out any frozen sites
      .then(sites => sites.filter(site => !site.frozen));
  }

  /**
   * Get all environments for a specific site
   *
   * @param {string} site - Site name or ID
   * @return {Promise<Array>} Array of environment objects
   */
  async getSiteEnvs(site) {
    const envs = await pantheonRequest(this.request, this.log, 'get', ['sites', site, 'environments']);
    return _.map(envs, (data, id) => _.merge({}, data, {id}));
  }

  /**
   * Get authenticated user's account information
   *
   * @return {Promise<Object>} User account data
   */
  async getUser() {
    return await pantheonRequest(this.request, this.log, 'get', ['users', _.get(this.session, 'user_id')]);
  }

  /**
   * Upload an SSH public key to the user's Pantheon account
   *
   * @param {string} key - Path to SSH public key file
   * @return {Promise<Object>} Response from key upload
   */
  postKey(key) {
    const postKey = ['users', _.get(this.session, 'user_id'), 'keys'];
    const options = (this.mode === 'node') ? {headers: {'User-Agent': 'Terminus/Lando'}} : {};
    const data = _.trim(fs.readFileSync(key, 'utf8'));
    return pantheonRequest(this.request, this.log, 'post', postKey, JSON.stringify(data), options);
  }
};
