'use strict';

const chai = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const utils = require('../lib/utils');

chai.should();

describe('drush version handling', () => {
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
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lando-pantheon-drush-'));
      warnings = [];
      originalWarn = console.warn;
      console.warn = warning => warnings.push(warning);
    });

    afterEach(() => {
      console.warn = originalWarn;
      fs.rmSync(tempDir, {recursive: true, force: true});
    });

    it('should default to drush 8 when drush_version is not set', () => {
      const file = writePantheonConfig('php_version: 8.3');

      const config = utils.getPantheonConfig([file]);

      config.drush.should.equal('8');
      warnings.should.have.length(0);
    });

    it('should warn and fall back to drush 8 when drush_version is 5', () => {
      const file = writePantheonConfig('drush_version: 5');

      const config = utils.getPantheonConfig([file]);

      config.drush.should.equal(8);
      warnings.should.have.length(1);
      warnings[0].should.include('drush_version: 5 in pantheon.yml is not supported');
      warnings[0].should.include('Drush 8 will be used instead');
    });

    it('should warn and fall back to drush 8 when drush_version is 6', () => {
      const file = writePantheonConfig('drush_version: 6');

      const config = utils.getPantheonConfig([file]);

      config.drush.should.equal(8);
      warnings.should.have.length(1);
      warnings[0].should.include('drush_version: 6 in pantheon.yml is not supported');
    });

    it('should warn and fall back to drush 8 when drush_version is 7', () => {
      const file = writePantheonConfig('drush_version: 7');

      const config = utils.getPantheonConfig([file]);

      config.drush.should.equal(8);
      warnings.should.have.length(1);
      warnings[0].should.include('drush_version: 7 in pantheon.yml is not supported');
    });

    it('should warn when drush_version is the string "5"', () => {
      const file = writePantheonConfig('drush_version: "5"');

      const config = utils.getPantheonConfig([file]);

      config.drush.should.equal(8);
      warnings.should.have.length(1);
      warnings[0].should.include('drush_version: 5 in pantheon.yml is not supported');
    });

    it('should not warn when drush_version is 8', () => {
      const file = writePantheonConfig('drush_version: 8');

      const config = utils.getPantheonConfig([file]);

      config.drush.should.equal('8');
      warnings.should.have.length(0);
    });

    it('should not warn when drush_version is 10', () => {
      const file = writePantheonConfig('drush_version: 10');

      const config = utils.getPantheonConfig([file]);

      config.drush.should.equal('10');
      warnings.should.have.length(0);
    });
  });
});
