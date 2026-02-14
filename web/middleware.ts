import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  Sentry.setTag('request_id', requestId);

  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = await getToken({ req: request });

    if (!token) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.headers.set('x-request-id', requestId);
      return response;
    }

    // Inline admin role check — middleware runs at edge, can't import from src/
    const role = (token.role as string) || '';
    const adminRoles = ['ADMIN', 'MAJORITY_OWNER', 'DIRECTOR_OF_SYSTEMS_INTEGRATIONS'];
    if (!adminRoles.includes(role)) {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.headers.set('x-request-id', requestId);
      return response;
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('x-request-id', requestId);

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
};
