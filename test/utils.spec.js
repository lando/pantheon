'use strict';

const chai = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const utils = require('../lib/utils');
chai.should();
const {expect} = chai;

describe('utils', () => {
  describe('#sortTokens', () => {
    it('flattens sources and keeps the newest token for each email regardless of input order', () => {
      const old = {email: 'me@x.test', token: 'old', date: 1};
      const newest = {email: 'me@x.test', token: 'new', date: 9};
      const other = {email: 'other@x.test', token: 'other', date: 3};

      const result = utils.sortTokens([newest, other], [old], [null, false, undefined]);

      result.should.have.deep.members([newest, other]);
      result.should.have.length(2);
    });

    it('returns an empty list when there are no tokens', () => {
      utils.sortTokens([], [null, false, undefined]).should.deep.equal([]);
    });
  });

  describe('framework helpers', () => {
    ['wordpress', 'wordpress_network', 'wordpress-custom', 'drupal', 'drupal8', 'backdrop', undefined].forEach(framework => {
      it(`selects database commands for ${framework}`, () => {
        const pressy = ['wordpress', 'wordpress_network', 'wordpress-custom'].includes(framework);

        utils.frameworkType(framework).should.equal(pressy ? 'pressy' : 'drupaly');
        utils.buildDbPullCommand({framework}).should.deep.equal(pressy ? {
          command: 'terminus remote:wp', options: '-- db export -',
        } : {
          command: 'terminus remote:drush', options: '-- sql-dump --structure-tables-list=cache,cache_*',
        });
      });
    });

    it('defaults the database pull command to drush when no options are supplied', () => {
      utils.buildDbPullCommand().should.deep.equal({
        command: 'terminus remote:drush', options: '-- sql-dump --structure-tables-list=cache,cache_*',
      });
    });

    ['wordpress', 'wordpress_network', 'drupal', 'backdrop', 'drupal8'].forEach(framework => {
      it(`exposes framework-specific tooling for ${framework}`, () => {
        const expected = framework.startsWith('wordpress') ? {wp: {service: 'appserver'}} : {drush: {service: 'appserver'}};
        if (framework === 'drupal8') expected.drupal = {service: 'appserver', description: 'Runs drupal console commands'};

        utils.getPantheonTooling(framework).should.deep.equal(expected);
      });
    });
  });

  describe('build steps', () => {
    ['wordpress', 'wordpress_network'].forEach(framework => {
      it(`installs and checks the wp-cli phar for ${framework}`, () => {
        const steps = utils.getPantheonBuildSteps(framework);

        steps.should.have.length(1);
        steps[0].should.include('https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar');
        steps[0].should.include('mv /tmp/wp-cli.phar /usr/local/bin/wp').and.include('php /usr/local/bin/wp --allow-root --info');
      });
    });

    it('installs the supported Drush 8 phar and checks its version', () => {
      const steps = utils.getPantheonBuildSteps('drupal', 8);

      steps[0].should.include('https://github.com/drush-ops/drush/releases/download/8.5.0/drush.phar');
      steps[0].should.include('mv /tmp/drush.phar /usr/local/bin/drush');
      steps[1].should.deep.equal(['drush', '--version']);
    });

    it('uses Composer for the requested modern Drush version', () => {
      const steps = utils.getPantheonBuildSteps('drupal9', 12);

      steps[0].should.include('composer global require drush/drush:^12 -n');
      steps[1].should.deep.equal(['drush', '--version']);
    });

    it('adds the Drupal Console phar for Drupal 8', () => {
      const steps = utils.getPantheonBuildSteps('drupal8');

      steps[2].should.include('https://drupalconsole.com/installer').and.include('mv /tmp/drupal.phar /usr/local/bin/drupal');
    });

    it('installs Backdrush and clears the Drush cache for Backdrop', () => {
      const steps = utils.getPantheonBuildSteps('backdrop');

      steps[2].should.include('https://github.com/backdrop-contrib/drush/archive/1.2.0.tar.gz');
      steps[2].should.include('-C /var/www/.drush && drush cc drush');
    });

    it('downloads Tika 3 into the Pantheon jar location', () => {
      const step = utils.getTika3BuildStep();

      step.should.include('https://archive.apache.org/dist/tika/3.2.0/tika-app-3.2.0.jar');
      step.should.include('-o "/opt/pantheon/tika/tika.jar"');
    });
  });

  describe('#getPantheonEnvironment', () => {
    const options = {
      app: 'sample', framework: 'drupal8', id: 'site-id', site: 'remote-site', root: '/app/sample', solrTag: '8.8-4',
      search: {version: 8}, _app: {meta: {token: 'machine-token', email: 'me@x.test'}},
    };

    it('sets database, cache, site and Terminus configuration', () => {
      const env = utils.getPantheonEnvironment(options);

      env.should.include({
        DB_HOST: 'database', DB_PORT: 3306, DB_USER: 'pantheon', DB_PASSWORD: 'pantheon', DB_NAME: 'pantheon',
        CACHE_HOST: 'cache', CACHE_PORT: '6379', CACHE_PASSWORD: 'pantheon', PANTHEON_ENVIRONMENT: 'lando',
        PANTHEON_SITE: 'site-id', PANTHEON_SITE_NAME: 'remote-site', PANTHEON_SEARCH_VERSION: '8',
        PANTHEON_INDEX_HOST: 'index', PANTHEON_INDEX_SCHEME: 'http', PANTHEON_INDEX_CORE: 'lando',
        LANDO_TERMINUS_TOKEN: 'machine-token', TERMINUS_USER: 'me@x.test', TERMINUS_SITE: 'remote-site', TERMINUS_ENV: 'dev',
      });
    });

    [['8.8-4', '8983'], ['9.10-1', '8983'], ['3.6-3', '449']].forEach(([solrTag, port]) => {
      it(`uses index port ${port} for ${solrTag}`, () => {
        const env = utils.getPantheonEnvironment({...options, solrTag});

        env.PANTHEON_INDEX_PORT.should.equal(port);
        JSON.parse(env.PRESSFLOW_SETTINGS).conf.pantheon_index_port.should.equal(port);
      });
    });

    [
      ['wordpress', 'wp-content/uploads'], ['wordpress_network', 'wp-content/uploads'], ['backdrop', 'files'],
      ['drupal', 'sites/default/files'], ['drupal8', 'sites/default/files'], ['drupal9', 'sites/default/files'],
      ['unknown', 'sites/default/files'],
    ].forEach(([framework, mount]) => {
      it(`sets FILEMOUNT for ${framework}`, () => {
        utils.getPantheonEnvironment({...options, framework}).FILEMOUNT.should.equal(mount);
      });
    });

    it('serializes usable Pressflow database settings', () => {
      const env = utils.getPantheonEnvironment(options);

      JSON.parse(env.PRESSFLOW_SETTINGS).databases.default.default.should.deep.equal({
        driver: 'mysql', prefix: '', database: 'pantheon', username: 'pantheon', password: 'pantheon', host: 'database', port: 3306,
      });
      JSON.parse(env.BACKDROP_SETTINGS).should.deep.equal(JSON.parse(env.PRESSFLOW_SETTINGS));
    });

    it('derives deterministic SHA-256 keys and salts from the configuration', () => {
      const first = utils.getPantheonEnvironment(options);

      const second = utils.getPantheonEnvironment({...options});

      ['AUTH_KEY', 'AUTH_SALT', 'DRUPAL_HASH_SALT', 'LOGGED_IN_KEY', 'LOGGED_IN_SALT',
        'NONCE_KEY', 'NONCE_SALT', 'SECURE_AUTH_KEY', 'SECURE_AUTH_SALT'].forEach(key => {
        first[key].should.match(/^[a-f0-9]{64}$/);
        second[key].should.equal(first[key]);
      });
      JSON.parse(first.PRESSFLOW_SETTINGS).drupal_hash_salt.should.equal(first.DRUPAL_HASH_SALT);
    });

    it('changes app-derived salts when the app identity changes', () => {
      const original = utils.getPantheonEnvironment(options);

      const changed = utils.getPantheonEnvironment({...options, app: 'another-app'});

      expect(changed.AUTH_SALT).not.to.equal(original.AUTH_SALT);
      expect(changed.LOGGED_IN_KEY).not.to.equal(original.LOGGED_IN_KEY);
    });
  });

  describe('service configuration', () => {
    it('configures persistent password-protected Redis with CLI tooling', () => {
      utils.getPantheonCache.should.deep.equal({
        services: {cache: {type: 'pantheon-redis:6', password: 'pantheon', persist: true, portforward: true}},
        tooling: {'redis-cli': {service: 'cache'}},
      });
    });

    it('loads the edge VCL from the requested configuration directory', () => {
      const edge = utils.getPantheonEdge({confDest: '/custom/config'});

      edge.proxyService.should.equal('edge');
      edge.services.edge.should.include({type: 'pantheon-varnish:6.0', ssl: true});
      edge.services.edge.config.vcl.should.equal(path.join('/custom/config', 'pantheon-v6.vcl'));
      edge.services.edge.backends.should.deep.equal(['appserver_nginx']);
      edge.services.edge.overrides.environment.VARNISHD_PARAM_HTTP_RESP_HDR_LEN.should.equal('25k');
    });

    [['3', '3.6-3', 'custom'], ['8', '8.8-4', '8.8.2'], ['9', '9.10-1', '9']].forEach(([version, solrTag, type]) => {
      it(`selects the Solr service and image for search ${version}`, () => {
        const result = utils.getPantheonIndex({search: {version}, solrTag, confDest: '/config'});

        result.services.index.type.should.equal(`pantheon-solr:${type}`);
        result.services.index.overrides.image.should.equal(`devwithlando/pantheon-index:${solrTag}`);
      });
    });
  });

  describe('#getTerminusTokens', () => {
    let home;
    beforeEach(() => {
      home = fs.mkdtempSync(path.join(os.tmpdir(), 'pantheon-'));
    });
    afterEach(() => {
      fs.rmSync(home, {recursive: true, force: true});
    });

    it('returns no tokens when the cache directory is missing', () => {
      utils.getTerminusTokens(home).should.deep.equal([]);
    });

    it('parses token files from the supplied home directory', () => {
      const dir = path.join(home, '.terminus', 'cache', 'tokens');
      fs.mkdirSync(dir, {recursive: true});
      fs.writeFileSync(path.join(dir, 'one.json'), JSON.stringify({email: 'me@x.test', token: 'saved'}));

      const tokens = utils.getTerminusTokens(home);

      tokens.should.deep.equal([{email: 'me@x.test', token: 'saved'}]);
    });

    it('names the file when cached JSON is invalid', () => {
      const dir = path.join(home, '.terminus', 'cache', 'tokens');
      fs.mkdirSync(dir, {recursive: true});
      const file = path.join(dir, 'broken.json');
      fs.writeFileSync(file, '{broken');

      expect(() => utils.getTerminusTokens(home)).to.throw(`The file ${file} is not valid JSON`);
    });
  });
});
