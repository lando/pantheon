'use strict';

const chai = require('chai');
const pantheonPhp = require('../builders/pantheon-php');

chai.should();

describe('pantheon-php', () => {
  const buildService = options => {
    class Parent {
      constructor(id, serviceOptions) {
        this.options = serviceOptions;
      }
    }

    class PantheonNginx {
      constructor() {
        this.data = [{version: '3'}];
        this.info = {};
      }
    }

    const app = {
      add: () => {},
      config: {services: {}},
      env: {LANDO_HOST_IP: '127.0.0.1'},
      info: [],
      _lando: {log: {debug: () => {}}},
    };
    const factory = {
      get: () => PantheonNginx,
    };
    const PantheonPhp = pantheonPhp.builder(Parent, pantheonPhp.defaults);
    return new PantheonPhp('appserver', Object.assign({
      _app: app,
      app: 'pantheon',
      confDest: '/tmp/lando/config',
      framework: 'drupal',
      id: 'site-id',
      name: 'appserver',
      project: 'pantheon',
      root: '/app',
      site: 'site-name',
      solrTag: 'latest',
      userConfRoot: '/app/.lando',
      volumes: [],
    }, options), factory);
  };

  it('should silently fall back to an available image generation', () => {
    const service = buildService({
      generation: '5',
      php: '7.1',
    });

    service.options.image.should.equal('devwithlando/pantheon-appserver:7.1-4');
  });

  it('should normalize unquoted PHP 8.0 before selecting an image', () => {
    const service = buildService({
      generation: '5',
      php: 8,
    });

    service.options.image.should.equal('devwithlando/pantheon-appserver:8.0-5');
  });
});
