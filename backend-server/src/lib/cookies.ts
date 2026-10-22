import type { CookieOptions, Request, Response } from 'express';
import { SESSION_COOKIE_OPTIONS } from './shared/hmac';
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
  res.clearCookie(name, { path: '/', httpOnly: true, sameSite: 'lax' });
}

export async function readAdminSession(req: Request): Promise<AdminSession | null> {
  return verifySessionValue(req.cookies?.[ADMIN_SESSION_COOKIE]);
}

export async function readCustomerSession(req: Request): Promise<CustomerSession | null> {
  return verifyCustomerSessionValue(req.cookies?.[CUSTOMER_SESSION_COOKIE]);
}
