import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { getStripe } from '../lib/stripe';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import Variant from '../models/Variant';

export async function markOrderPaid(order: Order, paymentIntent: string | null): Promise<void> {
  if (order.status === 'paid' || order.status === 'fulfilled') {
    if (paymentIntent && !order.stripe_payment_intent) {
      order.stripe_payment_intent = paymentIntent;
      await order.save();
    }
    return;
  }
  if (order.status === 'cancelled') return;
  const items = await OrderItem.findAll({ where: { order_id: order.id } });
  for (const item of items) {
    const variant = await Variant.findByPk(item.variant_id);
    if (!variant) continue;
    variant.stock = Math.max(0, variant.stock - item.quantity);
    await variant.save();
  }
  order.status = 'paid';
  if (paymentIntent) order.stripe_payment_intent = paymentIntent;
  await order.save();
}

export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const secret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    res.status(500).json({ error: 'Stripe webhook secret is not set.' });
    return;
  }
  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') {
    res.status(400).json({ error: 'Missing Stripe signature.' });
    return;
  }
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook';
    res.status(400).json({ error: message });
    return;
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = Number(session.metadata?.order_id || 0);
    const order =
      (orderId ? await Order.findByPk(orderId) : null) ||
      (session.id ? await Order.findOne({ where: { stripe_session_id: session.id } }) : null);
    if (order) {
      const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null;
      await markOrderPaid(order, intent);
    }
  }

  res.json({ received: true });
}
