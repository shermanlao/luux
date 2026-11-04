import { Op } from 'sequelize';
import { siteOrigin } from './stripe';
import type { MarketingChannel, MarketingInput } from './marketing/types';
import { isChannel } from './marketing/types';
import Order from '../models/Order';
import PageView from '../models/PageView';
import TrafficSource from '../models/TrafficSource';
import TrafficCountry from '../models/TrafficCountry';
import Product from '../models/Product';
import ProductImage from '../models/ProductImage';
import SiteSetting from '../models/SiteSetting';
import Variant from '../models/Variant';

const LUUX_APP = 'luux';
const MAX_STAY_SECONDS = 30 * 60;
const SOURCES = new Set(['Direct', 'Google', 'Instagram', 'Facebook', 'Threads', 'Pinterest', 'Bing', 'Yahoo', 'Other']);

export function normalizeSource(value: unknown): string {
  const source = String(value || '').trim();
  if (!SOURCES.has(source)) return '';
  return source;
}

export function normalizeCountry(value: unknown): string {
  const country = String(value || '').trim().slice(0, 80);
  if (!/^[\p{L}\p{M} .,'()-]+$/u.test(country)) return '';
  return country;
}

function dayStamp(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sinceDate(): Date {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  since.setUTCHours(0, 0, 0, 0);
  return since;
}

function absoluteUrl(src: string): string {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  const origin = siteOrigin();
  return `${origin}${src.startsWith('/') ? src : `/${src}`}`;
}

export function connectedChannels(site: SiteSetting): MarketingChannel[] {
  const channels: MarketingChannel[] = [];
  if (site.facebook_page_id && site.facebook_page_token) channels.push('facebook');
  if (site.instagram_account_id && site.instagram_token) channels.push('instagram');
  if (site.threads_user_id && site.threads_token) channels.push('threads');
  return channels;
}

export async function recordPageView(path: string, app = LUUX_APP): Promise<void> {
  const day = dayStamp(new Date());
  const [row] = await PageView.findOrCreate({
    where: { app, path, day },
    defaults: { app, path, day, count: 0, seconds: 0, stays: 0 },
  });
  row.count += 1;
  await row.save();
}

export async function recordTraffic(
  input: { path: string; source?: string; country?: string; seconds?: number },
  app = LUUX_APP
): Promise<void> {
  const day = dayStamp(new Date());
  const seconds = Number(input.seconds);
  if (Number.isFinite(seconds) && seconds >= 1) {
    const capped = Math.min(MAX_STAY_SECONDS, Math.round(seconds));
    const [row] = await PageView.findOrCreate({
      where: { app, path: input.path, day },
      defaults: { app, path: input.path, day, count: 0, seconds: 0, stays: 0 },
    });
    row.seconds = Number(row.seconds || 0) + capped;
    row.stays = Number(row.stays || 0) + 1;
    await row.save();
    return;
  }
  await recordPageView(input.path, app);
  const source = normalizeSource(input.source);
  if (source) {
    const [row] = await TrafficSource.findOrCreate({
      where: { app, source, day },
      defaults: { app, source, day, count: 0 },
    });
    row.count += 1;
    await row.save();
  }
  const country = normalizeCountry(input.country);
  if (country) {
    const [row] = await TrafficCountry.findOrCreate({
      where: { app, country, day },
      defaults: { app, country, day, count: 0 },
    });
    row.count += 1;
    await row.save();
  }
}

export async function luuxMarketingInput(): Promise<MarketingInput> {
  const site = await SiteSetting.findByPk(1);
  const origin = siteOrigin();
  const since = sinceDate();
  const sinceDay = dayStamp(since);
  const products = await Product.findAll({
    where: { published: true },
    include: [
      { model: ProductImage, as: 'images' },
      { model: Variant, as: 'variants' },
    ],
    order: [['featured', 'DESC'], ['id', 'DESC']],
    limit: 12,
  });
  const views = await PageView.findAll({
    where: { app: LUUX_APP, day: { [Op.gte]: sinceDay } },
    order: [['day', 'ASC']],
  });
  const orders = await Order.findAll({
    where: { status: { [Op.in]: ['paid', 'fulfilled'] }, createdAt: { [Op.gte]: since } },
    attributes: ['total', 'createdAt'],
  });
  const ordersByDay = new Map<string, { total: number; count: number }>();
  for (const order of orders) {
    const day = dayStamp(new Date(order.createdAt));
    const current = ordersByDay.get(day) || { total: 0, count: 0 };
    current.total += Number(order.total) || 0;
    current.count += 1;
    ordersByDay.set(day, current);
  }
  return {
    app: LUUX_APP,
    catalog: products.map((product) => {
      const images = (product as Product & { images?: ProductImage[] }).images || [];
      const variants = (product as Product & { variants?: Variant[] }).variants || [];
      const image = [...images].sort((a, b) => a.position - b.position)[0];
      return {
        title: product.title,
        url: `${origin}/products/${product.handle}`,
        image: absoluteUrl(image?.src || ''),
        price: variants[0]?.price || '0.00',
      };
    }),
    page_views: views.map((row) => ({ day: row.day, path: row.path, count: row.count })),
    orders: [...ordersByDay.entries()].map(([day, row]) => ({
      day,
      total: row.total.toFixed(2),
      count: row.count,
    })),
    channels: site ? connectedChannels(site) : [],
  };
}

export function parseInputChannels(value: unknown): MarketingChannel[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(isChannel);
}

export async function trafficSummary(app: string) {
  const since = sinceDate();
  const sinceDay = dayStamp(since);
  const views = await PageView.findAll({ where: { app, day: { [Op.gte]: sinceDay } } });
  const sources = await TrafficSource.findAll({ where: { app, day: { [Op.gte]: sinceDay } } });
  const countries = await TrafficCountry.findAll({ where: { app, day: { [Op.gte]: sinceDay } } });
  const byPath = new Map<string, number>();
  const secondsByPath = new Map<string, number>();
  const staysByPath = new Map<string, number>();
  const viewsByDay = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  let viewTotal = 0;
  let staySeconds = 0;
  let stayCount = 0;
  for (const row of views) {
    viewTotal += row.count;
    byPath.set(row.path, (byPath.get(row.path) || 0) + row.count);
    viewsByDay.set(row.day, (viewsByDay.get(row.day) || 0) + row.count);
    const seconds = Number(row.seconds || 0);
    const stays = Number(row.stays || 0);
    if (stays > 0) {
      secondsByPath.set(row.path, (secondsByPath.get(row.path) || 0) + seconds);
      staysByPath.set(row.path, (staysByPath.get(row.path) || 0) + stays);
      staySeconds += seconds;
      stayCount += stays;
    }
  }
  for (const row of sources) {
    sourceCounts.set(row.source, (sourceCounts.get(row.source) || 0) + row.count);
  }
  for (const row of countries) {
    countryCounts.set(row.country, (countryCounts.get(row.country) || 0) + row.count);
  }
  let paidTotal = 0;
  let paidCount = 0;
  const paidByDay = new Map<string, number>();
  if (app === LUUX_APP) {
    const orders = await Order.findAll({
      where: { status: { [Op.in]: ['paid', 'fulfilled'] }, createdAt: { [Op.gte]: since } },
      attributes: ['total', 'createdAt'],
    });
    for (const order of orders) {
      const amount = Number(order.total) || 0;
      paidTotal += amount;
      paidCount += 1;
      const day = dayStamp(new Date(order.createdAt));
      paidByDay.set(day, (paidByDay.get(day) || 0) + amount);
    }
  }
  const days = new Set([...viewsByDay.keys(), ...paidByDay.keys()]);
  return {
    views: viewTotal,
    average_stay_seconds: stayCount ? Math.round(staySeconds / stayCount) : 0,
    sources: [...sourceCounts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    countries: [...countryCounts.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count),
    top_paths: [...byPath.entries()]
      .map(([path, count]) => {
        const stays = staysByPath.get(path) || 0;
        return {
          path,
          count,
          stay_seconds: stays ? Math.round((secondsByPath.get(path) || 0) / stays) : 0,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    paid_total: paidTotal.toFixed(2),
    paid_count: paidCount,
    daily: [...days].sort().map((day) => ({
      day,
      views: viewsByDay.get(day) || 0,
      paid_total: (paidByDay.get(day) || 0).toFixed(2),
    })),
  };
}
