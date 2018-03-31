import typescript from 'rollup-plugin-typescript';

export default {
  input: 'dist/es6/index.js',
  output: {
    file: 'dist/umd/sql-tables.js',
    format: 'umd',
  },
}
