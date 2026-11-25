import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  TERMS_PRICES_EXCLUDE,
  collapseDuplicateTermsBody,
  countDuplicateOverviewStarts,
  migrateTermsPolicyHtml,
  renumberTermsSectionsAfterShopifyRemoval,
} from './termsPolicy';

const RTE_OPEN = '<div class="rte">\n        <p><strong><strong>OVERVIEW</strong> <br>Welcome to LUUX!';
const COPY_TAIL = ' SECTION 4 - PRICES non-remote addresses included. SECTION 24 - CONTACT [INSERT VAT NUMBER] ';
const COPY_OLD = `${RTE_OPEN} copy B. SECTION 4 - PRICES ${TERMS_PRICES_EXCLUDE} SECTION 24 - CONTACT.</p></div>`;

describe('collapseDuplicateTermsBody', () => {
  it('collapses HTML-wrapped duplicate overviews and closes the rte wrapper', () => {
    const duplicateStub = ' OVERVIEW</strong> <br>Welcome to LUUX! stub';
    const duplicated = `${RTE_OPEN}${COPY_TAIL}</strong>${duplicateStub}${COPY_OLD}`;
    assert.ok(countDuplicateOverviewStarts(duplicated) >= 2);
    const collapsed = collapseDuplicateTermsBody(duplicated);
    assert.equal(countDuplicateOverviewStarts(collapsed), 1);
    assert.match(collapsed, /^<div class="rte">/);
    assert.match(collapsed, /non-remote/);
    assert.doesNotMatch(collapsed, /copy B/);
    assert.match(collapsed, /<\/strong>\s*<\/p>\s*<\/div>\s*$/);
  });

  it('still collapses plain-text duplicates without an rte wrapper', () => {
    const plain = 'OVERVIEW Welcome to LUUX! A. SECTION 24 done. OVERVIEW Welcome to LUUX! B.';
    const collapsed = collapseDuplicateTermsBody(plain);
    assert.equal(countDuplicateOverviewStarts(collapsed), 1);
    assert.doesNotMatch(collapsed, / B\./);
  });
});

describe('renumberTermsSectionsAfterShopifyRemoval', () => {
  it('shifts SECTION 10–24 down to 9–23', () => {
    const html = '<p><strong>SECTION 10 - PRIVACY POLICY</strong> … <strong>SECTION 24 - CONTACT</strong></p>';
    const next = renumberTermsSectionsAfterShopifyRemoval(html);
    assert.match(next, /SECTION 9 - PRIVACY POLICY/);
    assert.match(next, /SECTION 23 - CONTACT/);
    assert.doesNotMatch(next, /SECTION 24 -/);
    assert.doesNotMatch(next, /SECTION 10 - PRIVACY/);
  });
});

describe('migrateTermsPolicyHtml', () => {
  it('collapses duplicates then upgrades section 4 wording', () => {
    const duplicateStub = ' OVERVIEW</strong> <br>Welcome to LUUX! stub';
    const duplicated = `${RTE_OPEN}${COPY_TAIL}${duplicateStub}${COPY_OLD}`;
    const migrated = migrateTermsPolicyHtml(duplicated);
    assert.equal(countDuplicateOverviewStarts(migrated), 1);
    assert.doesNotMatch(migrated, /prices do not include taxes, shipping/);
  });
});

describe('live terms snapshot', () => {
  it('collapses the production duplicate body (raw HTML, 113576 bytes)', () => {
    const snapshot = process.env.TERMS_FIXTURE || 'test-fixtures/terms-of-service-live.json';
    let raw: string;
    try {
      raw = readFileSync(snapshot, 'utf8');
    } catch {
      return;
    }
    const data = JSON.parse(raw) as { page: { body_html: string } };
    const html = data.page.body_html;
  const beforeOverview = countDuplicateOverviewStarts(html);
    assert.equal(beforeOverview, 5);
    const migrated = migrateTermsPolicyHtml(html);
    assert.equal(countDuplicateOverviewStarts(migrated), 1);
    assert.equal(migrated.match(/SECTION 4/g)?.length, 1);
    assert.match(migrated, /non-remote addresses is included/);
    assert.match(migrated, /HK\$280/);
    assert.doesNotMatch(migrated, /posted prices do not include taxes, shipping/);
    assert.ok(migrated.length < 40_000);
    assert.ok(migrated.startsWith('<div class="rte">'));
  });
});