import { Client, Pool, Query, QueryResult } from 'pg';
import { Observable, Observer } from 'rxjs';
import {
  SchemaStrict,
  SchemaStructStrict,
  SchemaStructProp,
  SchemaType,
} from './schema/schema';
import {
  hasDbOnlyConstraints,
  isSchemaType,
} from './schema/schema-guards';
import { toGeneral,  toSql } from './type-converters';
import { pool } from './db-connect';
import {
  isString,
  noop,
  partial,
  sql,
  warn,
  toIntBetweenOptional,
  identity,
} from './util';

export const getClient: () => Observable<Client> =
  <any>partial(getClientFrom, pool);

export const isValidResult = (result: QueryResult) => (result &&
Array.isArray(result.rows) &&
result.rows.length) ? true : false;

export interface QueryObservable {
  (queryString: string, params?: any[]): Observable<QueryResult>;
}

export interface QueryStream<T> {
  (queryString: string, params?: any[]): Observable<T>;
}

export type QueryFunction<T> = QueryObservable | QueryStream<T>;

export interface TableRow {
  id: number;
}

export function getClientFrom(p: () => Pool): Observable<Client> {
  return Observable.create((obs: Observer<Client>) => {
    let cleanup: Function = noop;

    p()
      .connect((err: Error, client: Client, done: Function) => {
        cleanup = done;
        if (err) {
          obs.error(err);
          return;
        }
        obs.next(client);
        obs.complete();
      });

    return () => {
      if (cleanup) { 
        cleanup();
      }
    };
  });
}

export function createPgQuery(
  client: Client, queryString: string, params?: any[]
): Query & Promise<QueryResult> {
  if (params) {
    sql(`Run query: ${queryString} with params: ${params}`);
    return (<any>client).query(queryString, params);
  }

  sql(`Run query: ${queryString}`);
  return (<any>client).query(queryString);
}

/**
 * Internal function to create a query that returns an observable that emits
 * rows one at a time
 */
export function createQueryStream<T>(
  client: Client, queryString: string, params?: any[]
): Observable<T> {
  return Observable.create((obs: Observer<T>) => {
    const qObj: Query = createPgQuery(client, queryString, params);

    qObj.on('error', obs.error.bind(obs));
    qObj.on('row', obs.next.bind(obs));
    qObj.on('end', obs.complete.bind(obs));
  });
}

/**
 * Internal function to create a query that returns its _entire_ result as an
 * observable
 */
export function createQueryObservable(
  client: Client, queryString: string, params?: any[]
): Observable<QueryResult> {
  return Observable.create((obs: Observer<QueryResult>) => {
    const qp: Promise<QueryResult> = createPgQuery(client, queryString, params);

    qp.then((result: QueryResult) => {
      obs.next(result);
      obs.complete();
    }, obs.error.bind(obs));
  });
}

export function queryStream<T>(
  queryString: string, params?: any[]
): Observable<T> {
  return getClient()
    .flatMap((client: Client) => createQueryStream(
      client, queryString, params
    ));
}

export function query(
  queryString: string, params?: any[]
): Observable<QueryResult>  {
  return getClient()
    .flatMap((client: Client) => createQueryObservable(
      client, queryString, params
    ));
}

export function getStruct(
  schema: SchemaStrict, tableName: string
): SchemaStructStrict {
  return Object.assign({}, schema[tableName].struct);
}

export function propSchemaToSql(prop: SchemaStructProp, value: any) {
  let converted: any;
  if (toSql[prop.type]) {
    converted = toSql[prop.type](value);
  }
  if (toGeneral[prop.type]) {
    converted = toGeneral[prop.type](value);
  }
  if (isString(converted)) {
    if (prop.typeMax) {
      return converted.slice(0, prop.typeMax);
    }
    return converted;
  }

  return toIntBetweenOptional(prop.typeMin, prop.typeMax, value);
}

export function propToSql(
  prop: SchemaType | SchemaStructProp, value: any
) {
  if (isSchemaType(prop)) {
    if (toSql[prop]) {
      return toSql[prop](value);
    }
    if (toGeneral[prop]) {
      return toGeneral[prop](value);
    }
    warn(`propToSql: no validator found for type ${prop}`);
    return '';
  }
  return propSchemaToSql(prop, value);
}

export function validatePropValsForInput(
  struct: SchemaStructStrict, cols: string[], vals: any[]
) {
  return cols
    .reduce((state, prop, i) => {
      const item: SchemaStructProp = struct[prop];

      if (item) {
        if (hasDbOnlyConstraints(item)) {
          // don't add it if it's db only
        } else {
          state.cols.push(prop);
          state.vals.push(propToSql(item, vals[i]));
        }
      }

      return state;
    }, {
      cols: [],
      vals: [],
    });
}

export function createSelectWhereQuery(name: string, cols: string[]): string {
  return `SELECT * FROM ${name} WHERE ` + cols
      .map((c, i) => `${c}=$${i + 1}`)
      .join(' AND ');
}

