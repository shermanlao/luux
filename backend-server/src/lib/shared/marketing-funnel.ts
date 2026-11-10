/**
 * GENERAL FUNCTION — Marketing Funnel.
 * Portable contract for tracked links, last non-direct attribution (30 days),
 * funnel events, and report assembly. Do not hard-code a shop path, currency,
 * or brand here. The app adapter supplies those.
 * Brief: Marketing Funnel (General Function), sections 3–8.
 */

export const FUNNEL_EVENTS = ['landing', 'product_view', 'add_to_cart', 'checkout_start', 'purchase'] as const;
export type FunnelEventName = (typeof FUNNEL_EVENTS)[number];

export const CLIENT_FUNNEL_EVENTS = ['landing', 'product_view', 'add_to_cart', 'checkout_start'] as const;
export type ClientFunnelEvent = (typeof CLIENT_FUNNEL_EVENTS)[number];

export const REPORT_RANGES = ['7d', '30d', '90d', '12m'] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

export const ATTRIBUTION_MODEL = 'last_non_direct' as const;
export const ATTRIBUTION_WINDOW_DAYS = 30;
export const ORGANIC_SOCIAL_MEDIUM = 'organic_social';

const WINDOW_MS = ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const SOCIAL_SOURCES = new Set(['instagram', 'facebook', 'threads', 'pinterest']);
const SOURCE_ALIASES: Record<string, string> = {
  ig: 'instagram',
  instagram: 'instagram',
  fb: 'facebook',
  facebook: 'facebook',
  google: 'google',
  threads: 'threads',
  pinterest: 'pinterest',
  bing: 'bing',
  yahoo: 'yahoo',
  direct: 'direct',
};
const DISPLAY_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  threads: 'Threads',
  pinterest: 'Pinterest',
  bing: 'Bing',
  yahoo: 'Yahoo',
  other: 'Other',
};

export type AttributionCore = {
  app: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  campaign_id: number;
  channel: string;
  landing_path: string;
};

export type StoredTouch = AttributionCore & {
  first_touch_at: string;
  last_touch_at: string;
};

export type TrackedUrlParams = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
};

export type FunnelCounts = {
  landings: number;
  product_views: number;
  add_to_carts: number;
  checkout_starts: number;
  orders: number;
  revenue: string;
  conversion_rate: number;
};

export type FunnelChannelRow = FunnelCounts & {
  source: string;
  label: string;
  channel: string;
};

export type FunnelCampaignRow = FunnelCounts & {
  campaign_id: number | null;
  campaign: string;
  channels: string[];
};

export type FunnelReport = {
  app: string;
  range: ReportRange;
  model: typeof ATTRIBUTION_MODEL;
  window_days: number;
  totals: FunnelCounts & {
    currency: string;
    average_order_value: string | null;
    product_view_rate: number;
    cart_rate: number;
    checkout_rate: number;
    purchase_rate: number;
  };
  channels: FunnelChannelRow[];
  campaigns: FunnelCampaignRow[];
  unattributed: FunnelCounts;
};

export type FunnelEventInput = {
  event: FunnelEventName;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  channel: string;
  campaign_id: number;
  count: number;
  revenue_cents: number;
};

export type FunnelOrderInput = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  channel: string;
  campaign_id: number;
  total_cents: number;
};

export function slugToken(value: string, max = 80): string {
  const clean = String(value || '').trim().toLowerCase();
  if (!clean || clean.includes('@')) return '';
  return clean
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
}

export function cleanPath(value: string): string {
  const path = String(value || '').split('?')[0].split('#')[0].trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('..') || path.length > 200) return '';
  return path.slice(0, 200);
}

export function isAttributed(source: string): boolean {
  const slug = slugToken(source, 40);
  return Boolean(slug) && slug !== 'direct' && slug !== 'unattributed';
}

export function channelFromSource(source: string): string {
  const slug = slugToken(source, 40);
  return SOCIAL_SOURCES.has(slug) ? slug : '';
}

export function campaignKey(app: string, id: number | string): string {
  const name = slugToken(app, 40) || 'app';
  const numeric = String(id).replace(/\D/g, '') || '0';
  return `${name}-${numeric}`.slice(0, 80);
}

