import { Router } from 'express';
import { asyncHandler, notFound } from '../lib/asyncHandler';
import { requireAdmin } from '../lib/authMiddleware';
import { changeOrderStock } from '../lib/orderStock';
import { serializeOrder } from '../lib/serialize';
import { cleanTrackingUrl, clipText } from '../lib/shared/address';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import Product from '../models/Product';
import Variant from '../models/Variant';

const router = Router();
router.use(requireAdmin());

// Order lines include the lamp so the details window can show its photo and description.
const orderInclude = [
  {
    model: OrderItem,
    as: 'items',
    include: [
      { model: Product, as: 'product', include: [{ association: 'images' }, { association: 'options' }] },
      { model: Variant, as: 'variant' },
    ],
  },
];

router.get(
  '/orders',
  asyncHandler(async (_req, res) => {
    const orders = await Order.findAll({
      include: orderInclude,
      order: [['id', 'DESC']],
    });
    res.json({ orders: orders.map((order) => serializeOrder(order)) });
  })
);

router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const order = await Order.findByPk(req.params.id, { include: orderInclude });
    if (!order) return notFound(res, 'Order');
    res.json({ order: serializeOrder(order) });
  })
);

router.post(
  '/orders/:id/fulfill',
  asyncHandler(async (req, res) => {
    const order = await Order.findByPk(req.params.id, { include: orderInclude });
    if (!order) return notFound(res, 'Order');
    if (order.status !== 'paid' && order.status !== 'fulfilled') {
      res.status(400).json({ error: 'Only paid orders can be marked fulfilled.' });
      return;
    }
    const body = (req.body || {}) as Record<string, unknown>;
    const carrier = clipText(body.tracking_carrier, 80);
    const trackingNumber = clipText(body.tracking_number, 80);
    const trackingUrl = cleanTrackingUrl(body.tracking_url);
    if (!carrier || !trackingNumber) {
      res.status(400).json({ error: 'Enter the carrier and tracking number.' });
      return;
    }
    if (trackingUrl === null) {
      res.status(400).json({ error: 'Enter a tracking link that starts with http:// or https://.' });
      return;
    }
    order.tracking_carrier = carrier;
    order.tracking_number = trackingNumber;
    order.tracking_url = trackingUrl;
    if (order.status === 'paid') order.status = 'fulfilled';
    await order.save();
    res.json({ order: serializeOrder(order) });
  })
);

router.post(
  '/orders/:id/cancel',
  asyncHandler(async (req, res) => {
    const order = await Order.findByPk(req.params.id, { include: orderInclude });
    if (!order) return notFound(res, 'Order');
    if (order.status === 'fulfilled') {
      res.status(400).json({ error: 'A fulfilled order cannot be cancelled here.' });
      return;
    }
    if (order.status === 'cancelled') {
      res.json({ order: serializeOrder(order) });
      return;
    }
    if (order.status === 'paid') await changeOrderStock(order.id, 1);
    order.status = 'cancelled';
    await order.save();
    res.json({ order: serializeOrder(order) });
  })
);

export default router;
