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

const VOID_HTML_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const TAG_TOKEN = /<\s*(\/?)\s*([a-zA-Z][\w:-]*)([^>]*?)(\/?)\s*>/g;

function findDuplicateOverviewStarts(html: string): number[] {
  const pattern = new RegExp(TERMS_OVERVIEW_DUPLICATE_PATTERN.source, TERMS_OVERVIEW_DUPLICATE_PATTERN.flags);
  const starts: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    starts.push(match.index);
    if (match.index === pattern.lastIndex) pattern.lastIndex += 1;
  }
  return starts;
}

function closeUnclosedHtmlTags(html: string): string {
  const stack: string[] = [];
  let token: RegExpExecArray | null;
  const scanner = new RegExp(TAG_TOKEN.source, TAG_TOKEN.flags);
  while ((token = scanner.exec(html)) !== null) {
    const isClose = token[1] === '/';
    const name = token[2].toLowerCase();
    const selfClose = token[4] === '/' || VOID_HTML_TAGS.has(name);
    if (selfClose) continue;
    if (isClose) {
      if (stack.length > 0 && stack[stack.length - 1] === name) {
        stack.pop();
      } else if (stack.includes(name)) {
        while (stack.length > 0 && stack[stack.length - 1] !== name) stack.pop();
        if (stack.length > 0) stack.pop();
      }
    } else {
      stack.push(name);
    }
  }
  if (stack.length === 0) return '';
  return stack
    .reverse()
    .map((tag) => `</${tag}>`)
    .join('');
}

/** Keep the first Shopify-style Terms block when the CMS body was pasted or merged multiple times. */
export function collapseDuplicateTermsBody(html: string): string {
  const starts = findDuplicateOverviewStarts(html);
  if (starts.length < 2) return html;
  const cutAt = starts[1];
  const truncated = html.slice(0, cutAt);
  return `${truncated}${closeUnclosedHtmlTags(truncated)}`;
}

function replaceAll(haystack: string, needle: string, replacement: string): string {
  if (!needle || !haystack.includes(needle)) return haystack;
  return haystack.split(needle).join(replacement);
}

export function migrateTermsPolicyHtml(html: string): string {
  let next = collapseDuplicateTermsBody(html);
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