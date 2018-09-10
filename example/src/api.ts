import { Request, Response } from 'express';

import { selectUsers, insertRandomUser } from './db';

export interface Handler {
  handler(req: Request, res: Response, next?: Function): any;
  method: 'delete' | 'get' | 'patch' | 'post' | 'put';
  route: string;
}

export const api: Handler[] = [
  {
    handler: getUsers,
    method: 'get',
    route: '/users',
  },
  {
    handler: postRandomUser,
    method: 'get', // for demo convenience not REST
    route: '/new-random-user',
  }
];

function getUsers(req: Request, res: Response) {
  console.log('getUsers');
  selectUsers().then((result) => { 
    console.log('getUsers next');
    res.send(result);
  }, (err) => {
    console.log('Error: getUsers:', err);
    res.status(500);
    res.send({ error: 'could not get users'});
  });
}

function postRandomUser(req: Request, res: Response) {
    console.log('post random');
  insertRandomUser().then(() => {
    console.log('post random next');
    res.sendStatus(200);
  }).catch((err: Error) => {
    console.log('Error: postRandom:', err);
    res.status(500);
    res.send({ error: 'could not post random'});
  });
}
