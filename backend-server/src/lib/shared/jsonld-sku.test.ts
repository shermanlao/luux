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

  it('omits overlong values', () => {
    assert.equal(jsonLdSku('x'.repeat(51)), undefined);
  });
});