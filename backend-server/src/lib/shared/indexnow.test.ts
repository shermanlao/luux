import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_INDEXNOW_KEY, indexNowKeyIsPublished, indexNowKeyLocation, indexNowUrlList } from './indexnow';

describe('indexNowUrlList', () => {
  it('includes the sitemap and each apex path on production origin only', () => {
    assert.deepEqual(indexNowUrlList('https://evil.luuxmart.com', [{ path: '/' }]), []);
    const urls = indexNowUrlList('https://luuxmart.com', [
      { path: '/' },
      { path: '/collections/all' },
      { path: '/products/foo' },
      { path: '//evil' },
    ]);
    assert.ok(urls.includes('https://luuxmart.com/sitemap.xml'));
    assert.ok(urls.includes('https://luuxmart.com/'));
    assert.ok(urls.includes('https://luuxmart.com/products/foo'));
    assert.ok(!urls.some((row) => row.includes('//evil')));
  });

  it('requires a published key file for the active key', () => {
    assert.equal(indexNowKeyIsPublished(DEFAULT_INDEXNOW_KEY), true);
    assert.equal(indexNowKeyIsPublished('missing-key-value'), false);
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