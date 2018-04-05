const chalk = require('chalk');

export interface Dictionary<T> {
  [key: string]: T;
}

export function arrToObj<T>(
  arr: T[], prop?: string, aggregate?: boolean
): Dictionary<T> | Dictionary<T[]> {
  return arr.reduce((state: Dictionary<T> | Dictionary<T[]>, el: T, i: number) => {
    let index;
    if (!prop) {
      index = i;
    } else {
      index = (<any>el)[prop];
    }
    if (aggregate) {
      if (!state[index]) {
        state[index] = <T[]>[];
      }
      (<any>state[index]).push(el);
    } else {
      state[index] = el;
    }
    return state;
  }, {});
}

export function objEach<T>(
  d: Dictionary<T>,
  callback: (value: T, key?: string, index?: number, d?: Dictionary<T>) => any
) {
  Object.keys(d).forEach((key, i) => {
    callback(d[key], key, i, d);
  });
}

export function objFilter<T>(
  d: Dictionary<T>,
  callback: (value: T, key: string, index: number) => boolean
): Dictionary<T> {
    return objReduce(d, (
      state: Dictionary<T>, value: T, key: string, index: number
    ) => {
      if (callback(value, key, index)) {
        state[key] = value;
      }
      return state;
    }, {});
}

export function objReduce<T, R>(
  d: Dictionary<T>,
  callback: (
    state: R, value?: T, key?: string, index?: number, d?: Dictionary<T>
  ) => R,
  init: R,
): R {
  return Object.keys(d)
    .reduce((state: R, key: string, i: number) => {
    return callback(state, d[key], key, i, d);
  }, init);
}

/**
 *  If keys/values have different lengths the expect behavior is to "underflow"
 *  values.  Non values will be initialized to undefined. Non keys will be
 *  ignored.
 *
 *  If there are duplicate keys the last assignment "wins", this would be the
 *  key with the highest index in the given keys array
 */
export function zip<T>(keys: string[], values: T[]): Dictionary<T> {
  return keys.reduce((o: Dictionary<T>, key: string, i: number) => {
    o[key] = values[i];
    return o;
  }, {})
}

export function unzip<T>(
  dictionary: Dictionary<T>
): { keys: string[], values: T[] } {
  return Object.keys(dictionary)
    .reduce((s: { keys: string[], values: T[] }, val: string) =>  {
      s.keys.push(val);
      s.values.push(dictionary[val]);

      return s;
    }, {
    keys: [],
    values: [],
  });
}

export function toString(val: any): string {
  return val + '';
}

export function toStringMax(max: number, val: any): string {
  const v = toString(val);
  return v.length > max ? v.slice(0, max) : v;
}

export function toIntMin(min: number, val: any): number {
  const num = toInt(val);

  if (num < min) {
    return min;
  }

  return num;
}

export function toIntMax(max: number, val: any): number {
  const num = toInt(val);

  if (num > max) {
    return max;
  }

  return num;
}

export function toGtZeroIntMax(max: number, val: any): number {
  const num = toInt(val);

  if (num > max) {
    return max;
  }

  if (num < 0) {
    return 0;
  }

  return num;
}

export function partial<T>(f: Function, ...boundArg: any[]) {
  return (...args: any[]) => <T>f(...boundArg, ...args);
}

export function identity<T>(i: any): T {
  return i;
}

export function toSqlBoolean(val: boolean): string {
  if (val) {
    return 'TRUE';
  }
  return 'FALSE';
}

export function toJsBoolean(val: any) {
  return val;
}

export function toInt(val: any): number {
    return parseInt(val, 10);
}

export function toIntBetween(min: number, max: number, val: any) {
  const asInt = toInt(val);

  if (asInt < min) {
    return min;
  }

  if (asInt > max) {
    return max;
  }

  return asInt;
}

export function toIntBetweenOptional(
  min: number|undefined, max: number|undefined, val: number
): number {
    if ((min === undefined) && (max === undefined)) {
      return val;
    }

    if (min === undefined) {
      return toIntMax(max, val);
    }

    if (max === undefined) {
      return toIntMin(min, val);
    }

    return toIntBetween(min, max, val);
}

export function deepFreeze<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return (<any>Object).freeze(obj.map(deepFreeze)) as T;
  }

  if (isObject(obj)) {
    for (let i in obj) {
      if (isObject((<any>obj)[i])) {
        if (!Object.isFrozen((<any>obj)[i])) {
          (<any>obj)[i] = deepFreeze((<any>obj)[i]);
        }
      }
    }
  }

  return Object.freeze(obj) as T;
}

/**
 * Is the given value a truthy object?
 */
export function isObject(obj: any): obj is Object {
  if (!obj) {
    return false;
  }

  return typeof obj === 'object';
}

export function isString(input: any): input is string {
  return typeof input === 'string';
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

export function noop() {}

export function nullableInt(val: any) {
  if (val === null) {
    return val;
  }
  return toInt(val);
}

export function warn(...args: any[]) {
  console.warn.apply(console, args);
}

export function isBoolean(arg: any): arg is boolean  {
  if (typeof arg === 'boolean') {
    return true;
  }
  return false;
}

export function findCaseInsensitivePropInObj<T>(
  obj: Dictionary<T>, prop: string
): T | boolean {
  const lProp = prop.toLowerCase();
  return objReduce(obj, (obj: any, el: any, objProp: string) => {
    if (obj) {
      return obj;
    }

    if (lProp === objProp.toLowerCase()) {
      return el;
    }

    return false;
  }, false);
}

export function pluck<T>(prop: string, haystack: Dictionary<T>) {
    return haystack[prop];
}

export function hasProp(prop: string, haystack: Dictionary<any>): boolean {
    return haystack[prop] ? true : false;
}

export function augmentObjIfNew<T>(obj: Dictionary<T>, item: T, key: string) {
  if (obj[key]) {
    // skip over
    return obj;
  }
  obj[key] = item;
  return obj;
}
