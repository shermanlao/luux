import { Router } from 'express';
import { Op } from 'sequelize';
import { asyncHandler, notFound } from '../lib/asyncHandler';
import { requireAdmin } from '../lib/authMiddleware';
import { normalizeShippingAmount } from '../lib/shared/shipping';
import MarketingSpend from '../models/MarketingSpend';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import Variant from '../models/Variant';

const router = Router();
router.use(requireAdmin());

const SPEND_TYPES = new Set(['post', 'ad', 'other']);

function parseDate(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

router.get(
  '/marketing-spend',
  asyncHandler(async (req, res) => {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const where = from && to ? { spent_on: { [Op.between]: [from, to] } } : {};
    const spends = await MarketingSpend.findAll({ where, order: [['spent_on', 'DESC'], ['id', 'DESC']] });
    res.json({ spends });
  })
);

router.post(
  '/marketing-spend',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const spent_on = parseDate(body.spent_on);
    const spend_type = String(body.spend_type || 'post').trim().toLowerCase();
    const channel = String(body.channel || '').trim().slice(0, 80);
    const note = String(body.note || '').trim().slice(0, 2000);
    const amount = normalizeShippingAmount(body.amount_hkd);
    if (!spent_on) return void res.status(400).json({ error: 'Enter a date.' });
    if (!SPEND_TYPES.has(spend_type)) return void res.status(400).json({ error: 'Choose post, ad, or other.' });
    if (!amount) return void res.status(400).json({ error: 'Enter a valid HKD amount.' });
    const spend = await MarketingSpend.create({ spent_on, spend_type, channel, amount_hkd: amount, note });
    res.json({ spend });
  })
);

router.delete(
  '/marketing-spend/:id',
  asyncHandler(async (req, res) => {
    const spend = await MarketingSpend.findByPk(req.params.id);
    if (!spend) return notFound(res, 'Spend');
    await spend.destroy();
    res.json({ ok: true });
  })
);

router.get(
  '/marketing-roi',
  asyncHandler(async (req, res) => {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    if (!from || !to) return void res.status(400).json({ error: 'Enter from and to dates.' });
    const spends = await MarketingSpend.findAll({ where: { spent_on: { [Op.between]: [from, to] } } });
    const spendTotal = spends.reduce((sum, row) => sum + Number(row.amount_hkd), 0);
    const orders = await Order.findAll({
      where: {
        status: { [Op.in]: ['paid', 'fulfilled'] },
        createdAt: { [Op.gte]: new Date(`${from}T00:00:00.000Z`), [Op.lte]: new Date(`${to}T23:59:59.999Z`) },
      },
      include: [{ model: OrderItem, as: 'items', include: [{ model: Variant, as: 'variant' }] }],
    });
    const revenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    let cogsTotal = 0;
    let cogsKnown = true;
    for (const order of orders) {
      for (const item of order.items || []) {
        const cogs = item.variant?.cogs_hkd;
        if (!cogs || !Number(cogs)) {
          cogsKnown = false;
          continue;
        }
        cogsTotal += Number(cogs) * item.quantity;
      }
    }
    let actualShippingTotal = 0;
    let actualShippingKnown = true;
    for (const order of orders) {
      const cost = order.actual_shipping_cost;
      if (!cost || !String(cost).trim()) {
        actualShippingKnown = false;
        continue;
      }
      actualShippingTotal += Number(cost);
    }
    const grossProfit =
      cogsKnown || actualShippingKnown
        ? revenue - (cogsKnown ? cogsTotal : 0) - (actualShippingKnown ? actualShippingTotal : 0)
        : null;
    res.json({
      from,
      to,
      spend_total: spendTotal.toFixed(2),
      order_count: orders.length,
      revenue: revenue.toFixed(2),
      revenue_per_spend: spendTotal > 0 ? (revenue / spendTotal).toFixed(4) : null,
      gross_profit: grossProfit == null ? null : grossProfit.toFixed(2),
      gross_profit_per_spend:
        spendTotal > 0 && grossProfit != null ? (grossProfit / spendTotal).toFixed(4) : null,
      cogs_recorded: cogsKnown,
      actual_shipping_recorded: actualShippingKnown,
    });
  })
);

export default router;