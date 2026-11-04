import { hmacHex, safeEqual, SESSION_MS } from './hmac';
import { resolveSessionSecret } from './production-secrets';

export const CUSTOMER_SESSION_COOKIE = 'luux_customer_session';

export type CustomerSession = {
  id: number;
  email: string;
};

function encodePart(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodePart(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function createCustomerSessionValue(id: number, email: string, now = Date.now()): Promise<string> {
  const exp = now + SESSION_MS;
  const payload = `${id}.${encodePart(email.toLowerCase())}.${exp}`;
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
    email = decodePart(emailEnc).toLowerCase();
  } catch {
    return null;
  }
  if (!email.includes('@')) return null;
  const payload = `${idStr}.${emailEnc}.${expStr}`;
  const expected = await hmacHex(resolveSessionSecret(), payload);
  if (!safeEqual(sig, expected)) return null;
  return { id, email };
}
