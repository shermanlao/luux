import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildWwwToApexLocation,
  publicOriginFromEnv,
  safeRedirectProto,
  wwwApexHostFromRequest,
} from './www-to-apex';

describe('www to apex redirect location', () => {
  it('uses SITE_ORIGIN without port and keeps path and query', () => {
    const env = publicOriginFromEnv('https://luuxmart.com', undefined);
    assert.equal(env, 'https://luuxmart.com');
    const location = buildWwwToApexLocation('/collections/all', '?sort=price', 'luuxmart.com', 'https', env);
    assert.equal(location, 'https://luuxmart.com/collections/all?sort=price');
    assert.doesNotMatch(location!, /:3004/);
  });

  it('strips port from env origin', () => {
    const env = publicOriginFromEnv('http://localhost:3000', undefined);
    assert.equal(env, 'http://localhost');
    const location = buildWwwToApexLocation('/cart', '', 'example.com', 'https', env);
    assert.equal(location, 'http://localhost/cart');
  });

  it('rejects non-http(s) SITE_ORIGIN', () => {
    assert.equal(publicOriginFromEnv('javascript:alert(1)', undefined), null);
    assert.equal(publicOriginFromEnv('data:text/html,hi', undefined), null);
  });

  it('falls back only for luuxmart.com with safe proto', () => {
    const location = buildWwwToApexLocation('/about', '', 'luuxmart.com', 'https', null);
    assert.equal(location, 'https://luuxmart.com/about');
    assert.doesNotMatch(location!, /:3004/);
  });

  it('falls back to env-configured apex hostname when env origin is unset but host is listed', () => {
    const location = buildWwwToApexLocation(
      '/p',
      '',
      'staging.luuxmart.com',
      'https',
      null,
      'https://staging.luuxmart.com',
      undefined,
    );
    assert.equal(location, 'https://staging.luuxmart.com/p');
  });

  it('does not redirect to attacker-controlled apex when env is unset', () => {
    assert.equal(buildWwwToApexLocation('/steal', '', 'evil.com', 'https', null), null);
    assert.equal(buildWwwToApexLocation('/steal', '', 'luuxmart.com.evil.com', 'https', null), null);
  });

  it('with env set, ignores hostile Host apex and still targets public origin', () => {
    const env = publicOriginFromEnv('https://luuxmart.com', undefined);
    const location = buildWwwToApexLocation('/x', '', 'evil.com', 'https', env);
    assert.equal(location, 'https://luuxmart.com/x');
  });

  it('rejects crafted X-Forwarded-Proto in fallback', () => {
    const cases = ['javascript:', 'data:', 'ftp:', 'http://evil.com', 'https evil', 'https,http', 'HTTP\r\nhttps'];
    for (const bad of cases) {
      assert.equal(buildWwwToApexLocation('/a', '', 'luuxmart.com', bad, null), null);
    }
    assert.equal(buildWwwToApexLocation('/a', '', 'luuxmart.com', 'http', null), 'http://luuxmart.com/a');
  });

  it('safeRedirectProto allows only http and https', () => {
    assert.equal(safeRedirectProto('https'), 'https');
    assert.equal(safeRedirectProto('http'), 'http');
    assert.equal(safeRedirectProto('javascript:'), null);
    assert.equal(safeRedirectProto('http://evil.com'), null);
  });

  it('detects www host and skips loopback', () => {
    assert.equal(wwwApexHostFromRequest('www.luuxmart.com'), 'luuxmart.com');
    assert.equal(wwwApexHostFromRequest('www.luuxmart.com:3004'), 'luuxmart.com');
    assert.equal(wwwApexHostFromRequest('www.localhost:3000'), null);
    assert.equal(wwwApexHostFromRequest('luuxmart.com'), null);
    assert.equal(wwwApexHostFromRequest('www.evil.com'), 'evil.com');
  });
});