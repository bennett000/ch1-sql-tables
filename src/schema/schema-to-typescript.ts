import { writeFile } from 'fs';
import { objReduce } from '../util';
import {
  SchemaPropStrict,
  SchemaStrict,
  SchemaStructProp,
} from './schema';
import { typeMappingsByGeneric } from './type-mappings';

export function schemaStructPropToTypeScript(
  state: string, prop: SchemaStructProp, name: string,
): string {
  return state + `  ${name}: ${typeMappingsByGeneric[prop.type].ts};
`;
}

export function scPropToInterface(
  state: string, scProp: SchemaPropStrict, name: string
): string {
  return state + `export interface ${name} {
${objReduce(scProp.struct, schemaStructPropToTypeScript, '')}}

`;
}

export function schemaToTypeScript(schema: SchemaStrict): string {
    return objReduce(schema, scPropToInterface, '');
}

export function writeTsFromSchema(fullPath: string, schema: SchemaStrict) {
  return new Promise((resolve, reject) => {
    writeFile(fullPath, schemaToTypeScript(schema), (err: Error|null) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
