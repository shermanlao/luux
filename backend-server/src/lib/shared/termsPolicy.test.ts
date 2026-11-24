import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  TERMS_OVERVIEW_MARKER,
  TERMS_PRICES_EXCLUDE,
  collapseDuplicateTermsBody,
  migrateTermsPolicyHtml,
} from './termsPolicy';

const COPY_A = `${TERMS_OVERVIEW_MARKER}! Section A. SECTION 4 - PRICES updated non-remote addresses included. SECTION 24 - CONTACT done.`;
const COPY_B = `${TERMS_OVERVIEW_MARKER}! Section B old. SECTION 4 - PRICES ${TERMS_PRICES_EXCLUDE} SECTION 24 - CONTACT done.`;

describe('collapseDuplicateTermsBody', () => {
  it('returns a single copy when the overview marker repeats', () => {
    const duplicated = `${COPY_A}${COPY_B}${COPY_B}`;
    const collapsed = collapseDuplicateTermsBody(duplicated);
    assert.equal(collapsed.match(/OVERVIEW/g)?.length, 1);
    assert.match(collapsed, /non-remote/);
    assert.doesNotMatch(collapsed, /Section B/);
  });

  it('leaves a single-copy body unchanged', () => {
    assert.equal(collapseDuplicateTermsBody(COPY_A), COPY_A);
  });
});

describe('migrateTermsPolicyHtml', () => {
  it('collapses duplicates then upgrades section 4 wording', () => {
    const duplicated = `${COPY_A}${COPY_B}`;
    const migrated = migrateTermsPolicyHtml(duplicated);
    assert.equal(migrated.match(/OVERVIEW/g)?.length, 1);
    assert.doesNotMatch(migrated, /prices do not include taxes, shipping/);
  });
});

describe('live terms snapshot', () => {
  it('collapses the 2026-11-25 production duplicate body', () => {
    const snapshot = process.env.TERMS_FIXTURE;
    if (!snapshot) return;
    const raw = readFileSync(snapshot, 'utf8');
    const data = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) as { page: { body_html: string } };
    const migrated = migrateTermsPolicyHtml(data.page.body_html);
    assert.equal(migrated.match(/OVERVIEW Welcome to LUUX/g)?.length, 1);
    assert.match(migrated, /non-remote addresses is included/);
    assert.doesNotMatch(migrated, /posted prices do not include taxes, shipping/);
    assert.ok(migrated.length < 40_000);
  });
});