import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import {
  queryStream,
  SchemaValidation,
  validateAndFixDatabase,
} from 'sql-tables';
import { initServer } from './server';
import { schema } from './schema';
import { api } from './api';

const init = validateAndFixDatabase(queryStream, schema)
  .map((sv: SchemaValidation[]) => sv.length ?
    console.log('Schema validation issues:', sv) :
    console.log('Schema validation okay.', sv)
  )
  .do(() => initServer(api));

initialize();

function initialize() {
  init.subscribe(() => { }, (err: Error) => {
    if (err.message.indexOf('the database system is starting up') >= 0) {
      console.log('Database is still booting, retrying in three seconds');
      setTimeout(initialize, 3000);
      return;
    }
    console.log('Fatal error initializing database: ', err);
    process.exit(1);
  });
}
