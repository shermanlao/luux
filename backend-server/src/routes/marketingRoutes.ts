import crypto from 'crypto';
import { Router, type Request } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { readAdminSession } from '../lib/cookies';
import { requestAiDraft } from '../lib/marketing/ai';
import { parseResults, toDocument } from '../lib/marketing/document';
import { publishDraft } from '../lib/marketing/publish';
import { isChannel, type CampaignDraft, type ChannelTokens, type MarketingChannel, type MarketingDocument, type MarketingInput } from '../lib/marketing/types';
import { connectedChannels, luuxMarketingInput, parseInputChannels, trafficSummary } from '../lib/marketingLuux';
import { safeEqual } from '../lib/shared/hmac';
import MarketingCampaign from '../models/MarketingCampaign';
import SiteSetting from '../models/SiteSetting';

const router = Router();

function findings(raw: string): string[] {
  try {
    const value = JSON.parse(raw || '[]');
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function channelsOf(raw: string): MarketingChannel[] {
  try {
    const value = JSON.parse(raw || '[]');
    return Array.isArray(value) ? value.map((item) => String(item)).filter(isChannel) : [];
  } catch {
    return [];
  }
}

function draftFrom(row: MarketingCampaign): CampaignDraft {
  const status = row.status === 'posted' || row.status === 'failed' ? row.status : 'draft';
  return {
    id: row.id,
    status,
    caption: row.caption,
    image_url: row.image_url,
    link: row.link,
    channels: channelsOf(row.channels),
    rationale: row.rationale,
    results: parseResults(row.results),
  };
}

function documentFrom(row: MarketingCampaign): MarketingDocument {
  return toDocument(row.app, { summary: row.analysis_summary, findings: findings(row.analysis_findings) }, [draftFrom(row)]);
}

async function authorize(req: Request): Promise<'staff' | 'key' | null> {
  if (await readAdminSession(req)) return 'staff';
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const site = await SiteSetting.findByPk(1);
  const saved = String(site?.marketing_api_key || '').trim();
  return saved && safeEqual(saved, token) ? 'key' : null;
}

function isStaff(res: { locals: Record<string, unknown> }): boolean {
  return res.locals.marketingAuth === 'staff';
}

function appName(value: unknown, fallback = ''): string {
  const name = String(value || fallback).trim().toLowerCase();
  return /^[a-z0-9_-]{1,40}$/.test(name) ? name : '';
}

function inputFromBody(body: Record<string, unknown>, app: string): MarketingInput | null {
  if (!Array.isArray(body.catalog)) return null;
  const catalog = body.catalog.slice(0, 12).map((item) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      title: String(row.title || '').slice(0, 160),
      url: String(row.url || '').slice(0, 400),
      image: String(row.image || '').slice(0, 400),
      price: String(row.price || '').slice(0, 40),
    };
  }).filter((item) => item.title);
  const pageViews = Array.isArray(body.page_views) ? body.page_views.slice(0, 400).map((item) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return { day: String(row.day || '').slice(0, 10), path: String(row.path || '/').slice(0, 200), count: Number(row.count) || 0 };
  }) : [];
  const orders = Array.isArray(body.orders) ? body.orders.slice(0, 60).map((item) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return { day: String(row.day || '').slice(0, 10), total: String(row.total || '0'), count: Number(row.count) || 0 };
  }) : [];
  return { app, catalog, page_views: pageViews, orders, channels: parseInputChannels(body.channels) };
}

function siteTokens(site: SiteSetting): ChannelTokens {
  return {
    facebook_page_id: site.facebook_page_id,
    facebook_page_token: site.facebook_page_token,
    instagram_account_id: site.instagram_account_id,
    instagram_token: site.instagram_token,
    threads_user_id: site.threads_user_id,
    threads_token: site.threads_token,
  };
}

function tokensFrom(body: Record<string, unknown>, site: SiteSetting | null, app: string): ChannelTokens {
  if (app === 'luux' && site) return siteTokens(site);
  const incoming = body.tokens && typeof body.tokens === 'object' ? (body.tokens as Record<string, unknown>) : null;
  if (incoming) {
    return {
      facebook_page_id: String(incoming.facebook_page_id || ''),
      facebook_page_token: String(incoming.facebook_page_token || ''),
      instagram_account_id: String(incoming.instagram_account_id || ''),
      instagram_token: String(incoming.instagram_token || ''),
      threads_user_id: String(incoming.threads_user_id || ''),
      threads_token: String(incoming.threads_token || ''),
    };
  }
  return {
    facebook_page_id: '',
    facebook_page_token: '',
    instagram_account_id: '',
    instagram_token: '',
    threads_user_id: '',
    threads_token: '',
  };
}

router.use(asyncHandler(async (req, res, next) => {
  const auth = await authorize(req);
  if (!auth) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    res.status(401).json({ error: 'Sign in required' });
    return;
  }
  res.locals.marketingAuth = auth;
  next?.();
}));