export function campaignIdFromKey(app: string, campaign: string): number {
  const name = slugToken(app, 40) || 'app';
  const match = new RegExp(`^${name}-(\\d+)$`).exec(slugToken(campaign, 80));
  if (!match) return 0;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

export function contentKey(channel: string, externalId: string | number): string {
  const ch = slugToken(channel, 40) || 'post';
  const id = slugToken(String(externalId ?? ''), 80) || 'post';
  return `${ch}-${id}`.slice(0, 120);
}

export function sourceLabel(source: string): string {
  const slug = slugToken(source, 40);
  if (!slug || slug === 'direct' || slug === 'unattributed') return 'Unattributed';
  return DISPLAY_LABELS[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function parseReportRange(value: unknown): ReportRange {
  const range = String(value || '30d');
  return (REPORT_RANGES as readonly string[]).includes(range) ? (range as ReportRange) : '30d';
}

export function utcDayStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function reportWindow(range: ReportRange, now = new Date()): { sinceDay: string; bucket: 'day' | 'month'; keys: string[] } {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  if (range === '12m') {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1));
    const keys: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      const month = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      keys.push(month.toISOString().slice(0, 7));
    }
    return { sinceDay: `${keys[0]}-01`, bucket: 'month', keys };
  }
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const keys: string[] = [];
  for (let i = 0; i < days; i += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    keys.push(utcDayStamp(day));
  }
  return { sinceDay: keys[0], bucket: 'day', keys };
}

type ParsedLink = { url: URL; relative: boolean };

function parseLink(raw: string): ParsedLink | null {
  const trimmed = raw.trim();
  const absolute = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const rooted = trimmed.startsWith('/');
  if (!absolute && !rooted) return null;
  try {
    return { url: new URL(trimmed, 'https://placeholder.local'), relative: !absolute };
  } catch {
    return null;
  }
}

function formatLink(url: URL, relative: boolean): string {
  if (relative) return `${url.pathname}${url.search}${url.hash}`;
  return url.toString();
}

export function buildTrackedUrl(baseUrl: string, params: TrackedUrlParams): string {
  const raw = String(baseUrl || '').trim();
  const parsed = parseLink(raw);
  if (!parsed) return raw;
  const fill: Record<string, string> = {
    utm_source: slugToken(params.source || '', 40),
    utm_medium: slugToken(params.medium || '', 40),
    utm_campaign: slugToken(params.campaign || '', 80),
    utm_content: slugToken(params.content || '', 120),
    utm_term: slugToken(params.term || '', 80),
  };
  let changed = false;
  for (const [key, value] of Object.entries(fill)) {
    if (!value) continue;
    const current = parsed.url.searchParams.get(key);
    if (current && current.trim()) continue;
    parsed.url.searchParams.set(key, value);
    changed = true;
  }
  return changed ? formatLink(parsed.url, parsed.relative) : raw;
}

export function stripGeneratedUtm(link: string, app: string, campaignId: number, channels: string[]): string {
  const parsed = parseLink(link);
  if (!parsed) return String(link || '').trim();
  const selected = new Set(channels.map((channel) => slugToken(channel, 40)).filter(Boolean));
  const campaign = campaignKey(app, campaignId);
  const drop = (key: string, value: string): boolean => {
    if (!value) return false;
    if (key === 'utm_medium') return value === ORGANIC_SOCIAL_MEDIUM;
    if (key === 'utm_campaign') return value === campaign;
    if (key === 'utm_source') return selected.has(value);
    if (key === 'utm_content') {
      for (const channel of selected) {
        if (value.startsWith(`${channel}-`) && slugToken(value, 120) === value) return true;
      }
    }
    return false;
  };
  for (const key of [...parsed.url.searchParams.keys()]) {
    const value = parsed.url.searchParams.get(key) || '';
    if (drop(key, value)) parsed.url.searchParams.delete(key);
  }
  return formatLink(parsed.url, parsed.relative);
}

