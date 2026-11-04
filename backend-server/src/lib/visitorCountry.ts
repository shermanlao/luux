import type { Request } from 'express';
import geoip from 'geoip-lite';

const names = new Intl.DisplayNames(['en'], { type: 'region' });
const SHORT_NAMES: Record<string, string> = {
  HK: 'Hong Kong',
  MO: 'Macao',
  TW: 'Taiwan',
};

function isPrivate(ip: string): boolean {
  if (ip === '::1' || ip.endsWith(':')) return true;
  if (ip.startsWith('10.') || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true;
  return false;
}

export function visitorIp(req: Request): string {
  const headers = [req.headers['x-real-ip'], req.headers['x-forwarded-for'], req.ip];
  for (const value of headers) {
    const raw = Array.isArray(value) ? value.join(',') : String(value || '');
    for (const part of raw.split(',')) {
      const ip = part.trim().replace(/^::ffff:/, '');
      if (!ip || ip === 'unknown' || isPrivate(ip)) continue;
      return ip;
    }
  }
  return '';
}

export function countryFromIp(ip: string): string {
  if (!ip) return '';
  const code = geoip.lookup(ip)?.country || '';
  if (!/^[A-Z]{2}$/.test(code)) return 'Unknown';
  if (SHORT_NAMES[code]) return SHORT_NAMES[code];
  try {
    const name = names.of(code);
    if (name && name !== code) return name.slice(0, 80);
  } catch {
    /* use the code */
  }
  return code;
}
