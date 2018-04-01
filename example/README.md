SQL Tables Example App
=======================

- `yarn install` or `npm install`
- `yarn start` or `npm start`
- `docker-compose up`

These instructions assume a docker based approach. This example can be tweaked to work on a local machine, the postgres configurations 
are in `docker/postgres`, there's not a whole lot to it.

The server code does not care about docker, it's just looking for the following environment variables

- SQLT_API_PORT=8282
- SQLT_PG_USER=sql-tables-example
- SQLT_PG_DB=sql-tables-example
- SQLT_PG_PASS=this-is-dev
- SQLT_PG_HOST=postgres 
- SQLT_PG_PORT=5432
