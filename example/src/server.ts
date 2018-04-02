import * as express from 'express';
import { Request, Response } from 'express';
import { Handler } from './api';

const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const RateLimit = require('express-rate-limit');


export function initServer(api: Handler[]) {
  const app = express();
  const port = process.env.SQLT_API_PORT || 8282;

  const corsOptions = {
    methods: 'POST,GET',
    // some legacy browsers (IE11, various SmartTVs) choke on 204
    optionsSuccessStatus: 200,
    origin: '*',
  };


  const limiter = new RateLimit({
    delayAfter: 10,             // after the first ten reqs delay
    delayMs: 1500,              // throttle by 500ms
    max: 15 * 60,               // limit max requests to 1/second
    keyGenerator: (req: Request) => req.ip, // sub-optimal :(
    windowMs: 15 * 60 * 1000,   // memory duration
  });

  app.disable('x-powered-by');
  app.enable('trust proxy');

//  apply to all requests
  app.use(limiter);

  app.use(bodyParser.json());
  app.use(cors(corsOptions));
  app.use(helmet());

  app.get('/favicon.ico', (req: Request, res: Response) => res.sendStatus(200));
  app.get('/status', (req: Request, res: Response) => {
    res.send('Alive');
  });

  api.forEach((h: Handler) => {
    app[h.method](h.route, h.handler);
  });

  app.get('*', (req: Request, res: Response) => {
    res.sendStatus(403);
  });

  app.listen(port, () => console.log(`API Listening on ${port}`));
}
