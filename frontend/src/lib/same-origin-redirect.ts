import { NextRequest, NextResponse } from 'next/server';

function firstHeader(value: string | null): string {
  return (value || '').split(',')[0].trim();
}

function isLoopbackHost(host: string): boolean {
  const hostname = host.replace(/^\[|\]$/g, '').split('%')[0].toLowerCase();
  const name = hostname.startsWith('::') ? hostname : hostname.split(':')[0];
  return name === 'localhost' || name === '127.0.0.1' || name === '::1';
}

export function redirectSameOrigin(request: NextRequest, path: string, search?: string): NextResponse {
  const location = search ? `${path}?${search}` : path;
  const host = firstHeader(request.headers.get('x-forwarded-host')) || firstHeader(request.headers.get('host'));
  const proto = firstHeader(request.headers.get('x-forwarded-proto')) || 'http';
  if (host && !isLoopbackHost(host)) {
    return NextResponse.redirect(`${proto}://${host}${location}`);
  }
  const env = (process.env.SITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  if (env) return NextResponse.redirect(`${env}${location}`);
  return NextResponse.redirect(new URL(location, request.url));
}
