/** Legacy Shopify locale path prefixes that should 301 to the English URL. */
export const LOCALE_PATH_PREFIXES = ['zh-HK', 'fr', 'ko', 'zh', 'en', 'cn'] as const;

const PREFIX_PATTERN = new RegExp(
  `^/(${LOCALE_PATH_PREFIXES.map((code) => code.replace(/-/g, '\\-')).join('|')})(?:/|$)`,
);

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
  const rest = (match[2] || '').replace(/\/$/, '');
  if (!rest) return '/';
  return `/${rest}`;
}