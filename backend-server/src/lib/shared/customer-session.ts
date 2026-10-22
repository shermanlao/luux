import { hmacHex, safeEqual, SESSION_MS } from './hmac';
import { resolveSessionSecret } from './production-secrets';

export const CUSTOMER_SESSION_COOKIE = 'luux_customer_session';

export type CustomerSession = {
  id: number;
  email: string;
};

export async function createCustomerSessionValue(id: number, email: string, now = Date.now()): Promise<string> {
  const exp = now + SESSION_MS;
  const payload = `${id}.${encodeURIComponent(email.toLowerCase())}.${exp}`;
  const sig = await hmacHex(resolveSessionSecret(), payload);
  return `${payload}.${sig}`;
}

export async function verifyCustomerSessionValue(value: string | undefined | null): Promise<CustomerSession | null> {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const [idStr, emailEnc, expStr, sig] = parts;
  const id = Number(idStr);
  const exp = Number(expStr);
  if (!Number.isFinite(id) || id < 1) return null;
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  let email = '';
  try {
    email = decodeURIComponent(emailEnc).toLowerCase();
  } catch {
    return null;
  }
  if (!email) return null;
  const payload = `${idStr}.${emailEnc}.${expStr}`;
  const expected = await hmacHex(resolveSessionSecret(), payload);
  if (!safeEqual(sig, expected)) return null;
  return { id, email };
}
