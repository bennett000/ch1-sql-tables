import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import {
  queryStream,
  Observable,
  SchemaValidation,
  validateAndFixDatabase,
} from 'sql-tables';
import { initServer } from './server';
import { schema } from './schema';

initialize().subscribe(() => {}, (err: Error) => {
  console.log('Fatal error initializing database: ', err);
  process.exit(1);
});

export function initialize(): Observable<void> {
  return validateAndFixDatabase(queryStream, schema)
    .map((sv: SchemaValidation[]) => sv.length ?
        console.log('Schema validation issues:', sv) :
        console.log('Schema validation okay.', sv)
    )
    .do(initServer);
}
