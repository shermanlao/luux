function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toHex(sig);
}

export function cookieIsSecure(): boolean {
  const flag = (process.env.COOKIE_SECURE || '').trim().toLowerCase();
  if (flag === '1' || flag === 'true' || flag === 'yes') return true;
  if (flag === '0' || flag === 'false' || flag === 'no') return false;
  const origin = process.env.SITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || '';
  if (origin.startsWith('https://')) return true;
  if (origin.startsWith('http://')) return false;
  return process.env.NODE_ENV === 'production';
}

export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  get secure() {
    return cookieIsSecure();
  },
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MS / 1000,
};