export function createInsertQuery(
  name: string, cols: string[], vals: any[]
): string {
  const colString = cols.join(', ');
  const valString = vals.reduce(makeParamReducer(cols.length), '');
  return `INSERT INTO ${name} (${colString}) VALUES ${valString}`;
}

export function createUpdateQuery(
  name: string, cols: string[], vals: any[], idProps: string[]
): string {
  const inputs = cols.map((col, i) => `${col} = $${i + 1}`).join(', ');
  return `UPDATE ${name} SET ${inputs} WHERE ` + idProps.map((prop, i) => {
    return `${prop} = $${cols.length + i}`;
  }).join(' AND ');
}

export function createDeleteQuery(
  name: string, idProps: string[]
): string {
  return `DELETE FROM ${name} WHERE ` + idProps.map((prop, i) => {
    return `${prop} = $${i}`;
  }).join(' AND ');
}

export function createSelectAllQuery(name: string, cols: string[] = []) {
  if (cols.length) {
    return `SELECT ${cols.map(identity).join(', ')} FROM ${name}`;
  } else {
    return `SELECT * FROM ${name}`;
  }
}

export function selectWhereValidator(
  schema: SchemaStrict, tableName: string, cols: string[], vals: any[]
): Error | SchemaStructStrict {
  if (cols.length !== vals.length) {
    return new Error('where: columns and values must pair up');
  }
  const tableSchema = getStruct(schema, tableName);
  if (!tableSchema) {
    return new Error(`where: table not found ${tableName}`);
  }
  return tableSchema;
}

/**
 * returns an observable that streams result rows
 */
export function selectWhereStream<T>(
  schema: SchemaStrict, tableName: string, cols: string[], vals: any[]
): Observable<T> {
  const tableSchema = selectWhereValidator(schema, tableName, cols, vals);
  if (tableSchema instanceof Error) {
    return Observable.throw(tableSchema);
  }

  const validColVals =
    validatePropValsForInput(tableSchema, cols, vals);

  const q = createSelectWhereQuery(tableName, validColVals.cols);

  return queryStream(q, validColVals.vals);
}

export function selectStream<T>(
  schema: SchemaStrict, tableName: string, cols: string[] = []
): Observable<T> {
  const q = createSelectAllQuery(tableName, cols);

  return queryStream(q);
}

/**
 * returns an observable with the _entire_ result
 */
export function selectWhereObservable(
  schema: SchemaStrict, tableName: string, cols: string[], vals: any[]
): Observable<QueryResult> {
  const tableSchema = selectWhereValidator(schema, tableName, cols, vals);
  if (tableSchema instanceof Error) {
    return Observable.throw(tableSchema);
  }

  const validColVals =
    validatePropValsForInput(tableSchema, cols, vals);

  const q = createSelectWhereQuery(tableName, validColVals.cols);

  return query(q, validColVals.vals);
}

function colsAndValsFromColsOrObject<T>(
  colsOrObject: string[] | { [P in keyof T]?: T[P]}, 
  vals: any[],
) {
  let cols: string[];

  if (Array.isArray(colsOrObject)) {
    cols = colsOrObject;
    if (cols.length !== vals.length) {
      if (vals.length === 0 || (cols.length % vals.length !== 0)) {
        return Observable
          .throw(new Error('columns and values length must be the same or ' +
            'vals must be a multiple of cols'));
      }
    }
  } else {
    cols = Object.keys(colsOrObject);
    vals = cols.map(col => (colsOrObject as any)[col]);
  }
  
  return {
    cols,
    vals,
  };
}

export function insert<T>(
  schema: SchemaStrict, 
  tableName: string, 
  colsOrObject: string[] | { [P in keyof T]?: T[P]}, 
  vals: any[] = [],
): Observable<QueryResult> {
  const cnv = colsAndValsFromColsOrObject(colsOrObject, vals);

  if (cnv instanceof Observable) {
    return cnv;
  }

  const struct = getStruct(schema, tableName);

  if (!struct) {
    return Observable.throw(new Error(`insert: table not found ${tableName}`));
  }

  const validColVals = validatePropValsForInput(struct, cnv.cols, cnv.vals);

  const q = createInsertQuery(
    tableName, validColVals.cols, validColVals.vals
  );

  sql('Attempting query', q);

  return query(q, validColVals.vals);
}

export function update<T>(
  schema: SchemaStrict, 
  tableName: string, 
  idProps: string[],
  idValues: Array<number | string>,
  colsOrObject: string[] | { [P in keyof T]?: T[P]}, 
  vals: any[] = [],
): Observable<QueryResult> {
  const cnv = colsAndValsFromColsOrObject(colsOrObject, vals);

  if (cnv instanceof Observable) {
    return cnv;
  }

  const struct = getStruct(schema, tableName);
  if (!struct) {
    return Observable.throw(new Error(`insert: table not found ${tableName}`));
  }

  const validColVals = validatePropValsForInput(struct, cnv.cols, cnv.vals);

  const q = createUpdateQuery(
    tableName, validColVals.cols, validColVals.vals, idProps,
  );

  sql('Attempting query', q);

  return query(q, validColVals.vals);
}

