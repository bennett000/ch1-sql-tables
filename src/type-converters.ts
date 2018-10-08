import {
  deepFreeze,
  Dictionary,
  partial,
  toInt,
  toIntMin,
  toIntBetween,
  toString,
  isString,
  toIntBetweenOptional,
} from '@ch1/utility';
import {
  toJsBoolean,
  toSqlBoolean,
  toJsDecimal,
  toSqlDecimal,
  warn,
} from './util';
import { SchemaStructProp, SchemaType } from './schema/schema';
import { isSchemaType } from './schema/schema-guards';

/**
 *  This file is three sets of functions designed for *internal* use within the
 *  tables module.  The verb "toJs/toSql/toGeneral" is weird.  It's setup this
 *  way so the tables engine can reference "type casting" functions.  The idea
 *  is when coming from SQL to JS to apply the transforms from the "toSql"
 *  object.  The the desired conversion is not found on the "toSql" module the
 *  "toGeneral" module will be checked.
 *
 *  Likewise coming from SQL->JS the same process will be applied, but the
 *  "toGeneral" filter will _not_ be used
 */

export type TypeCaster<T> = (input: any) => T;
export type TypeCasterDict = Dictionary<TypeCaster<any>>;


export const toGeneral: TypeCasterDict = deepFreeze({
  Int8: partial(toIntBetween, -128, 127),
  Int16: partial(toIntBetween, -32768, 32767),
  Int32: partial(toIntBetween, -2147483648, 2147483647),
  Int64: toInt, /** NOTE 64 bit integers are going to be a JS problem :/ */

  Ipv4: toString,

  UInt8: partial(toIntBetween, 0, 255),
  UInt16: partial(toIntBetween, 0, 65535),
  UInt32: partial(toIntBetween, 0, 4294967295),
  /** NOTE 64 bit integers are going to be a JS problem :/ */
  UInt64: partial(toIntMin, 0),

  String: toString,
  TimestampMs: toInt,
  TimestampS: toInt,
});

export const toJs: TypeCasterDict = deepFreeze({
  Boolean: toJsBoolean,
  Decimal: toJsDecimal,
});

export const toSql: TypeCasterDict = deepFreeze({
  Boolean: toSqlBoolean,
  Decimal: toSqlDecimal,
});

export function propSchemaToJs(prop: SchemaStructProp, value: any) {
  let converted: any;
  if (toJs[prop.type]) {
    converted = toSql[prop.type](value);
  }
  if (isString(converted)) {
    return converted;
  }

  return value;
}

export function propToJs(
  prop: SchemaType | SchemaStructProp, value: any
) {
  if (isSchemaType(prop)) {
    if (toJs[prop]) {
      return toJs[prop](value);
    }
    return value;
  }
  return propSchemaToJs(prop, value);
}

export function propSchemaToSql(prop: SchemaStructProp, value: any) {
  let converted: any;
  if (toSql[prop.type]) {
    converted = toSql[prop.type](value);
  }
  if (toGeneral[prop.type]) {
    converted = toGeneral[prop.type](value);
  }
  if (isString(converted)) {
    if (prop.typeMax) {
      return converted.slice(0, prop.typeMax);
    }
    return converted;
  }

  return toIntBetweenOptional(prop.typeMin, prop.typeMax, value);
}

export function propToSql(
  prop: SchemaType | SchemaStructProp, value: any
) {
  if (isSchemaType(prop)) {
    if (toSql[prop]) {
      return toSql[prop](value);
    }
    if (toGeneral[prop]) {
      return toGeneral[prop](value);
    }
    warn(`propToSql: no validator found for type ${prop}`);
    return '';
  }
  return propSchemaToSql(prop, value);
}