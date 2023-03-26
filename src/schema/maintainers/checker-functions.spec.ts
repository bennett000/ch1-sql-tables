import { isSchemaStructProp } from '../schema-guards';
import { NotInCode, NotInDb } from '../schema';
import { InfoSchemaColumn } from '../queries/sql';
import {
  checkForColumnInDb,
  checkForTableInDb,
  createCheckForTableInCode,
  createColumnsInDbTableReducer,
  createInfoSchemaToValidationContainer,
  fetchColumnsAndCheckIfInCode,
  fetchTablesAndCheckIfInCode,
  flattenSchemaValidationContainers,
  findColumnInSchema,
  listTableNames,
} from './checker-functions';

describe('checker functions', () => {
  describe('listTableNames function', () => {
    it('should return a promise', () => {
      const tno = listTableNames('my-db', () => new Promise<void>(resolve => resolve()) as any)
        .catch(() => {
          // we expect this to fail
        });
      expect(tno instanceof Promise).toBe(true);
    });

    it('should filter for truthy table_name\'s', () => {
      const testPromise = listTableNames(
        'my-db', 
        () => new Promise(resolve => resolve({
          rows: [
            {}, { table_name: 'test' }, {},
          ],
        } as any)));

      return expect(testPromise).resolves.toEqual(['test'])
    });
  });

  describe('createCheckForTableInCode function', () => {
    it('should return a function', () => {
      expect(typeof createCheckForTableInCode({})).toBe('function');
    });

    it('should return a function that returns an error if a case insensitive ' +
      'prop is not in an object', () => {
      const fn = createCheckForTableInCode({ });
      expect(typeof fn('some-prop').error).toBe('object');
    });

    it('should return a function tha returns a prop name if the case ' +
      'insensitive prop name exists in an object', () => {
      const fn = createCheckForTableInCode((<any>{ 'some-prop': {} }));
      expect(fn('some-prop').error).toBe(undefined);
    });
  });

  describe('fetchTablesAndCheckIfInCode function', () => {
    it('should return an observable', () => {
      const o = fetchTablesAndCheckIfInCode('my-db', () => new Promise<void>(resolve => resolve()) as any, {})
        .catch(() => {
          // we expect this to fail
        });
      expect(o instanceof Promise).toBe(true);
    });
  });

  describe('findColumnsInSchema function', () => {
    it('should return false if a given table is not in a given schema', () => {
      expect(findColumnInSchema({}, 'some-table', 'some-column'))
        .toBe(false);
    });

    it('should return false if a given column is not in a given struct', () => {
      expect(findColumnInSchema({
        'some-table': {
          struct: {},
        },
      }, 'some-table', 'some-column'))
        .toBe(false);
    });

    it('should return a struct prop if a given a valid column', () => {
      expect(isSchemaStructProp(findColumnInSchema({
        'some-table': {
          struct: {
            'some-column':  {
              type: 'String',
            },
          },
        },
      }, 'some-table', 'some-column')))
        .toBe(true);
    });
  });

  describe('createInfoSchemaToValidationContainer function', () => {
    it('should return a function that returns a container with a validation ' +
      'error if a column is not in a schema', () => {
      expect(createInfoSchemaToValidationContainer({})(({
        character_maximum_length: 0,
        column_name: 'some-column',
        data_type: 'varchar',
        is_nullable: 'YES',
        numeric_precision: 0,
        table_name: 'some-table',
      })).error).not.toBe(undefined);
    });

    it('should return a function that returns a container with no validation ' +
      'error if a column is in a schema', () => {
      expect(createInfoSchemaToValidationContainer({
        'some-table': {
          struct: {
            'some-column': {
              type: 'Int32',
              typeMax: 0,
            },
          },
        },
      })({
        character_maximum_length: 0,
        column_name: 'some-column',
        data_type: 'integer',
        is_nullable: 'YES',
        numeric_precision: 0,
        table_name: 'some-table',
      }).error).toBe(undefined);
    });
  });

  describe('flattenSchemaValidationContainers function', () => {
    it('should handle an empty case', () => {
      expect(flattenSchemaValidationContainers([
      ])).toEqual({
        errors: [],
        names: [],
      });
    });

    it('should aggregate two SchemaValidationContainers', () => {
      expect(flattenSchemaValidationContainers([
        {
          error: undefined,
          name: 'thing1',
        },
        {
          error: {
            name: 'thing2',
            type: 'column',
            reason: NotInCode,
          },
          name: 'thing2',
        },
      ])).toEqual({
        errors: [{
          name: 'thing2',
          type: 'column',
          reason: NotInCode,
        }],
        names: ['thing1', 'thing2'],
      });
    });
  });

  describe('checkForTableInDb function', () => {
    it('given a list of tables in the db and a schema produces a validation ' +
      'list of what\'s not in the db (case insensitive)', () => {
      const list = checkForTableInDb({
        someTable: {
          struct: {},
        },
        someOtherTable: {
          struct: {},
        },
      }, ['sometable']);
      expect(list.length).toBe(1);
      expect(list[0].reason).toBe(NotInDb);
    });
  });

  describe('checkForColumnInDb function', () => {
    it('should return an empty array if given a perfect db/code match (case ' +
      'insensitive)', () => {
      const results = checkForColumnInDb({
        'some-table': {
          struct: {
            'some-column': {
              type: 'Int32',
            },
          },
        },
      }, ['some-table.some-column']);

      expect(results.length).toBe(0);
    });
  });

  describe('createColumnsInDbTableReducer function', () => {
    it('should add an error to a list if it\'s not found', () => {
      const result = createColumnsInDbTableReducer(
        [ 'some-table.some-other-column' ], 'some-table'
      )([], null, 'some-column');
      expect(result.length).toBe(1);
      expect(result[0].reason).toBe('not in db');
    });

    it('should *not* add an error to a list if it\'s found', () => {
      const result = createColumnsInDbTableReducer(
        [ 'some-table.some-column' ], 'some-table'
      )([], null, 'some-column');
      expect(result.length).toBe(0);
    });
  });

  describe('fetchColumnsAndCheckIfInCode function', () => {
    it('should return an observable array case insensitively filtered by ' +
      'table_name', (done) => {
        const queryFunction = (q: string) => new Promise<{
          rows: InfoSchemaColumn[],
        }>(resolve => {
          resolve({
            rows: [{
              table_name: 'some-table',
              column_name: 'some-column',
            }] as InfoSchemaColumn[],
          });
        });

      const o = fetchColumnsAndCheckIfInCode('my-db', queryFunction, {
        'SOME-TABLE': {
          struct: {
            'SOME-COLUMN': {
              type: 'String',
            },
          },
        },
      });

      o.then(() => {
        done();
      }).catch(done);
    });
  });
});
