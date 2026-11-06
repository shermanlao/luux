import crypto from 'crypto';
import { Router, type Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { requireCustomer } from '../lib/authMiddleware';
import { clearCookie, readCustomerSession, setCookie } from '../lib/cookies';
import { hashPassword, verifyPassword } from '../lib/adminPassword';
import { rateLimit } from '../lib/rateLimit';
import { applyAccountProfile, readAccountProfile, serializeCustomer } from '../lib/customerProfile';
import { registrationError } from '../lib/shared/address';
import { serializeCustomerOrder } from '../lib/serialize';
import { ADMIN_SESSION_COOKIE, createSessionValue } from '../lib/shared/admin-session';
import {
  CUSTOMER_SESSION_COOKIE,
  createCustomerSessionValue,
} from '../lib/shared/customer-session';
import { safeEqual } from '../lib/shared/hmac';
import {
  clearOAuthStateCookie,
  fetchOAuthProfile,
  issueOAuthState,
  OAUTH_STATE_COOKIE,
  oauthAuthorizationUrl,
  oauthConfigured,
  oauthProviderLabel,
  parseOAuthProvider,
  setOAuthStateCookie,
  verifyOAuthState,
  type OAuthProfile,
  type OAuthProvider,
} from '../lib/oauth';
import AdminUser from '../models/AdminUser';
import Customer from '../models/Customer';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import Product from '../models/Product';
import Variant from '../models/Variant';

const router = Router();

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

router.post(
  '/register',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, name: 'register' }),
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const password_confirm = String(req.body?.password_confirm || '');
    const first_name = String(req.body?.first_name || '').trim();
    const last_name = String(req.body?.last_name || '').trim();
    if (password !== password_confirm) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }
    if (!email.includes('@') || password.length < 6) {
      res.status(400).json({ error: 'Use a valid email and a password of at least 6 characters.' });
      return;
    }
    const existing = await Customer.findOne({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }
    const profile = readAccountProfile((req.body || {}) as Record<string, unknown>);
    profile.first_name = profile.first_name || first_name;
    profile.last_name = profile.last_name || last_name;
    if (!profile.invoice.phone) profile.invoice.phone = profile.phone;
    if (profile.shippingSame) profile.shipping = { ...profile.invoice };
    else if (!profile.shipping.phone) profile.shipping.phone = profile.phone;
    const detailError = registrationError(profile);
    if (detailError) {
      res.status(400).json({ error: detailError });
      return;
    }
    const customer = await Customer.create({
      email,
      password_hash: hashPassword(password),
      first_name: profile.first_name,
      last_name: profile.last_name,
    });
    applyAccountProfile(customer, profile);
    await customer.save();
    setCookie(res, CUSTOMER_SESSION_COOKIE, await createCustomerSessionValue(customer.id, customer.email));
    res.json({ customer: serializeCustomer(customer) });
  })
);

router.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, name: 'customer-login' }),
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const admin = await AdminUser.findOne({ where: { email } });
    if (admin?.active && verifyPassword(password, admin.password_hash)) {
      setCookie(res, ADMIN_SESSION_COOKIE, await createSessionValue(admin.username, 'admin', admin.session_epoch));
      res.json({ admin: true, username: admin.username, role: admin.role, email: admin.email });
      return;
    }
    const customer = await Customer.findOne({ where: { email } });
    if (!customer || !verifyPassword(password, customer.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    setCookie(res, CUSTOMER_SESSION_COOKIE, await createCustomerSessionValue(customer.id, customer.email));
    res.json({
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      },
    });
  })
);

router.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    clearCookie(res, CUSTOMER_SESSION_COOKIE);
    res.json({ ok: true });
  })
);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const session = await readCustomerSession(req);
    if (!session) {
      res.status(401).json({ error: 'Sign in required' });
      return;
    }
    const customer = await Customer.findByPk(session.id);
    if (!customer) {
      res.status(401).json({ error: 'Sign in required' });
      return;
    }
    res.json({ customer: serializeCustomer(customer) });
  })
);

router.patch(
  '/profile',
  requireCustomer(),
  asyncHandler(async (req, res) => {
    const session = (req as typeof req & { customer: { id: number } }).customer;
    const customer = await Customer.findByPk(session.id);
    if (!customer) {
      res.status(401).json({ error: 'Sign in required' });
      return;
    }
    const profile = readAccountProfile((req.body || {}) as Record<string, unknown>);
    if (profile.error) {
      res.status(400).json({ error: profile.error });
      return;
    }
    applyAccountProfile(customer, profile);
    await customer.save();
    res.json({ customer: serializeCustomer(customer) });
  })
);

