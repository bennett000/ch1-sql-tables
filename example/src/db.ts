import { create as createSql } from '@ch1/sql-tables';
import { randomName } from './names';
import { schema } from './schema';
import { SqlDb } from '@ch1/sql-tables';

export const schemaName = 'sql-tables-example';

export function create() {
  return createSql({
    user: schemaName,
    database: schemaName,
    password: 'this-is-dev',
    host: 'postgres',
    port: 5432,
  }, schema);
}

export function createSelectUsers(sql: SqlDb<any>) {
  return sql.pool().query('SELECT * FROM Users');
}

export function createInsertRandomUser(sql: SqlDb<any>) {
  return sql.pool().query(
    'INSERT INTO users (nameFirst, nameLast, age) VALUES ($1, $2, $3)',
    [
      randomName(),
      randomName(),
      Math.floor(Math.random() * 78),
    ],
);
}
