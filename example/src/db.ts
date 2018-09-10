import { query } from '@ch1/sql-tables';
import { randomName } from './names';


export function selectUsers() {
  return query('SELECT * FROM users');
}

export function insertRandomUser() {
  return query(
    'INSERT INTO users (nameFirst, nameLast, age) VALUES ($1, $2, $3)',
    [
      randomName(),
      randomName(),
      Math.floor(Math.random() * 78),
    ],
);
}