export function trackedLinkForPost(
  link: string,
  app: string,
  campaignId: number,
  channel: string,
  externalId: string,
  channels: string[]
): string {
  const selected = channels.map((item) => slugToken(item, 40)).filter(Boolean);
  const base = stripGeneratedUtm(link, app, campaignId, selected);
  const ch = slugToken(channel, 40);
  return buildTrackedUrl(base, {
    source: ch,
    medium: ORGANIC_SOCIAL_MEDIUM,
    campaign: campaignKey(app, campaignId),
    content: ch ? contentKey(ch, externalId || campaignId) : '',
  });
}

export function captionWithTrackedUrl(caption: string, trackedUrl: string, originalLink = '', limit = 0): string {
  const tracked = trackedUrl.trim();
  const text = String(caption || '');
  if (!tracked) return limit > 0 ? text.slice(0, limit) : text;
  let next = text;
  if (!next.includes(tracked)) {
    const original = originalLink.trim();
    if (original && original !== tracked && next.includes(original)) next = next.split(original).join(tracked);
    else next = next.trim() ? `${next.trim()}\n${tracked}` : tracked;
  }
  if (limit > 0 && next.length > limit) {
    const room = limit - tracked.length - 1;
    if (room < 1) return tracked.slice(0, limit);
    const head = next.slice(0, room).replace(/\s+\S*$/, '').trim();
    next = head ? `${head}\n${tracked}` : tracked.slice(0, limit);
    if (next.length > limit) return tracked.slice(0, limit);
  }
  return next;
}

function hostName(value: string): string {
  return value.replace(/^www\./, '').toLowerCase();
}

function labelFromHost(host: string): string {
  if (host.includes('instagram')) return 'Instagram';
  if (host.includes('facebook') || host === 'fb.com' || host.endsWith('.fb.com')) return 'Facebook';
  if (host.includes('google')) return 'Google';
  if (host.includes('threads')) return 'Threads';
  if (host.includes('pinterest')) return 'Pinterest';
  if (host.includes('bing')) return 'Bing';
  if (host.includes('yahoo')) return 'Yahoo';
  return 'Other';
}

/** Shop-wide source label. Unknown utm_source values still fall through to the referrer. Same-site visits return an empty string. */
export function trafficSourceLabel(utmSource: string, referrer: string, pageHost: string): string {
  const token = String(utmSource || '').trim().toLowerCase();
  if (token === 'ig' || token === 'instagram') return 'Instagram';
  if (token === 'fb' || token === 'facebook') return 'Facebook';
  if (token === 'google') return 'Google';
  if (token === 'threads') return 'Threads';
  if (token === 'pinterest') return 'Pinterest';
  if (token === 'bing') return 'Bing';
  if (token === 'yahoo') return 'Yahoo';
  if (!referrer) return 'Direct';
  try {
    const host = hostName(new URL(referrer).hostname);
    const here = hostName(pageHost);
    if (host === here) return '';
    return labelFromHost(host);
  } catch {
    return 'Direct';
  }
}

export type UtmFields = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
};

export function readUtm(search: string): UtmFields {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return {
    source: params.get('utm_source') || '',
    medium: params.get('utm_medium') || '',
    campaign: params.get('utm_campaign') || '',
    content: params.get('utm_content') || '',
    term: params.get('utm_term') || '',
  };
}

function sourceSlug(token: string): string {
  const key = String(token || '').trim().toLowerCase();
  if (!key) return '';
  return SOURCE_ALIASES[key] || slugToken(key, 40);
}

export function visitTouch(input: {
  app: string;
  utm: UtmFields;
  referrer: string;
  pageHost: string;
  path: string;
  now?: Date;
}): AttributionCore | null {
  const app = slugToken(input.app, 40);
  const path = cleanPath(input.path);
  const fromUtm = sourceSlug(input.utm.source);
  let source = '';
  let fromReferrer = false;
  if (fromUtm) {
    if (!isAttributed(fromUtm)) return null;
    source = fromUtm;
  } else {
    const label = trafficSourceLabel('', input.referrer, input.pageHost);
    if (!label || label === 'Direct') return null;
    source = sourceSlug(label);
    fromReferrer = true;
    if (!isAttributed(source)) return null;
  }
  const mediumToken = slugToken(input.utm.medium, 40);
  const medium = mediumToken || (SOCIAL_SOURCES.has(source) ? ORGANIC_SOCIAL_MEDIUM : fromReferrer ? 'referral' : '');
  const campaign = slugToken(input.utm.campaign, 80);
  return {
    app,
    source,
    medium,
    campaign,
    content: slugToken(input.utm.content, 120),
    term: slugToken(input.utm.term, 80),
    campaign_id: campaignIdFromKey(app, campaign),
    channel: channelFromSource(source),
    landing_path: path,
  };
}

