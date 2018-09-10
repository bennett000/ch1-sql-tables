import {
  SchemaPropStrict,
  SchemaStrict,
  SchemaStructProp,
  SchemaValidation,
  SchemaValidationCollection,
} from '../schema';
import { validateColumns, validateTables } from './checker-functions'
import {
  createColumn,
  createTableFromStruct,
  orderDependencies,
  setColumnNullConstraint,
  StructContainer,
} from './fixer-functions';
import { QueryPromise, QueryResult } from '../../interfaces';
import { findCaseInsensitivePropInObj, log, objReduce } from '../../util';

export { mutateStructIntoSchemaStructs } from './fixer-functions';

export function validateDatabase(
  query: QueryPromise<any>,
  schema: SchemaStrict,
): Promise<SchemaValidation[]> {
  return validateTables(query, schema)
    .then((svc: SchemaValidationCollection) => {
      return validateColumns(query, filterSchemaByTableValidations(schema, svc), svc);
    });
}

export function filterSchemaByTableValidations(
  schema: SchemaStrict,
  svc: SchemaValidationCollection
): SchemaStrict {
  return objReduce(
    schema,
    (state: SchemaStrict, el: SchemaPropStrict, prop: string) => {
      if (svc.names.indexOf(prop.toLowerCase()) === -1) {
        state[prop] = el;
      }
      return state;
    },
    {});
}

export interface ValidationFixContainer {
  fixes: Promise<any>[];
  validations: SchemaValidation[];
}

export function orderedSchemaFromValidations(
  schema: SchemaStrict, validations: SchemaValidation[]
): StructContainer[] {
  const validationList: string[] = validations
    .map(mapValidationTableNotInDb)
    .filter(Boolean);

  return orderDependencies(schema)
    .filter((s: StructContainer) => validationList
      .indexOf(s.name) === -1 ? false : true);
}

export interface FixControls {
  additive?: boolean,
  codeToDbNotNull?: boolean;
  codeToDbNull?: boolean;
}

export type createValidationMapper = (
  query: QueryPromise<any>, schema: SchemaStrict
) => (arg: SchemaValidation) => Promise<any>;

export function generateFixes(
  query: QueryPromise<any>,
  schema: SchemaStrict,
  validations: SchemaValidation[],
  filterValidations: (arg: any) => Boolean,
  createValidationMapper: createValidationMapper,
): ValidationFixContainer {
  const fixes: Promise<any>[] = validations
    .filter(filterValidations)
    .map(createValidationMapper(query, schema));

  const balance: SchemaValidation[] = validations
    .filter((m) => !filterValidations(m));

  return {
    fixes,
    validations: balance,
  };
}

export function nullFixMapper(query: QueryPromise<any>, schema: SchemaStrict) {
  return  (sv: SchemaValidation): Promise<QueryResult<any>> => {
    const [table, column] = sv.name.split('.');
    /**
     * This is a touch optimistic, but given validations are produced from the
     * schema their props should exist
     */
    const scProp: SchemaPropStrict =
      (<any>findCaseInsensitivePropInObj(schema, table));
    const prop: SchemaStructProp =
      (<any>findCaseInsensitivePropInObj(scProp.struct, column));

    return setColumnNullConstraint(query, table, column, prop);
  };
}

export function columnAddMapper(query: QueryPromise<any>, schema: SchemaStrict) {
  return (sv: SchemaValidation): Promise<QueryResult<any>> => {
    const [table, column] = sv.name.split('.');
    /**
     * This is a touch optimistic, but given validations are produced from the
     * schema their props should exist
     */
    try {
      const scProp: SchemaPropStrict =
        (<any>findCaseInsensitivePropInObj(schema, table));
      const prop: SchemaStructProp =
        (<any>findCaseInsensitivePropInObj(scProp.struct, column));

      return createColumn(query, table, column, prop);
    } catch (err) {
      log(`columnAddMapper: Known possible error path: ${sv.name}`, sv);
      throw err;
    }

  };
}

