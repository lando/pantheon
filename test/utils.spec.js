'use strict';

const chai = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const utils = require('../lib/utils');

chai.should();

describe('utils', () => {
  describe('#resolveGeneration', () => {
    it('should fall back to the highest available generation', () => {
      utils.resolveGeneration('8.4', '4').should.equal('5');
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
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-pantheon-'));
      warnings = [];
      originalWarn = console.warn;
      console.warn = warning => warnings.push(warning);
    });

    afterEach(() => {
      console.warn = originalWarn;
      fs.rmSync(tempDir, {recursive: true, force: true});
    });

    it('should normalize unquoted x.0 PHP versions before resolving the generation', () => {
      const file = writePantheonConfig([
        'php_version: 8.0',
        'php_runtime_generation: 1',
      ].join('\n'));

      const config = utils.getPantheonConfig([file]);

      config.php.should.equal('8.0');
      config.generation.should.equal('4');
    });

    it('should warn and fall back when the requested PHP generation has no image', () => {
      const file = writePantheonConfig([
        'php_version: 8.4',
        'php_runtime_generation: 1',
      ].join('\n'));

      const config = utils.getPantheonConfig([file]);

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

      config.generation.should.equal('5');
      warnings.should.have.length(1);
      warnings[0].should.include('No Docker images are available for PHP 9.9');
    });
  });
});
