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
    nameFirst: {
      type: 'String',
      typeMax: 255,
    },
    nameLast: {
      type: 'String',
      typeMax: 255,
    },
    age: 'UInt8',
  },
};

/** Validate the json */
export const schema: SchemaStrict = deepFreeze<SchemaStrict>(
  strictify(jsonSchema)
);
