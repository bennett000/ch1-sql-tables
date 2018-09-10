import {
  PoolClient,
} from 'pg';
import {
  createInsertQuery,
  createPgQuery,
  createQueryPromise,
  createReduceCompoundInsertOrSelectResults,
  getClientFrom,
  hasQueryError,
  isValidResult,
  reduceByKeys,
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

  describe('createPgQuery function', () => {
    it('should call the query with params if given params', (done) => {
      const params = ['hello', 'world'];
      const qf = (q: string, p: any[]) => {
        expect(p).toEqual(params);
        done();
      };
      expect(createPgQuery(<PoolClient>{ query: qf }, 'hello', params));
    });

    it('should call the query without params if not given params', (done) => {
      const qf = (q: string, p: any[]) => {
        expect(p).toEqual(undefined);
        done();
      };
      expect(createPgQuery(<PoolClient>{ query: qf }, 'hello'));
    });
  });


  describe('createQueryObservable function', () => {
    let client: PoolClient;
    let resolve: Function;
    let reject: Function;

    beforeEach(() => {
      client = <PoolClient>(<any>{
        query: () => (new Promise((p, f) => { resolve = p; reject = f; })),
      });
    });

    it('should return a rejecting promise if client\'s query rejects',
      (done) => {
        createQueryPromise(client, 'hello', [])
          .then(() => expect('this case should not happen').toEqual(undefined))
          .catch((err: Error) => {
            expect(err instanceof Error).toEqual(true);
            done();
          });
        reject(new Error('fail case'));
      });

    it('should trigger a promise if client\'s query resolves',
      () => {
        const expectedThing = { test: 'hello' };
        setTimeout(() => resolve(expectedThing), 0);
        return createQueryPromise(client, 'hello', [])
          .then((thing: any) => {
            expect(thing).toEqual(expectedThing);
          })
          .catch((err: Error) => {
            expect(err).toEqual(undefined);
          });
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

  describe('getClientFrom function', () => {
    let pool: () => any;
    let result: any;

    beforeEach(() => {
      pool = () => ({
        connect: () => {
          return new Promise((resolve, reject) => {
            if (result instanceof Error) {
              reject(result);
            } else {
              resolve(result);
            }
          });
        },
      });
    });

    it('should error if the callback gets an error', (done) => {
      result = new Error('test passed!');
      getClientFrom(pool)
        .then(() => {
          expect('this case should not happen').toEqual(undefined);
        })
        .catch((err: any) => {
          expect(err instanceof Error).toEqual(true);
          done();
        });
    });

    it('should emit a client if everything is good', (done) => {
      const expectedThing = { type: 'client technically' };
      result = expectedThing;
      getClientFrom(pool)
        .then((thing: any) => {
          expect(thing).toEqual(expectedThing);
          done();
        })
        .catch((err) => {
          expect('this case should not happen').toEqual(undefined);
          done();
        });
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
