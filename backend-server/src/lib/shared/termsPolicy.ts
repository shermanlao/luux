export const TERMS_OVERVIEW_DUPLICATE_PATTERN = /OVERVIEW(?:\s|<[^>]+>)*Welcome to LUUX/gi;

export const TERMS_PRICES_EXCLUDE =
  'Unless otherwise expressly stated, posted prices do not include taxes, shipping, handling, customs or import charges.';
export const TERMS_PRICES_INCLUDE_V1 =
  'Unless otherwise expressly stated, posted prices are in Hong Kong dollars. Standard delivery within Hong Kong is included in the posted product price. Delivery to outlying islands, remote areas, stair carries, redelivery, and installation is not included and may be quoted separately. Overseas shipping, customs, and import charges are not included in the posted price; overseas delivery is quoted from HK$280 as a starting rate at checkout, and oversized or fragile pieces may be quoted after the order. Taxes apply where required by law.';
export const TERMS_PRICES_INCLUDE =
  'Unless otherwise expressly stated, posted prices are in Hong Kong dollars. Standard delivery within Hong Kong to non-remote addresses is included in the posted product price. Remote Hong Kong areas (including outlying islands and locations such as Tung Chung, Discovery Bay, Chek Lap Kok, Lantau, and Ma Wan) are not included; delivery there is quoted or charged separately. Stair carries, redelivery, and installation may also be quoted separately. Overseas shipping, customs, and import charges are not included in the posted price; overseas delivery is quoted from HK$280 as a starting rate at checkout, and oversized or fragile pieces may be quoted after the order. Taxes apply where required by law.';

export const TERMS_PAYMENT_INCLUDE_SHIPPING =
  '(iv) you will pay charges incurred by you at the posted prices, including shipping and handling charges and all applicable taxes, if any.';
export const TERMS_PAYMENT_CHECKOUT =
  '(iv) you will pay charges incurred by you at the posted prices, plus any overseas shipping, customs, duties, or taxes shown at checkout or quoted separately, if applicable.';

const HK_INCLUDED_V0 = 'Standard delivery within Hong Kong is included in the posted product price';
const HK_INCLUDED_V1 =
  'Standard delivery within Hong Kong to non-remote addresses is included in the posted product price. Remote Hong Kong areas (including outlying islands and locations such as Tung Chung, Discovery Bay, Chek Lap Kok, Lantau, and Ma Wan) are not included; delivery there is quoted or charged separately';

import { closeUnclosedHtmlTags, findRegexMatchStarts, replaceAll } from './htmlPolicyUtils';
import { removeShopifyFromTermsHtml, replaceLegacyContactEmail } from './policyContentMigration';

function findDuplicateOverviewStarts(html: string): number[] {
  return findRegexMatchStarts(html, TERMS_OVERVIEW_DUPLICATE_PATTERN);
}

/** Keep the first Shopify-style Terms block when the CMS body was pasted or merged multiple times. */
export function collapseDuplicateTermsBody(html: string): string {
  const starts = findDuplicateOverviewStarts(html);
  if (starts.length < 2) return html;
  const cutAt = starts[1];
  const truncated = html.slice(0, cutAt);
  return `${truncated}${closeUnclosedHtmlTags(truncated)}`;
}

/** After Section 9 (Shopify) is removed, close the gap by shifting 10–24 down to 9–23. */
export function renumberTermsSectionsAfterShopifyRemoval(html: string): string {
  let next = html;
  for (let section = 10; section <= 24; section += 1) {
    const pattern = new RegExp(`(SECTION\\s+)${section}(\\s*-\\s*)`, 'gi');
    next = next.replace(pattern, `$1${section - 1}$2`);
  }
  return next;
}

export function migrateTermsPolicyHtml(html: string): string {
  let next = collapseDuplicateTermsBody(html);
  next = removeShopifyFromTermsHtml(next);
  next = renumberTermsSectionsAfterShopifyRemoval(next);
  next = replaceLegacyContactEmail(next);
  next = replaceAll(next, TERMS_PRICES_EXCLUDE, TERMS_PRICES_INCLUDE);
  next = replaceAll(next, TERMS_PRICES_INCLUDE_V1, TERMS_PRICES_INCLUDE);
  if (next.includes(HK_INCLUDED_V0) && !next.includes('non-remote')) {
    next = replaceAll(next, HK_INCLUDED_V0, HK_INCLUDED_V1);
  }
  next = replaceAll(next, TERMS_PAYMENT_INCLUDE_SHIPPING, TERMS_PAYMENT_CHECKOUT);
  return next;
}

export function countDuplicateOverviewStarts(html: string): number {
  return findDuplicateOverviewStarts(html).length;
}