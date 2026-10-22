import { hmacHex, safeEqual, SESSION_COOKIE_OPTIONS, SESSION_MS } from './hmac';
import { resolveSessionSecret } from './production-secrets';

export const ADMIN_SESSION_COOKIE = 'luux_admin_session';
export { SESSION_COOKIE_OPTIONS };

export type AdminSession = {
  username: string;
  role: 'admin';
  epoch: number;
};

export async function createSessionValue(
  username: string,
  role: 'admin' = 'admin',
  epoch = 0,
  now = Date.now()
): Promise<string> {
  const exp = now + SESSION_MS;
  const payload = `${encodeURIComponent(username)}.${role}.${exp}.${epoch}`;
  const sig = await hmacHex(resolveSessionSecret(), payload);
  return `${payload}.${sig}`;
}

export async function verifySessionValue(value: string | undefined | null): Promise<AdminSession | null> {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 5) return null;
  const [userEnc, role, expStr, epochStr, sig] = parts;
  if (role !== 'admin') return null;
  let username = '';
  try {
    username = decodeURIComponent(userEnc);
  } catch {
    return null;
  }
  if (!username) return null;
  const exp = Number(expStr);
  const epoch = Number(epochStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  if (!Number.isFinite(epoch) || epoch < 0) return null;
  const payload = `${userEnc}.${role}.${expStr}.${epochStr}`;
  const expected = await hmacHex(resolveSessionSecret(), payload);
  if (!safeEqual(sig, expected)) return null;
  return { username, role, epoch };
}

export function safeAdminNextPath(raw: string | null | undefined): string {
  if (!raw) return '/admin';
  if (raw.includes('..') || raw.includes('//') || raw.includes('\\')) return '/admin';
  if (!/^\/admin(\/[\w\/-]*)?$/.test(raw)) return '/admin';
  return raw;
}
