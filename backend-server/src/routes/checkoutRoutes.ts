import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { readCustomerSession } from '../lib/cookies';
import { nextOrderNumber } from '../lib/orderNumber';
import { rateLimit } from '../lib/rateLimit';
import { shippingMatchesCountry } from '../lib/shared/shipping';
import { hkdToCents } from '../lib/shared/slugify';
import { getStripe, siteOrigin } from '../lib/stripe';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import Product from '../models/Product';
import ShippingRate from '../models/ShippingRate';
import Variant from '../models/Variant';

const router = Router();

type CartLine = { variant_id: number; quantity: number };

async function loadCart(lines: CartLine[]) {
  const items: Array<{
    variant: Variant;
    product: Product;
    quantity: number;
    unit_price: string;
  }> = [];
  for (const line of lines) {
    const quantity = Math.max(1, Math.min(99, Number(line.quantity) || 0));
    if (!quantity || !line.variant_id) continue;
    const variant = await Variant.findByPk(line.variant_id);
    if (!variant) throw new Error('A cart item is no longer available.');
    if (variant.stock < quantity) throw new Error(`${variant.title} does not have enough stock.`);
    const product = await Product.findByPk(variant.product_id);
    if (!product || !product.published) throw new Error('A cart item is no longer available.');
    items.push({ variant, product, quantity, unit_price: variant.price });
  }
  if (!items.length) throw new Error('Your cart is empty.');
  return items;
}

router.post(
  '/session',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, name: 'checkout' }),
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const lines = Array.isArray(body.items) ? (body.items as CartLine[]) : [];
    const items = await loadCart(lines);
    const shipping = await ShippingRate.findByPk(Number(body.shipping_rate_id));
    if (!shipping) {
      res.status(400).json({ error: 'Choose a shipping rate.' });
      return;
    }
    const email = String(body.email || '').trim().toLowerCase();
    const shippingName = String(body.shipping_name || '').trim();
    const shippingLine1 = String(body.shipping_line1 || '').trim();
    const shippingCity = String(body.shipping_city || '').trim();
    const shippingCountry = String(body.shipping_country || '').trim().toUpperCase();
    if (!email.includes('@') || email.length > 200) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }
    if (!shippingName || !shippingLine1 || !shippingCity || !shippingCountry) {
      res.status(400).json({ error: 'Enter the delivery name, address, and city.' });
      return;
    }
    if (!shippingMatchesCountry(shipping.countries, shippingCountry)) {
      res.status(400).json({ error: 'That shipping rate does not cover this country.' });
      return;
    }
    const subtotal = items.reduce((sum, item) => sum + hkdToCents(item.unit_price) * item.quantity, 0);
    const shippingCents = hkdToCents(shipping.amount);
    const totalCents = subtotal + shippingCents;
    const customer = await readCustomerSession(req);

    const order = await Order.create({
      number: await nextOrderNumber(),
      customer_id: customer?.id || null,
      email,
      status: 'pending',
      subtotal: (subtotal / 100).toFixed(2),
      shipping_amount: shipping.amount,
      total: (totalCents / 100).toFixed(2),
      currency: 'HKD',
      shipping_name: shippingName.slice(0, 120),
      shipping_phone: String(body.shipping_phone || '').trim().slice(0, 40),
      shipping_line1: shippingLine1.slice(0, 200),
      shipping_line2: String(body.shipping_line2 || '').trim().slice(0, 200),
      shipping_city: shippingCity.slice(0, 80),
      shipping_region: String(body.shipping_region || '').trim().slice(0, 80),
      shipping_postal: String(body.shipping_postal || '').trim().slice(0, 20),
      shipping_country: shippingCountry.slice(0, 8),
      shipping_rate_name: shipping.name,
    });

    await OrderItem.bulkCreate(
      items.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        variant_id: item.variant.id,
        title: item.product.title,
        variant_title: item.variant.title,
        sku: item.variant.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
    );

    const origin = siteOrigin();
    let session;
    try {
      const stripe = await getStripe();
      session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel?order=${encodeURIComponent(order.number)}`,
      metadata: { order_id: String(order.id), order_number: order.number },
      line_items: [
        ...items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: 'hkd',
            unit_amount: hkdToCents(item.unit_price),
            product_data: {
              name: item.product.title,
              description: item.variant.title === 'Default Title' ? undefined : item.variant.title,
            },
          },
        })),
        {
          quantity: 1,
          price_data: {
            currency: 'hkd',
            unit_amount: shippingCents,
            product_data: { name: `Shipping — ${shipping.name}` },
          },
        },
      ],
    });
    } catch (error) {
      order.status = 'cancelled';
      await order.save();
      const message = error instanceof Error ? error.message : 'Payment could not be started.';
      console.error('Stripe checkout failed:', message);
      res.status(502).json({ error: 'Payment could not be started. Try again.' });
      return;
    }

    order.stripe_session_id = session.id;
    await order.save();
    res.json({ url: session.url, order_number: order.number });
  })
);

router.get(
  '/session/:id',
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ where: { stripe_session_id: req.params.id } });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json({
      order: {
        number: order.number,
        total: order.total,
        currency: order.currency,
        status: order.status,
      },
    });
  })
);

export default router;
