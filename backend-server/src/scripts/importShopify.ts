import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import sequelize from '../database';
import { slugify } from '../lib/shared/slugify';
import { absoluteUploadPath, ensureDir, extensionFromUrl, publicUploadPath } from '../lib/uploads';
import Collection from '../models/Collection';
import Page from '../models/Page';
import Product from '../models/Product';
import ProductCollection from '../models/ProductCollection';
import ProductImage from '../models/ProductImage';
import ProductOption from '../models/ProductOption';
import SiteSetting from '../models/SiteSetting';
import Variant from '../models/Variant';

const ORIGIN = process.env.SHOPIFY_ORIGIN || 'https://luuxmart.com';
const FEATURED_TITLES = [
  'Oboe - Pendant Lamp',
  'Laputa - Pendant Lamp',
  'Conduit - Pendant Lamp',
  'Bowling Pin - Pendant Lamp',
];

type ShopifyImage = { id: number; src: string; alt: string | null; position: number; variant_ids?: number[] };
type ShopifyOption = { name: string; position?: number; values: string[] };
type ShopifyVariant = {
  id: number;
  title: string;
  sku: string | null;
  price: string;
  compare_at_price: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  featured_image?: { src?: string } | null;
  inventory_quantity?: number | null;
  available?: boolean;
};
type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  tags: string[] | string;
  images: ShopifyImage[];
  options: ShopifyOption[];
  variants: ShopifyVariant[];
};
type ShopifyCollection = {
  id: number;
  title: string;
  handle: string;
  description: string;
  image?: { src?: string } | null;
};