router.get(
  '/v1/overview',
  asyncHandler(async (req, res) => {
    const app = appName(req.query.app, 'luux');
    if (!app) {
      res.status(400).json({ error: 'Choose an app name.' });
      return;
    }
    if (!isStaff(res) && app !== 'luux') {
      res.status(400).json({ error: 'This key is for the LUUX shop only.' });
      return;
    }
    const site = await SiteSetting.findByPk(1);
    const summary = await trafficSummary(app);
    const rows = await MarketingCampaign.findAll({ where: { app }, order: [['id', 'DESC']], limit: 20 });
    const connected = site && app === 'luux' ? connectedChannels(site) : parseInputChannels([]);
    res.json({
      app,
      ...summary,
      connected: {
        facebook: connected.includes('facebook'),
        instagram: connected.includes('instagram'),
        threads: connected.includes('threads'),
      },
      campaigns: rows.map(documentFrom),
    });
  })
);

router.post(
  '/v1/drafts',
  asyncHandler(async (req, res) => {
    const staff = isStaff(res);
    const body = (req.body || {}) as Record<string, unknown>;
    const app = appName(body.app, 'luux');
    if (!app) {
      res.status(400).json({ error: 'Choose an app name.' });
      return;
    }
    if (!staff && app !== 'luux') {
      res.status(400).json({ error: 'This key is for the LUUX shop only.' });
      return;
    }
    const site = await SiteSetting.findByPk(1);
    if (!site?.ai_api_key) {
      res.status(400).json({ error: 'Save an AI API key on Integrations.' });
      return;
    }
    let input: MarketingInput | null;
    if (!staff) {
      input = await luuxMarketingInput();
      const requested = parseInputChannels(body.channels);
      if (requested.length) input.channels = input.channels.filter((channel) => requested.includes(channel));
    } else {
      const provided = inputFromBody(body, app);
      input = provided || (app === 'luux' ? await luuxMarketingInput() : null);
    }
    if (!input) {
      res.status(400).json({ error: 'Send a catalog, page views, orders, and channels.' });
      return;
    }
    const draft = await requestAiDraft(input, {
      baseUrl: site.ai_base_url,
      apiKey: site.ai_api_key,
      model: site.ai_model,
    });
    const rows: MarketingCampaign[] = [];
    const campaigns = draft.campaigns.length
      ? draft.campaigns
      : [{
          caption: draft.summary || 'A new post for the shop.',
          image_url: input.catalog[0]?.image || '',
          link: input.catalog[0]?.url || '',
          channels: input.channels,
          rationale: 'The model did not return a separate post, so this draft uses the analysis.',
        }];
    for (const campaign of campaigns) {
      rows.push(await MarketingCampaign.create({
        app,
        status: 'draft',
        caption: campaign.caption,
        channels: JSON.stringify(campaign.channels),
        image_url: campaign.image_url,
        link: campaign.link,
        rationale: campaign.rationale,
        analysis_summary: draft.summary,
        analysis_findings: JSON.stringify(draft.findings),
        results: '[]',
      }));
    }
    res.json(toDocument(app, { summary: draft.summary, findings: draft.findings }, rows.map(draftFrom)));
  })
);

router.get(
  '/v1/drafts/:id',
  asyncHandler(async (req, res) => {
    const row = await MarketingCampaign.findByPk(req.params.id);
    if (!row || (!isStaff(res) && row.app !== 'luux')) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(documentFrom(row));
  })
);

router.put(
  '/v1/drafts/:id',
  asyncHandler(async (req, res) => {
    const row = await MarketingCampaign.findByPk(req.params.id);
    if (!row || (!isStaff(res) && row.app !== 'luux')) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    if (row.status === 'posted') {
      res.status(400).json({ error: 'This campaign is already posted.' });
      return;
    }
    const body = req.body || {};
    if (body.caption != null) row.caption = String(body.caption).slice(0, 2000);
    if (body.image_url != null) row.image_url = String(body.image_url).slice(0, 400);
    if (body.link != null) row.link = String(body.link).slice(0, 400);
    if (Array.isArray(body.channels)) row.channels = JSON.stringify(parseInputChannels(body.channels));
    row.status = 'draft';
    await row.save();
    res.json(documentFrom(row));
  })
);

router.post(
  '/v1/drafts/:id/publish',
  asyncHandler(async (req, res) => {
    const row = await MarketingCampaign.findByPk(req.params.id);
    if (!row || (!isStaff(res) && row.app !== 'luux')) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    if (row.status === 'posted') {
      res.status(400).json({ error: 'This campaign is already posted.' });
      return;
    }
    const site = await SiteSetting.findByPk(1);
    const draft = draftFrom(row);
    if (!draft.channels.length) {
      res.status(400).json({ error: 'Choose at least one channel.' });
      return;
    }
    const results = await publishDraft(
      draft,
      tokensFrom((req.body || {}) as Record<string, unknown>, site, row.app),
      parseResults(row.results)
    );
    const posted = results.length > 0 && results.every((item) => item.status === 'posted');
    row.results = JSON.stringify(results);
    row.status = posted ? 'posted' : 'failed';
    await row.save();
    res.json(documentFrom(row));
  })
);

router.post(
  '/v1/keys',
  asyncHandler(async (req, res) => {
    const staff = await readAdminSession(req);
    if (!staff) {
      res.status(401).json({ error: 'Sign in required' });
      return;
    }
    const site = await SiteSetting.findByPk(1);
    if (!site) {
      res.status(404).json({ error: 'Settings' });
      return;
    }
    const key = crypto.randomBytes(24).toString('hex');
    site.marketing_api_key = key;
    await site.save();
    res.json({ marketing_api_key: key });
  })
);

export default router;
