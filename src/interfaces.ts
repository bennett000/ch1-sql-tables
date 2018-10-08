import { Pool, PoolClient } from 'pg';
import { FixControls } from './schema/maintainers/maintainers';
import { SchemaValidation } from './schema/schema';
export { Pool, PoolClient } from 'pg';

export type CipherAlgorithms = 'aes256' | 'blowfish';
export interface QueryFn<RowType> {
  (query: string, params?: any[]): Promise<QueryResult<RowType>>;
}
export interface SqlConfig {
  user: string,
  database: string,
  password: string,
  host: string,
  port?: number,
  max?: number,
  idleTimeoutMillis?: number,
  connectionTimeoutMillis?: number,
};
export interface SqlDb<Tables> {
  afterDestroy?: Promise<any>;
  delete(
    tableName: string,
    idProps: string[],
    idValues: Array<number | string>,
  ): Promise<any>;
  destroy(reason?: string): Promise<any>;
  insert<T>(
      tableName: string,
      colsOrObject: string[] | { [P in keyof T]?: T[P] },
      vals?: any[],
      passphrase?: string,
  ): Promise<any>;
  onDestroy(listener: (reason?: string) => any): () => void;
  pool(): Pool;
  select<RowType>(
    tableName: string,
    cols?: string[],
    passphrase?: string,
  ): Promise<RowType[]>;
  selectWhere<RowType>(
    tableName: string, cols: string[], vals: any[],
    passphrase?: string,
  ): Promise<RowType[]>;
  update<T>(
    tableName: string,
    idProps: string[],
    colsOrObject: string[] | { [P in keyof T]?: T[P] },
    vals?: any[],
    passphrase?: string,
  ): Promise<any>;
  transactionDelete(
    client: PoolClient,
    tableName: string,
    idProps: string[],
    idValues: Array<number | string>
  ): Promise<any>;
  transactionEnd(client: PoolClient): Promise<any>;
  transactionStart(pool: Pool): Promise<PoolClient>;
  transactionInsert<T>(
    client: PoolClient,
    tableName: string,
    colsOrObject: string[] | { [P in keyof T]?: T[P] },
    vals?: any[],
    passphrase?: string,
  ): Promise<any>;
  transactionUpdate<T>(
    client: PoolClient,
    tableName: string,
    idProps: string[],
    colsOrObject: string[] | { [P in keyof T]?: T[P] },
    vals?: any[],
    passphrase?: string,
  ): Promise<any>;
  transactionRollBack(client: PoolClient): Promise<any>;
  transactionSelect<RowType>(
    client: PoolClient,
    tableName: string,
    cols?: string[],
    passphrase?: string,
  ): Promise<RowType[]>;
  transactionSelectWhere<RowType>(
    client: PoolClient,
    tableName: string, cols: string[], vals: any[],
    passphrase?: string,
  ): Promise<RowType[]>;
  tables: SqlCrud<Tables>;
  validateAndFixDatabase(fixControls?: FixControls): Promise<SchemaValidation[]>;
}
export interface QueryResult<RowType> {
  rows: RowType[];
}

export interface TableRow {
  id: number;
}

export type SqlCrud<Tables> = {
  [Table in keyof Tables]: {
    insert(
      thing: { [Prop in keyof Tables[Table]]?: Tables[Table][Prop] },
      passphrase?: string,
    ): Promise<QueryResult<any>>;
    update(
      idProps: string[], 
      obj: { [Prop in keyof Tables[Table]]?: Tables[Table][Prop] },
      vals?: any[],
      passphrase?: string,
    ): Promise<QueryResult<any>>;
    delete(
      idProps: string[], idVals: Array<number | string>
    ): Promise<QueryResult<any>>;
    select(
      cols?: string[],
      passphrase?: string,
    ): Promise<Tables[Table][]>;
    selectWhere(
      idProps: string[], idVals: Array<number | string>,
      passphrase?: string,
    ): Promise<Tables[Table][]>;
    transactionInsert(
      client: PoolClient,
      thing: { [Prop in keyof Tables[Table]]?: Tables[Table][Prop] },
      passphrase?: string,
    ): Promise<QueryResult<any>>;
    transactionUpdate(
      client: PoolClient,
      idProps: string[], 
      obj: { [Prop in keyof Tables[Table]]?: Tables[Table][Prop] },
      vals?: any[],
      passphrase?: string,
    ): Promise<QueryResult<any>>;
    transactionDelete(
      client: PoolClient,
      idProps: string[], idVals: Array<number | string>,
      passphrase?: string,
    ): Promise<QueryResult<any>>;
    transactionSelect(
      client: PoolClient,
      tableName: string,
      cols?: string[],
      passphrase?: string,
    ): Promise<Tables[Table][]>;
    transactionSelectWhere(
      client: PoolClient,
      idProps: string[], idVals: Array<number | string>,
      passphrase?: string,
    ): Promise<Tables[Table][]>;
  };
};
