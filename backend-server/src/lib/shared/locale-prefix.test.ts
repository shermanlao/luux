import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { stripLocalePrefix } from './locale-prefix';

describe('stripLocalePrefix', () => {
  const cases: Array<[string, string]> = [
    ['/fr', '/'],
    ['/fr/', '/'],
    ['/fr/collections/all', '/collections/all'],
    ['/ko/cart', '/cart'],
    ['/zh', '/'],
    ['/zh-HK', '/'],
    ['/en', '/'],
    ['/cn', '/'],
  ];

  for (const [input, expected] of cases) {
    it(`maps ${input} → ${expected}`, () => {
      assert.equal(stripLocalePrefix(input), expected);
    });
  }

  it('returns null when no locale prefix is present', () => {
    assert.equal(stripLocalePrefix('/cart'), null);
    assert.equal(stripLocalePrefix('/collections/all'), null);
    assert.equal(stripLocalePrefix('/'), null);
  });
});