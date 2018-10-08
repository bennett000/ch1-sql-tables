import { SqlConfig, SqlDb } from './interfaces';
import { Pool, PoolClient } from 'pg';
import {
  deleteFrom, insert, select, selectWhere, update, transactionEnd, transactionRollBack, transactionStart, createCrud, psFallback,
} from './table';
import { Schema, strictify } from './schema/schema';
import { validateAndFixDatabase, FixControls } from './schema/maintainers/maintainers';
import { partial } from '@ch1/utility';

export function create<Tables>(
  config: SqlConfig,
  schema: Schema,
  globalPassphrase?: string,
): SqlDb<Tables> {
  const p = new Pool(config);
  const schemaStrict = strictify(schema);

  const onDestroyDict: { [key: string]: (reason?: string) => any} = {};
  const destroy = (reason?: string) => {
    return p.end()
      .then(() => {
        Object.keys(onDestroyDict).forEach((id) => {
          onDestroyDict[id](reason);
          delete onDestroyDict[id];
        });
      });
  };

  const onDestroy = (listener: (reason?: string) => any) => {
    const id = Date.now().toString(32) + Math.floor(Math.random() * 501251).toString(32);
    onDestroyDict[id] = listener;

    return () => {
      delete onDestroyDict[id];
    };
  };

  const query = p.query.bind(p);
  const fallback: (pass?: string) => string = partial(psFallback, globalPassphrase);

  const sql: SqlDb<Tables> = {
    delete: (
      tableName: string, 
      idProps: string[], 
      idValues: Array<number | string>
    ) => deleteFrom(query, schemaStrict, tableName, idProps, idValues),
    destroy,
    insert: <T>(
      tableName: string,
      colsOrObject: string[] | { [P in keyof T]?: T[P] },
      vals: any[] = [],
      passphrase?: string
    ) => insert<T>(query, schemaStrict, tableName, colsOrObject, vals, fallback(passphrase)),
    onDestroy,
    pool: () => p,
    select: <RowType>(
      tableName: string,
      cols: string[] = [],
      passphrase?: string
    ) => select<RowType>(query, schemaStrict, tableName, cols, fallback(passphrase)),
    selectWhere: <RowType>(
      tableName: string, cols: string[], vals: any[], passphrase?: string
    ) => selectWhere<RowType>(query, schemaStrict, tableName, cols, vals, fallback(passphrase)),
    update: <T>(
      tableName: string,
      idProps: string[],
      colsOrObject: string[] | { [P in keyof T]?: T[P] },
      vals: any[] = [],
      passphrase?: string
    ) => update(query, schemaStrict, tableName, idProps, colsOrObject, vals, fallback(passphrase)),
    transactionDelete: (
      client: PoolClient,
      tableName: string, 
      idProps: string[], 
      idValues: Array<number | string>
    ) => deleteFrom(client.query.bind(client), schemaStrict, tableName, idProps, idValues),
    transactionEnd,
    transactionStart,
    transactionInsert: <T>(
      client: PoolClient,
      tableName: string,
      colsOrObject: string[] | { [P in keyof T]?: T[P] },
      vals?: any[],
      passphrase?: string
    ) => insert<T>(client.query.bind(client), schemaStrict, tableName, colsOrObject, vals, fallback(passphrase)),
    transactionUpdate: <T>(
      client: PoolClient,
      tableName: string,
      idProps: string[],
      colsOrObject: string[] | { [P in keyof T]?: T[P] },
      vals: any[],
      passphrase?: string
    ) => update<T>(client.query.bind(client), schemaStrict, tableName, idProps, colsOrObject, vals, fallback(passphrase)),
    transactionRollBack,
    transactionSelect: <RowType>(
      client: PoolClient,
      tableName: string,
      cols?: string[],
      passphrase?: string
    ) => select<RowType>(client.query.bind(client), schemaStrict, tableName, cols, fallback(passphrase)),
    transactionSelectWhere: <RowType>(
      client: PoolClient,
      tableName: string, cols: string[], vals: any[],
      passphrase?: string
    ) => selectWhere<RowType>(client.query.bind(client), schemaStrict, tableName, cols, vals, fallback(passphrase)),
    tables: createCrud(query, schemaStrict, globalPassphrase),
    validateAndFixDatabase: (fixControls: FixControls = {
      additive: true,
      codeToDbNotNull: true,
      codeToDbNull: false,
    }) => validateAndFixDatabase(config.database, query, schemaStrict, fixControls),
  };

  p.on('error', (err: Error) => {
    sql.afterDestroy = sql.destroy('sql-tables: error: ' + err.message);
  });

  return sql;
}
