import { Router } from 'express';
import { asyncHandler, notFound } from '../lib/asyncHandler';
import { requireAdmin } from '../lib/authMiddleware';
import { serializePage, serializeShipping, serializeSite } from '../lib/serialize';
import ContactInquiry from '../models/ContactInquiry';
import Page from '../models/Page';
import ShippingRate from '../models/ShippingRate';
import SiteSetting from '../models/SiteSetting';

const router = Router();
router.use(requireAdmin());

router.get(
  '/pages',
  asyncHandler(async (_req, res) => {
    const pages = await Page.findAll({ order: [['id', 'ASC']] });
    res.json({ pages: pages.map(serializePage) });
  })
);

router.put(
  '/pages/:id',
  asyncHandler(async (req, res) => {
    const page = await Page.findByPk(req.params.id);
    if (!page) return notFound(res, 'Page');
    const body = req.body || {};
    if (body.title != null) page.title = String(body.title);
    if (body.body_html != null) page.body_html = String(body.body_html);
    await page.save();
    res.json({ page: serializePage(page) });
  })
);

router.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const site = await SiteSetting.findByPk(1);
    if (!site) return notFound(res, 'Settings');
    res.json({ site: serializeSite(site) });
  })
);

router.put(
  '/settings',
  asyncHandler(async (req, res) => {
    const site = await SiteSetting.findByPk(1);
    if (!site) return notFound(res, 'Settings');
    const body = req.body || {};
    const keys: Array<keyof SiteSetting> = [
      'company_name',
      'slogan',
      'hero_heading',
      'hero_subheading',
      'hero_image',
      'hero_cta_label',
      'hero_cta_href',
      'featured_heading',
      'story_heading',
      'story_body',
      'shop_heading',
      'shop_body',
      'sanctuary_heading',
      'newsletter_heading',
      'newsletter_body',
      'contact_email',
      'contact_phone',
      'contact_address',
      'facebook_url',
      'instagram_url',
      'threads_url',
      'pinterest_url',
      'seo_title',
      'seo_description',
      'logo_icon',
    ];
    for (const key of keys) {
      if (body[key] != null) {
        (site as unknown as Record<string, unknown>)[key as string] = String(body[key]);
      }
    }
    if (Array.isArray(body.featured_handles)) {
      site.featured_handles = JSON.stringify(body.featured_handles.map((item: unknown) => String(item)));
    }
    await site.save();
    res.json({ site: serializeSite(site) });
  })
);

router.get(
  '/shipping',
  asyncHandler(async (_req, res) => {
    const rates = await ShippingRate.findAll({ order: [['sort_order', 'ASC']] });
    res.json({ rates: rates.map(serializeShipping) });
  })
);

router.put(
  '/shipping/:id',
  asyncHandler(async (req, res) => {
    const rate = await ShippingRate.findByPk(req.params.id);
    if (!rate) return notFound(res, 'Shipping rate');
    const body = req.body || {};
    if (body.name != null) rate.name = String(body.name);
    if (body.amount != null) rate.amount = Number(body.amount).toFixed(2);
    if (body.countries != null) rate.countries = String(body.countries);
    await rate.save();
    res.json({ rate: serializeShipping(rate) });
  })
);

router.get(
  '/inquiries',
  asyncHandler(async (_req, res) => {
    const inquiries = await ContactInquiry.findAll({ order: [['id', 'DESC']] });
    res.json({
      inquiries: inquiries.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        message: row.message,
        createdAt: row.createdAt,
      })),
    });
  })
);

export default router;
