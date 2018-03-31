import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import {
  Schema,
  SchemaProp,
  SchemaPropStrict,
  SchemaStrict,
  SchemaStruct,
  SchemaStructStrict,
} from '../schema';
import { noop } from '../../util';
import {
  CircularDepStore,
  createCrIterator,
  createReferences,
  createStructIterator,
  createTableFromStruct,
  isConstraint,
  mutateStructIntoSchemaStructs,
  strictifySchemaItem,
} from './fixer-functions';

describe('Maintainer Fixer functions', () => {
  describe('mutateStructIntoSchmaStructs function', () => {
    it('shoud mutate new keys into the existing dictionary', () => {
      const dict = {
        tableA: {},
        tableB: {},
      };
      const template: SchemaStruct = {
        id: 'UInt64',
        dateCreated: 'String',
      };
      mutateStructIntoSchemaStructs(template, dict);
      expect((<any>dict.tableA).id).toBe('UInt64');
      expect((<any>dict.tableA).dateCreated).toBe('String');
      expect((<any>dict.tableB).id).toBe('UInt64');
      expect((<any>dict.tableB).dateCreated).toBe('String');
    });

    it('shoud preserve existing keys', () => {
      const dict: Schema = {
        tableA: { id: 'String' },
        tableB: {},
      };
      const template: SchemaStruct = {
        id: 'UInt64',
        dateCreated: 'String',
      };
      mutateStructIntoSchemaStructs(template, dict);
      expect((<any>dict).tableA.id).toBe('String');
      expect((<any>dict).tableB.id).toBe('UInt64');
    });
  });

  describe('strictifySchemaItem function', () => {
    it('should return a schemaPropStrict if given a SchemaStructStrict', () => {
      const struct: SchemaStructStrict = {
        columnA: {
          type: 'UInt64',
        },
      };
      expect(strictifySchemaItem(struct))
        .toEqual({ struct });
    });

    it('should return a schemaPropStrict if given a SchemaStruct', () => {
      const struct: SchemaStruct = {
        columnA: 'UInt64',
      };
      const structStrict: SchemaStructStrict = {
        columnA: {
          type: 'UInt64',
        },
      };
      expect(strictifySchemaItem(struct))
        .toEqual({ struct: structStrict });
    });

    it('should return a schemaPropStrict if given a SchemaPropStrict', () => {
      const scProp: SchemaPropStrict = {
        struct: {
          columnA: {
            type: 'UInt64',
          },
        },
      };
      expect(strictifySchemaItem(scProp))
        .toEqual({ struct: scProp.struct });
    });

    it('should return a schemaPropStrict if given a SchemaProp', () => {
      const scProp: SchemaProp = {
        struct: { columnA: 'UInt64' },
      };
      const structStrict: SchemaStructStrict = {
        columnA: {
          type: 'UInt64',
        },
      };
      expect(strictifySchemaItem(scProp))
        .toEqual({ struct: structStrict });
    });
  });

  describe('createStructIterator function', () => {
    it('if there is no relation the iterator should return state', () => {
      const state: CircularDepStore = {
        result: [],
        checked: {},
        ancestors: [],
      };

      expect(createStructIterator(
        {}, <any>noop, 'key')(state, { type: 'String' })
      ).toEqual(state);
    });

    it('if there is a dependent ancestor throw', () => {
      const state: CircularDepStore = {
        result: [],
        checked: {},
        ancestors: ['thing'],
      };

      expect(() => createStructIterator(
        {}, <any>noop, 'key')(state, {
          relation: { prop: 'any', struct: 'thing' },
          type: 'String',
        })
      ).toThrowError();
    });

    it('if the item has been checked return state', () => {
      const state: CircularDepStore = {
        result: [],
        checked: { thing: true },
        ancestors: [],
      };

      expect(createStructIterator(
        {}, <any>noop, 'key')(state, {
          relation: { prop: 'any', struct: 'thing' },
          type: 'String',
        })
      ).toEqual(state);
    });

    it('if the relation in question is not in the schema, throw', () => {
      const state: CircularDepStore = {
        result: [],
        checked: {},
        ancestors: [],
      };

      expect(() => createStructIterator(
        {}, <any>noop, 'key')(state, {
          relation: { prop: 'any', struct: 'thing' },
          type: 'String',
        })
      ).toThrowError();
    });

    it('if the item is not an ancestor and is not checked and exists in the ' +
      'schema run the iterator', (done) => {
      const state: CircularDepStore = {
        result: [],
        checked: {},
        ancestors: [],
      };

      createStructIterator(
        (<SchemaStrict>{ thing: { struct: {}} }),
        (s: CircularDepStore, scProp) => {
          expect(scProp).toEqual({ struct: {}});
          done();
          return s;
        }, 'key')(state, {
          relation: { prop: 'any', struct: 'thing' },
          type: 'String',
        });
    });

    it('if the item is not an ancestor and is not checked and exists in the ' +
      'schema return state', () => {
      const state: CircularDepStore = {
        result: [],
        checked: {},
        ancestors: [],
      };

      expect(createStructIterator(
        (<SchemaStrict>{ thing: { struct: {}} }),
        <any>noop, 'key')(state, {
          relation: { prop: 'any', struct: 'thing' },
          type: 'String',
        })
      ).toEqual(state);
    });
  });

  describe('createCrIterator function', () => {
    it('should return state if it\'s already checked', () => {
      const state: CircularDepStore = {
        result: [],
        checked: { thing: true },
        ancestors: [],
      };

      expect(createCrIterator({})(state, {
        struct: {},
      }, 'thing'))
        .toEqual(state);
    });

    it('should mark state and add items to the result if they pass', () => {
      const startState: CircularDepStore = {
        result: [],
        checked: {},
        ancestors: [],
      };

      const expectedState: CircularDepStore = {
        result: [{
          name: 'thing',
          scProp: { struct: {}},
        }],
        checked: { thing: true },
        ancestors: [],
      };

      expect(createCrIterator({
        thing: { struct: {} },
      })(startState, {
        struct: {},
      }, 'thing'))
        .toEqual(expectedState);
    });
  });

  describe('isConstraint function', () => {
    it('return false if there are no constraints', () => {
      expect(isConstraint('NotNull', { type: 'String' })).toBe(false);
    });
    
    it('return true if the constraint exists', () => {
      expect(isConstraint('NotNull', {
        type: 'String',
        constraints: ['Automatic', 'NotNull'],
      }))
        .toBe(true);
    });
  });

  describe('createReferences function', () => {
    it('should return an empty string on no relation', () => {
      expect(createReferences({ type: 'UInt64' })).toBe('');
    });

    it('should return a reference string if there are references', () => {
      expect(createReferences({
        type: 'UInt64',
        relation: { prop: 'some-prop', struct: 'some-struct' },
      })).not.toBe('');
    });
  });

  describe('createTableFromStruct', () => {
    it('should create an empty table', (done) => {
      createTableFromStruct(
        (query: string) => {
          expect(query).toBe('CREATE TABLE thing ();');
          return Observable.create((o: Observer<any>) => {
            o.next(undefined);
            o.complete();
          });
        },
        'thing',
        (<SchemaPropStrict>{ struct: {} }),
      ).subscribe(() => done());
    });

    it('should create a simple table', (done) => {
      createTableFromStruct(
        (query: string) => {
          expect(query).toBe(
            'CREATE TABLE thing (columnA varchar(255), columnB varchar(255));'
          );
          return Observable.create((o: Observer<any>) => {
            o.next(undefined);
            o.complete();
          });
        },
        'thing',
        (<SchemaPropStrict>{
          struct: {
            columnA: { type: 'String' },
            columnB: { type: 'String' },
          } }),
      ).subscribe(() => done());
    });

    it('should create a table with a primary key and foreign keys', (done) => {
      createTableFromStruct(
        (query: string) => {
          expect(query).toBe(
            'CREATE TABLE thing (columnA varchar(255) NOT NULL, ' +
            'columnB varchar(255) PRIMARY KEY, ' +
            'columnC integer  REFERENCES b (a), ' +
            'columnD timestamp default current_timestamp);'
          );
          return Observable.create((o: Observer<any>) => {
            o.next(undefined);
            o.complete();
          });
        },
        'thing',
        (<SchemaPropStrict>{
          struct: {
            columnA: { type: 'String', constraints: [ 'NotNull' ] },
            columnB: { type: 'String', constraints: [ 'PrimaryKey' ] },
            columnC: { type: 'UInt32', relation: { prop: 'a', struct: 'b' } },
            columnD: { type: 'TimestampS', constraints: [ 'Automatic' ] },
          } }),
      ).subscribe(() => done());
    });

    it('should create a table with composite keys', (done) => {
      createTableFromStruct(
        (query: string) => {
          expect(query).toBe(
            'CREATE TABLE thing (columnA varchar(255), ' +
            'columnB varchar(255), ' +
            'columnC integer, ' +
            'columnD smallint, ' +
            'UNIQUE(columnC, columnD), ' +
            'PRIMARY KEY(columnA, columnB)' +
            ');'
          );
          return Observable.create((o: Observer<any>) => {
            o.next(undefined);
            o.complete();
          });
        },
        'thing',
        (<SchemaPropStrict>{
          struct: {
            columnA: { type: 'String' },
            columnB: { type: 'String' },
            columnC: { type: 'UInt32' },
            columnD: { type: 'UInt16' },
          },
          primaryKey: ['columnA', 'columnB'],
          unique: [ ['columnC', 'columnD' ] ],
        }),
      ).subscribe(() => done());
    });

    it('should create a table with composite foreign keys', (done) => {
      createTableFromStruct(
        (query: string) => {
          expect(query).toBe(
            'CREATE TABLE thing (columnA varchar(255), ' +
            'columnB varchar(255), ' +
            'columnC integer, ' +
            'columnD smallint, ' +
            'FOREIGN KEY (columnA, columnB) REFERENCES other-thing (fA, fB)' +
            ');'
          );
          return Observable.create((o: Observer<any>) => {
            o.next(undefined);
            o.complete();
          });
        },
        'thing',
        (<SchemaPropStrict>{
          struct: {
            columnA: { type: 'String' },
            columnB: { type: 'String' },
            columnC: { type: 'UInt32' },
            columnD: { type: 'UInt16' },
          },
          foreignKey: [ {
            props: ['columnA', 'columnB'],
            propsForeign: ['fA', 'fB'],
            struct: 'other-thing',
          } ],
        }),
      ).subscribe(() => done());
    });
  });
});
