import { arrToObj, Dictionary } from '../util';
import { SchemaConstraint, SchemaType } from './schema';

export interface AbstractMapping {
  create: string;
  createA?: string;
  generic: SchemaConstraint | SchemaType;
}

export interface TypeMapping extends AbstractMapping {
  generic: SchemaType;
  infoSchema: string;
  ts: string;
}

export interface ConstraintMapping extends AbstractMapping {
  generic: SchemaConstraint;
}

export const typeMappings: TypeMapping[] = [
  {
    create: 'bigint',
    generic: 'Int64',
    infoSchema: 'bigint',
    ts: 'number',
  },
  {
    create: 'bigint',
    generic: 'UInt64',
    infoSchema: 'bigint',
    ts: 'number',
  },
  {
    create: 'boolean',
    generic: 'Boolean',
    infoSchema: 'boolean',
    ts: 'boolean',
  },
  {
    create: 'inet',
    generic: 'Ipv4',
    infoSchema: 'inet',
    ts: 'string',
  },
  {
    create: '',
    createA: 'varchar',
    generic: 'String',
    infoSchema: 'character varying',
    ts: 'string',
  },
  {
    create: 'integer',
    generic: 'Int32',
    infoSchema: 'integer',
    ts: 'number',
  },
  {
    create: 'smallint',
    generic: 'Int16',
    infoSchema: 'smallint',
    ts: 'number',
  },
  {
    create: 'integer',
    generic: 'UInt32',
    infoSchema: 'integer',
    ts: 'number',
  },
  {
    create: 'smallint',
    generic: 'UInt16',
    infoSchema: 'smallint',
    ts: 'number',
  },
  {
    create: 'timestamp default current_timestamp',
    generic: 'TimestampS',
    infoSchema: 'timestamp without time zone',
    ts: 'number',
  },
];

export const typeMappingsByInfoSchema: Dictionary<TypeMapping[]> =
  <any>arrToObj<TypeMapping>(typeMappings, 'infoSchema', true);
export const typeMappingsByGeneric: Dictionary<TypeMapping> =
  <any>arrToObj<TypeMapping>(typeMappings, 'generic');

export const constraintMappings: ConstraintMapping[] = [
  {
    create: '',
    createA: 'CHECK',
    generic: 'Check',
  },
  {
    create: 'NOT NULL',
    generic: 'NotNull',
  },
  {
    create: 'PRIMARY KEY',
    generic: 'PrimaryKey',
  },
  {
    create: 'UNIQUE',
    generic: 'Unique',
  },
];

export const constraintMappingsByGeneric: Dictionary<ConstraintMapping> =
  <any>arrToObj<ConstraintMapping>(constraintMappings, 'generic');

export const automatics: Dictionary<string> = {
  'Int32': 'serial PRIMARY KEY',
  'Int64': 'bigserial PRIMARY KEY',
  'TimestampS': 'timestamp default current_timestamp',
  'UInt32': 'serial PRIMARY KEY',
  'UInt64': 'bigserial PRIMARY KEY',
};

export const appOnlyMappings = [
  'Automatic',
  'DbModifyOnly',
  'DbInternal',
  'EncryptAppLayer',
  'EncryptDbLayer',
];
