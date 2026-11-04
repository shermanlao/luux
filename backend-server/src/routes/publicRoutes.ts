import { Router } from 'express';
import { Op } from 'sequelize';
import { asyncHandler, notFound } from '../lib/asyncHandler';
import { hashClientIp } from '../lib/cookieConsent';
import { readCustomerSession } from '../lib/cookies';
import { rateLimit } from '../lib/rateLimit';
import { PRODUCT_INCLUDE, serializeCollection, serializePage, serializeProduct, serializeShipping, serializeSite } from '../lib/serialize';
import CookieConsent from '../models/CookieConsent';
import Collection from '../models/Collection';
import { saveContactMessage } from '../lib/mail';
import HelpTip from '../models/HelpTip';
import NewsletterSubscriber from '../models/NewsletterSubscriber';
import Page from '../models/Page';
import Product from '../models/Product';
import ShippingRate from '../models/ShippingRate';
import SiteSetting from '../models/SiteSetting';
import { recordTraffic } from '../lib/marketingLuux';
import { productSearchOperator, productSearchPattern } from '../lib/shared/product-search';
import { countryFromIp, visitorIp } from '../lib/visitorCountry';
import { dbDialect } from '../database';
import Currency from '../models/Currency';

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
  '/currencies',
  asyncHandler(async (_req, res) => {
    const rows = await Currency.findAll({ order: [['sort_order', 'ASC'], ['code', 'ASC']] });
    res.json({
      currencies: rows.map((row) => ({
        code: row.code,
        name: row.name,
        symbol: row.symbol,
        rate: Number(row.rate),
        decimals: row.decimals,
      })),
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
    if (req.params.handle === 'all') {
      const rows = await Product.findAll({
        where: { published: true },
        include: PRODUCT_INCLUDE,
        order: [['title', 'ASC']],
      });
      const products = rows.map((product) => serializeProduct(product));
      res.json({
        collection: {
          id: 0,
          title: 'ALL',
          handle: 'all',
          description: '',
          image: '',
          sort_order: 0,
          published: true,
          products_count: products.length,
        },
        products,
      });
      return;
    }
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
    const pattern = productSearchPattern(q);
    if (!pattern) {
      res.json({ products: [], q });
      return;
    }
    const contains = productSearchOperator(dbDialect);
    const products = await Product.findAll({
      where: {
        published: true,
        [Op.or]: [
          { title: { [contains]: pattern } },
          { handle: { [contains]: pattern } },
          { body_html: { [contains]: pattern } },
          { tags: { [contains]: pattern } },
          { product_type: { [contains]: pattern } },
        ],
      },
      include: PRODUCT_INCLUDE,
      order: [['title', 'ASC']],
      limit: 200,
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
    res.json({ rates: rates.filter((rate) => rate.code !== 'paytest').map(serializeShipping) });
  })
);

router.get(
  '/cookie-consent',
  asyncHandler(async (req, res) => {
    const site = await SiteSetting.findByPk(1);
    const [row, session] = await Promise.all([
      CookieConsent.findOne({ where: { ip_hash: hashClientIp(req) } }),
      readCustomerSession(req),
    ]);
    const choice = row?.choice === 'all' || row?.choice === 'necessary' ? row.choice : null;
    res.json({
      decided: Boolean(choice),
      choice,
      notice: site?.cookie_notice || '',
      signedIn: Boolean(session),
    });
  })
);

router.post(
  '/cookie-consent',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 8, name: 'cookie-consent' }),
  asyncHandler(async (req, res) => {
    const choice = String(req.body?.choice || '');
    if (choice !== 'all' && choice !== 'necessary') {
      res.status(400).json({ error: 'Choose allow or necessary cookies.' });
      return;
    }
    const ip_hash = hashClientIp(req);
    const existing = await CookieConsent.findOne({ where: { ip_hash } });
    if (existing) {
      existing.choice = choice;
      await existing.save();
    } else {
      await CookieConsent.create({ ip_hash, choice });
    }
    res.json({ ok: true, decided: true, choice });
  })
);

router.post(
  '/traffic',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 240, name: 'traffic' }),
  asyncHandler(async (req, res) => {
    const path = String(req.body?.path || '').split('?')[0].trim();
    if (!path.startsWith('/') || path.startsWith('/admin') || path.includes('..') || path.length > 200) {
      res.status(400).json({ error: 'That path is not counted.' });
      return;
    }
    const seconds = Number(req.body?.seconds);
    const forwardedAgent = String(req.get('x-luux-agent') || '').trim();
    await recordTraffic({
      path,
      source: req.body?.source,
      country: countryFromIp(visitorIp(req)),
      seconds: Number.isFinite(seconds) ? seconds : undefined,
      userAgent: forwardedAgent || req.get('user-agent') || '',
    });
    res.json({ ok: true });
  })
);

router.post(
  '/newsletter',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 8, name: 'newsletter' }),
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 200);
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
    const name = String(req.body?.name || '').trim().slice(0, 120);
    const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 200);
    const message = String(req.body?.message || '').trim().slice(0, 4000);
    if (!name || !email.includes('@') || !message) {
      res.status(400).json({ error: 'Name, email, and message are required.' });
      return;
    }
    await saveContactMessage({ name, email, message });
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
