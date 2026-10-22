import { Router } from 'express';
import { asyncHandler, notFound } from '../lib/asyncHandler';
import { requireAdmin } from '../lib/authMiddleware';
import { slugify } from '../lib/shared/slugify';
import { PRODUCT_INCLUDE, serializeCollection, serializeProduct } from '../lib/serialize';
import Collection from '../models/Collection';
import Product from '../models/Product';
import ProductCollection from '../models/ProductCollection';
import ProductImage from '../models/ProductImage';
import ProductOption from '../models/ProductOption';
import Variant from '../models/Variant';

const router = Router();
router.use(requireAdmin());

router.get(
  '/products',
  asyncHandler(async (_req, res) => {
    const products = await Product.findAll({
      include: PRODUCT_INCLUDE,
      order: [['id', 'DESC']],
    });
    res.json({ products: products.map((product) => serializeProduct(product)) });
  })
);

router.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findByPk(req.params.id, { include: PRODUCT_INCLUDE });
    if (!product) return notFound(res, 'Product');
    res.json({ product: serializeProduct(product) });
  })
);

async function saveVariantsAndOptions(productId: number, body: Record<string, unknown>) {
  if (Array.isArray(body.options)) {
    await ProductOption.destroy({ where: { product_id: productId } });
    for (const [index, raw] of body.options.entries()) {
      const option = raw as { name?: string; values?: string[] };
      await ProductOption.create({
        product_id: productId,
        name: String(option.name || `Option ${index + 1}`),
        position: index + 1,
        values_json: JSON.stringify(option.values || []),
      });
    }
  }
  if (Array.isArray(body.variants)) {
    const keepIds: number[] = [];
    for (const raw of body.variants) {
      const row = raw as {
        id?: number;
        title?: string;
        sku?: string;
        price?: string;
        compare_at_price?: string | null;
        option1?: string | null;
        option2?: string | null;
        option3?: string | null;
        stock?: number;
        image_id?: number | null;
      };
      const payload = {
        product_id: productId,
        title: String(row.title || [row.option1, row.option2, row.option3].filter(Boolean).join(' / ') || 'Default Title'),
        sku: String(row.sku || ''),
        price: Number(row.price || 0).toFixed(2),
        compare_at_price: row.compare_at_price ? Number(row.compare_at_price).toFixed(2) : null,
        option1: row.option1 || null,
        option2: row.option2 || null,
        option3: row.option3 || null,
        stock: Number.isFinite(Number(row.stock)) ? Number(row.stock) : 0,
        image_id: row.image_id || null,
      };
      if (row.id) {
        const existing = await Variant.findOne({ where: { id: row.id, product_id: productId } });
        if (existing) {
          await existing.update(payload);
          keepIds.push(existing.id);
          continue;
        }
      }
      const created = await Variant.create(payload);
      keepIds.push(created.id);
    }
    const extras = await Variant.findAll({ where: { product_id: productId } });
    for (const extra of extras) {
      if (!keepIds.includes(extra.id)) await extra.destroy();
    }
  }
  if (Array.isArray(body.collection_ids)) {
    await ProductCollection.destroy({ where: { product_id: productId } });
    for (const id of body.collection_ids) {
      await ProductCollection.create({ product_id: productId, collection_id: Number(id) });
    }
  }
}

router.post(
  '/products',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const title = String(body.title || '').trim();
    if (!title) {
      res.status(400).json({ error: 'Title is required.' });
      return;
    }
    const handle = slugify(String(body.handle || title));
    const product = await Product.create({
      title,
      handle,
      body_html: String(body.body_html || ''),
      vendor: String(body.vendor || 'LUUX'),
      product_type: String(body.product_type || ''),
      tags: String(body.tags || ''),
      published: body.published !== false,
      featured: Boolean(body.featured),
    });
    await saveVariantsAndOptions(product.id, body);
    const fresh = await Product.findByPk(product.id, { include: PRODUCT_INCLUDE });
    res.json({ product: serializeProduct(fresh!) });
  })
);

router.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findByPk(req.params.id);
    if (!product) return notFound(res, 'Product');
    const body = req.body || {};
    if (body.title != null) product.title = String(body.title);
    if (body.handle != null) product.handle = slugify(String(body.handle || product.title));
    if (body.body_html != null) product.body_html = String(body.body_html);
    if (body.vendor != null) product.vendor = String(body.vendor);
    if (body.product_type != null) product.product_type = String(body.product_type);
    if (body.tags != null) product.tags = String(body.tags);
    if (body.published != null) product.published = Boolean(body.published);
    if (body.featured != null) product.featured = Boolean(body.featured);
    await product.save();
    await saveVariantsAndOptions(product.id, body);
    const fresh = await Product.findByPk(product.id, { include: PRODUCT_INCLUDE });
    res.json({ product: serializeProduct(fresh!) });
  })
);

router.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findByPk(req.params.id);
    if (!product) return notFound(res, 'Product');
    await product.destroy();
    res.json({ ok: true });
  })
);

router.post(
  '/products/:id/images',
  asyncHandler(async (req, res) => {
    const product = await Product.findByPk(req.params.id);
    if (!product) return notFound(res, 'Product');
    const src = String(req.body?.src || '');
    if (!src) {
      res.status(400).json({ error: 'Image path is required.' });
      return;
    }
    const max = (await ProductImage.max('position', { where: { product_id: product.id } })) as number | null;
    const image = await ProductImage.create({
      product_id: product.id,
      src,
      alt: String(req.body?.alt || product.title),
      position: (max || 0) + 1,
    });
    res.json({ image: { id: image.id, src: image.src, alt: image.alt, position: image.position } });
  })
);

router.delete(
  '/images/:id',
  asyncHandler(async (req, res) => {
    const image = await ProductImage.findByPk(req.params.id);
    if (!image) return notFound(res, 'Image');
    await image.destroy();
    res.json({ ok: true });
  })
);

router.get(
  '/collections',
  asyncHandler(async (_req, res) => {
    const collections = await Collection.findAll({
      include: [{ association: 'products', attributes: ['id'] }],
      order: [
        ['sort_order', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    res.json({
      collections: collections.map((row) => serializeCollection(row as Collection & { products?: Product[] })),
    });
  })
);

router.put(
  '/collections/:id',
  asyncHandler(async (req, res) => {
    const collection = await Collection.findByPk(req.params.id);
    if (!collection) return notFound(res, 'Collection');
    const body = req.body || {};
    if (body.title != null) collection.title = String(body.title);
    if (body.handle != null) collection.handle = slugify(String(body.handle || collection.title));
    if (body.description != null) collection.description = String(body.description);
    if (body.image != null) collection.image = String(body.image);
    if (body.sort_order != null) collection.sort_order = Number(body.sort_order) || 0;
    if (body.published != null) collection.published = Boolean(body.published);
    await collection.save();
    if (Array.isArray(body.product_ids)) {
      await ProductCollection.destroy({ where: { collection_id: collection.id } });
      for (const id of body.product_ids) {
        await ProductCollection.create({ collection_id: collection.id, product_id: Number(id) });
      }
    }
    res.json({ collection: serializeCollection(collection) });
  })
);

export default router;
