import {
  query,
  SchemaValidation,
  validateAndFixDatabase,
} from '@ch1/sql-tables';
import { initServer } from './server';
import { schema } from './schema';
import { api } from './api';

const init = validateAndFixDatabase(query, schema)
  .then((sv: SchemaValidation[]) => sv.length ?
    console.log('Schema validation issues:', sv) :
    console.log('Schema validation okay.', sv)
  )
  .then(() => initServer(api));

initialize();

function initialize() {
  init.then(() => { }, (err: Error) => {
    if (err.message.indexOf('the database system is starting up') >= 0) {
      console.log('Database is still booting, retrying in three seconds');
      setTimeout(initialize, 3000);
      return;
    }
    console.log('Fatal error initializing database: ', err);
    process.exit(1);
  });
}
