import { expect } from 'chai';
import {
  deepFreeze,
  isObject,
  partial,
} from './util'

describe('utility functions', () => {
  describe('deepFreeze function', () => {
    it('should return an identity if given a non-object', () => {
      expect(deepFreeze(null)).to.equal(null);
      expect(deepFreeze('hello')).to.equal('hello');
      expect(deepFreeze(7)).to.equal(7);
    });

    it('should freeze properties on an object', () => {
      const frozen = deepFreeze({
        a: 5,
        b: 'hello',
      });

      expect(() => (<any>frozen).a = 23).to.throw(Error);
      expect(() => (<any>frozen).b = 23).to.throw(Error);
    });

    it('should freeze object properties on an object', () => {
      const frozen = deepFreeze({
        a: 5,
        b: 'hello',
        c: {
          d: 'test',
        }
      });

      expect(() => (<any>frozen).c.d = 23).to.throw(Error);
    });

    it('should freeze nested arrays', () => {
      const frozen = deepFreeze([[1]]);

      expect(() => (<any>frozen)[0][0] = 5).to.throw(Error);
      expect(() => (<any>frozen)[0].push(5)).to.throw(Error);
    });

    it('should skip frozen sub-objects', () => {
      const frozen = deepFreeze({test: Object.freeze({nest: {val: 1}})});
      expect(() => (<any>frozen).test.nest.val = 5).not.to.throw(Error);
    });

  });

  describe('isObject function', () => {
    it('should return false if given nothing', () => {
      expect(isObject(undefined)).to.equal(false);
    });

    it('should return false if given null', () => {
      expect(isObject(null)).to.equal(false);
    });

    it('should return false if given a primitive', () => {
      expect(isObject(5)).to.equal(false);
    });

    it('should return true if given an Array', () => {
      expect(isObject([])).to.equal(true);
    });

    it('should return true if given an Object', () => {
      expect(isObject({})).to.equal(true);
    });
  });

  describe('partial function', () => {
    function addThreeArgs(a: number, b: number, c: number): number {
      return a + b * c;
    }

    it('should work for a simple single argument', () => {
      expect(partial<(b: number, c: number) => number>(addThreeArgs, 3)(2, 3))
        .to.equal(9);
    });

    it('should work for two arguments', () => {
      expect(partial<(c: number) => number>(addThreeArgs, 3, 2)(3)).to.equal(9);
    });

    it('should work for three arguments', () => {
      expect(partial<() => number>(addThreeArgs, 3, 2, 3)()).to.equal(9);
    });
  });
});
