import { dbDialect } from '../database';
import Page from '../models/Page';
import Product from '../models/Product';
import ShippingRate from '../models/ShippingRate';
import SiteSetting from '../models/SiteSetting';
import Variant from '../models/Variant';
import { productSearchOperator, productSearchPattern } from './shared/product-search';
import { contactAnswer, plainExcerpt, policyHandle, productSearchWords, receptionIntent, shippingAnswer } from './shared/receptionist';

function money(amount: string): string {
  const value = String(amount || '').trim();
  return value ? `HK$${value}` : '';
}

function lowestPrice(variants: Variant[]): string {
  const amounts = variants
    .map((variant) => Number(variant.price))
    .filter((amount) => Number.isFinite(amount));
  if (!amounts.length) return '';
  return money(Math.min(...amounts).toFixed(2));
}

async function matchingProducts(query: string, limit: number) {
  const words = productSearchWords(query);
  const pattern = productSearchPattern(words.sort((a, b) => b.length - a.length)[0] || '');
  if (!pattern) return [];
  const found = await Product.findAll({
    where: { published: true, title: { [productSearchOperator(dbDialect)]: pattern } },
    include: [{ model: Variant, as: 'variants' }],
    limit: 12,
  });
  const matched = found.filter((product) => {
    const title = product.title.toLowerCase();
    return words.every((word) => title.includes(word));
  });
  return matched.slice(0, limit);
}

export async function shopFacts(site: SiteSetting, query: string): Promise<string> {
  const [rates, pages, products] = await Promise.all([
    ShippingRate.findAll({ order: [['sort_order', 'ASC']] }),
    Page.findAll({ where: { kind: 'policy' } }),
    matchingProducts(query, 4),
  ]);
  const lines = [
    `Shop: ${site.company_name || 'LUUX'}`,
    contactAnswer(site) || '',
    ...rates.map((rate) => `${rate.name} (${rate.code}): HK$${rate.amount}`),
    ...pages.map((page) => `${page.title} (/policies/${page.handle}): ${plainExcerpt(page.body_html, 280)}`),
    ...products.map((product) => {
      const variants = (product.get('variants') as Variant[]) || [];
      const price = lowestPrice(variants);
      return `${product.title} (/products/${product.handle})${price ? ` from ${price}` : ''}`;
    }),
  ].filter(Boolean);
  return lines.join('\n');
}

export async function simpleShopAnswer(site: SiteSetting, text: string): Promise<string | null> {
  const intent = receptionIntent(text);
  if (intent === 'shipping') {
    const rates = await ShippingRate.findAll({ order: [['sort_order', 'ASC']] });
    return shippingAnswer(text, rates);
  }
  if (intent === 'contact') return contactAnswer(site);
  if (intent === 'policy') {
    const handle = policyHandle(text);
    if (!handle) return null;
    const page = await Page.findOne({ where: { handle, kind: 'policy' } });
    if (!page) return null;
    const excerpt = plainExcerpt(page.body_html, 500);
    if (!excerpt) return null;
    return `${page.title}: ${excerpt}`;
  }
  if (intent === 'product') {
    const products = await matchingProducts(text, 2);
    if (products.length !== 1) return null;
    const product = products[0];
    const variants = (product.get('variants') as Variant[]) || [];
    const price = lowestPrice(variants);
    return `${product.title} is on the shop at /products/${product.handle}${price ? `. It starts at ${price}.` : '.'}`;
  }
  return null;
}
