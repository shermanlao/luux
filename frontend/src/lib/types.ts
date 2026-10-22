export type ProductImage = { id: number; src: string; alt: string; position: number };
export type ProductOption = { id: number; name: string; position: number; values: string[] };
export type Variant = {
  id: number;
  title: string;
  sku: string;
  price: string;
  compare_at_price: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  stock: number;
  image_id: number | null;
  available: boolean;
};

export type Product = {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string;
  published: boolean;
  featured: boolean;
  price: string;
  images: ProductImage[];
  options: ProductOption[];
  variants: Variant[];
  collections: Array<{ id: number; title: string; handle: string }>;
};

export type Collection = {
  id: number;
  title: string;
  handle: string;
  description: string;
  image: string;
  sort_order: number;
  published: boolean;
  products_count: number;
};

export type Page = {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  kind: 'page' | 'policy';
};

export type SiteSettings = {
  company_name: string;
  slogan: string;
  hero_heading: string;
  hero_subheading: string;
  hero_image: string;
  hero_cta_label: string;
  hero_cta_href: string;
  featured_heading: string;
  featured_handles: string[];
  story_heading: string;
  story_body: string;
  shop_heading: string;
  shop_body: string;
  sanctuary_heading: string;
  newsletter_heading: string;
  newsletter_body: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  facebook_url: string;
  instagram_url: string;
  threads_url: string;
  pinterest_url: string;
  seo_title: string;
  seo_description: string;
  logo_icon: string;
};

export type SitePayload = { site: SiteSettings; collections: Collection[] };

export type ShippingRate = {
  id: number;
  name: string;
  code: string;
  amount: string;
  countries: string;
  sort_order: number;
};

export type Order = {
  id: number;
  number: string;
  email: string;
  status: string;
  subtotal: string;
  shipping_amount: string;
  total: string;
  currency: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_line1: string;
  shipping_line2: string;
  shipping_city: string;
  shipping_region: string;
  shipping_postal: string;
  shipping_country: string;
  shipping_rate_name: string;
  createdAt?: string;
  items: Array<{
    id: number;
    title: string;
    variant_title: string;
    sku: string;
    quantity: number;
    unit_price: string;
  }>;
};

export type CartLine = {
  variant_id: number;
  product_id: number;
  handle: string;
  title: string;
  variant_title: string;
  price: string;
  image: string;
  quantity: number;
};
