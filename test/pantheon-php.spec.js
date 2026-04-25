'use strict';

const chai = require('chai');
const pantheonPhp = require('../builders/pantheon-php');

chai.should();

describe('pantheon-php', () => {
  it('should silently fall back to an available image generation', () => {
    class Parent {
      constructor(id, options) {
        this.options = options;
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
    const service = new PantheonPhp('appserver', {
      _app: app,
      app: 'pantheon',
      confDest: '/tmp/lando/config',
      framework: 'drupal',
      generation: '4',
      id: 'site-id',
      name: 'appserver',
      php: '8.4',
      project: 'pantheon',
      root: '/app',
      site: 'site-name',
      solrTag: 'latest',
      userConfRoot: '/app/.lando',
      volumes: [],
    }, factory);

    service.options.image.should.equal('devwithlando/pantheon-appserver:8.4-5');
  });
});
