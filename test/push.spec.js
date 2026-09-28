'use strict';

const chai = require('chai');
const utils = require('../lib/utils');
const {getPantheonPush} = require('../lib/push');
chai.should();
const {expect} = chai;

describe('push', () => {
  const options = {id: 'site-id', env: 'feature', _app: {meta: {}, log: {}}};
  let originalEnvs;

  beforeEach(() => {
    originalEnvs = utils.getPantheonInquirerEnvs;
  });

  afterEach(() => {
    utils.getPantheonInquirerEnvs = originalEnvs;
  });

  it('builds appserver tooling without opting into database or file pushes', () => {
    const result = getPantheonPush(options);

    result.should.include({cmd: '/helpers/push.sh', service: 'appserver', level: 'app'});
    result.stdio.should.deep.equal(['inherit', 'pipe', 'pipe']);
    result.options.code.interactive.default.should.equal('feature');
    result.options.database.interactive.default.should.equal('none');
    result.options.files.interactive.default.should.equal('none');
  });

  ['code', 'database', 'files'].forEach(key => {
    it(`excludes test and live when resolving ${key} choices`, async () => {
      const calls = [];
      // Stub only the API-backed provider; exercise the real lazy callback wiring.
      utils.getPantheonInquirerEnvs = async (...args) => {
        calls.push(args);
        return [{name: 'feature', value: 'feature'}];
      };
      const task = getPantheonPush(options);

      const choices = await task.options[key].interactive.choices({auth: 'selected'});

      calls.should.deep.equal([['selected', 'site-id', ['test', 'live'], options._app.log]]);
      choices.should.deep.equal([{name: 'feature', value: 'feature'}]);
    });
  });

  ['none', 'feature'].forEach(code => {
    it(`requests a commit message only for a code push: ${code}`, () => {
      const result = getPantheonPush(options);

      result.options.message.should.include({passthrough: true});
      result.options.message.alias.should.deep.equal(['m']);
      result.options.message.interactive.type.should.equal('string');
      expect(result.options.message.interactive.when({code})).to.equal(code !== 'none');
    });
  });
});
