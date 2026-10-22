import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifySessionValue } from '@/lib/admin-session';
import { redirectSameOrigin } from '@/lib/same-origin-redirect';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/admin')) return NextResponse.next();

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
  matcher: ['/admin', '/admin/:path*'],
};
