import {
  NotInCode,
  NotInDb,
  SchemaStrict,
  SchemaPropStrict,
  SchemaStructProp,
  SchemaValidation,
  SchemaValidationCollection,
  SchemaValidationContainer,
} from '../schema';
import {
  InfoSchemaColumn,
  InfoSchemaTable,
  listAllColumns,
  listTables,
} from '../queries/sql';
import { isSchemaStructItem } from '../schema-guards';
import {
  findCaseInsensitivePropInObj,
  hasProp,
  isBoolean,
  objReduce,
  partial,
  pluck,
} from '@ch1/utility';
import { QueryFn } from '../../interfaces';
import { createColumnName, typeCheckColumn } from './checkers-types';

const tableName = 'table_name';
const mapTableName: (arg: any) => string = <any>partial(pluck, tableName);
const hasTableName: (arg: any) => boolean = <any>partial(hasProp, tableName);

export function listTableNames(
  dbName: string,
  query: QueryFn<InfoSchemaTable>
): Promise<string[]> {
  return listTables(dbName, query)
    .then((tables) => {
      return tables.filter(hasTableName)
        .map(mapTableName);
    });
}

export function fetchTablesAndCheckIfInCode(
  dbName: string,
  query: QueryFn<InfoSchemaTable>,
  schema: SchemaStrict
): Promise<SchemaValidationContainer[]> {

  return listTableNames(dbName, query)
  .then((names: string[]) => {
    return names.map(createCheckForTableInCode(schema));
  });
}

export function findColumnInSchema(
  schema: SchemaStrict, table: string, column: string
): SchemaStructProp | boolean {
  const scProp: SchemaPropStrict | boolean =
    findCaseInsensitivePropInObj<SchemaPropStrict>(schema, table);

  if (isBoolean(scProp)) {
    return scProp;
  }

  return findCaseInsensitivePropInObj<SchemaStructProp>(scProp.struct, column);
}

export function createInfoSchemaToValidationContainer(schema: SchemaStrict) {
  return (col: InfoSchemaColumn) => {
    const c = findColumnInSchema(schema, col.table_name, col.column_name);
    if (isSchemaStructItem(c)) {
      return typeCheckColumn(c, col);
    }
    return {
      error: {
        name: createColumnName(col.table_name, col.column_name),
        reason: NotInCode,
        type: 'column',
      },
      name: createColumnName(col.table_name, col.column_name),
    } as SchemaValidationContainer;
  };
}

export function fetchColumnsAndCheckIfInCode(
  dbName: string,
  query: QueryFn<InfoSchemaColumn>,
  schema: SchemaStrict
): Promise<SchemaValidationContainer[]> {
  const filterByTable =
    (col: InfoSchemaColumn) => findCaseInsensitivePropInObj(
      schema, col.table_name
    ) ? true : false

  return listAllColumns(dbName, query)
    .then((columns) => {
      return columns.filter(filterByTable)
        .map(createInfoSchemaToValidationContainer(schema));
    });
}

export function createCheckForTableInCode(dict: SchemaStrict) {
  const keys = Object.keys(dict).map((k) => k.toLowerCase());
  return (collection: string): SchemaValidationContainer => {
    if (keys.indexOf(collection.toLowerCase()) === -1) {
      return {
        error: {
          type: 'table',
          name: collection,
          reason: NotInCode,
        },
        name: collection,
      };
    }

    const collDict: any = {};
    collDict[collection] = dict[collection];

    return {
      error: undefined,
      name: collection,
    };
  };
}

export function checkForTableInDb(
  dict: SchemaStrict, dbTables: string[]
): SchemaValidation[] {
  const lcTables = dbTables.map(s => s.toLowerCase());
  return objReduce(dict,
    (
      state: SchemaValidation[], schema: SchemaPropStrict, prop: string
    ): SchemaValidation[] => lcTables.indexOf(prop.toLowerCase()) === -1 ?
      state.concat([{
        type: 'table',
        name: prop,
        reason: NotInDb,
      }]) :
      state, []);
}

export function createColumnsInDbTableReducer(lcCols: string[], sName: string) {
  return (
    innerState: SchemaValidation[], colDesc: any, colProp: string
  ) => {
    const needle = createColumnName(sName, colProp).toLowerCase();
    return lcCols.indexOf(needle) === -1 ?
      innerState.concat([{
        type: 'column',
        name: `${sName}.${colProp}`,
        reason: NotInDb,
      }]) :
      innerState
  };
}

export function createColumnsInDbReducer(dbColumns: string[]) {
  const lcCols = dbColumns.map(s => s.toLowerCase());
  return (
    state: SchemaValidation[], scProp: SchemaPropStrict, prop: string
  ): SchemaValidation[] => objReduce(
    scProp.struct, createColumnsInDbTableReducer(lcCols, prop), state
  )
}

export function checkForColumnInDb(
  dict: SchemaStrict, dbColumns: string[]
): SchemaValidation[] {
  return objReduce(dict, createColumnsInDbReducer(dbColumns), []);
}

export function flattenSchemaValidationContainers(
  arr: SchemaValidationContainer[]
): SchemaValidationCollection {
  return arr.reduce((s, svc: SchemaValidationContainer) => {
    if (svc.error !== undefined) {
      s.errors.push(svc.error);
    }
    s.names.push(svc.name);
    return s;
  } , { errors: [], names: [] } as SchemaValidationCollection)
}

export function validateColumns(
  dbName: string,
  query: QueryFn<InfoSchemaColumn>,
  schema: SchemaStrict,
  svc: SchemaValidationCollection
): Promise<SchemaValidation[]> {
  return fetchColumnsAndCheckIfInCode(dbName, query, schema)
    .then((columns) => {
      const flattened = flattenSchemaValidationContainers(columns)

      return checkForColumnInDb(
        schema, flattened.names)
        .concat(flattened.errors)
        .concat(svc.errors)
    });
}

export function validateTables(dbName: string, query: QueryFn<any>, schema: SchemaStrict) {
  return fetchTablesAndCheckIfInCode(dbName, query, schema)
    .then((tables) => {
      const flattened = flattenSchemaValidationContainers(tables);

      return ({
        errors: flattened.errors.concat(checkForTableInDb(schema, flattened.names)),
        names: flattened.names,
      });
    });
}
