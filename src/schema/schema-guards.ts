import { Dictionary, isObject } from '../util';
import {
  SchemaNonNumeric,
  SchemaNumeric,
  SchemaProp,
  SchemaRelationComposite,
  SchemaStruct,
  SchemaStructItem,
  SchemaStructProp,
  SchemaStructStrict,
  SchemaType, SchemaConstraint,
} from './schema';

export const schemeNumeric: Dictionary<boolean> = Object.freeze({
  Decimal: true,
  Int8: true,
  Int16: true,
  Int32: true,
  Int64: true,
  UInt8: true,
  UInt16: true,
  UInt32: true,
  UInt64: true,
  TimestampMs: true,
  TimestampS: true,
});

export const schemaNonNumeric: Dictionary<boolean> = Object.freeze({
  Boolean: true,
  Date: true,
  Ipv4: true,
  String: true,
});

export function isSchemaNonNumeric(input: string): input is SchemaNonNumeric {
  return schemaNonNumeric[input] || false;
}

export function isSchemaStructFn(fn: (arg: any) => boolean, arg: any) {
  if (!isObject(arg)) {
    return false;
  }

  let result = true;
  for (let i in arg) {
    if (arg.hasOwnProperty(i)) {
      if (!result) {
        break;
      }
      if (!fn(arg[i])) {
        result = false;
        break;
      }
    }
  }

  return result;
}


export function isSchemaStruct(arg: any): arg is SchemaStruct {
  return isSchemaStructFn(isSchemaStructItem, arg);
}

export function isSchemaStructStrict(arg: any): arg is SchemaStructStrict {
  return isSchemaStructFn(isSchemaStructProp, arg);
}

export function hasConstraints(input: SchemaStructItem): boolean {
  if (isSchemaStructProp(input)) {
    if (Array.isArray(input.constraints) && input.constraints.length) {
      return true;
    }
    return false;
  }

  return false;
}

export function hasConstraint(
  constraint: SchemaConstraint, prop: SchemaStructProp
): boolean {
  if (prop.constraints && prop.constraints.length) {
    const index = prop.constraints.indexOf(constraint);

    if (index === -1) {
      if (constraint === 'NotNull') {
        return hasConstraint('PrimaryKey', prop);
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  return false;
}


export function hasDbOnlyConstraints(prop: SchemaStructProp): boolean {
  if (hasConstraint('DbModifyOnly', prop) ||
    hasConstraint('DbInternal', prop)) {
    return true;
  }

  return false;
}

export function isSchemaNumeric(input: string): input is SchemaNumeric {
  return schemeNumeric[input] === true;
}

export function isSchemaType(input: any): input is SchemaType {
  return isSchemaNumeric(input) || isSchemaNonNumeric(input);
}

export function isSchemaStructProp(arg: any): arg is SchemaStructProp {
  if (arg && arg.type) {
    return true;
  }
  return false;
}

export function isSchemaStructItem(arg: any): arg is SchemaStructItem {
  return isSchemaStructProp(arg) || isSchemaType(arg);
}

export function isSchemaProp(arg: any): arg is SchemaProp {
  if (arg && isSchemaStruct(arg.struct)) {
    return true;
  }
  return false;
}

export function isSchemaRelationComposite(
  arg: any
): arg is SchemaRelationComposite {
  if (!Array.isArray(arg.props)) {
    return false;
  }

  if (!Array.isArray(arg.propsForeign)) {
    return false;
  }

  if (typeof arg.struct !== 'string') {
    return false;
  }

  if (arg.props.length === arg.propsForeign.length) {
    return true;
  }

  return false;
}
