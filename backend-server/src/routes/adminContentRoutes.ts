import { Router } from 'express';
import { Op } from 'sequelize';
import { asyncHandler, notFound } from '../lib/asyncHandler';
import { requireAdmin } from '../lib/authMiddleware';
import { resolveMailbox } from '../lib/hostinger-mail';
import { MailRequestError } from '../lib/mail-error';
import { serializePage, serializeShipping, serializeSite } from '../lib/serialize';
import { slugify } from '../lib/shared/slugify';
import { normalizeShippingAmount, normalizeShippingCountries } from '../lib/shared/shipping';
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
    res.json({ site: serializeSite(site), mail: serializeMail(site) });
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
    const mailError = applyMailSettings(site, body);
    if (mailError) {
      await site.reload();
      res.status(400).json({ error: mailError });
      return;
    }
    await site.save();
    res.json({ site: serializeSite(site), mail: serializeMail(site) });
  })
);

router.post(
  '/settings/mail-api',
  asyncHandler(async (req, res) => {
    const site = await SiteSetting.findByPk(1);
    if (!site) return notFound(res, 'Settings');
    const pasted = String(req.body?.mail_api_token || '').trim().replace(/^Bearer\s+/i, '');
    const token = pasted || String(site.mail_api_token || '').trim();
    if (!token) {
      res.status(400).json({ error: 'Paste the Agentic Mail API token first.' });
      return;
    }
    try {
      const mailbox = await resolveMailbox(token, [site.mail_from_email, site.contact_email, site.mail_smtp_user, site.mail_imap_user]);
      res.json({ address: mailbox.address });
    } catch (error) {
      const message = error instanceof MailRequestError ? error.message : 'Could not reach the mail API.';
      res.status(400).json({ error: message });
    }
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

function serializeMail(site: SiteSetting) {
  const smtp = secretHint(site.mail_smtp_password || '');
  const imap = secretHint(site.mail_imap_password || '');
  const api = secretHint(site.mail_api_token || '');
  const webhook = secretHint(site.mail_webhook_secret || '');
  return {
    mail_smtp_host: site.mail_smtp_host || '',
    mail_smtp_port: site.mail_smtp_port || '587',
    mail_smtp_secure: site.mail_smtp_secure === '1',
    mail_smtp_user: site.mail_smtp_user || '',
    mail_smtp_password_set: smtp.set,
    mail_smtp_password_hint: smtp.hint,
    mail_from_name: site.mail_from_name || '',
    mail_from_email: site.mail_from_email || '',
    mail_imap_host: site.mail_imap_host || '',
    mail_imap_port: site.mail_imap_port || '993',
    mail_imap_secure: site.mail_imap_secure !== '0',
    mail_imap_user: site.mail_imap_user || '',
    mail_imap_password_set: imap.set,
    mail_imap_password_hint: imap.hint,
    mail_api_token_set: api.set,
    mail_api_token_hint: api.hint,
    mail_webhook_secret_set: webhook.set,
    mail_webhook_secret_hint: webhook.hint,
  };
}

function cleanHost(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/^(smtp|smtps|imap|imaps|ssl|tls):\/\//i, '')
    .replace(/\/.*$/, '')
    .slice(0, 255);
}

function applyMailSettings(site: SiteSetting, body: Record<string, unknown>): string | null {
  if (body.mail_smtp_host != null) site.mail_smtp_host = cleanHost(body.mail_smtp_host);
  if (body.mail_imap_host != null) site.mail_imap_host = cleanHost(body.mail_imap_host);
  if (body.mail_smtp_user != null) site.mail_smtp_user = String(body.mail_smtp_user).trim().slice(0, 255);
  if (body.mail_imap_user != null) site.mail_imap_user = String(body.mail_imap_user).trim().slice(0, 255);
  if (body.mail_from_name != null) site.mail_from_name = String(body.mail_from_name).trim().slice(0, 255);
  if (body.mail_from_email != null) {
    const from = String(body.mail_from_email).trim().slice(0, 255);
    if (from && !from.includes('@')) return 'Enter a valid from address.';
    site.mail_from_email = from;
  }
  for (const key of ['mail_smtp_port', 'mail_imap_port'] as const) {
    if (body[key] == null) continue;
    const port = Number(String(body[key]).trim());
    if (!Number.isInteger(port) || port < 1 || port > 65535) return 'Enter a valid mail port.';
    site[key] = String(port);
  }
  if (body.mail_smtp_secure != null) site.mail_smtp_secure = body.mail_smtp_secure ? '1' : '0';
  if (body.mail_imap_secure != null) site.mail_imap_secure = body.mail_imap_secure ? '1' : '0';
  for (const key of ['mail_smtp_password', 'mail_imap_password'] as const) {
    if (body[key] == null) continue;
    const value = String(body[key]).trim();
    if (!value) continue;
    site[key] = value;
  }
  if (body.mail_api_token != null) {
    const token = String(body.mail_api_token).trim().replace(/^Bearer\s+/i, '').slice(0, 2000);
    if (token) site.mail_api_token = token;
  }
  if (body.mail_webhook_secret != null) {
    const secret = String(body.mail_webhook_secret).trim().replace(/^Bearer\s+/i, '').slice(0, 2000);
    if (secret) site.mail_webhook_secret = secret;
  }
  return null;
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
    res.json({ rates: rates.filter((rate) => rate.code !== 'paytest').map(serializeShipping) });
  })
);

async function nextShippingCode(name: string): Promise<string> {
  const base = slugify(name);
  const root = base === 'paytest' ? 'rate' : base;
  for (let n = 1; n < 100; n += 1) {
    const code = (n === 1 ? root : `${root}-${n}`).slice(0, 80);
    const taken = await ShippingRate.findOne({ where: { code } });
    if (!taken) return code;
  }
  throw new Error('Could not create a shipping option.');
}

router.post(
  '/shipping',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const name = String(body.name || '').trim().slice(0, 255);
    const amount = normalizeShippingAmount(body.amount);
    if (!name) {
      res.status(400).json({ error: 'Name is required.' });
      return;
    }
    if (!amount) {
      res.status(400).json({ error: 'Enter an amount in HKD.' });
      return;
    }
    const highest = await ShippingRate.max('sort_order', { where: { code: { [Op.ne]: 'paytest' } } });
    const rate = await ShippingRate.create({
      name,
      code: await nextShippingCode(name),
      amount,
      countries: normalizeShippingCountries(body.countries),
      sort_order: (Number(highest) || 0) + 1,
    });
    res.status(201).json({ rate: serializeShipping(rate) });
  })
);

