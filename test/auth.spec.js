'use strict';

const chai = require('chai');
const {getAuthOptions} = require('../lib/auth');
chai.should();
const {expect} = chai;

describe('auth', () => {
  describe('#getAuthOptions', () => {
    it('uses the cached identity when both email and token are present', () => {
      const result = getAuthOptions({email: 'me@x.test', token: 'cached'});

      result.should.deep.equal({auth: {default: 'cached', defaultDescription: 'me@x.test'}});
    });

    [{}, {email: 'me@x.test'}, {token: 'cached'}].forEach(meta => {
      it(`offers accounts when the cached identity is incomplete: ${JSON.stringify(meta)}`, () => {
        const tokens = [{email: 'one@x.test', token: 'one'}, {email: 'two@x.test', token: 'two'}];

        const result = getAuthOptions(meta, tokens);

        result.auth.interactive.choices.should.deep.equal([
          {name: 'one@x.test', value: 'one'}, {name: 'two@x.test', value: 'two'},
          {name: 'add or refresh a token', value: 'more'},
        ]);
        expect(result.auth.interactive.when()).to.equal(true);
        expect(result.auth).not.to.have.property('default');
      });
    });

    it('asks directly for a hidden password when no accounts are available', () => {
      const result = getAuthOptions();

      expect(result.auth.interactive.when()).to.equal(false);
      result['machine-token'].should.include({hidden: true});
      result['machine-token'].interactive.should.include({name: 'auth', type: 'password', weight: 101});
      expect(result['machine-token'].interactive.when({})).to.equal(true);
      expect(result['machine-token'].interactive.when({auth: 'provided'})).to.equal(true);
    });

    ['more', 'existing', undefined].forEach(auth => {
      it(`asks for a replacement only when the selected account is more: ${auth}`, () => {
        const result = getAuthOptions({}, [{email: 'me@x.test', token: 'existing'}]);

        expect(result['machine-token'].interactive.when({auth})).to.equal(auth === 'more');
      });
    });
  });
});
