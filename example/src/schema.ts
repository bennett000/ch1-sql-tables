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
    age: 'UInt16',
  },
  Posts: {
    id: {
      constraints: ['PrimaryKey', 'Automatic'],
      type: 'UInt64',
    },
    userId: {
      relation: { struct: 'Users', prop: 'id' },
      type: 'UInt64',
    },
    post: {
      type: 'String',
      typeMax: 255,
    },
  },
};

/** Validate the json */
export const schema: SchemaStrict = deepFreeze<SchemaStrict>(
  strictify(jsonSchema)
);
