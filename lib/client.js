'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');

// Set a limit on amount of sites
const MAX_SITES = 5000;

/**
 * Helper to make HTTP requests to the Pantheon API
 *
 * @param {object} request - Base URL and default headers
 * @param {object} log - Logger instance
 * @param {object} config - HTTP request configuration
 * @param {string} config.verb - HTTP method to use
 * @param {Array<string>} config.pathname - URL path segments to join
 * @param {object|string} [config.data] - Request payload or GET query configuration
 * @param {object} [config.options] - Additional request headers
 * @return {Promise<object|string>} Response data from API
 */
const pantheonRequest = async (request, log, {verb, pathname, data = {}, options = {}}) => {
  const path = pathname.join('/');
  const url = new URL(path, request.baseURL);
  const method = verb.toUpperCase();
  if (method === 'GET' && data.params) url.search = new URLSearchParams(data.params).toString();

  // Log the actual request we are about to make
  log.verbose('making %s request to %s', verb, `${request.baseURL}${path}`);
  log.debug('request sent data with %j', options, _.clone(data));

  const response = await fetch(url.toString(), {
    method,
    headers: {'Content-Type': 'application/json', ...request.headers, ...options.headers},
    ...(method === 'GET' ? {} : {body: typeof data === 'string' ? data : JSON.stringify(data)}),
  });
  // Read a clone so a failed JSON parse does not consume the text fallback.
  const body = await response.clone().json().catch(error => {
    if (!(error instanceof SyntaxError)) throw error;
    return response.text();
  });
  if (!response.ok) {
    throw new Error([
      `${method} request to ${path} failed with code ${response.status}: ${response.statusText}.`,
      `The server responded with the message ${body}.`,
    ].join(' '));
  }
  log.verbose('response recieved: %s with code %s', response.statusText, response.status);
  log.silly('response data', body);
  return body;
};

/**
 * Client for interacting with Pantheon's Terminus API
 * Handles authentication and API requests for sites, environments, and user data
 * @todo add some validation around the session eg throw an error if we make a request
 * with a unauthorized client
 * @todo we can remove the mode from here and just extend this in other things
 */
module.exports = class PantheonApiClient {
  /**
   * Create a new Pantheon API client instance
   *
   * @param {string} token - Pantheon machine token for authentication
   * @param {object} log - Logger instance to use
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
   * @return {Promise<object>} Session data from successful auth
   */
  async auth(token = this.token) {
    const data = {machine_token: token, client: 'terminus'};
    const options = (this.mode === 'node') ? {headers: {'User-Agent': 'Terminus/Lando'}} : {};
    const upath = ['authorize', 'machine-token'];

    // get the auth
    const auth = await pantheonRequest({baseURL: this.baseURL}, this.log, {verb: 'post', pathname: upath, data, options});

    // and set stuff with it
    this.token = token;
    this.session = auth;

    // set headers
    const headers = {'Content-Type': 'application/json'};
    // Add header if we are in node mode, otherwise assume its set upstream in the browser
    if (this.mode === 'node') headers['X-Pantheon-Session'] = auth.session;

    this.request = {baseURL: this.baseURL, headers};

    return auth;
  }

  /**
   * Get information about a specific Pantheon site
   *
   * @param {string} id - Site name or ID
   * @param {boolean} full - Whether to return full site details
   * @return {Promise<object>} Site information
   */
  async getSite(id, full = true) {
    const site = await pantheonRequest(this.request, this.log, {verb: 'get', pathname: ['site-names', id]});
    // if not full then just return the lookup
    if (!full) return site;
    // otherwise return the full site
    return await pantheonRequest(this.request, this.log, {verb: 'get', pathname: ['sites', site.id]});
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
      const sites = await pantheonRequest(this.request, this.log, {
        verb: 'get', pathname: getSites, data: {params: {limit: MAX_SITES}},
      });
      return _.map(sites, site => _.merge(site, site.site));
    };

    // Call to get org sites
    const pantheonOrgSites = async () => {
      const getOrgs = ['users', _.get(this.session, 'user_id'), 'memberships', 'organizations'];
      const orgs = await pantheonRequest(this.request, this.log, {verb: 'get', pathname: getOrgs});

      return await Promise.all(orgs.filter(org => org.role !== 'unprivileged').map(async org => {
        const getOrgsSites = ['organizations', org.id, 'memberships', 'sites'];
        const sites = await pantheonRequest(this.request, this.log, {
          verb: 'get', pathname: getOrgsSites, data: {params: {limit: MAX_SITES}},
        });
        return sites.map(site => _.merge(site, site.site));
      }))
      .then(sites => _.flatten(sites));
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
    const envs = await pantheonRequest(this.request, this.log, {verb: 'get', pathname: ['sites', site, 'environments']});
    return _.map(envs, (data, id) => _.merge({}, data, {id}));
  }

  /**
   * Get authenticated user's account information
   *
   * @return {Promise<object>} User account data
   */
  async getUser() {
    return await pantheonRequest(this.request, this.log, {verb: 'get', pathname: ['users', _.get(this.session, 'user_id')]});
  }

  /**
   * Upload an SSH public key to the user's Pantheon account
   *
   * @param {string} key - Path to SSH public key file
   * @return {Promise<object>} Response from key upload
   */
  async postKey(key) {
    const postKey = ['users', _.get(this.session, 'user_id'), 'keys'];
    const options = (this.mode === 'node') ? {headers: {'User-Agent': 'Terminus/Lando'}} : {};
    const data = _.trim(fs.readFileSync(key, 'utf8'));
    return await pantheonRequest(this.request, this.log, {verb: 'post', pathname: postKey, data: JSON.stringify(data), options});
  }
};
