import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = await getToken({ req: request });

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Inline admin role check — middleware runs at edge, can't import from src/
    const role = (token.role as string) || '';
    const adminRoles = ['ADMIN', 'MAJORITY_OWNER', 'DIRECTOR_OF_SYSTEMS_INTEGRATIONS'];
    if (!adminRoles.includes(role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
