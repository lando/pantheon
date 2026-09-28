'use strict';

const chai = require('chai');
const path = require('path');
const _ = require('lodash');
const recipe = require('../lib/recipe');
const utils = require('../lib/utils');

chai.should();

const baseOptions = (overrides = {}) => _.merge({
  app: 'mysite',
  build: [],
  build_root: [],
  run_root: [],
  cache: false,
  confDest: '/tmp/pantheon-conf',
  defaultFiles: {
    php: 'php.ini',
    database: 'mysql.cnf',
    server: 'nginx.conf.tpl',
  },
  drush: '8',
  edge: false,
  framework: 'drupal',
  index: false,
  php: '8.3',
  proxy: {},
  services: {},
  solrTag: 'latest',
  tooling: {terminus: {service: 'appserver'}},
  webroot: '.',
  _app: {_config: {domain: 'lndo.site'}, meta: {}},
}, overrides);

const toolingOptions = (overrides = {}) => _.merge({
  framework: 'drupal',
  env: 'dev',
  id: 'site-id',
  tooling: {terminus: {service: 'appserver'}},
  _app: {meta: {}, log: () => {}},
}, overrides);

describe('lib/recipe', () => {
  describe('#resolveOptions', () => {
    it('should use the unarmed mariadb image and leave the solr tag', () => {
      const resolved = recipe.resolveOptions(baseOptions(), {isArmed: false});

      resolved.database.should.equal('pantheon-mariadb:10.3');
      resolved.solrTag.should.equal('latest');
    });

    it('should use the arm mariadb image and solr tag when armed', () => {
      const resolved = recipe.resolveOptions(baseOptions(), {isArmed: true});

      resolved.database.should.equal('pantheon-mariadb-arm:10.3');
      resolved.solrTag.should.equal('3.6-3');
    });

    it('should keep the arm solr tag for search version 3', () => {
      const resolved = recipe.resolveOptions(baseOptions({search: {version: 3}}), {isArmed: true});

      resolved.solrTag.should.equal('3.6-3');
    });

    it('should map search 8 and 9 onto solr tags, including over an arm tag', () => {
      recipe.resolveOptions(baseOptions({search: {version: 8}})).solrTag.should.equal('8.8-4');
      recipe.resolveOptions(baseOptions({search: {version: 9}})).solrTag.should.equal('9.10-1');
      const armed = recipe.resolveOptions(baseOptions({search: {version: 9}}), {isArmed: true});
      armed.solrTag.should.equal('9.10-1');
      armed.database.should.equal('pantheon-mariadb-arm:10.3');
    });

    it('should use an explicit database version', () => {
      const resolved = recipe.resolveOptions(baseOptions({database: {version: 10.6}}));

      resolved.database.should.equal('pantheon-mariadb:10.6');
    });

    it('should set vhosts from the framework', () => {
      ['drupal', 'wordpress', 'backdrop'].forEach(framework => {
        recipe.resolveOptions(baseOptions({framework})).defaultFiles.vhosts.should.equal(`${framework}.conf.tpl`);
      });
    });

    it('should merge cache, edge, and index when they are enabled', () => {
      const resolved = recipe.resolveOptions(baseOptions({cache: true, edge: true, index: true}));

      resolved.services.cache.type.should.equal('pantheon-redis:6');
      resolved.tooling['redis-cli'].service.should.equal('cache');
      resolved.services.edge.type.should.equal('pantheon-varnish:6.0');
      resolved.services.index.type.should.equal('pantheon-solr:custom');
      resolved.proxyService.should.equal('edge');
      resolved.proxy.edge.should.deep.equal(['mysite.lndo.site']);
    });

    it('should omit cache, edge, and index when they are disabled', () => {
      const resolved = recipe.resolveOptions(baseOptions());

      resolved.services.should.not.have.property('cache');
      resolved.services.should.not.have.property('edge');
      resolved.services.should.not.have.property('index');
      resolved.tooling.should.not.have.property('redis-cli');
      resolved.proxyService.should.equal('appserver_nginx');
      resolved.proxy.appserver_nginx.should.deep.equal(['mysite.lndo.site']);
    });

    it('should keep an explicit proxyService when edge is off', () => {
      const resolved = recipe.resolveOptions(baseOptions({proxyService: 'custom'}));

      resolved.proxyService.should.equal('custom');
      resolved.proxy.custom.should.deep.equal(['mysite.lndo.site']);
    });

    it('should take drush_version from composer and fall back to options.drush', () => {
      const fromComposer = recipe.resolveOptions(baseOptions(), {
        composerConfig: {require: {'drush/drush': '^12'}},
      });
      const fallback = recipe.resolveOptions(baseOptions({drush: '11'}), {composerConfig: {require: {}}});
      const untouched = recipe.resolveOptions(baseOptions(), {composerConfig: null});

      fromComposer.drush_version.should.equal('^12');
      fallback.drush_version.should.equal('11');
      untouched.should.not.have.property('drush_version');
    });

    it('should not mutate the input', () => {
      const input = baseOptions({
        cache: true,
        edge: true,
        index: true,
        search: {version: 9},
        database: {version: 10.6},
      });
      const snapshot = _.cloneDeep(input);

      recipe.resolveOptions(input, {isArmed: true, composerConfig: {require: {'drush/drush': '^12'}}});

      input.should.deep.equal(snapshot);
    });
  });

  describe('#getBuildSteps', () => {
    const buildOptions = (overrides = {}) => ({
      framework: 'drupal',
      drush: 8,
      build: ['user-step'],
      build_root: ['root-step'],
      run_root: ['run-step'],
      ...overrides,
    });

    it('should put framework steps first, pantheon.sh on build_root, and auth.sh last', () => {
      const options = buildOptions();
      const steps = recipe.getBuildSteps(options);
      const framework = utils.getPantheonBuildSteps('drupal', 8);

      steps.build.should.deep.equal(framework.concat(['user-step', '/helpers/auth.sh']));
      steps.build_root.should.deep.equal(['root-step', '/helpers/pantheon.sh']);
      steps.run_root.should.deep.equal(['run-step', '/helpers/binding.sh']);
      options.build.should.deep.equal(['user-step']);
      options.build_root.should.deep.equal(['root-step']);
      options.run_root.should.deep.equal(['run-step']);
    });

    it('should unshift composer install when build_step is set', () => {
      const steps = recipe.getBuildSteps(buildOptions({build_step: true, build: []}));

      steps.build[0].should.equal('composer install');
      steps.build[steps.build.length - 1].should.equal('/helpers/auth.sh');
    });

    it('should append the tika 3 step only when tikaVersion is 3', () => {
      const withTika = recipe.getBuildSteps(buildOptions({tikaVersion: 3, build_root: []}));
      const withoutTika = recipe.getBuildSteps(buildOptions({tikaVersion: 2, build_root: []}));

      withTika.build_root.should.deep.equal(['/helpers/pantheon.sh', utils.getTika3BuildStep()]);
      withoutTika.build_root.should.deep.equal(['/helpers/pantheon.sh']);
    });
  });

  describe('#getTooling', () => {
    it('should merge drupal tooling and leave the input tooling alone', () => {
      const options = toolingOptions();
      const before = _.cloneDeep(options.tooling);
      const tooling = recipe.getTooling(options, []);

      tooling.drush.should.deep.equal({service: 'appserver'});
      tooling.should.not.have.property('wp');
      tooling.terminus.service.should.equal('appserver');
      options.tooling.should.deep.equal(before);
    });

    it('should merge wordpress tooling instead of drush', () => {
      const tooling = recipe.getTooling(toolingOptions({framework: 'wordpress'}), []);

      tooling.wp.should.deep.equal({service: 'appserver'});
      tooling.should.not.have.property('drush');
    });

    it('should inject LANDO_TERMINUS_TOKEN when the app meta token is set', () => {
      const tooling = recipe.getTooling(toolingOptions({
        _app: {meta: {token: 'machine-token'}},
      }), []);

      ['pull', 'push', 'switch'].forEach(command => {
        tooling[command].env.LANDO_TERMINUS_TOKEN.should.equal('machine-token');
      });
      tooling.pull.env.should.have.property('LANDO_DB_PULL_COMMAND');
    });

    it('should leave LANDO_TERMINUS_TOKEN unset when the app has no token', () => {
      const tooling = recipe.getTooling(toolingOptions(), []);

      ['pull', 'push', 'switch'].forEach(command => {
        tooling[command].env.should.not.have.property('LANDO_TERMINUS_TOKEN');
      });
    });
  });

  describe('#getServices', () => {
    const serviceOptions = (overrides = {}) => _.merge({
      build: [],
      build_root: [],
      run_root: [],
      confDest: '/conf',
      database: 'pantheon-mariadb:10.3',
      defaultFiles: {
        php: 'php.ini',
        database: 'mysql.cnf',
        server: 'nginx.conf.tpl',
        vhosts: 'drupal.conf.tpl',
      },
      php: '8.3',
    }, overrides);

    it('should build config paths from confDest and defaultFiles', () => {
      const options = serviceOptions();
      const services = recipe.getServices(options);

      services.appserver.type.should.equal('pantheon-php:8.3');
      services.appserver.config.should.deep.equal({
        php: path.join('/conf', 'php.ini'),
        server: path.join('/conf', 'nginx.conf.tpl'),
        vhosts: path.join('/conf', 'drupal.conf.tpl'),
      });
      services.database.type.should.equal('pantheon-mariadb:10.3');
      services.database.config.database.should.equal(path.join('/conf', 'mysql.cnf'));
      services.database.creds.should.deep.equal({database: 'pantheon', password: 'pantheon', user: 'pantheon'});
    });

    it('should let an explicit config.php win over defaultFiles', () => {
      const options = serviceOptions({config: {php: '/custom/php.ini'}});
      const config = recipe.getServiceConfig(options);

      config.php.should.equal('/custom/php.ini');
      config.server.should.equal(path.join('/conf', 'nginx.conf.tpl'));
      recipe.getServices(options).appserver.config.php.should.equal('/custom/php.ini');
    });
  });

  describe('#getDrushUri', () => {
    const uriOptions = (overrides = {}) => ({
      drush_uri: null,
      proxyService: 'edge',
      proxy: {edge: ['mysite.lndo.site']},
      services: {edge: {ssl: true}, appserver: {ssl: true}},
      _app: {_config: {}},
      ...overrides,
    });

    it('should prefer an explicit drush_uri', () => {
      recipe.getDrushUri(uriOptions({drush_uri: 'http://custom.test'}))
        .should.equal('http://custom.test');
    });

    it('should use https when the proxy service ssl flag is true', () => {
      recipe.getDrushUri(uriOptions()).should.equal('https://mysite.lndo.site');
    });

    it('should use http when the proxy service ssl flag is false', () => {
      const uri = recipe.getDrushUri(uriOptions({
        services: {edge: {ssl: false}, appserver: {ssl: true}},
      }));

      uri.should.equal('http://mysite.lndo.site');
    });

    it('should fall back to appserver ssl when the proxy service has no ssl flag', () => {
      const uri = recipe.getDrushUri(uriOptions({
        proxyService: 'appserver_nginx',
        proxy: {appserver_nginx: ['mysite.lndo.site']},
        services: {appserver: {ssl: false}},
      }));

      uri.should.equal('http://mysite.lndo.site');
    });

    it('should append a non-standard port', () => {
      const https = recipe.getDrushUri(uriOptions({
        _app: {_config: {proxyLastPorts: {https: 444, http: 8080}}},
      }));
      const http = recipe.getDrushUri(uriOptions({
        services: {edge: {ssl: false}, appserver: {ssl: true}},
        _app: {_config: {proxyLastPorts: {https: 444, http: 8080}}},
      }));

      https.should.equal('https://mysite.lndo.site:444');
      http.should.equal('http://mysite.lndo.site:8080');
    });

    it('should omit standard http and https ports', () => {
      const uri = recipe.getDrushUri(uriOptions({
        _app: {_config: {proxyLastPorts: {https: 443, http: 80}}},
      }));

      uri.should.equal('https://mysite.lndo.site');
    });

    it('should return null when there is no proxy url', () => {
      chai.expect(recipe.getDrushUri(uriOptions({
        proxy: {},
        proxyService: 'appserver_nginx',
      }))).to.equal(null);
    });
  });
});
