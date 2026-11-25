/** Build a www → apex redirect URL without using the internal request URL (avoids leaking listen ports). */

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

export function publicOriginFromEnv(
  siteOrigin = process.env.SITE_ORIGIN,
  nextPublicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL,
): string | null {
  const raw = (nextPublicSiteUrl || siteOrigin || '').replace(/\/$/, '');
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return null;
  }
}

export function buildWwwToApexLocation(
  pathname: string,
  search: string,
  apexHost: string,
  forwardedProto: string | null,
  envOrigin: string | null,
): string {
  const path = `${pathname}${search}`;
  if (envOrigin) return `${envOrigin}${path}`;
  const proto = firstForwardedHeader(forwardedProto) || 'https';
  return `${proto}://${apexHost}${path}`;
}