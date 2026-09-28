'use strict';

const assert = require('node:assert/strict');
const {expect} = require('chai');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const PantheonApiClient = require('../lib/client');

const baseURL = 'https://terminus.pantheon.io/api/';
const fakeResponse = (body, status = 200, statusText = 'OK') => ({
  ok: status >= 200 && status < 300,
  status,
  statusText,
  headers: new Headers({'Content-Type': 'application/json'}),
  json: async () => body,
  text: async () => JSON.stringify(body),
  clone: () => fakeResponse(body, status, statusText),
});

describe('PantheonApiClient', () => {
  let originalFetch;
  let calls;
  let responses;
  let client;
  let log;
  const session = {session: 'session-id', user_id: 'user-id'};

  beforeEach(() => {
    originalFetch = global.fetch;
    calls = [];
    responses = [fakeResponse(session)];
    log = {verbose() {}, debug() {}, silly() {}, info() {}, warn() {}};
    client = new PantheonApiClient('machine-token', log);
    global.fetch = async (url, options) => {
      calls.push({url, options});
      assert.ok(responses.length, `Unexpected fetch: ${url}`);
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response;
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts the token and stores the session when authenticating', async () => {
    const result = await client.auth();

    expect(result).to.deep.equal(session);
    expect(client.session).to.deep.equal(session);
    expect(calls).to.have.length(1);
    expect(calls[0].url).to.equal(`${baseURL}authorize/machine-token`);
    expect(calls[0].options.method).to.equal('POST');
    expect(JSON.parse(calls[0].options.body)).to.deep.equal({machine_token: 'machine-token', client: 'terminus'});
    const headers = new Headers(calls[0].options.headers);
    expect(headers.get('Content-Type')).to.equal('application/json');
    expect(headers.get('User-Agent')).to.equal('Terminus/Lando');
    expect(headers.has('X-Pantheon-Session')).to.equal(false);
  });

  it('uses and stores the supplied token when authentication overrides the constructor token', async () => {
    await client.auth('replacement-token');

    expect(client.token).to.equal('replacement-token');
    expect(JSON.parse(calls[0].options.body).machine_token).to.equal('replacement-token');
  });

  it('gets the user with the session header when authenticated in node mode', async () => {
    const user = {email: 'user@example.com'};
    responses.push(fakeResponse(user));
    await client.auth();

    const result = await client.getUser();

    expect(result).to.deep.equal(user);
    expect(calls[1].url).to.equal(`${baseURL}users/user-id`);
    expect(calls[1].options.method).to.equal('GET');
    expect(calls[1].options).not.to.have.property('body');
    expect(new Headers(calls[1].options.headers).get('X-Pantheon-Session')).to.equal('session-id');
  });

  it('leaves session and user-agent headers upstream when using browser mode', async () => {
    client = new PantheonApiClient('machine-token', log, 'browser');
    responses.push(fakeResponse({email: 'browser@example.com'}));
    await client.auth();

    await client.getUser();

    for (const call of calls) {
      const headers = new Headers(call.options.headers);
      expect(headers.has('User-Agent')).to.equal(false);
      expect(headers.has('X-Pantheon-Session')).to.equal(false);
      expect(headers.get('Content-Type')).to.equal('application/json');
    }
  });

  it('merges, deduplicates, sorts and filters sites when user and organization memberships overlap', async () => {
    responses.push(
      fakeResponse([{site: {id: 'z', name: 'zeta'}}, {site: {id: 'f', name: 'frozen', frozen: true}}]),
      fakeResponse([{id: 'org', role: 'admin'}, {id: 'blocked', role: 'unprivileged'}]),
      fakeResponse([{site: {id: 'a', name: 'alpha'}}, {site: {id: 'z', name: 'zeta'}}]),
    );
    await client.auth();

    const sites = await client.getSites();

    expect(sites.map(site => ({id: site.id, name: site.name}))).to.deep.equal([
      {id: 'a', name: 'alpha'}, {id: 'z', name: 'zeta'},
    ]);
    expect(calls.slice(1).map(call => call.url)).to.deep.equal([
      `${baseURL}users/user-id/memberships/sites?limit=5000`,
      `${baseURL}users/user-id/memberships/organizations`,
      `${baseURL}organizations/org/memberships/sites?limit=5000`,
    ]);
    expect(calls.slice(1).every(call => call.options.method === 'GET' && !('body' in call.options))).to.equal(true);
  });

  it('returns only the lookup when full site details are not requested', async () => {
    responses.push(fakeResponse({id: 'site-id'}));
    await client.auth();

    const site = await client.getSite('site-name', false);

    expect(site).to.deep.equal({id: 'site-id'});
    expect(calls.map(call => call.url)).to.deep.equal([
      `${baseURL}authorize/machine-token`, `${baseURL}site-names/site-name`,
    ]);
  });

  it('returns full site details when using the default lookup', async () => {
    responses.push(fakeResponse({id: 'site-id'}), fakeResponse({id: 'site-id', framework: 'drupal8'}));
    await client.auth();

    const site = await client.getSite('site-name');

    expect(site).to.deep.equal({id: 'site-id', framework: 'drupal8'});
    expect(calls.slice(1).map(call => call.url)).to.deep.equal([
      `${baseURL}site-names/site-name`, `${baseURL}sites/site-id`,
    ]);
  });

  it('returns environment IDs when requesting site environments', async () => {
    responses.push(fakeResponse({dev: {locked: false}, live: {locked: true}}));
    await client.auth();

    const envs = await client.getSiteEnvs('site-id');

    expect(envs).to.deep.equal([{locked: false, id: 'dev'}, {locked: true, id: 'live'}]);
    expect(calls[1].url).to.equal(`${baseURL}sites/site-id/environments`);
    expect(calls[1].options.method).to.equal('GET');
  });

  for (const mode of ['node', 'browser']) {
    it(`posts a trimmed JSON string when uploading a key in ${mode} mode`, async () => {
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pantheon-client-'));
      const key = path.join(directory, 'id.pub');
      try {
        fs.writeFileSync(key, '  ssh-ed25519 AAAA test@example.com\n');
        client = new PantheonApiClient('machine-token', log, mode);
        responses.push(fakeResponse({id: 'key-id'}));
        await client.auth();

        const result = await client.postKey(key);

        expect(result).to.deep.equal({id: 'key-id'});
        expect(calls[1].url).to.equal(`${baseURL}users/user-id/keys`);
        expect(calls[1].options.method).to.equal('POST');
        expect(calls[1].options.body).to.equal(JSON.stringify('ssh-ed25519 AAAA test@example.com'));
        const headers = new Headers(calls[1].options.headers);
        expect(headers.get('Content-Type')).to.equal('application/json');
        expect(headers.get('User-Agent')).to.equal(mode === 'node' ? 'Terminus/Lando' : null);
        expect(headers.get('X-Pantheon-Session')).to.equal(mode === 'node' ? 'session-id' : null);
      } finally {
        fs.rmSync(directory, {recursive: true, force: true});
      }
    });
  }

  it('preserves the 401 error contract when authentication is rejected', async () => {
    responses = [fakeResponse('Token expired', 401, 'Unauthorized')];

    await assert.rejects(client.auth(), {
      message: 'POST request to authorize/machine-token failed with code 401: Unauthorized. ' +
        'The server responded with the message Token expired.',
    });
    expect(client).not.to.have.property('session');
  });

  it('preserves JSON object interpolation when the server returns an error object', async () => {
    responses = [fakeResponse({message: 'Denied'}, 403, 'Forbidden')];

    await assert.rejects(client.auth(), {
      message: 'POST request to authorize/machine-token failed with code 403: Forbidden. ' +
        'The server responded with the message [object Object].',
    });
  });

  it('includes the text when a real response contains a non-JSON error body', async () => {
    responses = [new Response('Gateway unavailable', {status: 502, statusText: 'Bad Gateway'})];

    await assert.rejects(client.auth(), {
      message: 'POST request to authorize/machine-token failed with code 502: Bad Gateway. ' +
        'The server responded with the message Gateway unavailable.',
    });
  });

  it('returns an empty string when a successful response has no body', async () => {
    responses.push(new Response(null, {status: 204}));
    await client.auth();

    const result = await client.getUser();

    expect(result).to.equal('');
  });

  it('propagates transport failures when fetch rejects', async () => {
    const error = new TypeError('fetch failed');
    responses = [error];

    await assert.rejects(client.auth(), received => received === error);
  });
});
