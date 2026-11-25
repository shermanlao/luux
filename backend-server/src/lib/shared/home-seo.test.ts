import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HOME_DESCRIPTION_FALLBACK, homePageDescription, isGenericHomeSeoDescription } from './home-seo';

describe('homePageDescription', () => {
  it('replaces generic CMS blurbs with the storefront fallback', () => {
    assert.equal(isGenericHomeSeoDescription('Modern lighting for living spaces.'), true);
    assert.equal(
      homePageDescription('Modern lighting for living spaces. Pendant, wall, table, floor, and ceiling lamps.'),
      HOME_DESCRIPTION_FALLBACK,
    );
    assert.equal(homePageDescription('Custom staff copy for the homepage.'), 'Custom staff copy for the homepage.');
  });
});