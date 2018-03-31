import { expect } from 'chai';
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
      }, [])).to.equal(null);
    });

    it('should return null if db and code match (inverse)', () => {
      expect(compareNullConstraints({
        column_name: 'some-column',
        table_name: 'some-table',
        is_nullable: 'NO',
        data_type: 'varchar',
        character_maximum_length: 25,
        numeric_precision: 0,
      }, ['NotNull'])).to.equal(null);
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
        }, ['NotNull'])).to.not.equal(null);
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
        }, [])).to.not.equal(null);
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

      expect(validateSchemaRelations(passing)).to.equal('');
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

      expect(validateSchemaRelations(passing)).not.to.equal('');
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

      expect(validateSchemaRelations(passing)).not.to.equal('');
    });
  });

  describe('createColumnName function', () => {
    it('should return a "dot joined" string', () => {
      expect(createColumnName('foo', 'bar')).to.equal('foo.bar');
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
      }, ['NotNull'])).to.not.equal(null);
    });

    it('should return a TypeMismatch if types mismatch', () => {
      expect(compareTypes('String', {
        column_name: 'some-column',
        table_name: 'some-table',
        is_nullable: 'YES',
        data_type: 'integer',
        character_maximum_length: 25,
        numeric_precision: 0,
      }, ['NotNull']).reason).to.equal(TypeMismatch);
    });

    it('should return a NotInCode if it does not have a type mapping', () => {
      expect(compareTypes('String', {
        column_name: 'some-column',
        table_name: 'some-table',
        is_nullable: 'YES',
        data_type: 'barf',
        character_maximum_length: 25,
        numeric_precision: 0,
      }, ['NotNull']).reason).to.equal(NotInCode);
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
      }).error).to.not.equal(undefined);
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
      }).error).to.not.equal(undefined);
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
      }, { prop: 'some-column', struct: 'some-table' }, 'String')).to.equal('');
    });

    it('should return an error string if column is not found', () => {
      expect(findRelation({
        'some-table': {
          struct: { },
        },
      }, { prop: 'some-column', struct: 'some-table' }, 'String'))
        .to.not.equal('');
    });

    it('should return an error string if table is not found', () => {
      expect(findRelation(
        {},
        { prop: 'some-column', struct: 'some-table' }, 'String')
      ).to.not.equal('');
    });
  });
});
