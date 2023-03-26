import { Dictionary, toInt, isNumber } from '@ch1/utility';
import chalk from 'chalk';

const TRUE = 'TRUE';
const FALSE = 'FALSE';

export function toSqlBoolean(val: boolean): string {
  if (val) {
    return TRUE;
  }
  return FALSE;
}

export function toJsBoolean(val: any) {
  if (typeof val === 'boolean') {
    return val;
  }
  if (val === 't') {
    return true;
  }
  if (val === TRUE) {
    return true;
  }
  return false;
}

export function toSqlDecimal(val: any) {
  if (isNumber(val)) {
    return val + '';
  }
  return val;
}

export function toJsDecimal(val: any) {
  return parseFloat(val);
}


export function error(...messages: any[]) {
  console.log.call(console, chalk.red(messages.join(' ')));
}

export function sql(...messages: any[]) {
  if (process.env.SQLT_HIDE_SQL) {
    return;
  }
  console.log.call(console, chalk.blue(messages.join(' ')));
}

export function log(...messages: any[]) {
  console.log.apply(console, messages);
}

export function nullableInt(val: any) {
  if (val === null) {
    return val;
  }
  return toInt(val);
}

export function warn(...args: any[]) {
  console.warn.apply(console, args);
}

export function augmentObjIfNew<T>(obj: Dictionary<T>, item: T, key: string) {
  if (obj[key]) {
    // skip over
    return obj;
  }
  obj[key] = item;
  return obj;
}
