import { writeFile } from 'fs';
import { objReduce } from '@ch1/utility';
import {
  SchemaPropStrict,
  SchemaStrict,
  SchemaStructProp,
} from './schema';
import { typeMappingsByGeneric } from './type-mappings';

export function schemaStructPropToTypeScript(
  state: string, prop: SchemaStructProp, name: string,
): string {
  return state + `  ${name.toLowerCase()}: ${typeMappingsByGeneric[prop.type].ts};
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

export function dbInterfaceFromSchema(schema: SchemaStrict) {
  return objReduce(schema, (state: string, prop, name: string) => {
    state += `  ${name.toLowerCase()}: ${name};\n`;
    return state;
  }, 'export interface DbSchema {\n') + '}';
}

export function writeTsFromSchema(fullPath: string, schema: SchemaStrict) {
  const tableInterfaces = schemaToTypeScript(schema);
  const dbInterface = dbInterfaceFromSchema(schema);
  const interfaces = tableInterfaces + dbInterface;
  return new Promise((resolve, reject) => {
    writeFile(fullPath, interfaces, (err: Error|null) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
