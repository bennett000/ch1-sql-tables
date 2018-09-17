import { Pool, PoolClient, QueryResult, SqlCrud, TableRow, QueryFn } from './interfaces';
import {
  isString,
  toIntBetweenOptional,
  identity,
} from '@ch1/utility';
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
import {
  sql,
  warn,
} from './util';

export const isValidResult = (result: QueryResult<any>) => (result &&
Array.isArray(result.rows) &&
result.rows.length) ? true : false;

export function query<RowType>(
  queryFn: QueryFn<RowType>, queryString: string, params?: any[]
): Promise<QueryResult<RowType>> {
  if (params) {
    sql(`Run query: ${queryString} with params: ${params}`);
    return queryFn(queryString, params) as Promise<QueryResult<RowType>>;
  }

  sql(`Run query: ${queryString}`);
  return queryFn(queryString) as Promise<QueryResult<RowType>>;
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
  name: string, cols: string[], idProps: string[]
): string {
  const inputs = cols.map((col, i) => `${col} = $${i + 1}`).join(', ');
  
  return `UPDATE ${name} SET ${inputs} WHERE ` + idProps.map((prop, i) => {
    return `${prop} = $${cols.length + i + 1}`;
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

export function selectWhere<RowType>(
  queryFn: QueryFn<RowType>, schema: SchemaStrict, tableName: string, cols: string[], vals: any[]
): Promise<RowType[]> {
  const tableSchema = selectWhereValidator(schema, tableName, cols, vals);
  if (tableSchema instanceof Error) {
    return Promise.reject(tableSchema);
  }

  const validColVals =
    validatePropValsForInput(tableSchema, cols, vals);

  const q = createSelectWhereQuery(tableName, validColVals.cols);

  return query<RowType>(queryFn, q, validColVals.vals).then(pluckRows);
}

export function select<RowType>(
  queryFn: QueryFn<RowType>, schema: SchemaStrict, tableName: string, cols: string[] = []
): Promise<RowType[]> {
  const q = createSelectAllQuery(tableName, cols);

  return query<RowType>(queryFn, q).then(pluckRows);
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
        return new Error('columns and values length must be the same or ' +
            'vals must be a multiple of cols');
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
  queryFn: QueryFn<any>,
  schema: SchemaStrict, 
  tableName: string, 
  colsOrObject: string[] | { [P in keyof T]?: T[P]}, 
  vals: any[] = [],
): Promise<QueryResult<any>> {
  const cnv = colsAndValsFromColsOrObject(colsOrObject, vals);

  if (cnv instanceof Error) {
    return Promise.reject(cnv);
  }

  const struct = getStruct(schema, tableName);

  if (!struct) {
    throw new Error(`insert: table not found ${tableName}`);
  }

  const validColVals = validatePropValsForInput(struct, cnv.cols, cnv.vals);

  const q = createInsertQuery(
    tableName, validColVals.cols, validColVals.vals
  );

  sql('Attempting query', q);

  return query(queryFn, q, validColVals.vals);
}

export function update<T>(
  queryFn: QueryFn<any>,
  schema: SchemaStrict, 
  tableName: string, 
  idProps: string[],
  colsOrObject: string[] | { [P in keyof T]?: T[P]}, 
  vals: any[] = [],
): Promise<QueryResult<any>> {
  const cnv = colsAndValsFromColsOrObject(colsOrObject, vals);

  if (cnv instanceof Error) {
    return Promise.reject(cnv);
  }

  const struct = getStruct(schema, tableName);
  if (!struct) {
    return Promise.reject(new Error(`insert: table not found ${tableName}`));
  }

  const validColVals = validatePropValsForInput(struct, cnv.cols, cnv.vals);

  const idPropMap = validColVals.cols.reduce((ipm, el, i) => {
    if (idProps.indexOf(el) > -1) {
      ipm.indexes.push(i);
    } else {
      ipm.filtered.push(el);
    }
    return ipm;
  }, { indexes: [], filtered: [] });

  const idValueMap = validColVals.vals.reduce((ivm, el, i) => {
    if (idPropMap.indexes.indexOf(i) > -1) {
      ivm.last.push(el);
    } else {
      ivm.first.push(el);
    }
    return ivm;
  }, { first: [], last: [] });

  const q = createUpdateQuery(
    tableName, idPropMap.filtered, idProps,
  );

  sql('Attempting query', q);

  return query(queryFn, q, idValueMap.first.concat(idValueMap.last));
}

export function deleteFrom(
  queryFn: QueryFn<any>,
  schema: SchemaStrict, 
  tableName: string, 
  idProps: string[],
  idValues: Array<number | string>,
): Promise<QueryResult<any>> {
  const struct = getStruct(schema, tableName);
  if (!struct) {
    return Promise.reject(new Error(`insert: table not found ${tableName}`));
  }

  const q = createDeleteQuery(tableName, idProps);

  sql('Attempting query', q);

  return query(queryFn, q, idValues);
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

// export function compoundInsertOrSelectIfExists(
//   schema: SchemaStrict, tableName: string, cols: string[], vals: any[],
//   depObservables: Observable<TableRow[]>[],
//   depCols: string[],
//   ...keyIndexes: number[]
// ) {
//   return Observable
//     .zip(
//       ...depObservables,
//       (...deps: any[]) => deps
//     )
//     .map(createReduceCompoundInsertOrSelectResults(depCols))
//     .flatMap((results) => insertOrSelectIfExistsObservable(
//       schema,
//       tableName,
//       [...cols, ...depCols],
//       [...vals, ...results],
//       ...keyIndexes
//     ));
// }

// export function insertOrSelectIfExistsObservable<T extends TableRow>(
//   schema: SchemaStrict,
//   tableName: string,
//   cols: string[],
//   vals: any[],
//   ...keyIndexes: number[]
// ): Observable<T[]> {
//   const reducedCols = cols.reduce(reduceByKeys(keyIndexes), []);
//   const reducedVals = vals.reduce(reduceByKeys(keyIndexes), []);

//   const swo = selectWhereObservable(
//     schema,
//     tableName,
//     reducedCols,
//     reducedVals
//   );

//   return swo.flatMap((result1: QueryResult<any>) => isValidResult(result1) ?
//     Observable.of(result1.rows) :
//     insert(schema, tableName, cols, vals)
//       .flatMap(() => swo
//         .flatMap((result2: QueryResult<any>) => isValidResult(result2) ?
//           Observable.of(result2.rows) :
//           Observable.throw(new Error('insertOrSelectWhere: unknown fail'))))
//   );
// }

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
  pool: Pool,
  isolationLevel?: string
): Promise<PoolClient> {
  return pool.connect()
    .then((client: PoolClient) => {
      if (isolationLevel) {
        return query(client.query.bind(client), `BEGIN TRANSACTION ISOLATION LEVEL ${isolationLevel};`)
          .then(() => client);
      }
      return query(client.query.bind(client), 'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;')
        .then(() => client);
    });
}

export function transactionEnd(client: PoolClient): Promise<QueryResult<any>> {
  return query(client.query.bind(client), 'END TRANSACTION;')
    .then((result) => {
      client.release();
      return result;
    })
    .catch((err: Error) => {
      client.release();
      throw err;
    });
}

export function transactionRollBack(client: PoolClient, err?: Error): Promise<QueryResult<any>> {
  sql('Transaction Rollback', err ?
    err.message + '\nStack Trace: ' + err.stack :
    undefined);

  return query(client.query.bind(client), 'ROLLBACK;')
    .then((result) => {
      client.release();
      return result;
    }).catch((err: Error) => {
      client.release();
      throw err;
    });
}

export function createCrud<T>(
  queryFn: QueryFn<any>,
  schema: SchemaStrict
): SqlCrud<T> {
  return Object.keys(schema).reduce((
    crud: SqlCrud<T>, el: string
  ) => {
    (crud as any)[el] = {
      insert: insert.bind(null, queryFn, schema, el),
      update: update.bind(null, queryFn, schema, el),
      delete: deleteFrom.bind(null, queryFn, schema, el),
      select: select.bind(null, queryFn, schema, el),
      selectWhere: selectWhere.bind(null, queryFn, schema, el),
    transactionDelete: (
      client: PoolClient,
      idProps: string[], 
      idValues: Array<number | string>
    ) => deleteFrom(client.query.bind(client), schema, el, idProps, idValues),
    transactionInsert: <T>(
      client: PoolClient,
      colsOrObject: string[] | { [P in keyof T]?: T[P] },
      vals?: any[],
    ) => insert<T>(client.query.bind(client), schema, el, colsOrObject, vals),
    transactionUpdate: <T>(
      client: PoolClient,
      idProps: string[],
      colsOrObject: string[] | { [P in keyof T]?: T[P] },
      vals: any[],
    ) => update<T>(client.query.bind(client), schema, el, idProps, colsOrObject, vals),
    transactionSelect: <RowType>(
      client: PoolClient,
      el: string,
      cols?: string[],
    ) => select<RowType>(client.query.bind(client), schema, el, cols),
    transactionSelectWhere: <RowType>(
      client: PoolClient,
      el: string, cols: string[], vals: any[]
    ) => selectWhere<RowType>(client.query.bind(client), schema, el, cols, vals),
    };
    return crud;
  }, {} as SqlCrud<T>);
}

export function pluckRows<T>(result: QueryResult<T>) {
  return result.rows;
}