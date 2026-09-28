'use strict';

const chai = require('chai');
chai.should();
const {expect} = chai;

describe('plugin bootstrap', () => {
  const clientPath = require.resolve('../lib/client');
  const indexPath = require.resolve('../index');
  let savedClient;
  let savedIndex;
  let savedLog;
  let handlers;
  let store;
  let calls;
  let lando;
  let authError;

  beforeEach(() => {
    savedClient = require.cache[clientPath];
    savedIndex = require.cache[indexPath];
    savedLog = console.log;
    handlers = {};
    store = new Map([
      ['pantheon.tokens', [{token: 'bad', email: 'bad@x.test'}, {token: 'good', email: 'good@x.test'}]],
      ['app.meta', {token: 'bad', email: 'bad@x.test', site: 'site-id'}],
      ['app.tooling', {pull: {}}],
    ]);
    calls = {sanitize: [], auth: [], writes: [], removed: [], clear: 0, art: []};
    authError = new Error('GET request to x failed with code 401: Unauthorized.');
    require('../lib/client');
    require.cache[clientPath] = {...require.cache[clientPath], exports: class {
      constructor(token) {
        this.token = token;
      }
      async auth() {
        calls.auth.push(this.token);
        if (authError) throw authError;
        return {};
      }
    }};
    delete require.cache[indexPath];
    console.log = value => calls.art.push(value);
    lando = {
      log: {alsoSanitize: key => calls.sanitize.push(key), verbose() {}, debug() {}, silly() {}},
      events: {on: (name, fn) => {
        handlers[name] = fn;
      }},
      cache: {
        get: key => store.get(key),
        set: (key, value, options) => {
          store.set(key, value);
          calls.writes.push({key, value, options});
        },
        remove: key => {
          store.delete(key);
          calls.removed.push(key);
        },
      },
      cli: {clearTaskCaches: () => {
        calls.clear++;
      }, makeArt: () => 'ART'},
    };
    require('../index')(lando);
  });

  afterEach(() => {
    console.log = savedLog;
    if (savedClient) require.cache[clientPath] = savedClient;
    else delete require.cache[clientPath];
    if (savedIndex) require.cache[indexPath] = savedIndex;
    else delete require.cache[indexPath];
  });

  it('sanitizes authentication and registers all answer handlers', () => {
    calls.sanitize.should.deep.equal(['pantheon-auth']);
    Object.keys(handlers).should.have.members(['cli-pull-answers', 'cli-push-answers', 'cli-switch-answers']);
  });

  it('does nothing when the recipe is not Pantheon', async () => {
    const data = {options: {auth: 'keep', _app: {recipe: 'drupal', metaCache: 'app.meta'}}};

    await handlers['cli-pull-answers'](data);

    calls.auth.should.deep.equal([]);
    calls.writes.should.deep.equal([]);
    calls.removed.should.deep.equal([]);
    calls.clear.should.equal(0);
    data.options.auth.should.equal('keep');
  });

  ['pull', 'push', 'switch'].forEach(command => {
    it(`evicts a revoked token and resets prompting for ${command}`, async () => {
      const data = {options: {auth: 'bad', _app: {recipe: 'pantheon', metaCache: 'app.meta', toolingCache: 'app.tooling'}}};

      await handlers[`cli-${command}-answers`](data);

      calls.auth.should.deep.equal(['bad']);
      calls.writes.should.deep.equal([
        {key: 'pantheon.tokens', value: [{token: 'good', email: 'good@x.test'}], options: {persist: true}},
        {key: 'app.meta', value: {email: 'bad@x.test', site: 'site-id'}, options: {persist: true}},
      ]);
      calls.removed.should.deep.equal(['app.tooling']);
      calls.clear.should.equal(1);
      expect(data.options).not.to.have.property('auth');
      calls.art.should.deep.equal(['ART']);
    });
  });

  [null, new Error('GET request to x failed with code 500: Server Error.')].forEach(error => {
    it(`preserves authentication when ${error ? 'the error is not 401' : 'the token is valid'}`, async () => {
      authError = error;
      const data = {options: {auth: 'bad', _app: {recipe: 'pantheon', metaCache: 'app.meta'}}};

      await handlers['cli-pull-answers'](data);

      calls.auth.should.deep.equal(['bad']);
      calls.writes.should.deep.equal([]);
      calls.removed.should.deep.equal([]);
      calls.clear.should.equal(0);
      data.options.auth.should.equal('bad');
    });
  });

  it('skips validation when the metadata has no token', async () => {
    store.set('app.meta', {email: 'me@x.test'});

    await handlers['cli-pull-answers']({options: {_app: {recipe: 'pantheon', metaCache: 'app.meta'}}});

    calls.auth.should.deep.equal([]);
    calls.writes.should.deep.equal([]);
  });
});