export function deleteFrom(
  schema: SchemaStrict, 
  tableName: string, 
  idProps: string[],
  idValues: Array<number | string>,
): Observable<QueryResult> {
  const struct = getStruct(schema, tableName);
  if (!struct) {
    return Observable.throw(new Error(`insert: table not found ${tableName}`));
  }

  const q = createDeleteQuery(tableName, idProps);

  sql('Attempting query', q);

  return query(q, idValues);
}

export function reduceByKeys(keys: number[]) {
  return (cols: string[] = [], col: string, i: number): string[] => {
    if (keys.indexOf(i) === -1) {
      return cols;
    }
    cols.push(col);
    return cols;
  };
}

export function hasQueryError(first: number, result: any[], i: number) {
  if (first >= 0) {
    return first;
  }
  if (!result.length) {
    return i;
  }
  return first;
}

export function createReduceCompoundInsertOrSelectResults(depCols: string[]) {
  return (results: TableRow[][]) => {
    const firstError = results.reduce(hasQueryError, -1);

    if (firstError !== -1) {
      throw new Error(
        'compoundInsertOrSelect: failed on dependent query for ' +
        depCols[firstError]
      );
    }
    return results.map(r => r[0].id);
  };
}

export function compoundInsertOrSelectIfExists(
  schema: SchemaStrict, tableName: string, cols: string[], vals: any[],
  depObservables: Observable<TableRow[]>[],
  depCols: string[],
  ...keyIndexes: number[]
) {
  return Observable
    .zip(
      ...depObservables,
      (...deps: any[]) => deps
    )
    .map(createReduceCompoundInsertOrSelectResults(depCols))
    .flatMap((results) => insertOrSelectIfExistsObservable(
      schema,
      tableName,
      [...cols, ...depCols],
      [...vals, ...results],
      ...keyIndexes
    ));
}

export function insertOrSelectIfExistsObservable<T extends TableRow>(
  schema: SchemaStrict,
  tableName: string,
  cols: string[],
  vals: any[],
  ...keyIndexes: number[]
): Observable<T[]> {
  const reducedCols = cols.reduce(reduceByKeys(keyIndexes), []);
  const reducedVals = vals.reduce(reduceByKeys(keyIndexes), []);

  const swo = selectWhereObservable(
    schema,
    tableName,
    reducedCols,
    reducedVals
  );

  return swo.flatMap((result1: QueryResult) => isValidResult(result1) ?
    Observable.of(result1.rows) :
    insert(schema, tableName, cols, vals)
      .flatMap(() => swo
        .flatMap((result2: QueryResult) => isValidResult(result2) ?
          Observable.of(result2.rows) :
          Observable.throw(new Error('insertOrSelectWhere: unknown fail'))))
  );
}

function makeParamReducer(chunkSize?: number) {
  return (vstr: string, v: string, i: number, arr: string[]) => {
    const pos = i + 1;

    if (arr.length === 1) {
      return `($${pos})`;
    }

    if (i === 0) {
      return `($${pos}`;
    } else if (i % chunkSize === 0) {
      return `${vstr}), ($${pos}`;
    } else if (i === arr.length - 1) {
      return `${vstr}, $${pos})`;
    }

    return `${vstr}, $${pos}`;
  };
}

export function transactionStart(
  isolationLevel?: string
): Observable<QueryResult> {
  if (isolationLevel) {
    return query(`BEGIN TRANSACTION ISOLATION LEVEL ${isolationLevel};`);
  }
  return query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;');
}

export function transactionEnd(): Observable<QueryResult> {
  return query('END TRANSACTION;');
}

export function transactionRollBack(err?: Error): Observable<QueryResult> {
  sql('Transaction Rollback', err ?
    err.message + '\nStack Trace: ' + err.stack :
    undefined);
  return query('ROLLBACK;');
}

export type SqlCrud<T> = {
  [P in keyof T]: {
    // insert(thing: T[P]): Observable<QueryResult>;
    insert(thing: { [P1 in keyof T[P]]?: T[P][P1] }): Observable<QueryResult>;
    update(
      idProps: string[], 
      idVals: Array<number | string>, 
      obj: { [P1 in keyof T[P]]?: T[P][P1] }
    ): Observable<QueryResult>;
    delete(
      idProps: string[], idVals: Array<number | string>
    ): Observable<QueryResult>;
    select(): Observable<T[P]>;
    selectWhere(
      idProps: string[], idVals: Array<number | string>
    ): Observable<T[P]>;
  };
};

export function createCrud<T>(schema: SchemaStrict): SqlCrud<T> {
  return Object.keys(schema).reduce((
    crud: SqlCrud<T>, el: string
  ) => {
    (crud as any)[el] = {
      insert: insert.bind(null, schema, el),
      update: update.bind(null, schema, el),
      delete: deleteFrom.bind(null, schema, el),
      select: selectStream.bind(null, schema, el),
      selectWhere: selectWhereStream.bind(null, schema, el),
    };
    return crud;
  }, {} as SqlCrud<T>);
}
