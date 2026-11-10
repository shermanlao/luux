/**
 * Luux persistence adapter for the general marketing funnel.
 * GENERAL FUNCTION — Marketing Funnel lives in lib/shared/marketing-funnel.ts.
 * This file supplies the Luux shop: app, HKD, and the order table.
 */
import { Op } from 'sequelize';
import { hkdToCents } from '../shared/slugify';
import {
  assembleFunnel,
  campaignKey,
  publicPurchase,
  reportWindow,
  utcDayStamp,
  type ClientFunnelEvent,
  type FunnelEventName,
  type FunnelReport,
  type ReportRange,
  type StoredTouch,
} from '../shared/marketing-funnel';
import { FUNNEL_APP, FUNNEL_CURRENCY } from '../shared/marketing-funnel-luux';
import FunnelEvent from '../../models/FunnelEvent';
import Order from '../../models/Order';

const ORDER_FIELDS = [
  'number',
  'total',
  'currency',
  'createdAt',
  'attr_source',
  'attr_medium',
  'attr_campaign',
  'attr_content',
  'attr_channel',
  'attr_campaign_id',
] as const;

export async function recordFunnelHit(input: {
  app?: string;
  event: ClientFunnelEvent | 'purchase';
  path: string;
  attribution: StoredTouch | null;
  revenueCents?: number;
  at?: Date;
}): Promise<void> {
  const app = input.app || FUNNEL_APP;
  const when = input.at || new Date();
  const touch = input.attribution;
  const where = {
    app,
    day: utcDayStamp(when),
    event: input.event,
    source: touch?.source || '',
    medium: touch?.medium || '',
    campaign: touch?.campaign || '',
    content: touch?.content || '',
    term: touch?.term || '',
    channel: touch?.channel || '',
    landing_path: touch?.landing_path || '',
    path: input.path,
    campaign_id: touch?.campaign_id || 0,
  };
  const [row] = await FunnelEvent.findOrCreate({
    where,
    defaults: { ...where, count: 0, revenue_cents: 0 },
  });
  row.count += 1;
  row.revenue_cents = Number(row.revenue_cents || 0) + Math.max(0, Math.round(input.revenueCents || 0));
  await row.save();
}

function touchFromOrder(order: Order): StoredTouch | null {
  if (!order.attr_source) return null;
  return {
    app: FUNNEL_APP,
    source: order.attr_source,
    medium: order.attr_medium || '',
    campaign: order.attr_campaign || '',
    content: order.attr_content || '',
    term: order.attr_term || '',
    campaign_id: Number(order.attr_campaign_id) || 0,
    channel: order.attr_channel || '',
    landing_path: order.attr_landing_path || '',
    first_touch_at: order.attr_first_touch_at || '',
    last_touch_at: order.attr_last_touch_at || '',
  };
}

export async function recordPurchase(order: Order): Promise<void> {
  if (order.attr_purchased === '1') return;
  if (order.status !== 'paid' && order.status !== 'fulfilled') return;
  await recordFunnelHit({
    event: 'purchase',
    path: '/checkout',
    attribution: touchFromOrder(order),
    revenueCents: hkdToCents(order.total),
    at: order.createdAt ? new Date(order.createdAt) : new Date(),
  });
  order.attr_purchased = '1';
  await order.save();
}

async function paidOrders(app: string, since: Date): Promise<Order[]> {
  if (app !== FUNNEL_APP) return [];
  return Order.findAll({
    where: { status: { [Op.in]: ['paid', 'fulfilled'] }, createdAt: { [Op.gte]: since } },
    attributes: [...ORDER_FIELDS],
    order: [['createdAt', 'DESC']],
  });
}

export async function buildFunnelReport(app: string, range: ReportRange): Promise<FunnelReport> {
  const window = reportWindow(range);
  const since = new Date(`${window.sinceDay}T00:00:00.000Z`);
  const [events, orders] = await Promise.all([
    FunnelEvent.findAll({ where: { app, day: { [Op.gte]: window.sinceDay } } }),
    paidOrders(app, since),
  ]);
  return assembleFunnel({
    app,
    range,
    currency: FUNNEL_CURRENCY,
    events: events.map((row) => ({
      event: row.event as FunnelEventName,
      source: row.source,
      medium: row.medium,
      campaign: row.campaign,
      content: row.content,
      channel: row.channel,
      campaign_id: Number(row.campaign_id) || 0,
      count: Number(row.count) || 0,
      revenue_cents: Number(row.revenue_cents) || 0,
    })),
    orders: orders.map((order) => ({
      source: order.attr_source || '',
      medium: order.attr_medium || '',
      campaign: order.attr_campaign || '',
      content: order.attr_content || '',
      channel: order.attr_channel || '',
      campaign_id: Number(order.attr_campaign_id) || 0,
      total_cents: hkdToCents(order.total),
    })),
  });
}

export async function campaignPurchases(app: string, campaignId: number, range: ReportRange) {
  if (app !== FUNNEL_APP || !campaignId) return [];
  const window = reportWindow(range);
  const since = new Date(`${window.sinceDay}T00:00:00.000Z`);
  const orders = await Order.findAll({
    where: {
      status: { [Op.in]: ['paid', 'fulfilled'] },
      createdAt: { [Op.gte]: since },
      attr_campaign_id: campaignId,
    },
    attributes: [...ORDER_FIELDS],
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  return orders.map((order) =>
    publicPurchase({
      number: order.number,
      total: order.total,
      currency: order.currency || FUNNEL_CURRENCY,
      source: order.attr_source || '',
      medium: order.attr_medium || '',
      campaign: order.attr_campaign || campaignKey(app, campaignId),
      content: order.attr_content || '',
      channel: order.attr_channel || '',
    })
  );
}

export function compactFunnel(report: FunnelReport) {
  return {
    range: report.range,
    model: report.model,
    window_days: report.window_days,
    totals: report.totals,
    unattributed: report.unattributed,
  };
}
