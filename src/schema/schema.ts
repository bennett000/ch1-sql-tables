import { Dictionary } from '../util';

/* use strings for nicer JSON*/
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


export type SchemaType = SchemaNonNumeric | SchemaNumeric;

export type SchemaConstraint =
  'Automatic' |
  'Check' |
  'DbModifyOnly' |
  'DbInternal' |
  'EncryptAppLayer' |
  'EncryptDbLayer' |
  'NotNull' |
  'PrimaryKey' |
  'Unique';

export interface SchemaRelation {
  prop: string;
  struct: string;
}

export interface SchemaRelationComposite {
  props: string[];         // props on "this" struct
  propsForeign: string[];  // props on other struct
  struct: string;
}

export interface SchemaStructProp {
  constraints?: SchemaConstraint[];
  defaultValue?: any;
  relation?: SchemaRelation;
  type: SchemaType;
  typeMax?: number;
  typeMin?: number;
}

export type SchemaItem = SchemaProp | SchemaStruct;

export type SchemaStructItem = SchemaStructProp | SchemaType;

export type SchemaStruct = Dictionary<SchemaStructItem>;

export type SchemaStructStrict = Dictionary<SchemaStructProp>;

export interface SchemaProp {
  struct: SchemaStruct;
  unique?: string[][];                      // for composite UNIQUE support
  primaryKey?: string[];                    // for composite PRIMARY KEY support
  foreignKey?: SchemaRelationComposite[];   // for composite FOREIGN KEY support
}

export interface SchemaPropStrict extends SchemaProp {
  struct: SchemaStructStrict;
}

export type Schema = Dictionary<SchemaItem>;

export type SchemaStrict = Dictionary<SchemaPropStrict>;

export type SchemaErr = { count: number, string: string };

export type Reasons =
  'not in db' | 'not in code' | 'type mismatch' | 'constraint';

export const NotInCode = 'not in code';
export const NotInDb = 'not in db';
export const TypeMismatch = 'type mismatch';
export const Constraint = 'constraint';

export type SchemaValidationExtra =
  'src: NULL code: NOT NULL' | 'src: NOT NULL code: NULL';

export interface SchemaValidation {
  type: 'table' | 'column' | 'type';
  name: string;
  reason: Reasons;
  extra?: SchemaValidationExtra | string;
}

export interface SchemaValidationContainer {
  error: SchemaValidation;
  name: string;
}

export interface SchemaValidationCollection {
  errors: SchemaValidation[];
  names: string[];
}

export { strictify } from './maintainers/fixer-functions';

export {
  mutateStructIntoSchemaStructs,
  validateDatabase,
  validateAndFixDatabase,
} from './maintainers/maintainers';

