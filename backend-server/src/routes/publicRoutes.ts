import { Router } from 'express';
import { Op } from 'sequelize';
import { asyncHandler, notFound } from '../lib/asyncHandler';
import { readCustomerSession } from '../lib/cookies';
import { rateLimit } from '../lib/rateLimit';
import { PRODUCT_INCLUDE, serializeCollection, serializePage, serializeProduct, serializeShipping, serializeSite } from '../lib/serialize';
import Collection from '../models/Collection';
import ContactInquiry from '../models/ContactInquiry';
import HelpTip from '../models/HelpTip';
import NewsletterSubscriber from '../models/NewsletterSubscriber';
import Page from '../models/Page';
import Product from '../models/Product';
import ShippingRate from '../models/ShippingRate';
import SiteSetting from '../models/SiteSetting';

const router = Router();

router.get(
  '/help-tips',
  asyncHandler(async (_req, res) => {
    const rows = await HelpTip.findAll({ order: [['helpKey', 'ASC']] });
    res.json({
      data: rows.map((row) => ({ helpKey: row.helpKey, title: row.title, body: row.body })),
    });
  })
);

router.get(
  '/site',
  asyncHandler(async (_req, res) => {
    const site = await SiteSetting.findByPk(1);
    if (!site) return notFound(res, 'Site');
    const collections = await Collection.findAll({
      where: { published: true },
      order: [
        ['sort_order', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    res.json({ site: serializeSite(site), collections: collections.map((row) => serializeCollection(row)) });
  })
);

router.get(
  '/collections',
  asyncHandler(async (_req, res) => {
    const collections = await Collection.findAll({
      where: { published: true },
      order: [
        ['sort_order', 'ASC'],
        ['id', 'ASC'],
      ],
      include: [{ association: 'products', where: { published: true }, required: false, attributes: ['id'] }],
    });
    res.json({
      collections: collections.map((row) => serializeCollection(row as Collection & { products?: Product[] })),
    });
  })
);

router.get(
  '/collections/:handle',
  asyncHandler(async (req, res) => {
    const collection = await Collection.findOne({
      where: { handle: req.params.handle, published: true },
      include: [
        {
          association: 'products',
          where: { published: true },
          required: false,
          include: PRODUCT_INCLUDE,
        },
      ],
    });
    if (!collection) return notFound(res, 'Collection');
    const products = ((collection as Collection & { products?: Product[] }).products || []).map((product) =>
      serializeProduct(product)
    );
    res.json({ collection: serializeCollection(collection, products.length), products });
  })
);

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const featured = String(req.query.featured || '') === '1';
    const where: Record<string, unknown> = { published: true };
    if (featured) where.featured = true;
    const products = await Product.findAll({
      where,
      include: PRODUCT_INCLUDE,
      order: [['id', 'ASC']],
    });
    res.json({ products: products.map((product) => serializeProduct(product)) });
  })
);

router.get(
  '/products/:handle',
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({
      where: { handle: req.params.handle, published: true },
      include: PRODUCT_INCLUDE,
    });
    if (!product) return notFound(res, 'Product');
    res.json({ product: serializeProduct(product) });
  })
);

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json({ products: [] });
      return;
    }
    const products = await Product.findAll({
      where: {
        published: true,
        [Op.or]: [
          { title: { [Op.like]: `%${q}%` } },
          { body_html: { [Op.like]: `%${q}%` } },
          { tags: { [Op.like]: `%${q}%` } },
        ],
      },
      include: PRODUCT_INCLUDE,
      limit: 48,
    });
    res.json({ products: products.map((product) => serializeProduct(product)), q });
  })
);

router.get(
  '/pages/:handle',
  asyncHandler(async (req, res) => {
    const page = await Page.findOne({ where: { handle: req.params.handle } });
    if (!page) return notFound(res, 'Page');
    res.json({ page: serializePage(page) });
  })
);

router.get(
  '/shipping',
  asyncHandler(async (_req, res) => {
    const rates = await ShippingRate.findAll({ order: [['sort_order', 'ASC']] });
    res.json({ rates: rates.map(serializeShipping) });
  })
);

router.post(
  '/newsletter',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 8, name: 'newsletter' }),
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }
    await NewsletterSubscriber.findOrCreate({ where: { email }, defaults: { email } });
    res.json({ ok: true });
  })
);

router.post(
  '/contact',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 8, name: 'contact' }),
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const message = String(req.body?.message || '').trim();
    if (!name || !email || !message) {
      res.status(400).json({ error: 'Name, email, and message are required.' });
      return;
    }
    await ContactInquiry.create({ name, email, message });
    res.json({ ok: true });
  })
);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const session = await readCustomerSession(req);
    if (!session) {
      res.json({ customer: null });
      return;
    }
    res.json({ customer: { id: session.id, email: session.email } });
  })
);

export default router;
