/** Build a www → apex redirect URL without using the internal request URL (avoids leaking listen ports). */

const KNOWN_PUBLIC_APEX = 'luuxmart.com';

export function firstForwardedHeader(value: string | null | undefined): string {
  return (value || '').split(',')[0].trim();
}

export function bareHostname(hostHeader: string): string {
  return hostHeader.replace(/:\d+$/, '');
}

/** Apex hostname when the request host is www.*; null when no redirect should run. */
export function wwwApexHostFromRequest(hostHeader: string): string | null {
  const bare = bareHostname(hostHeader);
  if (!/^www\./i.test(bare)) return null;
  const apex = bare.replace(/^www\./i, '');
  if (/^(localhost|127\.0\.0\.1)$/i.test(apex)) return null;
  return apex;
}

/** Only `http` or `https` — rejects crafted X-Forwarded-Proto values. */
export function safeRedirectProto(value: string | null | undefined): 'http' | 'https' | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  if (raw.includes(',') || /\s/.test(raw)) return null;
  const token = raw.toLowerCase();
  if (token === 'http' || token === 'https') return token;
  return null;
}

function envHostnameAllowlist(
  siteOrigin = process.env.SITE_ORIGIN,
  nextPublicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL,
): Set<string> {
  const hosts = new Set<string>([KNOWN_PUBLIC_APEX]);
  for (const raw of [nextPublicSiteUrl, siteOrigin]) {
    if (!raw) continue;
    try {
      const parsed = new URL(String(raw).replace(/\/$/, ''));
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        hosts.add(parsed.hostname.toLowerCase());
      }
    } catch {
      /* ignore invalid env */
    }
  }
  return hosts;
}

export function publicOriginFromEnv(
  siteOrigin = process.env.SITE_ORIGIN,
  nextPublicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL,
): string | null {
  const raw = (nextPublicSiteUrl || siteOrigin || '').replace(/\/$/, '');
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return null;
  }
}

/**
 * Build redirect Location, or null when env and headers cannot safely target a known public host.
 * With env set, Location uses env origin only (headers are not trusted for hostname).
 */
export function buildWwwToApexLocation(
  pathname: string,
  search: string,
  apexHost: string,
  forwardedProto: string | null,
  envOrigin: string | null,
  siteOrigin?: string,
  nextPublicSiteUrl?: string,
): string | null {
  const path = `${pathname}${search}`;
  if (envOrigin) return `${envOrigin}${path}`;

  const apex = apexHost.toLowerCase();
  if (!envHostnameAllowlist(siteOrigin, nextPublicSiteUrl).has(apex)) return null;

  const protoHeader = firstForwardedHeader(forwardedProto);
  const proto = safeRedirectProto(forwardedProto);
  if (protoHeader && !proto) return null;
  const scheme = proto ?? 'https';
  return `${scheme}://${apex}${path}`;
}