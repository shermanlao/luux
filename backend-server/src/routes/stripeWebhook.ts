import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { recordPurchase } from '../lib/marketing/funnelLuux';
import { notifyPaidOrder } from '../lib/orderNotice';
import { changeOrderStock } from '../lib/orderStock';
import { getStripe, stripeWebhookSecret } from '../lib/stripe';
import Order from '../models/Order';

export async function markOrderPaid(order: Order, paymentIntent: string | null): Promise<void> {
  if (order.status === 'cancelled') return;
  if (order.status !== 'paid' && order.status !== 'fulfilled') {
    await changeOrderStock(order.id, -1);
    order.status = 'paid';
    if (paymentIntent) order.stripe_payment_intent = paymentIntent;
    await order.save();
  } else if (paymentIntent && !order.stripe_payment_intent) {
    order.stripe_payment_intent = paymentIntent;
    await order.save();
  }
  await recordPurchase(order);
  if (order.status === 'paid' || order.status === 'fulfilled') {
    await notifyPaidOrder(order);
  }
}

export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const secret = await stripeWebhookSecret();
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
    const stripe = await getStripe();
    event = stripe.webhooks.constructEvent(req.body, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook';
    res.status(400).json({ error: message });
    return;
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded' ||
    event.type === 'checkout.session.async_payment_failed'
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = Number(session.metadata?.order_id || 0);
    const order =
      (orderId ? await Order.findByPk(orderId) : null) ||
      (session.id ? await Order.findOne({ where: { stripe_session_id: session.id } }) : null);
    if (order && event.type === 'checkout.session.async_payment_failed') {
      if (order.status === 'pending') {
        order.status = 'cancelled';
        await order.save();
      }
    } else if (order) {
      const paid = event.type === 'checkout.session.async_payment_succeeded' || session.payment_status === 'paid';
      if (paid) {
        const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null;
        try {
          await markOrderPaid(order, intent);
        } catch (error) {
          console.error('Paid order notice failed:', error instanceof Error ? error.message : error);
          res.status(500).json({ error: 'Order notice email failed.' });
          return;
        }
      }
    }
  }

  res.json({ received: true });
}
