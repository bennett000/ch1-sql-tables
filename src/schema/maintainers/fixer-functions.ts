import { Observable } from 'rxjs/Observable';
import {
  Schema,
  SchemaItem,
  SchemaRelationComposite,
  SchemaStrict,
  SchemaStruct,
  SchemaStructItem,
  SchemaStructStrict,
  SchemaConstraint,
  SchemaPropStrict,
  SchemaStructProp,
  SchemaType,
} from '../schema';
import {
  hasConstraints,
  hasConstraint,
  isSchemaProp,
  isSchemaStructProp,
  isSchemaStructStrict,
  isSchemaType,
} from '../schema-guards';
import { QueryStream } from '../../table';
import {
  addColumn,
  createTable,
  foreignKey,
  foreignKeyComposite,
  primaryKey,
  setNotNull,
  setNull,
  unique,
  varChar,
} from '../queries/sql';
import {
  automatics,
  ConstraintMapping,
  constraintMappingsByGeneric,
  appOnlyMappings,
  TypeMapping,
  typeMappingsByGeneric,
} from '../type-mappings';
import {
  augmentObjIfNew,
  Dictionary,
  log,
  partial,
  objReduce,
} from '../../util';

const MAX_VAR_CHAR = 255;

export function createColumn(
  query: QueryStream<any>, table: string, column: string, prop: SchemaStructProp
) {
  const columnString = createColumnFromProp(column, prop);

  return query(`${addColumn(table)} ${columnString}`);
}

export function setColumnNullConstraint(
  query: QueryStream<any>, table: string, column: string, prop: SchemaStructProp
) {
  if (hasConstraint('NotNull', prop)) {
    return query(setNotNull(table, column));
  }

  return query(setNull(table, column));
}

export function createAutomaticColumnNameType(name: string, type: SchemaType) {
  if (automatics[type]) {
    return `${name} ${automatics[type]}`;
  }
  log(`Unexpected: createColumnFromItem: Unsupported automatic type ${type}`);
  return '';
}

export function createColumnFromProp(name: string, prop: SchemaStructProp) {
  const type: SchemaType = prop.type;

  if (isAutomatic(prop)) {
    return createAutomaticColumnNameType(name, type)
  }

  if (!typeMappingsByGeneric[type]) {
    log(`Unexpected createColumnFromItem: Unsupported type ${type}`);
    return '';
  }

  const mapping: TypeMapping = <any>typeMappingsByGeneric[type];

  if (mapping.create) {
    return `${name} ${mapping.create} ${createConstraints(prop)} ` +
      `${createReferences(prop)}`;
  }

  let evaluatedType: string = mapping.createA;

  if (type === 'String' && isSchemaStructProp(prop)) {
    evaluatedType = varChar(prop.typeMax || MAX_VAR_CHAR);
  } else {
    log(
      `Unexpected createColumnFromItem: Unsupported argument type ${type}`
    );
    return '';
  }

  return `${name} ${evaluatedType} ${createConstraints(prop)} ` +
    `${createReferences(prop)} ${createDefault(prop)}`;
}

export function createTableFromStruct(
  query: QueryStream<any>, name: string, s: SchemaPropStrict
): Observable<any> {
  return createTable(query, name, objReduce(
    s.struct,
    (state: string[], el: SchemaStructProp, name: string) => {
      const column = createColumnFromProp(name, el).trim();
      if (column) {
        state.push(column);
      }
      return state;
    },
    [])
    .concat(createCompositeConstraints(s))
  );
}

export function createCompositeConstraints(scProp: SchemaPropStrict) {
    return [
      ...createCompositeUnique(scProp),
      ...createCompositeForeignKey(scProp),
      createCompositePrimaryKey(scProp),
    ].filter(Boolean);
}

export function createCompositeUnique(scProp: SchemaPropStrict) {
  if (Array.isArray(scProp.unique) && scProp.unique.length) {
    return scProp.unique.map(unique);
  }
  return [];
}

export function createCompositeForeignKey(scProp: SchemaPropStrict) {
  if (Array.isArray(scProp.foreignKey) && scProp.foreignKey.length) {
    return scProp.foreignKey
      .map((scr: SchemaRelationComposite) => foreignKeyComposite(
      scr.props,
      scr.propsForeign,
      scr.struct,
    ));
  }
  return [];
}

export function createCompositePrimaryKey(scProp: SchemaPropStrict) {
  if (Array.isArray(scProp.primaryKey) && scProp.primaryKey.length) {
    return primaryKey(scProp.primaryKey);
  }
  return '';
}

