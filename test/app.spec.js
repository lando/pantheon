'use strict';

const chai = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
require('../lib/utils');
chai.should();

describe('app hook', () => {
  const clientPath = require.resolve('../lib/client');
  const appPath = require.resolve('../app');
  let home;
  let savedClient;
  let savedApp;
  let savedNow;
  let hook;
  let app;
  let lando;
  let handlers;
  let store;
  let calls;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'pantheon-'));
    savedClient = require.cache[clientPath];
    savedApp = require.cache[appPath];
    savedNow = Date.now;
    Date.now = () => 1700000000123;
    handlers = {};
    calls = {auth: [], users: 0, writes: [], removed: [], sanitize: []};
    store = new Map([
      ['x.meta.cache', {token: 'old', email: 'me@x.test'}],
      ['pantheon.tokens', [
        {token: 'old', email: 'me@x.test', date: 1}, {token: 'other', email: 'other@x.test', date: 2},
      ]],
      ['sample.tooling.cache', {pull: {}}],
    ]);
    require('../lib/client');
    require.cache[clientPath] = {...require.cache[clientPath], exports: class {
      constructor(token) {
        this.token = token;
      }
      async auth() {
        calls.auth.push(this.token);
        return {};
      }
      async getUser() {
        calls.users++;
        return {email: 'me@x.test'};
      }
    }};
    delete require.cache[appPath];
    hook = require('../app');
    app = {
      name: 'sample', config: {recipe: 'pantheon'}, metaCache: 'x.meta.cache', meta: {site: 'site-id'},
      log: {alsoSanitize: key => calls.sanitize.push(key), verbose() {}, debug() {}, silly() {}},
      events: {on: (name, priority, fn) => {
        handlers[name] = typeof priority === 'function' ? {fn: priority} : {priority, fn};
      }},
    };
    lando = {
      config: {home},
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
    };
  });

  afterEach(() => {
    Date.now = savedNow;
    if (savedClient) require.cache[clientPath] = savedClient;
    else delete require.cache[clientPath];
    if (savedApp) require.cache[appPath] = savedApp;
    else delete require.cache[appPath];
    fs.rmSync(home, {recursive: true, force: true});
  });

  it('loads Pantheon and Terminus caches at pre-init priority 1', async () => {
    const dir = path.join(home, '.terminus', 'cache', 'tokens');
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(path.join(dir, 'token.json'), JSON.stringify({token: 'terminus', email: 'terminal@x.test'}));
    await hook(app, lando);

    handlers['pre-init'].fn();

    handlers['pre-init'].priority.should.equal(1);
    app.pantheonTokenCache.should.equal('pantheon.tokens');
    app.pantheonTokens.should.deep.equal([
      {token: 'old', email: 'me@x.test', date: 1}, {token: 'other', email: 'other@x.test', date: 2},
    ]);
    app.terminusTokens.should.deep.equal([{token: 'terminus', email: 'terminal@x.test'}]);
  });

  it('initializes empty token lists when neither cache exists', async () => {
    store.delete('pantheon.tokens');
    await hook(app, lando);

    handlers['pre-init'].fn();

    app.pantheonTokens.should.deep.equal([]);
    app.terminusTokens.should.deep.equal([]);
  });

  ['pull', 'push', 'switch'].forEach(command => {
    it(`persists a changed token and refreshes tooling after ${command}`, async () => {
      await hook(app, lando);
      handlers['pre-init'].fn();

      await handlers[`post-${command}`].fn({}, {auth: 'new'});

      calls.auth.should.deep.equal(['new']);
      calls.users.should.equal(1);
      calls.writes.should.have.length(2);
      calls.writes[0].should.deep.equal({
        key: 'x.meta.cache', value: {site: 'site-id', token: 'new', email: 'me@x.test', date: 1700000000},
        options: {persist: true},
      });
      calls.writes[1].key.should.equal('pantheon.tokens');
      calls.writes[1].options.should.deep.equal({persist: true});
      calls.writes[1].value.should.have.deep.members([
        {token: 'other', email: 'other@x.test', date: 2}, {token: 'new', email: 'me@x.test', date: 1700000000},
      ]);
      calls.removed.should.deep.equal(['sample.tooling.cache']);
    });
  });

  [undefined, 'old'].forEach(auth => {
    it(`does not update caches when authentication is ${auth ? 'unchanged' : 'absent'}`, async () => {
      await hook(app, lando);
      handlers['pre-init'].fn();

      await handlers['post-pull'].fn({}, {auth});

      calls.auth.should.deep.equal([]);
      calls.users.should.equal(0);
      calls.writes.should.deep.equal([]);
      calls.removed.should.deep.equal([]);
    });
  });

  it('looks up the account when a cached token has no email', async () => {
    store.set('x.meta.cache', {token: 'old'});
    await hook(app, lando);
    handlers['pre-init'].fn();

    await handlers['post-pull'].fn({}, {auth: 'old'});

    calls.auth.should.deep.equal(['old']);
    calls.users.should.equal(1);
    calls.writes[0].value.should.include({token: 'old', email: 'me@x.test', date: 1700000000});
  });

  it('registers no token hooks for a non-Pantheon recipe', async () => {
    app.config.recipe = 'drupal';

    await hook(app, lando);

    handlers.should.deep.equal({});
    calls.auth.should.deep.equal([]);
    calls.writes.should.deep.equal([]);
    calls.removed.should.deep.equal([]);
    calls.sanitize.should.deep.equal(['pantheon-auth']);
  });
});
