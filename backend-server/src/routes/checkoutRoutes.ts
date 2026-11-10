import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { readAdminSession, readCustomerSession } from '../lib/cookies';
import { applyCheckoutProfile, orderAddressColumns, readCheckoutProfile } from '../lib/customerProfile';
import { nextOrderNumber } from '../lib/orderNumber';
import { rateLimit } from '../lib/rateLimit';
import { addressReady, phoneDigits } from '../lib/shared/address';
import { shippingMatchesCountry } from '../lib/shared/shipping';
import { attributionMetadata, orderAttributionColumns, sanitizeAttribution } from '../lib/shared/marketing-funnel';
import { FUNNEL_APP } from '../lib/shared/marketing-funnel-luux';
import { hkdToCents } from '../lib/shared/slugify';
import { getStripe, siteOrigin } from '../lib/stripe';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import Product from '../models/Product';
import ShippingRate from '../models/ShippingRate';
import Variant from '../models/Variant';
import Customer from '../models/Customer';

const router = Router();

type CartLine = { variant_id: number; quantity: number };

async function loadCart(lines: CartLine[], allowUnpublished: boolean) {
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
    if (!product || (!product.published && !allowUnpublished)) throw new Error('A cart item is no longer available.');
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
    const admin = await readAdminSession(req);
    const usePaytest = Boolean(body.paytest);
    if (usePaytest && !admin) {
      res.status(403).json({ error: 'Sign in required' });
      return;
    }
    const items = await loadCart(lines, Boolean(admin));
    if (usePaytest && items.some((item) => item.product.handle !== 'payment-test')) {
      res.status(400).json({ error: 'Choose a shipping rate.' });
      return;
    }
    const shipping = usePaytest
      ? await ShippingRate.findOne({ where: { code: 'paytest' } })
      : await ShippingRate.findByPk(Number(body.shipping_rate_id));
    if (!shipping || (shipping.code === 'paytest' && (!admin || items.some((item) => item.product.handle !== 'payment-test')))) {
      res.status(400).json({ error: 'Choose a shipping rate.' });
      return;
    }
    const fields = body as Record<string, unknown>;
    const profile = readCheckoutProfile(fields);
    const { email, phone, invoice, shipping: delivery, shippingSame: same } = profile;
    if (!email.includes('@') || email.length > 200) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }
    if (!phone) {
      res.status(400).json({ error: 'Enter a contact number.' });
      return;
    }
    if (phoneDigits(phone) < 6) {
      res.status(400).json({ error: 'Enter a contact number with at least 6 digits.' });
      return;
    }
    if (!addressReady(invoice)) {
      res.status(400).json({ error: 'Enter the invoice name, address, city, and country.' });
      return;
    }
    if (!addressReady(delivery)) {
      res.status(400).json({ error: 'Enter the shipping name, address, city, and country.' });
      return;
    }
    if (!shippingMatchesCountry(shipping.countries, delivery.country)) {
      res.status(400).json({ error: 'That shipping rate does not cover this country.' });
      return;
    }
    const subtotal = items.reduce((sum, item) => sum + hkdToCents(item.unit_price) * item.quantity, 0);
    const shippingCents = hkdToCents(shipping.amount);
    const totalCents = subtotal + shippingCents;
    const customer = await readCustomerSession(req);
    if (customer) {
      const row = await Customer.findByPk(customer.id);
      if (row) {
        applyCheckoutProfile(row, profile);
        await row.save();
      }
    }

    const attribution = sanitizeAttribution(body.attribution, FUNNEL_APP);
    const order = await Order.create({
      number: await nextOrderNumber(),
      customer_id: customer?.id || null,
      email,
      status: 'pending',
      subtotal: (subtotal / 100).toFixed(2),
      shipping_amount: shipping.amount,
      total: (totalCents / 100).toFixed(2),
      currency: 'HKD',
      ...orderAddressColumns('shipping', delivery),
      shipping_phone: phone,
      ...orderAddressColumns('invoice', invoice),
      shipping_same: same ? '1' : '0',
      shipping_rate_name: shipping.name,
      ...orderAttributionColumns(attribution),
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
      metadata: { order_id: String(order.id), order_number: order.number, ...attributionMetadata(attribution) },
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
        ...(shippingCents > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: 'hkd',
                  unit_amount: shippingCents,
                  product_data: { name: `Shipping — ${shipping.name}` },
                },
              },
            ]
          : []),
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
