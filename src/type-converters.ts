import {
  deepFreeze,
  Dictionary,
  partial,
  toInt,
  toIntMin,
  toIntBetween,
  toJsBoolean,
  toSqlBoolean,
  toString,
} from './util';

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
});

export const toSql: TypeCasterDict = deepFreeze({
  Boolean: toSqlBoolean,
});
