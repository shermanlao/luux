import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifySessionValue } from '@/lib/admin-session';
import { redirectSameOrigin } from '@/lib/same-origin-redirect';
import { visitorKind } from '@shared/visitorKind';

const API_ORIGIN = process.env.API_ORIGIN || 'http://127.0.0.1:3333';

function isShopPage(pathname: string): boolean {
  if (!pathname.startsWith('/') || pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return false;
  }
  if (pathname.startsWith('/uploads') || pathname.startsWith('/images')) return false;
  if (pathname.includes('..') || pathname.length > 200) return false;
  if (/\.[a-z0-9]{1,8}$/i.test(pathname)) return false;
  return true;
}

function isDocumentGet(request: NextRequest): boolean {
  if (request.method !== 'GET') return false;
  const purpose = `${request.headers.get('purpose') || ''} ${request.headers.get('sec-purpose') || ''}`.toLowerCase();
  if (purpose.includes('prefetch')) return false;
  if (request.headers.get('next-router-prefetch')) return false;
  if (request.headers.get('x-middleware-prefetch') === '1') return false;
  if (request.headers.get('rsc') === '1') return false;
  const dest = (request.headers.get('sec-fetch-dest') || '').toLowerCase();
  if (dest && dest !== 'document') return false;
  return isShopPage(request.nextUrl.pathname);
}

function visitorAddress(request: NextRequest): string {
  const real = (request.headers.get('x-real-ip') || '').trim();
  const forwarded = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  return (real || forwarded).slice(0, 80);
}

async function countAutomatedVisit(request: NextRequest): Promise<void> {
  if (!isDocumentGet(request)) return;
  const userAgent = request.headers.get('user-agent') || '';
  if (visitorKind(userAgent) === 'Human') return;
  const path = request.nextUrl.pathname.split('?')[0].slice(0, 200);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-luux-agent': userAgent.slice(0, 400) || 'unknown',
  };
  const address = visitorAddress(request);
  if (address) headers['x-real-ip'] = address;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    await fetch(`${API_ORIGIN}/api/traffic`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ path }),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch {
    /* a missed automated view should not block the page */
  } finally {
    clearTimeout(timer);
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/admin')) {
    await countAutomatedVisit(request);
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifySessionValue(token);

  if (pathname === '/admin/login') {
    if (session) return redirectSameOrigin(request, '/admin');
    return NextResponse.next();
  }

  if (!session) {
    const next = new URLSearchParams({ next: pathname });
    return redirectSameOrigin(request, '/admin/login', next.toString());
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/((?!_next/static|_next/image|api/|uploads/|images/|favicon.ico).*)',
  ],
};
