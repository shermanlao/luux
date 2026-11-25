/** Legacy Shopify locale path prefixes that should 301 to the English URL. */
export const LOCALE_PATH_PREFIXES = ['zh-HK', 'fr', 'ko', 'zh', 'en', 'cn'] as const;

const PREFIX_PATTERN = new RegExp(
  `^/(${LOCALE_PATH_PREFIXES.map((code) => code.replace(/-/g, '\\-')).join('|')})(?:/|$)`,
);

/** Reject protocol-relative or off-site paths after a locale prefix is removed. */
export function isSameSiteRedirectPath(pathname: string): boolean {
  if (pathname === '/') return true;
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return false;
  if (pathname.includes('://') || pathname.includes('..')) return false;
  if (pathname.length > 200) return false;
  return /^\/[a-zA-Z0-9._~%-]+(?:\/[a-zA-Z0-9._~%-]+)*\/?$/.test(pathname);
}

/**
 * Strips a leading locale prefix and returns the apex English path (always starts with `/`).
 */
export function stripLocalePrefix(pathname: string): string | null {
  const normalized = pathname.split('?')[0] || '/';
  if (!PREFIX_PATTERN.test(normalized)) return null;
  const match = normalized.match(
    new RegExp(`^/(${LOCALE_PATH_PREFIXES.map((code) => code.replace(/-/g, '\\-')).join('|')})(?:/(.*))?$`),
  );
  if (!match) return null;
  const restRaw = match[2];
  if (restRaw === undefined || restRaw === '') return '/';
  if (restRaw.startsWith('/') || restRaw.includes('://')) return null;
  const target = `/${restRaw.replace(/\/$/, '')}`;
  return isSameSiteRedirectPath(target) ? target : null;
}