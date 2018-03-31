import 'rxjs/operator/concat';
import { objReduce } from '../../util';
import {
  InfoSchemaColumn,
} from '../queries/sql';
import {
  Constraint,
  NotInCode,
  Schema,
  SchemaConstraint,
  SchemaErr,
  SchemaPropStrict,
  SchemaRelation,
  SchemaValidation,
  SchemaStrict,
  SchemaStructProp,
  SchemaType,
  SchemaValidationContainer,
  TypeMismatch,
} from '../schema';
import { typeMappingsByInfoSchema } from '../type-mappings';
import { strictify } from './fixer-functions';


export function compareNullConstraints(
  col: InfoSchemaColumn, constraints: SchemaConstraint[]
): SchemaValidation | null {
  const index = constraints.indexOf('NotNull');

  if (col.is_nullable === 'YES') {
    if (index !== -1) {
      return {
        name: col.column_name,
        type: 'type',
        reason: Constraint,
        extra: 'db: NULL code: NOT NULL',
      }
    }
  } else {
    if (index === -1) {
      return {
        name: col.column_name,
        type: 'type',
        reason: Constraint,
        extra: 'db: NOT NULL code: NULL',
      }
    }
  }

  return null;
}

export function compareTypes(
  type: string, col: InfoSchemaColumn, constraints: SchemaConstraint[] = []
): SchemaValidation | null {
  const mappings = typeMappingsByInfoSchema[col.data_type];
  if (Array.isArray(mappings)) {
    const match = mappings.reduce((state: boolean, el) => {
      if (state) {
        return state;
      }
      if (el.generic === type) {
        return true;
      }
      return false;
    }, false);

    if (!match) {
      return {
        name: col.column_name,
        type: 'type',
        reason: TypeMismatch,
        extra: `db: ${col.data_type} code: ${type}`,
      };
    }

    return compareNullConstraints(col, constraints);
  } else {
    return {
      name: col.column_name,
      type: 'type',
      reason: NotInCode,
    };
  }
}

function createSchemaValidationReducer(schema: SchemaStrict) {
  return (schemaState: SchemaErr, scProp: SchemaPropStrict) => {
    return objReduce<SchemaStructProp, SchemaErr>(
      scProp.struct, createStructValidationReducer(schema), schemaState);
  };
}

export function validateSchemaRelations(schema: Schema): string {
  const sSchema = strictify(schema);
  return objReduce<SchemaPropStrict, SchemaErr>(
    sSchema, createSchemaValidationReducer(sSchema), { count: 0, string: '' }
  ).string;
}

function createStructValidationReducer(schema: SchemaStrict) {
  return (structState: SchemaErr, prop: SchemaStructProp) => {
    if (prop.relation) {
      const relationError = findRelation(schema, prop.relation, prop.type);
      if (relationError) {
        return (<any>Object).assign({}, {
          count: structState.count + 1,
          string: structState.string ? '\n' + relationError : relationError,
        });
      }
    }

    return structState;
  };
}

export function findRelation(
  s: SchemaStrict,
  r: SchemaRelation,
  type: SchemaType
): string {
  if (s[r.struct]) {
    const prop = s[r.struct].struct[r.prop];
    if (prop) {
      if (prop.type === type) {
        return '';
      }
      return `Prop ${r.prop} on ${r.struct} is of type ${prop.type} but ` +
        `relationship specifies ${type}`;
    }
    return `Prop ${r.prop} not found in Structure ${r.struct}`;
  }
  return `Structure "${r.struct}" not found`;
}

export function typeCheckColumn(
  schemaStructProp: SchemaStructProp,
  col: InfoSchemaColumn
): SchemaValidationContainer {
  const diff = compareTypes(
    schemaStructProp.type, col, schemaStructProp.constraints
  );

  if (diff) {
    diff.name = createColumnName(col.table_name, diff.name);
    return {
      error: diff,
      name: createColumnName(col.table_name, col.column_name),
    };
  }

  return {
    error: undefined,
    name: col.table_name + '.' + col.column_name,
  };
}

export function createColumnName(tableName: string, columnName: string) {
  return `${tableName}.${columnName}`;
}

