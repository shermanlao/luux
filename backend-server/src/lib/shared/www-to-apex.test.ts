import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildWwwToApexLocation,
  publicOriginFromEnv,
  wwwApexHostFromRequest,
} from './www-to-apex';

describe('www to apex redirect location', () => {
  it('uses SITE_ORIGIN without port and keeps path and query', () => {
    const env = publicOriginFromEnv('https://luuxmart.com', undefined);
    assert.equal(env, 'https://luuxmart.com');
    const location = buildWwwToApexLocation('/collections/all', '?sort=price', 'luuxmart.com', 'https', env);
    assert.equal(location, 'https://luuxmart.com/collections/all?sort=price');
    assert.doesNotMatch(location, /:3004/);
  });

  it('strips port from env origin', () => {
    const env = publicOriginFromEnv('http://localhost:3000', undefined);
    assert.equal(env, 'http://localhost');
    const location = buildWwwToApexLocation('/cart', '', 'example.com', 'https', env);
    assert.equal(location, 'http://localhost/cart');
  });

  it('falls back to forwarded proto and apex host when env is unset', () => {
    const location = buildWwwToApexLocation('/about', '', 'luuxmart.com', 'https', null);
    assert.equal(location, 'https://luuxmart.com/about');
  });

  it('detects www host and skips loopback', () => {
    assert.equal(wwwApexHostFromRequest('www.luuxmart.com'), 'luuxmart.com');
    assert.equal(wwwApexHostFromRequest('www.localhost:3000'), null);
    assert.equal(wwwApexHostFromRequest('luuxmart.com'), null);
  });
});