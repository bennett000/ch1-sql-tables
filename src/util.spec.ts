import {
  toSqlBoolean, toJsBoolean,
} from './util'

describe('utility functions', () => {
  const t = 'TRUE';
  const f = 'FALSE';
  describe('toSqlBoolean', () => {
    it('returns true if given a truthy value', () => {
      expect(toSqlBoolean({} as any)).toBe(t);
    });

    it('returns false if given a falsey value', () => {
      expect(toSqlBoolean(null as any)).toBe(f);
    });

    it('is recommended to use actual booleans', () => {
      expect(toSqlBoolean(true)).toBe(t);
      expect(toSqlBoolean(false)).toBe(f);
    });
  });

  describe('toJsBoolean', () => {
    it('defaults to false', () => {
      expect(toJsBoolean('foo')).toBe(false);
    });

    it ('converts TRUE to true', () => {
      expect(toJsBoolean('TRUE')).toBe(true);
    });
  });
});
