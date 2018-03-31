import { NotInCode, Schema, TypeMismatch } from '../schema';
import {
  createColumnName,
  compareNullConstraints,
  compareTypes,
  findRelation,
  typeCheckColumn,
  validateSchemaRelations,
} from './checkers-types';

describe('Schema Maintainer type checking functions', () => {
  describe('compareNullConstraints function', () => {
    it('should return null if db and code match', () => {
      expect(compareNullConstraints({
        column_name: 'some-column',
        table_name: 'some-table',
        is_nullable: 'YES',
        data_type: 'varchar',
        character_maximum_length: 25,
        numeric_precision: 0,
      }, [])).toBe(null);
    });

    it('should return null if db and code match (inverse)', () => {
      expect(compareNullConstraints({
        column_name: 'some-column',
        table_name: 'some-table',
        is_nullable: 'NO',
        data_type: 'varchar',
        character_maximum_length: 25,
        numeric_precision: 0,
      }, ['NotNull'])).toBe(null);
    });

    it('should return a SchemaValidation if db is nullable and code is not',
      () => {
        expect(compareNullConstraints({
          column_name: 'some-column',
          table_name: 'some-table',
          is_nullable: 'YES',
          data_type: 'varchar',
          character_maximum_length: 25,
          numeric_precision: 0,
        }, ['NotNull'])).not.toBe(null);
      });

    it('should return a SchemaValidation if db is not nullable and code is',
      () => {
        expect(compareNullConstraints({
          column_name: 'some-column',
          table_name: 'some-table',
          is_nullable: 'NO',
          data_type: 'varchar',
          character_maximum_length: 25,
          numeric_precision: 0,
        }, [])).not.toBe(null);
      });
  });

  describe('validateSchemaRelations', () => {
    it('should pass a simple test case', () => {
      const passing: Schema = {
        table_a: {
          table_b_id: {
            relation: { prop: 'id', struct: 'table_b' },
            type: 'UInt8',
          },
        },
        table_b: {
          id: 'UInt8',
        },
      };

      expect(validateSchemaRelations(passing)).toBe('');
    });

    it('should fail a simple type mismatch case', () => {
      const passing: Schema = {
        table_a: {
          table_b_id: {
            relation: { prop: 'id', struct: 'table_b' },
            type: 'UInt8',
          },
        },
        table_b: {
          id: 'UInt16',
        },
      };

      expect(validateSchemaRelations(passing)).not.toBe('');
    });

    it('should fail a simple missing relationship case', () => {
      const passing: Schema = {
        table_a: {
          table_b_id: {
            relation: { prop: 'id', struct: 'table_b' },
            type: 'UInt8',
          },
        },
      };

      expect(validateSchemaRelations(passing)).not.toBe('');
    });
  });

  describe('createColumnName function', () => {
    it('should return a "dot joined" string', () => {
      expect(createColumnName('foo', 'bar')).toBe('foo.bar');
    });
  });

  describe('compareTypes function', () => {
    it('should return null if types match, including constraints', () => {
      expect(compareTypes('String', {
        column_name: 'some-column',
        table_name: 'some-table',
        is_nullable: 'YES',
        data_type: 'varchar',
        character_maximum_length: 25,
        numeric_precision: 0,
      }, ['NotNull'])).not.toBe(null);
    });

    it('should return a TypeMismatch if types mismatch', () => {
      expect(compareTypes('String', {
        column_name: 'some-column',
        table_name: 'some-table',
        is_nullable: 'YES',
        data_type: 'integer',
        character_maximum_length: 25,
        numeric_precision: 0,
      }, ['NotNull']).reason).toBe(TypeMismatch);
    });

    it('should return a NotInCode if it does not have a type mapping', () => {
      expect(compareTypes('String', {
        column_name: 'some-column',
        table_name: 'some-table',
        is_nullable: 'YES',
        data_type: 'barf',
        character_maximum_length: 25,
        numeric_precision: 0,
      }, ['NotNull']).reason).toBe(NotInCode);
    });
  });

  describe('typeCheckColumn function', () => {
    it('should return a container with a validation error if there is a ' +
      'validation error', () => {
      expect(typeCheckColumn({
        type: 'String',
      }, {
        column_name: 'some-column',
        table_name: 'some-table',
        is_nullable: 'YES',
        data_type: 'barf',
        character_maximum_length: 25,
        numeric_precision: 0,
      }).error).not.toBe(undefined);
    });

    it('should return a container with no validation error if there is no ' +
      'validation error', () => {
      expect(typeCheckColumn({
        type: 'String',
      }, {
        column_name: 'some-column',
        table_name: 'some-table',
        is_nullable: 'YES',
        data_type: 'varchar',
        character_maximum_length: 25,
        numeric_precision: 0,
      }).error).not.toBe(undefined);
    });
  });

  describe('findRelation function', () => {
    it('should return an empty string if correct relation is found', () => {
      expect(findRelation({
        'some-table': {
          struct: {
            'some-column': {
              type: 'String',
            },
          },
        },
      }, { prop: 'some-column', struct: 'some-table' }, 'String')).toBe('');
    });

    it('should return an error string if column is not found', () => {
      expect(findRelation({
        'some-table': {
          struct: { },
        },
      }, { prop: 'some-column', struct: 'some-table' }, 'String'))
        .not.toBe('');
    });

    it('should return an error string if table is not found', () => {
      expect(findRelation(
        {},
        { prop: 'some-column', struct: 'some-table' }, 'String')
      ).not.toBe('');
    });
  });
});
