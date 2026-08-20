'use strict';

const chai = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const utils = require('../lib/utils');

chai.should();

describe('php generation fallback', () => {
  describe('#resolveGeneration', () => {
    it('should keep a published generation', () => {
      utils.resolveGeneration('8.3', '5').should.equal('5');
    });

    it('should fall back to the highest available generation', () => {
      utils.resolveGeneration('7.1', '5').should.equal('4');
      utils.resolveGeneration('8.4', '4').should.equal('5');
    });

    it('should resolve PHP 8.5 to generation 5', () => {
      utils.resolveGeneration('8.5', '5').should.equal('5');
    });

    it('should return null when no PHP generation images exist', () => {
      chai.expect(utils.resolveGeneration('9.9', '5')).to.equal(null);
    });
  });

  describe('#getPantheonConfig', () => {
    let tempDir;
    let originalWarn;
    let warnings;

    const writePantheonConfig = content => {
      const file = path.join(tempDir, 'pantheon.yml');
      fs.writeFileSync(file, content);
      return file;
    };

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-pantheon-php-'));
      warnings = [];
      originalWarn = console.warn;
      console.warn = warning => warnings.push(warning);
    });

    afterEach(() => {
      console.warn = originalWarn;
      fs.rmSync(tempDir, {recursive: true, force: true});
    });

    it('should keep frontend_build parsing when resolving PHP images', () => {
      const file = writePantheonConfig([
        'php_version: 8.3',
        'frontend_build:',
        '  paths:',
        '    - path: web/themes/custom/demo',
        '      node_version: 26',
        '      build_command: build',
      ].join('\n'));

      const config = utils.getPantheonConfig([file]);

      config.php.should.equal('8.3');
      config.generation.should.equal('5');
      config.frontendBuild.should.be.an('object');
      warnings.should.have.length(0);
    });

    it('should normalize unquoted x.0 PHP versions before resolving the generation', () => {
      const file = writePantheonConfig([
        'php_version: 8.0',
        'php_runtime_generation: 1',
      ].join('\n'));

      const config = utils.getPantheonConfig([file]);

      config.php.should.equal('8.0');
      config.generation.should.equal('4');
      warnings.should.have.length(0);
    });

    it('should warn and fall back when PHP 7.1 has no generation 5 image', () => {
      const file = writePantheonConfig('php_version: 7.1');

      const config = utils.getPantheonConfig([file]);

      config.php.should.equal('7.1');
      config.generation.should.equal('4');
      warnings.should.have.length(1);
      warnings[0].should.include('No Docker image exists for PHP 7.1 generation 5');
      warnings[0].should.include('devwithlando/pantheon-appserver:7.1-4');
    });

    it('should warn and fall back when PHP 8.4 has no generation 4 image', () => {
      const file = writePantheonConfig([
        'php_version: 8.4',
        'php_runtime_generation: 1',
      ].join('\n'));

      const config = utils.getPantheonConfig([file]);

      config.php.should.equal('8.4');
      config.generation.should.equal('5');
      warnings.should.have.length(1);
      warnings[0].should.include('No Docker image exists for PHP 8.4 generation 4');
      warnings[0].should.include('devwithlando/pantheon-appserver:8.4-5');
    });

    it('should warn and keep the requested generation when no PHP images exist', () => {
      const file = writePantheonConfig([
        'php_version: 9.9',
        'php_runtime_generation: 2',
      ].join('\n'));

      const config = utils.getPantheonConfig([file]);

      config.php.should.equal('9.9');
      config.generation.should.equal('5');
      warnings.should.have.length(1);
      warnings[0].should.include('No Docker images are available for PHP 9.9');
    });
  });
});
