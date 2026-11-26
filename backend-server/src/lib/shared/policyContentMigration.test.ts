import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  containsLegacyEmail,
  containsShopifyMention,
  countRefundPolicyStarts,
  migratePrivacyPolicyHtml,
  migrateRefundPolicyHtml,
  PUBLIC_CONTACT_EMAIL,
} from './policyContentMigration';
import { migrateTermsPolicyHtml } from './termsPolicy';

const LIVE_DIR = join(__dirname, 'fixtures/live-policy-html');

function readLiveFixture(name: 'refund-policy.html' | 'privacy-policy.html' | 'terms-of-service.html'): string {
  return readFileSync(join(LIVE_DIR, name), 'utf8');
}

describe('migrateRefundPolicyHtml', () => {
  it('dedupes live refund HTML and removes empty 4tech mailto links', () => {
    const html = readLiveFixture('refund-policy.html');
    assert.equal(countRefundPolicyStarts(html), 2);
    assert.match(html, /mailto:info@4techhk\.com/);

    const migrated = migrateRefundPolicyHtml(html);
    assert.equal(countRefundPolicyStarts(migrated), 1);
    assert.doesNotMatch(migrated, /info@4techhk\.com/i);
    assert.doesNotMatch(migrated, /mailto:info@4techhk\.com/i);
    assert.match(migrated, new RegExp(PUBLIC_CONTACT_EMAIL));
    assert.match(migrated, /^<div class="rte">/);
    assert.ok(migrated.length < html.length / 2 + 500);
  });
});

describe('migratePrivacyPolicyHtml', () => {
  it('removes Shopify relationship and powered-by copy from live privacy HTML', () => {
    const html = readLiveFixture('privacy-policy.html');
    assert.ok(containsShopifyMention(html));

    const migrated = migratePrivacyPolicyHtml(html);
    assert.doesNotMatch(migrated, /Relationship with Shopify/i);
    assert.doesNotMatch(migrated, /powered by Shopify/i);
    assert.doesNotMatch(migrated, /privacy\.shopify\.com/i);
    assert.doesNotMatch(migrated, /Shopify Consumer Privacy Policy/i);
    assert.doesNotMatch(migrated, /Shopify account/i);
    assert.ok(!containsShopifyMention(migrated));
    assert.match(migrated, /With vendors and other third parties/);
  });
});

describe('migrateTermsPolicyHtml shopify cleanup', () => {
  it('removes Section 9 and other Shopify leftovers from live terms HTML', () => {
    const html = readLiveFixture('terms-of-service.html');
    assert.match(html, /SECTION 9 - RELATIONSHIP WITH SHOPIFY/i);

    const migrated = migrateTermsPolicyHtml(html);
    assert.doesNotMatch(migrated, /SECTION 9 - RELATIONSHIP WITH SHOPIFY/i);
    assert.doesNotMatch(migrated, /powered by Shopify/i);
    assert.doesNotMatch(migrated, /shopify\.com\/legal\/privacy/i);
    assert.doesNotMatch(migrated, /NOTE TO MERCHANT: This section accurately characterizes Shopify/i);
    assert.ok(!containsShopifyMention(migrated));
    assert.match(migrated, /\[INSERT TRADING NAME\]/);
    assert.match(migrated, /SECTION 9 - PRIVACY POLICY/);
    assert.match(migrated, /SECTION 10 - FEEDBACK/);
    assert.doesNotMatch(migrated, /SECTION 24 - CONTACT/);
    assert.match(migrated, /SECTION 23 - CONTACT/);
    assert.ok(!containsLegacyEmail(migrated));

    const secondPass = migrateTermsPolicyHtml(migrated);
    assert.equal(secondPass, migrated);
    assert.doesNotMatch(secondPass, /SECTION 9 - RELATIONSHIP WITH SHOPIFY/i);
    assert.match(secondPass, /\[INSERT TRADING NAME\]/);
  });
});