export function createNotNullFilter(fixControls: FixControls) {
  return (sv: SchemaValidation): boolean => {
    if (fixControls.codeToDbNotNull && fixControls.codeToDbNull) {
      return sv.type === 'type' && sv.reason === 'constraint' &&
        (sv.extra === 'db: NULL code: NOT NULL' ||
        sv.extra === 'db: NOT NULL code: NULL')
    }

    if (fixControls.codeToDbNotNull) {
      return sv.type === 'type' && sv.reason === 'constraint' &&
        sv.extra === 'db: NOT NULL code: NULL';
    }
    if (fixControls.codeToDbNull) {
      return sv.type === 'type' && sv.reason === 'constraint' &&
        sv.extra === 'db: NULL code: NOT NULL';
    }

    return false;
  }
}

export function addNotNull(
  query: QueryPromise<any>,
  schema: SchemaStrict,
  validations: SchemaValidation[],
  fixControls: FixControls,
): ValidationFixContainer {
   const nullFilter = createNotNullFilter(fixControls);
   return generateFixes(query, schema, validations, nullFilter, nullFixMapper);
}

export function addColumns(
  query: QueryPromise<any>, schema: SchemaStrict, validations: SchemaValidation[]
): ValidationFixContainer {
  return generateFixes(query, schema, validations, (m) => m
    .type === 'column' && m.reason === 'not in db', columnAddMapper);
}

export const mapValidationTableNotInDb = (sv: SchemaValidation) => sv
  .type === 'table' && sv.reason === 'not in db' ? sv.name : '';

/**
 * @todo refactor to match addColumn/notNull, interesting due to sort
 * constraints, in theory though we'll need sort constraints on columns :/
 */
export function addTables(
  query: QueryPromise<any>, schema: SchemaStrict, validations: SchemaValidation[]
): ValidationFixContainer {
  const tables: string[] = validations
    .map(mapValidationTableNotInDb)
    .filter(Boolean);

  const columns: SchemaValidation[] = validations
    .filter((m) => {
      if (m.type === 'table') {
        return null;
      }

      // filter for missing columns on added tables
      const tIndex = tables.indexOf(m.name.split('.')[0]);
      if (tIndex === -1) {
        return m;
      }
      return null;
    })
    .filter(Boolean);

  const orderedSchemaFixes =
    orderedSchemaFromValidations(schema, validations);

  return {
    fixes: orderedSchemaFixes
      .map((osf: StructContainer) => createTableFromStruct(
        query, osf.name, osf.scProp)
      ),
    validations: columns,
  }
}

export function fixValidations(
  query: QueryPromise<any>,
  schema: SchemaStrict,
  fixControls: FixControls,
): (validations: SchemaValidation[]) => ValidationFixContainer {
  return (validations: SchemaValidation[]) => {
    if (fixControls.additive) {
      const tableResult = addTables(query, schema, validations);
      const columnResult = addColumns(query, schema, tableResult.validations);
      const notNulResults = addNotNull(
        query, schema, columnResult.validations, fixControls);

      return {
        fixes: [
          ...tableResult.fixes,
          ...columnResult.fixes,
          ...notNulResults.fixes,
        ],
        validations: notNulResults.validations
      };
    } else {
      return {
        fixes: [],
        validations,
      }
    }
  };
}

export function validateAndFixDatabase(
  query: QueryPromise<any>,
  schema: SchemaStrict,
  fixControls: FixControls = {
    additive: true,
    codeToDbNotNull: true,
    codeToDbNull: false,
  },
): Promise<SchemaValidation[]> {
  return validateDatabase(query, schema)
    .then((results) => {
      const vfc = fixValidations(query, schema, fixControls)(results);
      return Promise.all(vfc.fixes)
        .then(() => {
          return vfc.validations;
        });
    });
}

