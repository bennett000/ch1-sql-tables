import {
  createInsertQuery,
  createReduceCompoundInsertOrSelectResults,
  hasQueryError,
  insert,
  isValidResult,
  reduceByKeys,
  query,
  validatePropValsForInput,
  select,
} from './table';
import { SchemaStrict, strictify } from './schema/schema';
import { QueryFn } from './interfaces';

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
      expect(isValidResult(undefined as any)).toEqual(false);
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
    const passphrase = 'password';
    it('should handle an existing case', () => {
      const expected = {
        cols: ['name'],
        vals: ['jane'],
      };
      const result = validatePropValsForInput({
        name: { type: 'String' },
      }, ['name'], ['jane'], passphrase);

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
      }, ['name', 'rank'], ['jane', 'major'], passphrase);

      expect(result).toEqual(expected);
    });

    it('should skip non existing cases', () => {
      const expected = {
        cols: ['name'],
        vals: ['jane'],
      };
      const result = validatePropValsForInput({
        name: { type: 'String' },
      }, ['name', 'rank'], ['jane', 'major'], passphrase);

      expect(result).toEqual(expected);
    });
  });

  describe('integration tests', () => {
    let schema: SchemaStrict;
    let queryFn: QueryFn<any>;
    let lastQuery: string;
    let lastValues: any[];
    let queryResults: any[];

    beforeEach(() => {
      queryResults = [];
      queryFn = (query: string, values = []) => {
        lastQuery = query;
        lastValues = values;
        return Promise.resolve({ rows: queryResults });
      };
      schema = strictify({
        Users: {
          nameFirst: 'String',
        },
        Data: {
          notSecret: 'String',
          secret: {
            constraints: [ 'EncryptAppLayer' ],
            type: 'String',
            typeMax: 255
          },
        }
      });
    });

    describe('insert', () => {
      it('calls the expected query', () => {
        return insert(queryFn, schema, 'Users', {
          nameFirst: 'Jo',
        }, undefined, 'foo')
          .then(() => {
            expect(lastQuery).toBe('INSERT INTO Users (nameFirst) VALUES ($1)');
            expect(lastValues[0]).toBe('Jo');
          })
      });

      it('encrypts table level calls', () => {
        return insert(queryFn, schema, 'Data', {
          notSecret: 'Clear Text',
          secret: 'Top Secret!!',
        }, undefined, 'foo')
          .then(() => {
            expect(lastValues[0]).toBe('Clear Text');
            expect(lastValues[1]).toBe('41384812395461a9623b8602ac624794');
          })
      });
    });

    describe('select', () => {
      it('decrypts the table calls if password is provided', () => {
        queryResults = [
          { notSecret: 'Hi there', secret: '41384812395461a9623b8602ac624794' },
          { notSecret: 'Word', secret: '41384812395461a9623b8602ac624794' },
        ];
        return select(queryFn, schema, 'Data', undefined, 'foo')
          .then((rows) => {
            expect(rows[0].notSecret).toBe('Hi there');
            expect(rows[1].notSecret).toBe('Word');
            expect(rows[0].secret).toBe('Top Secret!!');
            expect(rows[1].secret).toBe('Top Secret!!');
          });
      }); 

      it('returns encrypted results if password is an empty string ("")', () => {
        queryResults = [
          { notSecret: 'Hi there', secret: '41384812395461a9623b8602ac624794' },
          { notSecret: 'Word', secret: '41384812395461a9623b8602ac624794' },
        ];
        return select(queryFn, schema, 'Data', undefined, undefined)
          .then((rows) => {
            expect(rows[0].notSecret).toBe('Hi there');
            expect(rows[1].notSecret).toBe('Word');
            expect(rows[0].secret).toBe('41384812395461a9623b8602ac624794');
            expect(rows[1].secret).toBe('41384812395461a9623b8602ac624794');
          });
      }); 
    });
  });
});
