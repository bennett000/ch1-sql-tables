SQL Tables
==========

[![CircleCI](https://circleci.com/gh/bennett000/ch1-sql-tables.svg?style=svg)](https://circleci.com/gh/bennett000/ch1-sql-tables)


_This is not well maintained_

_Due to string concatenation in a few spots this library may have injection 
sql vulnerabilities_

## Installation

`yarn add @ch1/sql-tables`

## Dependencies

* The excellent [node-postgress (pg)](https://node-postgres.com/ "Node Postgres Library") library to talk to a Postgres database
* Chalk to add colour to the output
* `require-from-string`, exclusively for the TypScript type generator

## Description

SQL Tables is a thin data access layer and schema generator for Postgres (and potentially other SQLs) that can generate TypeScript type definitions.

The library exists to provide a convenient way of accessing common database
functionality:

* Schema to describe databases in great detail
* Can create a db on a server
* Can do basic migrations when schema updates
* Provides some convenient accessor methods for common queries
* Uses pools under the hood

## Usage


```ts
import { create } from '@ch1/sql-tables';

const sql = create(databaseConfig, databaseSchema);

sql.validateAndFixDatabase()
  .then(() => {
    // we should have a new database setup at the server
    // specified in `databseConfig`
    // this gives us accessors like:

    return sql.tables.users.select(['index', 'name']);
  });
```



## Schema

SQL Tables makes use of a type description format that _can be_ light weight
and easy to write, or can be verbose and descriptive.  

The format is JSON and it will allow us to describe a great deal of SQL
features as well as how to map those features to JS.

### Simple Schema Example

```ts
{
  users: {
    index: {
      // auto increment primary key
      constraints: ['Automatic', 'PrimaryKey'],
      type: 'UInt16',
    },
    name: 'String',
    age: 'Uint8',
  },
  comments: {
    index: {
      // auto increment primary key
      constraints: ['Automatic', 'PrimaryKey'],
      type: 'UInt16',
    },
    userIndex: {
      relation: [{
        struct: 'users',
        prop: 'index',
      }],
      type: 'UInt16',
    },
    comment: 'String',
  },
}
```

This would setup two tables, a users table with an auto incrementing
index and a comments table with an auto incrementing index and a foreign
key pointing to the user index.

### Schema Spec

`Schema` itself is just a `Dictionary<SchemaItem>`

```ts
export type Schema = Dictionary<SchemaItem>;
```

`SchemaItems` are either `SchemaStruct`s ("the struct(ure) of the schema" 
a database description)
or `SchemaProp`s ("schema property" or a meta table description)

```ts
export type SchemaItem = SchemaProp | SchemaStruct;
```

The `SchemaProp` interface, it's typically not needed unless
you need composite key support.

```ts
export interface SchemaProp {

  // holds the information about table props/columns
  struct: SchemaStruct;

  // optionally describe COMPOSITE unique key constraints
  unique?: string[][];               

  // optionally describe COMPOSITE primary keys here
  primaryKey?: string[];              
  
  
  // optionall describe COMPOSITE foreign keys here
  foreignKey?: SchemaRelationComposite[]; 
}
```

Instead of `SchemaProp`s you'll mostly be using `SchemaStruct`s
which are dictionaries of `SchemaStructItem`s

```ts
export type SchemaStruct = Dictionary<SchemaStructItem>;
```

`SchemaStructItem`s are either `SchemaStructProp`s or
`SchemaType`s

```ts
export type SchemaStructItem = SchemaStructProp | SchemaType;
```

`SchemaStructProp`s describe properties/columns in a table 

```ts
export interface SchemaStructProp {
  // list of constraints on the table
  constraints?: SchemaConstraint[];

  // default value to use (raw pg query will ignore this)
  defaultValue?: any;

  // describe a foreign key relationship
  relation?: SchemaRelation;

  // the actual type of the column
  type: SchemaType;

  // max constraint (numeric only)
  typeMax?: number;

  // min constraint (numeric only)
  typeMin?: number;
}
```

The current supported schema types are listed below.  These
values can also be used in place of `SchemaStructProp`s

```ts
export type SchemaType = SchemaNonNumeric | SchemaNumeric;

export type SchemaNumeric =
  'Decimal' |
  'Int8' |
  'Int16' |
  'Int32' |
  'Int64' |
  'UInt8' |
  'UInt16' |
  'UInt32' |
  'UInt64' |
  'TimestampMs' |
  'TimestampS';

export type SchemaNonNumeric =
  'Boolean' |
  'Date' |
  'Ipv4' |
  'String';
```

There are also a set of constraints:

```ts
export type SchemaConstraint =
  // automatic (primary key typically)
  'Automatic' | 

  // not supported yet
  'Check' |

  // only let the DB modify this value
  // raw pg _query ignores this_ but other functions
  // will respect it
  'DbModifyOnly' |

  // mark this field as internal to the db
  // raw pg _query ignores this_ but other functions
  // will respect it
  'DbInternal' |

  // enables app layer encryption
  // see app layer encryption docs below 
  'EncryptAppLayer' |

  // to implement
  'EncryptDbLayer' |

  // enforce not null
  'NotNull' |

  // mark as primary key
  'PrimaryKey' |

  // mark as a unique key
  'Unique';
```

Relationships can be described with the following objects:

```ts
export interface SchemaRelation {
  // name of the column this foreign key relates to
  prop: string;

  // name of the table this foreign key relates to
  struct: string;
}
```

### Generating TypeScript Types

If you've installed `@ch1/sql-tables` in your project you should be able to
use our CLI tool.  From your project route:

`./node_modules/.bin/sql-tables /path/to/input-schema.ts /path/to/output.ts`

This will generate TypeScript types from `input-schema.ts` and put them in `output.ts`

_The tool assumes you've exported your schema using the name schema_

```ts
export const schema = { /* schema */ };
```

Optionally you can specify your own prop

`./node_modules/.bin/sql-tables.js /path/to/input-schema.ts /path/to/output.ts myProp`

```ts
export const myProp = { /* schema */ };
```

_If you're using the script in your `package.json`'s `scripts` section you 
do not need the `./node_modules/.bin` prefix_

##### Known Limitations

* If your `schema.ts` has relative imports this tool _might not work_. We
_do_ expose the functions that translate a schema to TypeScript `writeTsFromSchema(fullPath: string, schema: SchemaStrict)` and its
companion `strictify(schema: Schema): SchemaStrict`.

* Will _not_ make new directories

## API

### `create`

The `create` function takes a `SqlConfig` and a `Schema`, and returns an `SqlDb` object

```ts
export function create<Tables>(
  // sql server credentials
  config: SqlConfig,

  // schema in "simple" (or strict)
  schema: Schema,
): SqlDb<Tables> {
```

The `SqlDb` object is the "workhorse" of the library

```ts
// the `Tables` generic can be generated from your `Schema`
// `Tables` describes the return values of the convenience
// subfunctions `SqlDb.tables`
export interface SqlDb<Tables> {

  // if the afterDestroy promise is present it resolves when destroy
  // is complete.  Only used for fatal connection errors
  afterDestroy?: Promise<any>;

  // run a delete query
  // props are an array of columns
  // idValues are an array of number|string
  // props.length must === idValues.length
  //
  // DELETE FROM tableName WHERE idProps[0] = idValues[0]...
  //
  // multiple values will be use `AND` logic
  delete(
    tableName: string,
    idProps: string[],
    idValues: Array<number | string>,
  ): Promise<any>;

  // destroy the connection to the database
  // attempts to be graceful
  // sets the `SqlDb.afterDestroy` promise
  destroy(reason?: string): Promise<any>;

  // run an insert query
  // colsOrObject is either a string[] or
  // colsOrObject is a dictionary with column names as keys and values
  // vals is optional and used if colsOrObject is a string[]
  insert<T>(
      tableName: string,
      colsOrObject: string[] | { [P in keyof T]?: T[P] },
      vals?: any[],
      passphrase?: string,
  ): Promise<any>;

  // in the event of a catastrophic error this object emits a 
  // destroy notification with any given reason
  onDestroy(listener: (reason?: string) => any): () => void;

  // if you need access to the underlying database driver
  // use `pool().connect()`, currently will return a pg `PoolClient`
  // where pg is the node postgres library
  pool(): Pool;

  // select from a table
  // optionally select only given columns
  select<RowType>(
    tableName: string,
    cols?: string[],
    passphrase?: string,
  ): Promise<RowType[]>;

  // select things _where_ some condition is true
  // `cols.length` must ==== `vals.length` where cols
  // are the columns to select and `vals` are the values to use
  // uses an `AND` in the event of multiple column/values pairs
  selectWhere<RowType>(
    tableName: string, cols: string[], vals: any[],
    passphrase?: string,
  ): Promise<RowType[]>;


  // update query
  // idProps are the prop(s) to use as the primary key(s)
  // more docs...
  update<T>(
    tableName: string,
    idProps: string[],
    colsOrObject: string[] | { [P in keyof T]?: T[P] },
    vals?: any[],
    passphrase?: string,
  ): Promise<any>;

  // calls a delete query (see `SqlDb.delete`)
  // client is a `PoolClient` from `SqlDb.transactionStart`
  transactionDelete(
    client: PoolClient,
    tableName: string,
    idProps: string[],
    idValues: Array<number | string>
  ): Promise<any>;

  // this will commit the transaction in progress
  // this will also `release` the `client` rendering it
  // useless for future requests
  transactionEnd(client: PoolClient): Promise<any>;

  // this starts a transaction and promises to return a `PoolClient`
  // this `PoolClient` must eventually be given to `transactionEnd` *or*
  // this `PoolClient` must eventually be given to `transactionRollBack`
  //
  // use the `PoolClient` with methods starting with `transaction` to
  // include them in the current transaction.
  transactionStart(pool: Pool): Promise<PoolClient>;

  // calls a insert query (see `SqlDb.insert`)
  // client is a `PoolClient` from `SqlDb.transactionStart`
  transactionInsert<T>(
    client: PoolClient,
    tableName: string,
    colsOrObject: string[] | { [P in keyof T]?: T[P] },
    vals?: any[],
    passphrase?: string,
  ): Promise<any>;

  // calls a update query (see `SqlDb.update`)
  // client is a `PoolClient` from `SqlDb.transactionStart`
  transactionUpdate<T>(
    client: PoolClient,
    tableName: string,
    idProps: string[],
    colsOrObject: string[] | { [P in keyof T]?: T[P] },
    vals: any[],
    passphrase?: string,
  ): Promise<any>;

  // this will rollback the transaction in progress
  // this will also `release` the `client` rendering it
  // useless for future requests
  transactionRollBack(client: PoolClient): Promise<any>;

  // calls a select select (see `SqlDb.select`)
  // client is a `PoolClient` from `SqlDb.transactionStart`
  transactionSelect<RowType>(
    client: PoolClient,
    tableName: string,
    cols?: string[],
    passphrase?: string,
  ): Promise<RowType[]>;

  // calls a selectWhere selectWhere (see `SqlDb.selectWhere`)
  // client is a `PoolClient` from `SqlDb.transactionStart`
  transactionSelectWhere<RowType>(
    client: PoolClient,
    tableName: string, cols: string[], vals: any[],
    passphrase?: string,
  ): Promise<RowType[]>;

  // tables is an `SqlCrud`, in short it is a dictionary where the keys
  // are table names and the values are methods
  // the methods on each table are insert, update, delete, select, 
  // selectWhere, and their transaction prefixed variants
  //
  // these convenience methods don't require table names to be specified
  tables: SqlCrud<Tables>;

  // checks the database connection and returns mismatches between
  // the database schema and the described schema
  // the function can implement fixes
  //
  // additive fixes are pretty easy
  // mutative fixes not so much
  validateAndFixDatabase(
    fixControls: FixControls = {
      // if additive is true the script will add new tables/columns
      additive: true,

      // if codeToDbNotNull is true the script will update not null
      // instructions from the code's schema to the db's schema
      codeToDbNotNull: true,

      // if codeToDbNull is true the script will update nullable
      // instructions from the code's schema to the db's schema
      codeToDbNull: false,
    },
  ): Promise<SchemaValidation[]>;
}

```

### `SqlConfig`

The `SqlConfig` object is fairly self explanatory and is currently
modeled on the configuration for the `pg` library.  `max` refers to 
the maximum number of clients in the pool

```ts
export interface SqlConfig {
  user: string,
  database: string,
  password: string,
  host: string,
  port: number,
  max: number,
  idleTimeoutMillis: number,
  connectionTimeoutMillis: number,
};
```

### `SchemaValidation`

The `SchemaValidation` object tries to specify what the delta is between
the database and the given `Schema`

```ts
export interface SchemaValidation {
  // the type of thing the validation error stumbled on
  type: 'table' | 'column' | 'type';

  // the name of the thing
  name: string;

  // the reasons why things went wrong
  reason: 'not in db' | 'not in code' | 'type mismatch' | 'constraint';

  // possibly more debug info
  extra?: 'src: NULL code: NOT NULL' | 'src: NOT NULL code: NULL' | string;
}
```

### `strictify`

The `strictify` function takes a `Schema` as an input and returns a `SchemaStrict`, it's mostly internal, but it's useful if you're using
the `writeTsFromSchema` function:

```ts
export function strictify(schema: Schema): SchemaStrict;
```

### `writeTsFromSchema`

The `writeTsFromSchema` function takes a path and a `SchemaStrict` and
writes out typescript types to the specified path; the `fullPath` argument
should contain the filename and extension.

```ts
export function writeTsFromSchema(fullPath: string, schema: SchemaStrict): Promise<void>;
```

## Application Layer Encryption

One of the constraint options is `EncryptAppLayer`.  This feature enables
encryption in the application layer.  The Database is ignorant of the 
encryption and should expect a String 255.

The default encryption algo is Blowfish.

Passphrasing can be implemented in any combination of the following ways:

* global passphrases as a fallback
* passphrases provided on select/insert/update calls
* selects with no passphrase (encrypted column results)

Example 1:


```ts
// This is a "global encryption" example
import { create } from '@ch1/sql-tables';

const schema = {
  Users: {
    data: {
      constraints: ['EncryptApplayer'],
      type: 'String',
      typeMax: 255,
    },
  },
};

const sql = create(databaseConfig, schema, 'secret passphrase');

sql.tables.Users.insert({ data: 'foo' });

// { data: 'encrypted(foo)' } is now saved in Users, encryption use
// the passphrase "secret passphrase"
```

Example 2:


```ts
// This is a "local encryption" example
import { create } from '@ch1/sql-tables';

const schema = {
  Users: {
    data: {
      constraints: ['EncryptApplayer'],
      type: 'String',
      typeMax: 255,
    },
  },
};

const sql = create(databaseConfig, schema, 'secret passphrase');

sql.tables.Users.insert({ data: 'foo' }, 'override passphrase');

// { data: 'encrypted(foo)' } is now saved in Users, encryption use
// the passphrase "override passphrase"
```

Example 3:


```ts
// This is an encrypted select example
import { create } from '@ch1/sql-tables';

const schema = {
  Users: {
    data: {
      constraints: ['EncryptApplayer'],
      type: 'String',
      typeMax: 255,
    },
  },
};

const sql = create(databaseConfig, schema, 'secret passphrase');

sql.tables.Users.insert({ data: 'foo' }, 'override passphrase')
  .then(() => {
    return sql.tables.Users.select(undefined, '');
  })
  .then((rows) => {
    // rows are selected but contents of encrypted rows stay encrypted
  });

```

Example 4:


```ts
// This is an decrypted select FAILURE example
import { create } from '@ch1/sql-tables';

const schema = {
  Users: {
    data: {
      constraints: ['EncryptApplayer'],
      type: 'String',
      typeMax: 255,
    },
  },
};

const sql = create(databaseConfig, schema, 'secret passphrase');

sql.tables.Users.insert({ data: 'foo' }, 'override passphrase')
  .then(() => {
    return sql.tables.Users.select();
  })
  .then((rows) => {
    // query actually fails, select tries to decrypt with "secret passphrase" 
  });

```

Example 5:


```ts
// This is an decrypted select example
import { create } from '@ch1/sql-tables';

const schema = {
  Users: {
    data: {
      constraints: ['EncryptApplayer'],
      type: 'String',
      typeMax: 255,
    },
  },
};

const sql = create(databaseConfig, schema, 'secret passphrase');

sql.tables.Users.insert({ data: 'foo' }, 'override passphrase')
  .then(() => {
    return sql.tables.Users.select(undefined, 'override passphrase');
  })
  .then((rows) => {
    // columns are decrypted using 'override passphrase'
  });

```



## License

[LGPL](./LICENSE 'Lesser GNU Public License')
