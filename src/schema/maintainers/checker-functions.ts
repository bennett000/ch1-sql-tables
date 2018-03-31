import { Observable } from 'rxjs';
import 'rxjs/operator/concat';
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
} from '../../util';
import { QueryStream } from '../../table';
import { createColumnName, typeCheckColumn } from './checkers-types';

const tableName = 'table_name';
const mapTableName: (arg: any) => string = <any>partial(pluck, tableName);
const hasTableName: (arg: any) => boolean = <any>partial(hasProp, tableName);

export function listTableNames(
  query: QueryStream<InfoSchemaTable>
): Observable<string> {
  return listTables(query)
    .filter(hasTableName)
    .map(mapTableName)
}

export function fetchTablesAndCheckIfInCode(
  query: QueryStream<InfoSchemaTable>,
  schema: SchemaStrict
): Observable<SchemaValidationContainer[]> {

  return listTableNames(query)
    .map(createCheckForTableInCode(schema))
    .toArray();
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
    };
  };
}

export function fetchColumnsAndCheckIfInCode(
  query: QueryStream<InfoSchemaColumn>,
  schema: SchemaStrict
): Observable<SchemaValidationContainer[]> {

  const filterByTable =
    (col: InfoSchemaColumn) => findCaseInsensitivePropInObj(
      schema, col.table_name
    ) ? true : false

  return listAllColumns(query)
    .filter(filterByTable)
    .map(createInfoSchemaToValidationContainer(schema))
    .toArray() as any;
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
  return arr.reduce((s, svc) => {
    if (svc.error) {
      s.errors.push(svc.error);
    }
    s.names.push(svc.name);
    return s;
  } , { errors: [], names: [] })
}

export function validateColumns(
  query: QueryStream<InfoSchemaColumn>,
  schema: SchemaStrict,
  svc: SchemaValidationCollection
): Observable<SchemaValidation[]> {
  return fetchColumnsAndCheckIfInCode(query, schema)
    .map(flattenSchemaValidationContainers)
    .map((innerSvc: SchemaValidationCollection) => checkForColumnInDb(
        schema, innerSvc.names)
      .concat(innerSvc.errors)
      .concat(svc.errors)
    );
}

export function validateTables(query: QueryStream<any>, schema: SchemaStrict) {
  return fetchTablesAndCheckIfInCode(query, schema)
    .map(flattenSchemaValidationContainers)
    .map((svc: SchemaValidationCollection) => ({
      errors: svc.errors.concat(checkForTableInDb(schema, svc.names)),
      names: svc.names,
    }));
}
