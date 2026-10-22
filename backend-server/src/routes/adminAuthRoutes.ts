import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { requireAdmin } from '../lib/authMiddleware';
import { clearCookie, readAdminSession, setCookie } from '../lib/cookies';
import { verifyPassword } from '../lib/adminPassword';
import { rateLimit } from '../lib/rateLimit';
import { ADMIN_SESSION_COOKIE, createSessionValue } from '../lib/shared/admin-session';
import AdminUser from '../models/AdminUser';
import ContactInquiry from '../models/ContactInquiry';
import Order from '../models/Order';
import Product from '../models/Product';

const router = Router();

router.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, name: 'admin-login' }),
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const user = await AdminUser.findOne({ where: { email } });
    if (!user || !user.active || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    setCookie(res, ADMIN_SESSION_COOKIE, await createSessionValue(user.username, 'admin', user.session_epoch));
    res.json({ username: user.username, role: user.role, email: user.email });
  })
);

router.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    clearCookie(res, ADMIN_SESSION_COOKIE);
    res.json({ ok: true });
  })
);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const session = await readAdminSession(req);
    if (!session) {
      res.status(401).json({ error: 'Sign in required' });
      return;
    }
    res.json({ username: session.username, role: session.role });
  })
);

router.get(
  '/dashboard',
  requireAdmin(),
  asyncHandler(async (_req, res) => {
    const [products, orders, paid, inquiries] = await Promise.all([
      Product.count(),
      Order.count(),
      Order.count({ where: { status: 'paid' } }),
      ContactInquiry.count(),
    ]);
    res.json({ products, orders, paid, inquiries });
  })
);

export default router;
