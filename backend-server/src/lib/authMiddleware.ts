import type { NextFunction, Request, Response } from 'express';
import { readAdminSession, readCustomerSession } from './cookies';

export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = await readAdminSession(req);
    if (!session) {
      res.status(401).json({ error: 'Sign in required' });
      return;
    }
    (req as Request & { admin?: typeof session }).admin = session;
    next();
  };
}

export function requireCustomer() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = await readCustomerSession(req);
    if (!session) {
      res.status(401).json({ error: 'Sign in required' });
      return;
    }
    (req as Request & { customer?: typeof session }).customer = session;
    next();
  };
}