export function createConstraints(item: SchemaStructProp) {
  if (hasConstraints(item)) {
    return (<any>item).constraints
      .reduce((s: string, c: SchemaConstraint) => {
        if (appOnlyMappings.indexOf(c) !== -1) {
          return s;
        }
        const mapping: ConstraintMapping = constraintMappingsByGeneric[c];

        if (!mapping || (!mapping.create)) {
          log(`Unexpected: createConstraints: Unsupported mapping ${c}`);
          return s;
        }

        return s + mapping.create + ' ';
      }, '');
  }

  return '';
}

export function createReferences(item: SchemaStructProp) {
  if (item.relation) {
    return foreignKey(item.relation.struct, item.relation.prop).trim();
  } else {
    return '';
  }
}

export function createDefault(prop: SchemaStructProp) {
  if (prop.defaultValue) {
    return `DEFAULT ${prop.defaultValue}`;
  } else {
    return '';
  }
}

export function isConstraint(
  constraint: SchemaConstraint, item: SchemaStructProp
): boolean {
  if (hasConstraints(item)) {
    return (<any>item).constraints
      .reduce(
        (s: boolean, c: SchemaConstraint) => c === constraint ? true : s,
        false
      );
  }

  return false;
}

export const isAutomatic =
  partial<(item: SchemaStructProp) => boolean>(isConstraint, 'Automatic');

export interface StructContainer {
  name: string;
  scProp: SchemaPropStrict;
}

export interface CircularDepStore {
  result: StructContainer[];
  checked: Dictionary<boolean>;
  ancestors: string[];
}

export function orderDependencies(schema: SchemaStrict) {
  return objReduce(schema, createCrIterator(schema), {
    result: [],
    checked: {},
    ancestors: [],
  }).result;
}

export type SchemaIterator = (
  state: CircularDepStore, scProp: SchemaPropStrict, key: string
) => CircularDepStore;

export function createCrIterator(schema: SchemaStrict) {
  return function schemaIterator(
    state: CircularDepStore, scProp: SchemaPropStrict, key: string
  ) {
    // skip rows that have already been checked
    if (state.checked[key]) { return state; }
    // stack up lineage to check circular dependencies
    state.ancestors.push(key);
    // mark row as checked
    state.checked[key] = true;

    state = objReduce(
      scProp.struct,
      createStructIterator(schema, schemaIterator, key),
      state);

    // add result, and fix up the stack
    state.result.push({
      name: key,
      scProp,
    });
    state.ancestors.pop();
    // check each requirement too
    return state;
  }
}

export function createStructIterator(
  schema: SchemaStrict, schemaIterator: SchemaIterator, key: string
) {
  return (state: CircularDepStore, item: SchemaStructProp) => {
    // skip items with no relationships
    if (!item.relation) {
      return state;
    }

    const dependsOn = item.relation.struct;

    if (state.ancestors.indexOf(dependsOn) > -1) {
      throw new Error('DB Fixer: circular dependency found: ' + key +
        ' -> ' + dependsOn);
    }
    if (state.checked[dependsOn]) { return state; }
    if (!schema[dependsOn]) {
      throw new ReferenceError('DB Fixer: unable to resolve: ' + dependsOn);
    }

    schemaIterator(state, schema[dependsOn], dependsOn);
    return state;
  };
}

export function strictifySchemaStructItem(
  scItem: SchemaStructItem
): SchemaStructProp {
  if (isSchemaType(scItem)) {
    return {
      type: scItem,
    };
  }
  return scItem;
}

export function strictifySchemaStruct(
  struct: SchemaStruct
): SchemaStructStrict {
  return objReduce(
    struct,
    (s: SchemaStructStrict, e, i) => {
      s[i] = strictifySchemaStructItem(e);
      return s;
    },
    {}
  );
}

export function strictifySchemaItem(scProp: SchemaItem): SchemaPropStrict {
  if (isSchemaProp(scProp)) {
    if (isSchemaStructStrict(scProp.struct)) {
      return <SchemaPropStrict>scProp;
    }
    return <SchemaPropStrict>Object.assign({}, scProp, {
      struct: strictifySchemaStruct(scProp.struct),
    });
  }

  return {
    struct: strictifySchemaStruct(scProp),
  };
}

export function strictify(schema: Schema): SchemaStrict {
  return objReduce(
    schema,
    (s: SchemaStrict, e, i) => {
      s[i] = strictifySchemaItem(e);
      return s;
    },
    {}
  );
}

export function mutateStructIntoSchemaStructs(
  s: SchemaStruct, schema: Schema
): Schema {
  return objReduce(schema,
    (newSchema: Schema, item: SchemaItem) => {
      const struct = (<any>item).struct ? (<any>item).struct : <any>item;
      objReduce(s, augmentObjIfNew, struct);
      return newSchema;
    }, schema);
}

