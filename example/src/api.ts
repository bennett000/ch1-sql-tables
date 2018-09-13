import { Request, Response } from 'express';

import { createSelectUsers, createInsertRandomUser } from './db';
import { SqlDb } from '@ch1/sql-tables';

export interface Handler {
  handler(req: Request, res: Response, next?: Function): any;
  method: 'delete' | 'get' | 'patch' | 'post' | 'put';
  route: string;
}

export const api: (sql: SqlDb<any>) => Handler[] =
  (sql: SqlDb<any>) => [
    {
      handler: createGetUsers(sql),
      method: 'get',
      route: '/users',
    },
    {
      handler: createPostRandomUser(sql),
      method: 'get', // for demo convenience not REST
      route: '/new-random-user',
    }
  ];

function createGetUsers(sql: SqlDb<any>) {
  return (req: Request, res: Response) => {
    console.log('getUsers');
    createSelectUsers(sql).then((result) => {
      console.log('getUsers next');
      res.send(result);
    }, (err) => {
      console.log('Error: getUsers:', err);
      res.status(500);
      res.send({ error: 'could not get users' });
    });
  };
}

function createPostRandomUser(sql: SqlDb<any>) {
  return (req: Request, res: Response) => {
    console.log('post random');
    createInsertRandomUser(sql).then(() => {
      console.log('post random next');
      res.sendStatus(200);
    }).catch((err: Error) => {
      console.log('Error: postRandom:', err);
      res.status(500);
      res.send({ error: 'could not post random' });
    });
  };
}
