import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_INDEXNOW_KEY, indexNowKeyLocation, indexNowUrlList } from './indexnow';

describe('indexNowUrlList', () => {
  it('includes the sitemap and each apex path', () => {
    const urls = indexNowUrlList('https://luuxmart.com', [
      { path: '/' },
      { path: '/collections/all' },
      { path: '/products/foo' },
    ]);
    assert.ok(urls.includes('https://luuxmart.com/sitemap.xml'));
    assert.ok(urls.includes('https://luuxmart.com/'));
    assert.ok(urls.includes('https://luuxmart.com/products/foo'));
  });
});

describe('indexNowKeyLocation', () => {
  it('points at the public key file on the site origin', () => {
    assert.equal(
      indexNowKeyLocation('https://luuxmart.com'),
      `https://luuxmart.com/${DEFAULT_INDEXNOW_KEY}.txt`,
    );
  });
});