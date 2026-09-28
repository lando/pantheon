'use strict';

const chai = require('chai');
const {parsePantheonConfig} = require('../lib/config');

chai.should();

describe('lib/config', () => {
  describe('#parsePantheonConfig', () => {
    let warnings;
    let originalWarn;

    beforeEach(() => {
      warnings = [];
      originalWarn = console.warn;
      console.warn = warning => warnings.push(warning);
    });

    afterEach(() => {
      console.warn = originalWarn;
    });

    it('should default php, webroot, drush, and generation', () => {
      const config = parsePantheonConfig([]);

      config.php.should.equal('8.3');
      config.webroot.should.equal('.');
      config.drush.should.equal('8');
      config.generation.should.equal('5');
      chai.expect(config.frontendBuild).to.equal(null);
      config.should.not.have.property('tikaVersion');
      warnings.should.have.length(0);
    });

    it('should stringify a numeric php_version', () => {
      parsePantheonConfig([{php_version: 8.2}]).php.should.equal('8.2');
    });

    it('should use web as the webroot when web_docroot is set', () => {
      parsePantheonConfig([{web_docroot: true}]).webroot.should.equal('web');
    });

    it('should keep drush 11', () => {
      const config = parsePantheonConfig([{drush_version: 11}]);

      config.drush.should.equal('11');
      warnings.should.have.length(0);
    });

    it('should warn and fall back to drush 8 when drush is 7', () => {
      const config = parsePantheonConfig([{drush_version: 7}]);

      config.drush.should.equal(8);
      warnings.should.have.length(1);
      warnings[0].should.include('drush_version: 7 in pantheon.yml is not supported');
    });

    it('should map php_runtime_generation 1 to generation 4', () => {
      parsePantheonConfig([{php_runtime_generation: 1}]).generation.should.equal('4');
    });

    it('should coerce tika_version to an integer', () => {
      parsePantheonConfig([{tika_version: '3'}]).tikaVersion.should.equal(3);
    });

    it('should pass parsed frontend_build through', () => {
      const config = parsePantheonConfig([{
        frontend_build: {paths: [{path: 'web/themes/custom/foo', node_version: 24}]},
      }]);

      config.frontendBuild.nodeVersion.should.equal('24');
      config.frontendBuild.paths[0].should.include({
        path: 'web/themes/custom/foo',
        buildCommand: 'build',
      });
    });

    it('should let later docs override earlier ones and keep earlier keys', () => {
      const config = parsePantheonConfig([
        {php_version: 8.1, web_docroot: true, site: 'kept'},
        {php_version: 8.2},
      ]);

      config.php.should.equal('8.2');
      config.webroot.should.equal('web');
      config.site.should.equal('kept');
    });
  });
});
