import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { requireCustomer } from '../lib/authMiddleware';
import { clearCookie, readCustomerSession, setCookie } from '../lib/cookies';
import { hashPassword, verifyPassword } from '../lib/adminPassword';
import { rateLimit } from '../lib/rateLimit';
import { serializeOrder } from '../lib/serialize';
import {
  CUSTOMER_SESSION_COOKIE,
  createCustomerSessionValue,
} from '../lib/shared/customer-session';
import Customer from '../models/Customer';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';

const router = Router();

router.post(
  '/register',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, name: 'register' }),
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const first_name = String(req.body?.first_name || '').trim();
    const last_name = String(req.body?.last_name || '').trim();
    if (!email.includes('@') || password.length < 6) {
      res.status(400).json({ error: 'Use a valid email and a password of at least 6 characters.' });
      return;
    }
    const existing = await Customer.findOne({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }
    const customer = await Customer.create({
      email,
      password_hash: hashPassword(password),
      first_name,
      last_name,
    });
    setCookie(res, CUSTOMER_SESSION_COOKIE, await createCustomerSessionValue(customer.id, customer.email));
    res.json({ customer: { id: customer.id, email: customer.email, first_name, last_name } });
  })
);

router.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, name: 'customer-login' }),
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
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

router.get(
  '/orders',
  requireCustomer(),
  asyncHandler(async (req, res) => {
    const session = (req as typeof req & { customer: { id: number } }).customer;
    const orders = await Order.findAll({
      where: { customer_id: session.id },
      include: [{ model: OrderItem, as: 'items' }],
      order: [['id', 'DESC']],
    });
    res.json({ orders: orders.map((order) => serializeOrder(order)) });
  })
);

export default router;
