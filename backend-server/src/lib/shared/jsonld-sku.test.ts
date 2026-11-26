import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { jsonLdSku } from './jsonld-sku';

describe('jsonLdSku', () => {
  it('returns short real SKUs', () => {
    assert.equal(jsonLdSku('OB-BLK'), 'OB-BLK');
    assert.equal(jsonLdSku('PAYTEST'), 'PAYTEST');
  });

  it('omits pipe-heavy Shopify option strings', () => {
    assert.equal(
      jsonLdSku('Default Title | Warm White | 3000K | Dimmable | Large'),
      undefined,
    );
  });

  it('omits live Balloon semicolon/hash variant ids', () => {
    assert.equal(jsonLdSku('200000531:29;200000795:366;249:200006305#20cm'), undefined);
  });

  it('omits overlong values', () => {
    assert.equal(jsonLdSku('x'.repeat(51)), undefined);
  });
});