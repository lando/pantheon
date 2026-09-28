'use strict';

const chai = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');
const _ = require('lodash');
const recipe = require('../builders/pantheon');
const utils = require('../lib/utils');

chai.should();

class MockParent {
  /**
   * Captures the options the recipe hands to its parent.
   *
   * @param {string} id recipe id
   * @param {object} options resolved recipe options
   */
  constructor(id, options) {
    this.id = id;
    this.options = options;
  }
}

describe('builders/pantheon', () => {
  let tempDir;

  const buildRecipe = (overrides = {}, pantheon = {api_version: 1, php_version: 8.3}) => {
    fs.writeFileSync(path.join(tempDir, 'pantheon.yml'), yaml.dump(pantheon));
    const Recipe = recipe.builder(MockParent, recipe.config);
    const options = _.merge({
      root: tempDir,
      app: 'mysite',
      // getPantheonEdge and getPantheonIndex join paths under confDest.
      confDest: path.join(tempDir, 'conf'),
      _app: {
        _config: {domain: 'lndo.site', isArmed: false},
        pantheonTokens: [],
        terminusTokens: [],
        meta: {},
      },
    }, overrides);
    return new Recipe('pantheon', options);
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-pantheon-builder-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, {recursive: true, force: true});
  });

  it('should resolve a default drupal recipe', () => {
    const {options} = buildRecipe();

    options.services.appserver.type.should.equal('pantheon-php:8.3');
    options.services.database.type.should.equal('pantheon-mariadb:10.3');
    options.defaultFiles.vhosts.should.equal('drupal.conf.tpl');
    options.services.cache.type.should.equal('pantheon-redis:6');
    options.services.should.have.property('edge');
    options.proxyService.should.equal('edge');
    options.services.should.have.property('index');
    options.proxy.edge.should.deep.equal(['mysite.lndo.site']);
    options.tooling.should.include.keys(
      'pull', 'push', 'switch', 'drush', 'terminus', 'mysql', 'php', 'composer', 'redis-cli', 'varnishadm',
    );
    options.tooling.should.not.have.property('wp');
    options.build_root[0].should.equal('/helpers/pantheon.sh');
    options.build[options.build.length - 1].should.equal('/helpers/auth.sh');
    options.run_root.should.include('/helpers/binding.sh');
    options.services.appserver.overrides.environment.DRUSH_OPTIONS_URI.should.equal('https://mysite.lndo.site');
  });

  it('should resolve wordpress without cache, edge, or index', () => {
    const {options} = buildRecipe({framework: 'wordpress', cache: false, edge: false, index: false});

    options.tooling.should.have.property('wp');
    options.tooling.should.not.have.property('drush');
    options.services.should.not.have.property('cache');
    options.services.should.not.have.property('edge');
    options.services.should.not.have.property('index');
    options.proxyService.should.equal('appserver_nginx');
    options.proxy.appserver_nginx.should.deep.equal(['mysite.lndo.site']);
    options.defaultFiles.vhosts.should.equal('wordpress.conf.tpl');
  });

  it('should honor arm, search 9, web_docroot, and composer drush', () => {
    fs.writeFileSync(path.join(tempDir, 'composer.json'), JSON.stringify({
      require: {'drush/drush': '^12'},
    }));
    const {options} = buildRecipe({
      _app: {_config: {isArmed: true}},
    }, {
      php_version: 8.2,
      web_docroot: true,
      search: {version: 9},
      database: {version: 10.6},
      tika_version: 3,
    });

    options.services.database.type.should.equal('pantheon-mariadb-arm:10.6');
    options.solrTag.should.equal('9.10-1');
    options.webroot.should.equal('web');
    options.drush_version.should.equal('^12');
    options.build_root.should.include(utils.getTika3BuildStep());
    options.services.index.type.should.equal('pantheon-solr:9');
  });

  it('should prefer an explicit drush_uri', () => {
    const {options} = buildRecipe({drush_uri: 'http://custom.test'});

    options.services.appserver.overrides.environment.DRUSH_OPTIONS_URI.should.equal('http://custom.test');
  });

  it('should append a non-standard proxy port to DRUSH_OPTIONS_URI', () => {
    const {options} = buildRecipe({
      _app: {_config: {proxyLastPorts: {https: 444, http: 8080}}},
    });

    options.services.appserver.overrides.environment.DRUSH_OPTIONS_URI.should.equal('https://mysite.lndo.site:444');
  });

  it('should add a frontend node sidecar from pantheon.yml frontend_build', () => {
    const relPath = 'web/themes/custom/foo';
    fs.mkdirSync(path.join(tempDir, relPath), {recursive: true});
    fs.writeFileSync(path.join(tempDir, relPath, 'pnpm-lock.yaml'), '');
    const {options} = buildRecipe({}, {
      api_version: 1,
      php_version: 8.3,
      frontend_build: {paths: [{path: relPath}]},
    });

    options.services.frontend.type.should.equal('pantheon-node:26');
    options.tooling.pnpm.service.should.equal('frontend');
    options.tooling.node.service.should.equal('frontend');
    options.tooling.should.have.property('frontend-build');
  });
});
