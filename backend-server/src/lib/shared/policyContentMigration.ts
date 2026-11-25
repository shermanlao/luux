import {
  closeUnclosedHtmlTags,
  collapseAtSecondMatch,
  findRegexMatchStarts,
  replaceAll,
} from './htmlPolicyUtils';

export const PUBLIC_CONTACT_EMAIL = 'hello@luuxmart.com';
export const LEGACY_CONTACT_EMAIL = 'info@4techhk.com';

export const REFUND_POLICY_DUPLICATE_PATTERN = /We have a 30-day return policy/gi;

const POWERED_BY_SHOPIFY =
  /\s*LUUX is powered by Shopify, which enables us to provide the Services to you\.\s*/gi;

const TERMS_SECTION_9 =
  /<strong>SECTION 9\s*-\s*RELATIONSHIP WITH SHOPIFY<\/strong>[\s\S]*?(?=<strong>SECTION 10\s*-\s*PRIVACY POLICY<\/strong>)/i;

const TERMS_SECTION_10_SHOPIFY_PRIVACY =
  /, and certain personal information may be subject to Shopify['’]s Privacy Policy, which can be viewed <a href="https:\/\/www\.shopify\.com\/legal\/privacy\/app-users">here<\/a>\./gi;

const TERMS_SECTION_10_HOSTED =
  /\s*<br>Because the Services are hosted by Shopify[\s\S]*?use your personal information\.\s*/i;

const TERMS_SHOPIFY_TRADEMARKS =
  /\s*Shopify['’]s name, logo, product and service names, designs and slogans are trademarks of Shopify\.\s*/i;

const PRIVACY_RELATIONSHIP_SECTION = /<h2>Relationship with Shopify<\/h2>\s*<p>[\s\S]*?<\/p>\s*/i;

const PRIVACY_SHOPIFY_AD_EXAMPLE =
  /For example, we use Shopify to support personalized advertising with third-party services based on your online activity with different merchants and websites\.\s*/gi;

const PRIVACY_GPC_SHOPIFY_ACCOUNT =
  /\s*If we are able to associate the device sending the signal to a Shopify account, we will apply the opt out request to the account as well\.\s*/i;

export function replaceLegacyContactEmail(html: string): string {
  let next = html.replace(/<a\s+href="mailto:info@4techhk\.com"[^>]*>\s*<\/a>/gi, '');
  next = replaceAll(next, 'mailto:info@4techhk.com', `mailto:${PUBLIC_CONTACT_EMAIL}`);
  next = replaceAll(next, LEGACY_CONTACT_EMAIL, PUBLIC_CONTACT_EMAIL);
  return next;
}

export function countRefundPolicyStarts(html: string): number {
  return findRegexMatchStarts(html, REFUND_POLICY_DUPLICATE_PATTERN).length;
}

export function collapseDuplicateRefundBody(html: string): string {
  return collapseAtSecondMatch(html, REFUND_POLICY_DUPLICATE_PATTERN, true);
}

export function migrateRefundPolicyHtml(html: string): string {
  let next = collapseDuplicateRefundBody(html);
  next = replaceLegacyContactEmail(next);
  return next;
}

export function removeShopifyFromTermsHtml(html: string): string {
  let next = html.replace(POWERED_BY_SHOPIFY, ' ');
  next = next.replace(TERMS_SECTION_9, '');
  next = next.replace(TERMS_SECTION_10_SHOPIFY_PRIVACY, '.');
  next = next.replace(/\bthese privacy policies\b/gi, 'our Privacy Policy');
  next = next.replace(TERMS_SECTION_10_HOSTED, ' <br>');
  next = replaceAll(next, 'how we, Shopify, and our partners', 'how we and our partners');
  next = replaceAll(next, 'LUUX, Shopify or any third party', 'LUUX or any third party');
  next = next.replace(TERMS_SHOPIFY_TRADEMARKS, ' ');
  next = replaceAll(next, 'harm LUUX, Shopify or users', 'harm LUUX or users');
  next = replaceAll(next, 'THOSE OF SHOPIFY AND ITS AFFILIATES, ', '');
  next = replaceAll(next, 'hold harmless LUUX, Shopify, and our', 'hold harmless LUUX and our');
  return next;
}

export function migratePrivacyPolicyHtml(html: string): string {
  let next = replaceLegacyContactEmail(html);
  next = next.replace(POWERED_BY_SHOPIFY, ' ');
  next = replaceAll(
    next,
    'With Shopify, vendors and other third parties who perform services on our behalf',
    'With vendors and other third parties who perform services on our behalf'
  );
  next = next.replace(PRIVACY_SHOPIFY_AD_EXAMPLE, '');
  next = next.replace(PRIVACY_RELATIONSHIP_SECTION, '');
  next = next.replace(PRIVACY_GPC_SHOPIFY_ACCOUNT, ' ');
  return next;
}

export function containsShopifyMention(html: string): boolean {
  return /shopify/i.test(html);
}

export function containsLegacyEmail(html: string): boolean {
  return /info@4techhk\.com/i.test(html);
}

/** Shared HTML truncation helper exported for terms duplicate collapse. */
export { closeUnclosedHtmlTags, findRegexMatchStarts };