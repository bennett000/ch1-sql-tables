import { create as createSql } from '@ch1/sql-tables';
import { randomName } from './names';
import { schema } from './schema';
import { SqlDb } from '@ch1/sql-tables';

import * as env from './env';

export function create() {
  return createSql<{
    users: {
      id: string, nameFirst: string, nameLast: string, age: string
    },
    posts: {
      id: string, userId: string, post: string
    },
  }>({
    user: env.dbUser,
    database: env.dbName,
    password: env.dbPass,
    host: env.dbHost,
    port: env.dbPort,
  }, schema);
}

export function createSelectUsers(sql: SqlDb<any>) {
  return sql.tables.Users.select();
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
