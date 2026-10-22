import type Collection from '../models/Collection';
import type Order from '../models/Order';
import type OrderItem from '../models/OrderItem';
import type Page from '../models/Page';
import type Product from '../models/Product';
import type ProductImage from '../models/ProductImage';
import type ProductOption from '../models/ProductOption';
import type SiteSetting from '../models/SiteSetting';
import type Variant from '../models/Variant';
import type ShippingRate from '../models/ShippingRate';

function parseJsonArray(raw: string | null | undefined): string[] {
  try {
    const value = JSON.parse(raw || '[]');
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

export function serializeImage(image: ProductImage) {
  return {
    id: image.id,
    src: image.src,
    alt: image.alt,
    position: image.position,
  };
}

export function serializeVariant(variant: Variant) {
  return {
    id: variant.id,
    title: variant.title,
    sku: variant.sku,
    price: variant.price,
    compare_at_price: variant.compare_at_price,
    option1: variant.option1,
    option2: variant.option2,
    option3: variant.option3,
    stock: variant.stock,
    image_id: variant.image_id,
    available: variant.stock > 0,
  };
}

export function serializeOption(option: ProductOption) {
  return {
    id: option.id,
    name: option.name,
    position: option.position,
    values: parseJsonArray(option.values_json),
  };
}

export function serializeProduct(
  product: Product & {
    images?: ProductImage[];
    options?: ProductOption[];
    variants?: Variant[];
    collections?: Collection[];
  },
  extra?: { collection_handles?: string[] }
) {
  const images = [...(product.images || [])].sort((a, b) => a.position - b.position);
  const variants = product.variants || [];
  const minPrice = variants.reduce((min, variant) => {
    const price = Number(variant.price);
    return Number.isFinite(price) && price < min ? price : min;
  }, Number.POSITIVE_INFINITY);
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    body_html: product.body_html,
    vendor: product.vendor,
    product_type: product.product_type,
    tags: product.tags,
    published: product.published,
    featured: product.featured,
    price: Number.isFinite(minPrice) ? minPrice.toFixed(2) : '0.00',
    images: images.map(serializeImage),
    options: [...(product.options || [])]
      .sort((a, b) => a.position - b.position)
      .map(serializeOption),
    variants: variants.map(serializeVariant),
    collections: (product.collections || []).map((row) => ({
      id: row.id,
      title: row.title,
      handle: row.handle,
    })),
    collection_handles: extra?.collection_handles,
  };
}

export function serializeCollection(
  collection: Collection & { products?: Product[] },
  productCount?: number
) {
  return {
    id: collection.id,
    title: collection.title,
    handle: collection.handle,
    description: collection.description,
    image: collection.image,
    sort_order: collection.sort_order,
    published: collection.published,
    products_count: productCount ?? collection.products?.length ?? 0,
  };
}

export function serializePage(page: Page) {
  return {
    id: page.id,
    title: page.title,
    handle: page.handle,
    body_html: page.body_html,
    kind: page.kind,
  };
}

export function serializeSite(site: SiteSetting) {
  return {
    company_name: site.company_name,
    slogan: site.slogan,
    hero_heading: site.hero_heading,
    hero_subheading: site.hero_subheading,
    hero_image: site.hero_image,
    hero_cta_label: site.hero_cta_label,
    hero_cta_href: site.hero_cta_href,
    featured_heading: site.featured_heading,
    featured_handles: parseJsonArray(site.featured_handles),
    story_heading: site.story_heading,
    story_body: site.story_body,
    shop_heading: site.shop_heading,
    shop_body: site.shop_body,
    sanctuary_heading: site.sanctuary_heading,
    newsletter_heading: site.newsletter_heading,
    newsletter_body: site.newsletter_body,
    contact_email: site.contact_email,
    contact_phone: site.contact_phone,
    contact_address: site.contact_address,
    facebook_url: site.facebook_url,
    instagram_url: site.instagram_url,
    threads_url: site.threads_url,
    pinterest_url: site.pinterest_url,
    seo_title: site.seo_title,
    seo_description: site.seo_description,
    logo_icon: site.logo_icon,
  };
}

export function serializeShipping(rate: ShippingRate) {
  return {
    id: rate.id,
    name: rate.name,
    code: rate.code,
    amount: rate.amount,
    countries: rate.countries,
    sort_order: rate.sort_order,
  };
}

export function serializeOrder(order: Order & { items?: OrderItem[] }) {
  return {
    id: order.id,
    number: order.number,
    email: order.email,
    status: order.status,
    subtotal: order.subtotal,
    shipping_amount: order.shipping_amount,
    total: order.total,
    currency: order.currency,
    shipping_name: order.shipping_name,
    shipping_phone: order.shipping_phone,
    shipping_line1: order.shipping_line1,
    shipping_line2: order.shipping_line2,
    shipping_city: order.shipping_city,
    shipping_region: order.shipping_region,
    shipping_postal: order.shipping_postal,
    shipping_country: order.shipping_country,
    shipping_rate_name: order.shipping_rate_name,
    stripe_session_id: order.stripe_session_id,
    createdAt: order.createdAt,
    items: (order.items || []).map((item) => ({
      id: item.id,
      title: item.title,
      variant_title: item.variant_title,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
  };
}

export const PRODUCT_INCLUDE = [
  { association: 'images' },
  { association: 'options' },
  { association: 'variants' },
  { association: 'collections' },
];
