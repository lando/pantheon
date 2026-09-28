'use strict';

const chai = require('chai');
const {getPantheonPhp, getPantheonComposer} = require('../lib/php');
chai.should();

describe('php tooling', () => {
  it('runs PHP in appserver', () => {
    getPantheonPhp.should.deep.equal({service: 'appserver', cmd: 'php'});
  });

  it('runs Composer with ANSI output in appserver', () => {
    getPantheonComposer.should.deep.equal({service: 'appserver', cmd: 'composer --ansi'});
  });
});