export function touchExpired(touch: { last_touch_at: string }, now: Date): boolean {
  const last = Date.parse(touch.last_touch_at);
  if (!Number.isFinite(last)) return true;
  return now.getTime() - last > WINDOW_MS;
}

export function applyTouch(existing: StoredTouch | null, incoming: AttributionCore | null, now: Date): StoredTouch | null {
  const live = existing && !touchExpired(existing, now) ? existing : null;
  if (incoming && isAttributed(incoming.source)) {
    return {
      ...incoming,
      app: incoming.app || live?.app || '',
      first_touch_at: live?.first_touch_at || now.toISOString(),
      last_touch_at: now.toISOString(),
    };
  }
  return live;
}

function validIso(value: unknown): string {
  const text = String(value || '').trim();
  const time = Date.parse(text);
  if (!Number.isFinite(time)) return '';
  return new Date(time).toISOString();
}

export function sanitizeAttribution(value: unknown, app: string, now = new Date()): StoredTouch | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const source = slugToken(String(row.source || ''), 40);
  if (!isAttributed(source)) return null;
  const campaign = slugToken(String(row.campaign || ''), 80);
  const channelSlug = slugToken(String(row.channel || ''), 40);
  const touch: StoredTouch = {
    app: slugToken(app, 40),
    source,
    medium: slugToken(String(row.medium || ''), 40),
    campaign,
    content: slugToken(String(row.content || ''), 120),
    term: slugToken(String(row.term || ''), 80),
    campaign_id: campaignIdFromKey(app, campaign),
    channel: SOCIAL_SOURCES.has(channelSlug) ? channelSlug : channelFromSource(source),
    landing_path: cleanPath(String(row.landing_path || '')),
    first_touch_at: validIso(row.first_touch_at) || now.toISOString(),
    last_touch_at: validIso(row.last_touch_at) || now.toISOString(),
  };
  if (touchExpired(touch, now)) return null;
  return touch;
}

export function attributionMetadata(touch: AttributionCore | null): Record<string, string> {
  if (!touch || !isAttributed(touch.source)) return {};
  const pairs: Array<[string, string]> = [
    ['utm_source', touch.source],
    ['utm_medium', touch.medium],
    ['utm_campaign', touch.campaign],
    ['utm_content', touch.content],
    ['utm_term', touch.term],
    ['campaign_id', touch.campaign_id ? String(touch.campaign_id) : ''],
    ['channel', touch.channel],
    ['landing_path', touch.landing_path],
  ];
  const out: Record<string, string> = {};
  for (const [key, item] of pairs) {
    if (item) out[key] = item.slice(0, 500);
  }
  return out;
}

export function orderAttributionColumns(touch: StoredTouch | null): Record<string, string | number> {
  if (!touch) {
    return {
      attr_source: '',
      attr_medium: '',
      attr_campaign: '',
      attr_content: '',
      attr_term: '',
      attr_channel: '',
      attr_landing_path: '',
      attr_campaign_id: 0,
      attr_first_touch_at: '',
      attr_last_touch_at: '',
    };
  }
  return {
    attr_source: touch.source,
    attr_medium: touch.medium,
    attr_campaign: touch.campaign,
    attr_content: touch.content,
    attr_term: touch.term,
    attr_channel: touch.channel,
    attr_landing_path: touch.landing_path,
    attr_campaign_id: touch.campaign_id,
    attr_first_touch_at: touch.first_touch_at,
    attr_last_touch_at: touch.last_touch_at,
  };
}