router.put(
  '/shipping/:id',
  asyncHandler(async (req, res) => {
    const rate = await ShippingRate.findByPk(req.params.id);
    if (!rate) return notFound(res, 'Shipping rate');
    if (rate.code === 'paytest') {
      res.status(400).json({ error: 'This shipping rate cannot be edited.' });
      return;
    }
    const body = req.body || {};
    if (body.name != null) {
      const name = String(body.name).trim().slice(0, 255);
      if (!name) {
        res.status(400).json({ error: 'Name is required.' });
        return;
      }
      rate.name = name;
    }
    if (body.amount != null) {
      const amount = normalizeShippingAmount(body.amount);
      if (!amount) {
        res.status(400).json({ error: 'Enter an amount in HKD.' });
        return;
      }
      rate.amount = amount;
    }
    if (body.countries != null) rate.countries = normalizeShippingCountries(body.countries);
    await rate.save();
    res.json({ rate: serializeShipping(rate) });
  })
);

router.delete(
  '/shipping/:id',
  asyncHandler(async (req, res) => {
    const rate = await ShippingRate.findByPk(req.params.id);
    if (!rate) return notFound(res, 'Shipping rate');
    if (rate.code === 'paytest') {
      res.status(400).json({ error: 'This shipping rate cannot be deleted.' });
      return;
    }
    await rate.destroy();
    res.json({ ok: true });
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
