import { NextResponse, type NextRequest } from 'next/server';

/**
 * Cheap edge-level gate: routes that require a session are redirected to the
 * login page when the auth cookie is missing. The cookie is HttpOnly and set
 * by the API, so it is only a hint — every API call re-verifies the token and
 * the user's role on the server.
 */
const PROTECTED_PREFIXES = ['/dashboard', '/devices', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  if (request.cookies.get('token')?.value) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/devices/:path*', '/admin/:path*'],
};
