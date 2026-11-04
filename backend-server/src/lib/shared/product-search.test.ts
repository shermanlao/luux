import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Op } from 'sequelize';
import { productSearchOperator, productSearchPattern } from './product-search';

describe('product search', () => {
  it('uses a case-insensitive match on Postgres', () => {
    assert.equal(productSearchOperator('postgres'), Op.iLike);
    assert.equal(productSearchOperator('sqlite'), Op.like);
  });

  it('keeps the typed letters as a substring', () => {
    assert.equal(productSearchPattern('  lapu '), '%lapu%');
    assert.equal(productSearchPattern('Laputa'), '%Laputa%');
    assert.equal(productSearchPattern('%_'), null);
  });
});