router.get(
  '/orders',
  requireCustomer(),
  asyncHandler(async (req, res) => {
    const session = (req as typeof req & { customer: { id: number } }).customer;
    const orders = await Order.findAll({
      where: { customer_id: session.id },
      include: orderInclude,
      order: [['id', 'DESC']],
    });
    res.json({ orders: orders.map((order) => serializeCustomerOrder(order)) });
  })
);

router.get(
  '/orders/:number',
  requireCustomer(),
  asyncHandler(async (req, res) => {
    const session = (req as typeof req & { customer: { id: number } }).customer;
    const number = String(req.params.number || '').trim().slice(0, 40);
    const order = await Order.findOne({
      where: { number, customer_id: session.id },
      include: orderInclude,
    });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json({ order: serializeCustomerOrder(order) });
  })
);

router.post(
  '/orders/lookup',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, name: 'order-lookup' }),
  asyncHandler(async (req, res) => {
    const number = String(req.body?.number || '').trim().slice(0, 40);
    const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 200);
    const order =
      number && email.includes('@')
        ? await Order.findOne({ where: { number, email }, include: orderInclude })
        : null;
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json({ order: serializeCustomerOrder(order) });
  })
);

function accountErrorRedirect(res: Response, message: string): void {
  clearOAuthStateCookie(res);
  res.redirect(`/account?error=${encodeURIComponent(message.slice(0, 180))}`);
}

function safeOAuthMessage(provider: OAuthProvider, error: unknown): string {
  const label = oauthProviderLabel(provider);
  const message = error instanceof Error ? error.message : '';
  if (message === 'This email is already linked to another account.' || message.startsWith(`${label} `)) return message;
  return `${label} sign-in failed.`;
}

async function customerFromProfile(profile: OAuthProfile): Promise<Customer> {
  const column = profile.provider === 'google' ? 'google_sub' : 'facebook_id';
  let customer = await Customer.findOne({ where: { [column]: profile.subject } });
  if (!customer) customer = await Customer.findOne({ where: { email: profile.email } });
  if (customer) {
    const current = String(customer.get(column) || '');
    if (current && current !== profile.subject) {
      throw new Error('This email is already linked to another account.');
    }
    if (!current) customer.set(column, profile.subject);
    if (!customer.first_name && profile.first_name) customer.first_name = profile.first_name;
    if (!customer.last_name && profile.last_name) customer.last_name = profile.last_name;
    await customer.save();
    return customer;
  }
  return Customer.create({
    email: profile.email,
    password_hash: hashPassword(crypto.randomBytes(32).toString('hex')),
    first_name: profile.first_name,
    last_name: profile.last_name,
    google_sub: profile.provider === 'google' ? profile.subject : '',
    facebook_id: profile.provider === 'facebook' ? profile.subject : '',
  });
}

router.get(
  '/oauth/:provider',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, name: 'customer-oauth' }),
  asyncHandler(async (req, res) => {
    const provider = parseOAuthProvider(String(req.params.provider || ''));
    if (!provider) {
      res.status(404).json({ error: 'Unknown sign-in provider' });
      return;
    }
    const label = oauthProviderLabel(provider);
    if (!oauthConfigured(provider)) {
      accountErrorRedirect(res, `${label} sign-in is not configured.`);
      return;
    }
    const state = await issueOAuthState(provider);
    setOAuthStateCookie(res, state);
    res.redirect(oauthAuthorizationUrl(provider, state));
  })
);

router.get(
  '/oauth/:provider/callback',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30, name: 'customer-oauth-callback' }),
  asyncHandler(async (req, res) => {
    const provider = parseOAuthProvider(String(req.params.provider || ''));
    if (!provider) {
      res.status(404).json({ error: 'Unknown sign-in provider' });
      return;
    }
    const label = oauthProviderLabel(provider);
    if (req.query.error) {
      const cancelled = req.query.error === 'access_denied';
      accountErrorRedirect(res, cancelled ? `${label} sign-in was cancelled.` : `${label} sign-in failed.`);
      return;
    }
    const state = String(req.query.state || '');
    const cookie = String(req.cookies?.[OAUTH_STATE_COOKIE] || '');
    if (!state || !cookie || !safeEqual(state, cookie) || !(await verifyOAuthState(provider, state))) {
      accountErrorRedirect(res, 'Sign-in could not be confirmed. Try again.');
      return;
    }
    const code = String(req.query.code || '');
    if (!code || code.length > 2048) {
      accountErrorRedirect(res, `${label} sign-in failed.`);
      return;
    }
    try {
      const profile = await fetchOAuthProfile(provider, code);
      const customer = await customerFromProfile(profile);
      clearOAuthStateCookie(res);
      setCookie(res, CUSTOMER_SESSION_COOKIE, await createCustomerSessionValue(customer.id, customer.email));
      res.redirect('/account');
    } catch (error) {
      accountErrorRedirect(res, safeOAuthMessage(provider, error));
    }
  })
);

export default router;
