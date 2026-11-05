import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeShippingAmount, normalizeShippingCountries, shippingMatchesCountry } from './shipping';

describe('shipping countries', () => {
  it('matches a listed country and a wildcard', () => {
    assert.equal(shippingMatchesCountry('HK', 'hk'), true);
    assert.equal(shippingMatchesCountry('HK, MO', 'MO'), true);
    assert.equal(shippingMatchesCountry('*', 'US'), true);
    assert.equal(shippingMatchesCountry('HK', 'US'), false);
  });

  it('stores * or unique country codes', () => {
    assert.equal(normalizeShippingCountries(''), '*');
    assert.equal(normalizeShippingCountries(' * '), '*');
    assert.equal(normalizeShippingCountries('hk, mo, hk'), 'HK,MO');
  });
});

describe('shipping amount', () => {
  it('keeps a non-negative HKD amount with two decimals', () => {
    assert.equal(normalizeShippingAmount('80'), '80.00');
    assert.equal(normalizeShippingAmount('12.5'), '12.50');
    assert.equal(normalizeShippingAmount(''), null);
    assert.equal(normalizeShippingAmount('-1'), null);
    assert.equal(normalizeShippingAmount('abc'), null);
  });
});