export function publicPurchase(order: {
  number: string;
  total: string;
  currency: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  channel: string;
}) {
  return {
    number: order.number,
    total: order.total,
    currency: order.currency,
    source: order.source,
    medium: order.medium,
    campaign: order.campaign,
    content: order.content,
    channel: order.channel,
  };
}

export function attributionStorageKey(app: string): string {
  return `${slugToken(app, 40) || 'app'}_attr`;
}

export function visitSessionKey(app: string): string {
  return `${slugToken(app, 40) || 'app'}_funnel_visit`;
}

export function checkoutSessionKey(app: string): string {
  return `${slugToken(app, 40) || 'app'}_funnel_checkout`;
}

function readCookie(name: string): string {
  const parts = document.cookie ? document.cookie.split(';') : [];
  for (const part of parts) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return '';
      }
    }
  }
  return '';
}

export function readStoredTouch(app: string, now = new Date()): StoredTouch | null {
  if (typeof window === 'undefined') return null;
  const key = attributionStorageKey(app);
  const cookie = readCookie(key);
  const local = (() => {
    try {
      return window.localStorage.getItem(key) || '';
    } catch {
      return '';
    }
  })();
  const touch = sanitizeAttribution(parseJson(cookie), app, now) || sanitizeAttribution(parseJson(local), app, now);
  if (touch) return touch;
  if (cookie || local) clearStoredTouch(app);
  return null;
}

