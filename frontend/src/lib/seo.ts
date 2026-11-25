import type { Metadata } from 'next';
import type { Product, SiteSettings } from './types';
import { siteOrigin } from './api';
import { listingVariant } from './variants';

export const SHOP_FACTS_BLURB =
  'LUUX is a Hong Kong lighting retailer. Products on this site are replicas, not originals. Posted prices are in HKD. Standard Hong Kong delivery to non-remote addresses is included in the product price; remote Hong Kong areas and overseas shipping (from HK$280) are quoted separately. Contact hello@luuxmart.com or +852 6898 8613.';

const PAGE_DESCRIPTIONS: Record<string, string> = {
  'about-us':
    'About LUUX — a Hong Kong retailer of replica modern lighting. Pendant, wall, table, floor, and ceiling lamps with standard HK delivery included where shown.',
  contact: 'Contact LUUX by email or phone in Hong Kong. Send a message from this page for orders, shipping quotes, and product questions.',
  'privacy-policy': 'How LUUX collects and uses personal information for orders, accounts, and customer service on luuxmart.com.',
  'cookie-policy': 'Which cookies LUUX uses for sign-in, cart, currency, and campaign attribution — and how to allow or reject optional cookies.',
  'refund-policy': 'LUUX 30-day returns and exchanges. How to request a return and when refunds are issued to your original payment method.',
  'terms-of-service': 'Terms for shopping at LUUX — prices in HKD, shipping, payments via Stripe, and Hong Kong governing law.',
  'shipping-policy':
    'Hong Kong standard and remote delivery, overseas shipping from HK$280, and what is included in posted product prices.',
};

const COLLECTION_DESCRIPTIONS: Record<string, string> = {
  pendant: 'Pendant lamps and chandeliers for dining, kitchen, and living spaces.',
  wall: 'Wall lamps and sconces for corridors, bedrooms, and accent lighting.',
  table: 'Table lamps for desks, bedside tables, and reading light.',
  floor: 'Floor lamps and standing lights for living rooms and lounges.',
  ceiling: 'Ceiling lamps and flush mounts for ambient room lighting.',
  all: 'Every published LUUX lamp in one grid — pendant, wall, table, floor, and ceiling lighting.',
};

export function absoluteUrl(path: string): string {
  const origin = siteOrigin();
  if (!path) return origin;
  return path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function canonicalPath(path: string): Metadata['alternates'] {
  return { canonical: absoluteUrl(path) };
}

export function pageDescription(handle: string, fallback: string): string {
  return PAGE_DESCRIPTIONS[handle] || fallback;
}

export function collectionDescription(handle: string, title: string, fallback: string): string {
  return COLLECTION_DESCRIPTIONS[handle] || `${title} — ${fallback}`;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function productListingDescription(product: Product): string {
  const prose = stripHtml(product.body_html);
  if (prose.length >= 80 && !/^(\||\d|ø|sku|watt|voltage|material)/i.test(prose.slice(0, 40))) {
    return prose.slice(0, 155);
  }
  const type = product.product_type ? ` ${product.product_type.toLowerCase()}` : ' lighting';
  return `${product.title} — replica${type} from LUUX in Hong Kong. From HK$${product.price} in Hong Kong dollars with standard local delivery included where shown at checkout.`;
}

export function productIsSpecHeavy(product: Product): boolean {
  const text = stripHtml(product.body_html);
  const hasTable = /<table/i.test(product.body_html);
  if (hasTable && text.length < 120) return true;
  if (text.length < 60) return true;
  const specMarkers = (text.match(/\|/g) || []).length;
  return specMarkers >= 4 && text.length < 200;
}

export function buildPageMetadata({
  path,
  title,
  description,
  image,
  index = true,
}: {
  path: string;
  title: string;
  description: string;
  image?: string;
  index?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const images = image ? [{ url: absoluteUrl(image) }] : undefined;
  return {
    title,
    description,
    alternates: canonicalPath(path),
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'LUUX',
      images,
    },
    twitter: {
      card: images?.length ? 'summary_large_image' : 'summary',
      title,
      description,
      images: images?.map((row) => row.url),
    },
  };
}

export function organizationJsonLd(site: SiteSettings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.company_name || 'LUUX',
    url: absoluteUrl('/'),
    email: site.contact_email,
    telephone: site.contact_phone,
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.contact_address || 'Hong Kong',
      addressCountry: 'HK',
    },
  };
}

export function productJsonLd(product: Product) {
  const variant = listingVariant(product);
  const price = variant?.price || product.price;
  const available = variant?.available ?? product.variants.some((row) => row.available);
  const image = product.images[0]?.src;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: productListingDescription(product),
    sku: variant?.sku || undefined,
    image: image ? absoluteUrl(image) : undefined,
    brand: { '@type': 'Brand', name: 'LUUX' },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/products/${product.handle}`),
      priceCurrency: 'HKD',
      price,
      availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}