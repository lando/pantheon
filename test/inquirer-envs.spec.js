'use strict';

const assert = require('node:assert/strict');
const {expect} = require('chai');
const utils = require('../lib/utils');

const fakeResponse = body => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: new Headers({'Content-Type': 'application/json'}),
  json: async () => body,
  text: async () => JSON.stringify(body),
  clone: () => fakeResponse(body),
});

describe('getPantheonInquirerEnvs', () => {
  let originalFetch;
  let responses;
  let calls;
  let log;

  beforeEach(() => {
    originalFetch = global.fetch;
    responses = [fakeResponse({session: 'session-id', user_id: 'user-id'})];
    calls = [];
    log = {verbose() {}, debug() {}, silly() {}, info() {}, warn() {}};
    global.fetch = async (url, options) => {
      calls.push({url, options});
      assert.ok(responses.length, `Unexpected fetch: ${url}`);
      return responses.shift();
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns inquirer choices and none when environments are available', async () => {
    responses.push(fakeResponse({dev: {}, test: {}, live: {}}));

    const choices = await utils.getPantheonInquirerEnvs('token', 'site-id', [], log);

    expect(choices).to.deep.equal([
      {name: 'dev', value: 'dev'}, {name: 'test', value: 'test'},
      {name: 'live', value: 'live'}, {name: 'none', value: 'none'},
    ]);
    expect(JSON.parse(calls[0].options.body).machine_token).to.equal('token');
    expect(calls[1].url).to.equal('https://terminus.pantheon.io/api/sites/site-id/environments');
    expect(new Headers(calls[1].options.headers).get('X-Pantheon-Session')).to.equal('session-id');
  });

  it('excludes nopes when building choices', async () => {
    responses.push(fakeResponse({dev: {}, test: {}, live: {}}));

    const choices = await utils.getPantheonInquirerEnvs('token', 'site-id', ['test', 'live'], log);

    expect(choices).to.deep.equal([{name: 'dev', value: 'dev'}, {name: 'none', value: 'none'}]);
  });

  it('returns only none when the site has no environments', async () => {
    responses.push(fakeResponse({}));

    const choices = await utils.getPantheonInquirerEnvs('token', 'site-id', [], log);

    expect(choices).to.deep.equal([{name: 'none', value: 'none'}]);
  });

  it('uses the supplied logger and propagates the error when an environment request fails', async () => {
    const verbose = [];
    const debug = [];
    log.verbose = (...args) => verbose.push(args);
    log.debug = (...args) => debug.push(args);
    responses.push(new Response('Session expired', {status: 401, statusText: 'Unauthorized'}));

    await assert.rejects(utils.getPantheonInquirerEnvs('token', 'site-id', [], log), /failed with code 401/);

    expect(verbose).to.deep.include([
      'making %s request to %s', 'get', 'https://terminus.pantheon.io/api/sites/site-id/environments',
    ]);
    expect(debug).to.have.length(2);
  });
});
