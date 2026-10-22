import { Request, Response, NextFunction } from 'express';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientIp(req: Request): string {
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function rateLimit(options: { windowMs: number; max: number; name: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${options.name}:${clientIp(req)}`;
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > options.max) {
      const retrySec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retrySec));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    return next();
  };
}
