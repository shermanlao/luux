import { Router } from 'express';
import { Op } from 'sequelize';
import { asyncHandler, notFound } from '../lib/asyncHandler';
import { requireAdmin } from '../lib/authMiddleware';
import { editProductPhotoFile, saveProductImageDataUrl } from '../lib/productPhotoEdit';
import { slugify } from '../lib/shared/slugify';
import { importProductFromUrl } from '../lib/productImport';
import { PRODUCT_INCLUDE, serializeCollection, serializeProduct } from '../lib/serialize';
import Collection from '../models/Collection';
import Product from '../models/Product';
import SiteSetting from '../models/SiteSetting';
import ProductCollection from '../models/ProductCollection';
import ProductImage from '../models/ProductImage';
import ProductOption from '../models/ProductOption';
import Variant from '../models/Variant';

const router = Router();
router.use(requireAdmin());

function clip(value: unknown, max = 255): string {
  const text = String(value ?? '');
  return text.length <= max ? text : text.slice(0, max);
}

function adminProduct(product: Product) {
  return serializeProduct(product, { admin: true });
}

router.get(
  '/products',
  asyncHandler(async (_req, res) => {
    const products = await Product.findAll({
      include: PRODUCT_INCLUDE,
      order: [['id', 'DESC']],
    });
    res.json({ products: products.map((product) => adminProduct(product)) });
  })
);

router.post(
  '/products/import',
  asyncHandler(async (req, res) => {
    const url = String(req.body?.url || '').trim();
    if (!url) {
      res.status(400).json({ error: 'Paste a product link.' });
      return;
    }
    const site = await SiteSetting.findByPk(1);
    const collections = await Collection.findAll({ order: [['title', 'ASC']] });
    const known = collections.map((row) => ({
      id: row.id,
      title: row.title,
      handle: row.handle,
    }));
    try {
      const product = await importProductFromUrl(
        url,
        {
          baseUrl: site?.ai_base_url || '',
          apiKey: site?.ai_api_key || '',
          model: site?.ai_model || '',
        },
        known
      );
      res.json({ product });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read that product link.';
      res.status(400).json({ error: message });
    }
  })
);

router.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findByPk(req.params.id, { include: PRODUCT_INCLUDE });
    if (!product) return notFound(res, 'Product');
    res.json({ product: adminProduct(product) });
  })
);

async function saveVariantsAndOptions(productId: number, body: Record<string, unknown>) {
  if (Array.isArray(body.options)) {
    await ProductOption.destroy({ where: { product_id: productId } });
    for (const [index, raw] of body.options.entries()) {
      const option = raw as { name?: string; values?: string[] };
      await ProductOption.create({
        product_id: productId,
        name: clip(option.name || `Option ${index + 1}`),
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
        title: clip(row.title || [row.option1, row.option2, row.option3].filter(Boolean).join(' / ') || 'Default Title'),
        sku: clip(row.sku || ''),
        price: Number(row.price || 0).toFixed(2),
        compare_at_price: row.compare_at_price ? Number(row.compare_at_price).toFixed(2) : null,
        option1: row.option1 ? clip(row.option1) : null,
        option2: row.option2 ? clip(row.option2) : null,
        option3: row.option3 ? clip(row.option3) : null,
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
    const existing = await Product.findOne({ where: { handle } });
    if (existing) {
      res.status(409).json({ error: 'A product with this handle already exists.', product_id: existing.id });
      return;
    }
    const product = await Product.create({
      title: clip(title),
      handle,
      body_html: String(body.body_html || ''),
      vendor: clip(String(body.vendor || 'LUUX').trim() || 'LUUX'),
      vendor_url: String(body.vendor_url || ''),
      vendor_contact: String(body.vendor_contact || ''),
      product_type: String(body.product_type || ''),
      tags: String(body.tags || ''),
      published: body.published !== false,
      featured: Boolean(body.featured),
    });
    await saveVariantsAndOptions(product.id, body);
    const fresh = await Product.findByPk(product.id, { include: PRODUCT_INCLUDE });
    res.json({ product: adminProduct(fresh!) });
  })
);

router.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findByPk(req.params.id);
    if (!product) return notFound(res, 'Product');
    const body = req.body || {};
    if (body.title != null) product.title = clip(String(body.title).trim());
    if (body.handle != null) {
      const handle = slugify(String(body.handle || product.title));
      const taken = await Product.findOne({ where: { handle, id: { [Op.ne]: product.id } } });
      if (taken) {
        res.status(409).json({ error: 'A product with this handle already exists.', product_id: taken.id });
        return;
      }
      product.handle = handle;
    }
    if (body.body_html != null) product.body_html = String(body.body_html);
    if (body.vendor != null) product.vendor = clip(String(body.vendor).trim() || 'LUUX');
    if (body.vendor_url != null) product.vendor_url = String(body.vendor_url);
    if (body.vendor_contact != null) product.vendor_contact = String(body.vendor_contact);
    if (body.product_type != null) product.product_type = String(body.product_type);
    if (body.tags != null) product.tags = String(body.tags);
    if (body.published != null) product.published = Boolean(body.published);
    if (body.featured != null) product.featured = Boolean(body.featured);
    await product.save();
    await saveVariantsAndOptions(product.id, body);
    const fresh = await Product.findByPk(product.id, { include: PRODUCT_INCLUDE });
    res.json({ product: adminProduct(fresh!) });
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
      alt: clip(req.body?.alt || product.title),
      position: (max || 0) + 1,
    });
    res.json({ image: { id: image.id, src: image.src, alt: image.alt, position: image.position } });
  })
);

router.post(
  '/products/images/edit',
  asyncHandler(async (req, res) => {
    const instruction = String(req.body?.instruction || '');
    const src = String(req.body?.src || '');
    const imageDataUrl = String(req.body?.imageDataUrl || '');
    try {
      const site = await SiteSetting.findByPk(1);
      const saved = instruction.trim()
        ? await editProductPhotoFile({
            src,
            imageDataUrl,
            instruction,
            slotLabel: String(req.body?.slotLabel || ''),
            baseUrl: site?.ai_base_url || '',
            apiKey: site?.ai_api_key || '',
          })
        : saveProductImageDataUrl(imageDataUrl);
      res.json({ src: saved });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The photo could not be edited.';
      res.status(400).json({ error: message });
    }
  })
);

router.post(
  '/images/:id/main',
  asyncHandler(async (req, res) => {
    const image = await ProductImage.findByPk(req.params.id);
    if (!image) return notFound(res, 'Image');
    const rows = await ProductImage.findAll({
      where: { product_id: image.product_id },
      order: [
        ['position', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    const ordered = [image, ...rows.filter((row) => row.id !== image.id)];
    for (let index = 0; index < ordered.length; index += 1) {
      const position = index + 1;
      if (ordered[index].position !== position) {
        ordered[index].position = position;
        await ordered[index].save();
      }
    }
    res.json({
      images: ordered.map((row) => ({
        id: row.id,
        src: row.src,
        alt: row.alt,
        position: row.position,
      })),
    });
  })
);

router.put(
  '/images/:id',
  asyncHandler(async (req, res) => {
    const image = await ProductImage.findByPk(req.params.id);
    if (!image) return notFound(res, 'Image');
    const src = String(req.body?.src || '').trim();
    if (!src.startsWith('/uploads/')) {
      res.status(400).json({ error: 'Image path is required.' });
      return;
    }
    image.src = src;
    if (req.body?.alt != null) image.alt = clip(req.body.alt);
    await image.save();
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
