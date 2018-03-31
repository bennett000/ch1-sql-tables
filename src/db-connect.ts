import { Pool } from 'pg';
import { error } from './util';
/**
 * @typedef {{ toJs: function(...), toSql: function(...) }} ColumnValidator
 */

export const dbName = process.env.MM_PG_DB || 'match_maker';

const config = {
  user: process.env.MM_PG_USER || 'match_maker',
  database: dbName,
  password: process.env.MM_PG_PASS || 'this-is-dev',
  host: process.env.MM_PG_HOST || 'localhost',
  port: process.env.MM_PG_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
};

let globalPool: Pool;

export function pool(): Pool {
  if (!globalPool) {
    globalPool = new Pool(config);

    globalPool.on('error', (err: Error) => {
      // if an error is encountered by a client while it sits idle in the pool
      // the pool itself will emit an error event with both the error and
      // the client which emitted the original error
      error('idle client error', err.message);
    });

    // validate tables on init
  }
  return globalPool;
}
