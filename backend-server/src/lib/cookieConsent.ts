import { createHash } from 'crypto';
import type { Request } from 'express';
import { clientIp } from './rateLimit';
import { resolveSessionSecret } from './shared/production-secrets';

export function hashClientIp(req: Request): string {
  return createHash('sha256').update(`${resolveSessionSecret()}:${clientIp(req)}`).digest('hex');
}
