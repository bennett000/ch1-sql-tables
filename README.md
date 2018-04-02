SQL Tables
==========

_This library is not maintained... yet_


SQL Tables is a thin data access layer and schema generator for Postgres (and potentially other SQLs) that leverages RxJS streams and can generate TypeScript type definitions.

## Quick Start

First define a schema, schemas can be JSON or JS:

```ts
import {
  deepFreeze,
  strictify,
  Schema,
  SchemaStrict,
} from 'sql-tables';

/** This could easily be JSON */
const jsonSchema: Schema = {
  Users: {
    id: {
      constraints: ['PrimaryKey', 'Automatic'],
      type: 'UInt64',
    },
    nameFirst: 'String',
    nameLast: 'String',
    age: 'Number',
  },
};

/** Validate the json */
const schema: SchemaStrict = deepFreeze<SchemaStrict>(
  strictify(jsonSchema)
);

/** export the schema for use */
export default schema;
```



## License

[LGPLv3](./LICENSE "Lesser GNU Public License")