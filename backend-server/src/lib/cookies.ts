import type { CookieOptions, Request, Response } from 'express';
import { SESSION_COOKIE_OPTIONS } from './shared/hmac';
import AdminUser from '../models/AdminUser';
import { ADMIN_SESSION_COOKIE, verifySessionValue, type AdminSession } from './shared/admin-session';
import { CUSTOMER_SESSION_COOKIE, verifyCustomerSessionValue, type CustomerSession } from './shared/customer-session';

function cookieOptions(): CookieOptions {
  return {
    httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
    secure: SESSION_COOKIE_OPTIONS.secure,
    sameSite: SESSION_COOKIE_OPTIONS.sameSite,
    path: SESSION_COOKIE_OPTIONS.path,
    maxAge: SESSION_COOKIE_OPTIONS.maxAge * 1000,
  };
}

export function setCookie(res: Response, name: string, value: string): void {
  res.cookie(name, value, cookieOptions());
}

export function clearCookie(res: Response, name: string): void {
  const options = cookieOptions();
  res.clearCookie(name, { path: options.path, httpOnly: options.httpOnly, sameSite: options.sameSite, secure: options.secure });
}

export async function readAdminSession(req: Request): Promise<AdminSession | null> {
  const session = await verifySessionValue(req.cookies?.[ADMIN_SESSION_COOKIE]);
  if (!session) return null;
  const user = await AdminUser.findOne({ where: { username: session.username } });
  if (!user || !user.active || user.session_epoch !== session.epoch) return null;
  return session;
}

export async function readCustomerSession(req: Request): Promise<CustomerSession | null> {
  return verifyCustomerSessionValue(req.cookies?.[CUSTOMER_SESSION_COOKIE]);
}
