import {
  createInsertQuery,
  createReduceCompoundInsertOrSelectResults,
  hasQueryError,
  isValidResult,
  reduceByKeys,
  query,
  validatePropValsForInput,
} from './table';

describe('table specs', () => {
  describe('createInsertQuery function', () => {
    it('should handle single values', () => {
      expect(createInsertQuery('users', ['name'], ['jane']))
      .toBe('INSERT INTO users (name) VALUES ($1)');
    });

    it('should handle multiple values', () => {
      expect(createInsertQuery('users', ['name', 'rank'], ['jane', 'major']))
      .toBe('INSERT INTO users (name, rank) VALUES ($1, $2)');
    });
  });

  describe('query function', () => {
    it('should call the query with params if given params', (done) => {
      const params = ['hello', 'world'];
      const qf = (q: string, p: any[]) => {
        expect(p).toEqual(params);
        done();
      };
      expect(query(qf as any, 'hello', params));
    });

    it('should call the query without params if not given params', (done) => {
      const qf = (q: string, p: any[]) => {
        expect(p).toEqual(undefined);
        done();
      };
      expect(query(qf as any, 'hello'));
    });
  });


  describe('createReduceCompoundInsertOrSelectResults function', () => {
    it('should throw if there are any errors', () => {
      expect(() =>
        createReduceCompoundInsertOrSelectResults(['col1', 'col2'])([[], []])
      ).toThrowError();
    });

    it('should return a list of ids if everything is good', () => {
      expect(
        createReduceCompoundInsertOrSelectResults(['col1', 'col2'])(
          [[{id: 1}], [{id: 2}]]
        )
      ).toEqual([1, 2]);
    });
  });

  describe('hasQueryError', () => {
    it('should return state if state is >= 0', () => {
      expect(hasQueryError(0, [], 7)).toEqual(0);
    });

    it('should return index if state is -1 and element has no length', () => {
      expect(hasQueryError(-1, [], 7)).toEqual(7);
    });

    it('should return -1 if state is -1 and element has length', () => {
      expect(hasQueryError(-1, [{}], 7)).toEqual(-1);
    });
  });

  describe('isValidResult function', () => {
    it('should return false if the result object is falsey', () => {
      expect(isValidResult(undefined)).toEqual(false);
    });

    it('should return false if there is no rows object', () => {
      expect(isValidResult(<any>{})).toEqual(false);
    });

    it('should return false if the rows object is not an array', () => {
      expect(isValidResult(<any>{ rows: {} })).toEqual(false);
    });

    it('should return false if the rows object is an empty array', () => {
      expect(isValidResult(<any>{ rows: [] })).toEqual(false);
    });

    it('should return true if the rows object is an array with length', () => {
      expect(isValidResult(<any>{ rows: [{}] })).toEqual(true);
    });
  });

  describe('reduceByKeys function', () => {
    it('if a set of keys contains index return state with that column', () => {
      expect(reduceByKeys([5])([], 'hello', 5)).toEqual(['hello']);
    });

    it('if a set of keys does not contain an index return state', () => {
      expect(reduceByKeys([5])([], 'hello', 3)).toEqual([]);
    });
  });

  describe('validatePropValsForInput function', () => {
    it('should handle an existing case', () => {
      const expected = {
        cols: ['name'],
        vals: ['jane'],
      };
      const result = validatePropValsForInput({
        name: { type: 'String' },
      }, ['name'], ['jane']);

      expect(result).toEqual(expected);
    });

    it('should handle two existing cases', () => {
      const expected = {
        cols: ['name', 'rank'],
        vals: ['jane', 'major'],
      };
      const result = validatePropValsForInput({
        name: { type: 'String' },
        rank: { type: 'String' },
      }, ['name', 'rank'], ['jane', 'major']);

      expect(result).toEqual(expected);
    });

    it('should skip non existing cases', () => {
      const expected = {
        cols: ['name'],
        vals: ['jane'],
      };
      const result = validatePropValsForInput({
        name: { type: 'String' },
      }, ['name', 'rank'], ['jane', 'major']);

      expect(result).toEqual(expected);
    });
  });
});
