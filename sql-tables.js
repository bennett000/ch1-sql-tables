#!/usr/bin/env node
const { strictify, writeTsFromSchema } = require('./dist');

const { readFileSync } = require('fs');
const ts = require('typescript');

function usage() {
  console.log('');
  console.log(`${process.argv[1]} path-to-input-schema.ts path-to-output-file.ts [schema-prop]`);
  console.log('');
}

if (!process.argv[2]) {
  usage();
  process.exit(-1);
}

if (!process.argv[3]) {
  usage();
  process.exit(-2);
}

if (process.argv.length > 5) {
  usage();
  process.exit(-3);
}

if (process.argv.length < 4) {
  usage();
  process.exit(-4);
}


const schemaPath = process.argv[2];
const tsPath = process.argv[3];
const schemaProp = process.argv[4] || 'schema';

const tsOpts = {
  lib: [ 'dom', 'es6' ],
  module: 'commonjs',
  moduleResolution: 'node',
  target: 'es5',
};

writeSchema();

function writeSchema() {
    const fullPath = schemaPath;
    const input = readFileSync(fullPath, 'utf8');
    const jsSchema = ts.transpileModule(input, tsOpts);
    const schema = require('require-from-string')(
      jsSchema.outputText,
    )[schemaProp];

    console.log('Generating TypeScript from the schema', schemaPath);

    writeTsFromSchema(
      tsPath,
      strictify(schema),
    ).then(() => {
      console.log('Wrote TypeScript to', tsPath);
    }).catch((err) => {
      console.log('Fatal Error Writing File', err.message);
    });
}
