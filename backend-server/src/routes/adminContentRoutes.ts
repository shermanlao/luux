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
      'logo',
      'logo_icon',
      'cookie_notice',
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

const INTEGRATION_SECRETS = [
  'ai_api_key',
  'stripe_secret_key',
  'stripe_publishable_key',
  'stripe_webhook_secret',
  'marketing_api_key',
  'facebook_page_token',
  'instagram_token',
  'threads_token',
] as const;
const INTEGRATION_TEXT = ['ai_base_url', 'ai_model', 'facebook_page_id', 'instagram_account_id', 'threads_user_id'] as const;

function secretHint(value: string): { set: boolean; hint: string } {
  const trimmed = value.trim();
  if (!trimmed) return { set: false, hint: '' };
  return { set: true, hint: `••••${trimmed.slice(-4)}` };
}

function serializeIntegrations(site: SiteSetting) {
  const aiKey = secretHint(site.ai_api_key);
  const stripeSecret = secretHint(site.stripe_secret_key);
  const stripePublishable = secretHint(site.stripe_publishable_key);
  const stripeWebhook = secretHint(site.stripe_webhook_secret);
  const marketingKey = secretHint(site.marketing_api_key);
  const facebookToken = secretHint(site.facebook_page_token);
  const instagramToken = secretHint(site.instagram_token);
  const threadsToken = secretHint(site.threads_token);
  return {
    ai_base_url: site.ai_base_url || '',
    ai_model: site.ai_model || '',
    ai_api_key_set: aiKey.set,
    ai_api_key_hint: aiKey.hint,
    stripe_secret_key_set: stripeSecret.set,
    stripe_secret_key_hint: stripeSecret.hint,
    stripe_publishable_key_set: stripePublishable.set,
    stripe_publishable_key_hint: stripePublishable.hint,
    stripe_webhook_secret_set: stripeWebhook.set,
    stripe_webhook_secret_hint: stripeWebhook.hint,
    marketing_api_key_set: marketingKey.set,
    marketing_api_key_hint: marketingKey.hint,
    facebook_page_id: site.facebook_page_id || '',
    facebook_page_token_set: facebookToken.set,
    facebook_page_token_hint: facebookToken.hint,
    instagram_account_id: site.instagram_account_id || '',
    instagram_token_set: instagramToken.set,
    instagram_token_hint: instagramToken.hint,
    threads_user_id: site.threads_user_id || '',
    threads_token_set: threadsToken.set,
    threads_token_hint: threadsToken.hint,
  };
}

router.get(
  '/integrations',
  asyncHandler(async (_req, res) => {
    const site = await SiteSetting.findByPk(1);
    if (!site) return notFound(res, 'Settings');
    res.json({ integrations: serializeIntegrations(site) });
  })
);

router.put(
  '/integrations',
  asyncHandler(async (req, res) => {
    const site = await SiteSetting.findByPk(1);
    if (!site) return notFound(res, 'Settings');
    const body = req.body || {};
    for (const key of INTEGRATION_TEXT) {
      if (body[key] != null) site[key] = String(body[key]).trim();
    }
    for (const key of INTEGRATION_SECRETS) {
      if (body[key] == null) continue;
      const value = String(body[key]).trim();
      if (!value) continue;
      site[key] = value;
    }
    await site.save();
    res.json({ integrations: serializeIntegrations(site) });
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
