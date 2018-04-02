import { queryStream } from 'sql-tables';
import { randomName } from './names';


export function selectUsers() {
  return queryStream('SELECT * FROM users');
}

export function insertRandomUser() {
  return queryStream(
    'INSERT INTO users (nameFirst, nameLast, age) VALUES ($1, $2, $3)',
    [
      randomName(),
      randomName(),
      Math.floor(Math.random() * 78),
    ],
);
}