function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib
      .get(url, { headers: { 'User-Agent': 'luux-importer/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchJson<T>(res.headers.location).then(resolve, reject);
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk as Buffer));
        res.on('end', () => {
          if ((res.statusCode || 500) >= 400) {
            reject(new Error(`${url} -> ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T);
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
}

function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib
      .get(url, { headers: { 'User-Agent': 'luux-importer/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuffer(res.headers.location).then(resolve, reject);
          return;
        }
        if ((res.statusCode || 500) >= 400) {
          reject(new Error(`${url} -> ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk as Buffer));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

function fetchText(url: string): Promise<string> {
  return fetchBuffer(url).then((buf) => buf.toString('utf8'));
}

async function downloadTo(url: string, absPath: string): Promise<void> {
  if (fs.existsSync(absPath) && fs.statSync(absPath).size > 0) return;
  ensureDir(path.dirname(absPath));
  const buf = await fetchBuffer(url);
  fs.writeFileSync(absPath, buf);
}

function tagsOf(product: ShopifyProduct): string {
  return Array.isArray(product.tags) ? product.tags.join(', ') : String(product.tags || '');
}

async function importPages(): Promise<void> {
  try {
    const data = await fetchJson<{ pages: Array<{ title: string; handle: string; body_html: string | null }> }>(
      `${ORIGIN}/pages.json`
    );
    for (const page of data.pages || []) {
      if (!page.handle || page.handle.startsWith('html-sitemap') || page.handle === 'data-sharing-opt-out') continue;
      const handle = page.handle === '聯絡我們' ? 'contact' : page.handle;
      const existing = await Page.findOne({ where: { handle } });
      const body = page.body_html || '';
      if (!body.trim()) continue;
      if (existing) {
        existing.title = page.title;
        existing.body_html = body;
        await existing.save();
      } else {
        await Page.create({ title: page.title, handle, body_html: body, kind: 'page' });
      }
    }
  } catch (error) {
    console.warn('pages.json skipped', error);
  }

  const policies = [
    ['privacy-policy', 'Privacy policy'],
    ['refund-policy', 'Refund policy'],
    ['terms-of-service', 'Terms of service'],
  ];
  for (const [handle, title] of policies) {
    try {
      const html = await fetchText(`${ORIGIN}/policies/${handle}`);
      const match = html.match(/<div[^>]+class="[^"]*shopify-policy__body[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const body = match ? match[1].trim() : '';
      if (!body) continue;
      const existing = await Page.findOne({ where: { handle } });
      if (existing) {
        existing.body_html = body;
        await existing.save();
      } else {
        await Page.create({ title, handle, body_html: body, kind: 'policy' });
      }
    } catch (error) {
      console.warn(`policy ${handle} skipped`, error);
    }
  }
}

async function importHero(site: SiteSetting): Promise<void> {
  try {
    const html = await fetchText(ORIGIN + '/');
    const match =
      html.match(/<img[^>]+class="[^"]*banner[^"]*"[^>]+src="([^"]+)"/i) ||
      html.match(/src="(https:\/\/cdn\.shopify\.com\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
    if (!match) return;
    const url = match[1].replace(/&amp;/g, '&');
    const abs = absoluteUploadPath('site', 'hero.jpg');
    await downloadTo(url, abs);
    site.hero_image = publicUploadPath('site', 'hero.jpg');
    await site.save();
  } catch (error) {
    console.warn('hero image skipped', error);
  }
}

async function main(): Promise<void> {
  await sequelize.sync();
  ensureDir(absoluteUploadPath('products'));
  ensureDir(absoluteUploadPath('collections'));
  ensureDir(absoluteUploadPath('site'));

  console.log('Fetching collections…');
  const collectionsJson = await fetchJson<{ collections: ShopifyCollection[] }>(`${ORIGIN}/collections.json`);
  const shopifyCollections = (collectionsJson.collections || []).filter(
    (row) => !['frontpage', 'all'].includes(row.handle)
  );

  const collectionByHandle = new Map<string, Collection>();
  for (const [index, row] of shopifyCollections.entries()) {
    let imagePath = '';
    if (row.image?.src) {
      const filename = `${row.handle}${extensionFromUrl(row.image.src)}`;
      await downloadTo(row.image.src, absoluteUploadPath('collections', filename));
      imagePath = publicUploadPath('collections', filename);
    }
    const existing = await Collection.findOne({ where: { handle: row.handle } });
    const payload = {
      title: row.title,
      handle: row.handle,
      description: row.description || '',
      image: imagePath,
      sort_order: index + 1,
      published: true,
    };
    const collection = existing ? await existing.update(payload) : await Collection.create(payload);
    collectionByHandle.set(row.handle, collection);
  }

  console.log('Fetching products…');
  const productsJson = await fetchJson<{ products: ShopifyProduct[] }>(`${ORIGIN}/products.json?limit=250`);
  const shopifyProducts = productsJson.products || [];
  console.log(`Found ${shopifyProducts.length} products`);

  const membership = new Map<number, Set<string>>();
  for (const collection of shopifyCollections) {
    try {
      const data = await fetchJson<{ products: Array<{ id: number }> }>(
        `${ORIGIN}/collections/${collection.handle}/products.json?limit=250`
      );
      for (const product of data.products || []) {
        if (!membership.has(product.id)) membership.set(product.id, new Set());
        membership.get(product.id)!.add(collection.handle);
      }
    } catch (error) {
      console.warn(`collection products ${collection.handle} skipped`, error);
    }
  }

  for (const [index, shopify] of shopifyProducts.entries()) {
    process.stdout.write(`\rProduct ${index + 1}/${shopifyProducts.length} ${shopify.title}          `);
    const handle = shopify.handle || slugify(shopify.title);
    let product = await Product.findOne({ where: { shopify_id: String(shopify.id) } });
    if (!product) product = await Product.findOne({ where: { handle } });
    const payload = {
      title: shopify.title,
      handle,
      body_html: shopify.body_html || '',
      vendor: shopify.vendor || 'LUUX',
      product_type: shopify.product_type || '',
      tags: tagsOf(shopify),
      published: true,
      featured: FEATURED_TITLES.includes(shopify.title),
      shopify_id: String(shopify.id),
    };
    if (product) await product.update(payload);
    else product = await Product.create(payload);

    await ProductImage.destroy({ where: { product_id: product.id } });
    await ProductOption.destroy({ where: { product_id: product.id } });
    await Variant.destroy({ where: { product_id: product.id } });
    await ProductCollection.destroy({ where: { product_id: product.id } });

    const imageIdByShopify = new Map<number, number>();
    for (const image of shopify.images || []) {
      const filename = `${handle}-${image.position || 1}-${image.id}${extensionFromUrl(image.src)}`;
      try {
        await downloadTo(image.src, absoluteUploadPath('products', filename));
      } catch (error) {
        console.warn(`\nimage failed ${image.src}`, error);
        continue;
      }
      const row = await ProductImage.create({
        product_id: product.id,
        src: publicUploadPath('products', filename),
        alt: image.alt || shopify.title,
        position: image.position || 0,
      });
      imageIdByShopify.set(image.id, row.id);
    }

    for (const option of shopify.options || []) {
      if (option.name === 'Title' && option.values.length === 1 && option.values[0] === 'Default Title') continue;
      await ProductOption.create({
        product_id: product.id,
        name: option.name,
        position: option.position || 1,
        values_json: JSON.stringify(option.values || []),
      });
    }

    for (const variant of shopify.variants || []) {
      const imageSrc = variant.featured_image?.src;
      let image_id: number | null = null;
      if (imageSrc) {
        const match = (shopify.images || []).find((image) => image.src === imageSrc);
        if (match) image_id = imageIdByShopify.get(match.id) || null;
      }
      const stock =
        typeof variant.inventory_quantity === 'number'
          ? Math.max(0, variant.inventory_quantity)
          : variant.available === false
            ? 0
            : 10;
      await Variant.create({
        product_id: product.id,
        title: variant.title || 'Default Title',
        sku: variant.sku || '',
        price: Number(variant.price || 0).toFixed(2),
        compare_at_price: variant.compare_at_price ? Number(variant.compare_at_price).toFixed(2) : null,
        option1: variant.option1,
        option2: variant.option2,
        option3: variant.option3,
        stock,
        image_id,
        shopify_id: String(variant.id),
      });
    }

    const handles = membership.get(shopify.id);
    if (handles) {
      for (const collectionHandle of handles) {
        const collection = collectionByHandle.get(collectionHandle);
        if (!collection) continue;
        await ProductCollection.create({ product_id: product.id, collection_id: collection.id });
      }
    }
  }

  const featured = await Product.findAll({ where: { featured: true } });
  const site = await SiteSetting.findByPk(1);
  if (site) {
    site.featured_handles = JSON.stringify(featured.map((row) => row.handle));
    await site.save();
    await importHero(site);
  }
  await importPages();
  console.log('\nImport complete.');
}

main()
  .then(() => sequelize.close())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