function parseJson(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeStoredTouch(app: string, touch: StoredTouch): void {
  if (typeof window === 'undefined') return;
  const key = attributionStorageKey(app);
  const raw = JSON.stringify(touch);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${key}=${encodeURIComponent(raw)}; Path=/; Max-Age=${ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60}; SameSite=Lax${secure}`;
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    /* storage can be blocked; the cookie still holds the touch */
  }
}

export function clearStoredTouch(app: string): void {
  if (typeof window === 'undefined') return;
  const key = attributionStorageKey(app);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${key}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function money(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

function ratio(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 10000) / 10000;
}

type Bucket = {
  landings: number;
  product_views: number;
  add_to_carts: number;
  checkout_starts: number;
  orders: number;
  revenue_cents: number;
  channels: Set<string>;
  campaign: string;
  campaign_id: number;
  source: string;
  channel: string;
};

function emptyBucket(campaign = '', campaignId = 0, source = '', channel = ''): Bucket {
  return {
    landings: 0,
    product_views: 0,
    add_to_carts: 0,
    checkout_starts: 0,
    orders: 0,
    revenue_cents: 0,
    channels: new Set<string>(),
    campaign,
    campaign_id: campaignId,
    source,
    channel,
  };
}

function addCount(bucket: Bucket, event: FunnelEventName, count: number): void {
  const amount = Number.isFinite(count) && count > 0 ? count : 0;
  if (event === 'landing') bucket.landings += amount;
  if (event === 'product_view') bucket.product_views += amount;
  if (event === 'add_to_cart') bucket.add_to_carts += amount;
  if (event === 'checkout_start') bucket.checkout_starts += amount;
}

function rememberChannel(bucket: Bucket, source: string, channel: string): void {
  const value = slugToken(channel, 40) || channelFromSource(source);
  if (value) bucket.channels.add(value);
  if (!bucket.source && isAttributed(source)) bucket.source = slugToken(source, 40);
  if (!bucket.channel && value) bucket.channel = value;
}

function countsOf(bucket: Bucket): FunnelCounts {
  return {
    landings: bucket.landings,
    product_views: bucket.product_views,
    add_to_carts: bucket.add_to_carts,
    checkout_starts: bucket.checkout_starts,
    orders: bucket.orders,
    revenue: money(bucket.revenue_cents),
    conversion_rate: ratio(bucket.orders, bucket.landings),
  };
}

function campaignIdentity(row: { source: string; campaign: string; campaign_id: number }): string {
  if (!isAttributed(row.source) && !row.campaign && !row.campaign_id) return '';
  if (!isAttributed(row.source) && !row.campaign) return '';
  if (row.campaign) return row.campaign;
  if (row.campaign_id > 0) return `id-${row.campaign_id}`;
  return slugToken(row.source, 40);
}

export function assembleFunnel(input: {
  app: string;
  range: ReportRange;
  currency: string;
  events: FunnelEventInput[];
  orders: FunnelOrderInput[];
}): FunnelReport {
  const campaigns = new Map<string, Bucket>();
  const channels = new Map<string, Bucket>();
  const unattributed = emptyBucket();
  const totals = emptyBucket();

  const take = (row: { source: string; campaign: string; campaign_id: number; channel: string }): Bucket => {
    const attributed = isAttributed(row.source) || Boolean(row.campaign) || row.campaign_id > 0;
    if (!attributed) return unattributed;
    const key = campaignIdentity(row) || slugToken(row.source, 40) || 'campaign';
    const found = campaigns.get(key) || emptyBucket(row.campaign || key, row.campaign_id, slugToken(row.source, 40), slugToken(row.channel, 40));
    if (row.campaign_id > 0 && !found.campaign_id) found.campaign_id = row.campaign_id;
    if (row.campaign && !found.campaign) found.campaign = row.campaign;
    campaigns.set(key, found);
    return found;
  };

  const takeChannel = (row: { source: string; channel: string }): Bucket | null => {
    if (!isAttributed(row.source)) return null;
    const source = slugToken(row.source, 40);
    const found = channels.get(source) || emptyBucket('', 0, source, slugToken(row.channel, 40) || channelFromSource(source));
    channels.set(source, found);
    return found;
  };

  for (const event of input.events) {
    if (event.event === 'purchase') continue;
    const bucket = take(event);
    addCount(bucket, event.event, event.count);
    addCount(totals, event.event, event.count);
    rememberChannel(bucket, event.source, event.channel);
    const channel = takeChannel(event);
    if (channel) {
      addCount(channel, event.event, event.count);
      rememberChannel(channel, event.source, event.channel);
    }
  }

  for (const order of input.orders) {
    const cents = Number.isFinite(order.total_cents) ? Math.max(0, Math.round(order.total_cents)) : 0;
    const bucket = take(order);
    bucket.orders += 1;
    bucket.revenue_cents += cents;
    totals.orders += 1;
    totals.revenue_cents += cents;
    rememberChannel(bucket, order.source, order.channel);
    const channel = takeChannel(order);
    if (channel) {
      channel.orders += 1;
      channel.revenue_cents += cents;
      rememberChannel(channel, order.source, order.channel);
    }
  }

  const campaignRows: FunnelCampaignRow[] = [...campaigns.values()]
    .map((bucket) => ({
      ...countsOf(bucket),
      campaign_id: bucket.campaign_id > 0 ? bucket.campaign_id : null,
      campaign: bucket.campaign,
      channels: [...bucket.channels],
    }))
    .sort((a, b) => b.landings - a.landings || b.orders - a.orders || a.campaign.localeCompare(b.campaign));

  const channelRows: FunnelChannelRow[] = [...channels.values()]
    .map((bucket) => ({
      ...countsOf(bucket),
      source: bucket.source,
      label: sourceLabel(bucket.source),
      channel: bucket.channel || channelFromSource(bucket.source),
    }))
    .sort((a, b) => b.landings - a.landings || b.orders - a.orders || a.label.localeCompare(b.label));

  return {
    app: slugToken(input.app, 40),
    range: input.range,
    model: ATTRIBUTION_MODEL,
    window_days: ATTRIBUTION_WINDOW_DAYS,
    totals: {
      ...countsOf(totals),
      currency: input.currency,
      average_order_value: totals.orders ? money(Math.round(totals.revenue_cents / totals.orders)) : null,
      product_view_rate: ratio(totals.product_views, totals.landings),
      cart_rate: ratio(totals.add_to_carts, totals.product_views),
      checkout_rate: ratio(totals.checkout_starts, totals.add_to_carts),
      purchase_rate: ratio(totals.orders, totals.checkout_starts),
    },
    channels: channelRows,
    campaigns: campaignRows,
    unattributed: countsOf(unattributed),
  };
}
