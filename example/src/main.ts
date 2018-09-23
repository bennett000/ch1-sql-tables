import { SchemaValidation } from '@ch1/sql-tables';
import { initServer } from './server';
import { api } from './api';
import { create as createDb } from './db';

let retryCount = 0;
const retryMax = 3;
const delay = 3000;
const sql = createDb();

initialize();

function initialize() {
  return sql.validateAndFixDatabase()
    .then((sv: SchemaValidation[]) => sv.length ?
      console.log('Schema validation issues:', sv) :
      console.log('Schema validation okay.', sv)
    )
    .then(() => initServer(api(sql)))
    .catch((err: Error) => {
      if (err.message.indexOf('the database system is starting up') >= 0) {
        console.log('Database is still booting, retrying in three seconds');
        setTimeout(initialize, delay);
        return;
      }
      if (retryCount < retryMax) {
        retryCount += 1;
        console.log('Database connection encountered error, retrying...');
        setTimeout(initialize, delay);
        return;
      }
      console.log('Fatal error initializing database: ', err);
      process.exit(1);
    });
}

process.on('unhandledRejection', (err) => {
  console.log('Fatal: missed rejection', err);
  process.exit(-1);
});