import { Pool } from 'pg';
import { error } from './util';
/**
 * @typedef {{ toJs: function(...), toSql: function(...) }} ColumnValidator
 */

export const dbName = process.env.SQLT_PG_DB || 'default_database';

/** @todo propagate this through from 0 */
const config = {
  user: process.env.SQLT_PG_USER || 'default_database_user',
  database: dbName,
  password: process.env.SQLT_PG_PASS || 'this-is-dev',
  host: process.env.SQLT_PG_HOST || 'localhost',
  port: process.env.SQLT_PG_PORT || 5432,
  max: 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
