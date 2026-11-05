import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { messageHtml, parseAttachments, prepareMailHtml, type StoredAttachment } from './mail-html';

const logo: StoredAttachment = {
  id: 'logo-1',
  filename: 'logo.png',
  contentType: 'image/png',
  sizeBytes: 1200,
  inline: true,
  contentId: '<logo@shop>',
  storage: 'mail',
};

describe('mail html', () => {
  it('keeps the message layout and opens links in a new tab', () => {
    const html = prepareMailHtml('<p>Hello</p><a href="https://luuxmart.com/pages/contact">Contact</a>', 4, []);
    assert.match(html, /<p>Hello<\/p>/);
    assert.match(html, /href="https:\/\/luuxmart\.com\/pages\/contact"/);
    assert.match(html, /target="_blank"/);
  });

  it('removes scripts and blocks unsafe urls', () => {
    const html = prepareMailHtml(
      '<p onclick="steal()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">Go</a><img src="/api/admin/logout"><img src="cid:logo@shop">',
      4,
      [logo]
    );
    assert.equal(html.includes('alert'), false);
    assert.equal(html.includes('onclick'), false);
    assert.equal(html.includes('/api/admin/logout'), false);
    assert.match(html, /href="#"/);
    assert.match(html, /\/api\/admin\/messages\/4\/file\?attachment=logo-1/);
  });

  it('turns plain text into html with a real link', () => {
    const html = messageHtml({ id: 2, body: 'See https://example.com/offer.\n<script>no</script>', body_html: null }, []);
    assert.match(html, /href="https:\/\/example\.com\/offer"/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /<html[\s>]/);
  });

  it('uses the html part when the mailbox stored one', () => {
    const html = messageHtml({ id: 2, body: 'plain', body_html: '<table><tr><td>GemPages</td></tr></table>' }, []);
    assert.match(html, /<table><tr><td>GemPages<\/td><\/tr><\/table>/);
    assert.equal(html.includes('plain'), false);
  });

  it('reads stored attachment records', () => {
    const files = parseAttachments(JSON.stringify([logo, { id: '', filename: 'skip' }, 'nope']));
    assert.equal(files.length, 1);
    assert.equal(files[0].contentId, '<logo@shop>');
  });
});
