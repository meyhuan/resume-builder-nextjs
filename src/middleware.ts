import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/editor(.*)', '/admin(.*)']);

export default clerkMiddleware(async (auth, request) => {
  const { pathname, search } = request.nextUrl;
  const { userId } = await auth();
  if (isProtectedRoute(request)) {
    if (!userId) {
      const redirectTarget: string = `${pathname}${search}`;
      const loginUrl: URL = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', redirectTarget);
      return NextResponse.redirect(loginUrl);
    }
  }
  if (pathname === '/login' && userId) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (!userId && pathname === '/login' && !request.nextUrl.searchParams.get('redirect')) {
    const redirectTarget: string = `${pathname}${search}`;
    const loginUrl: URL = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', redirectTarget);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
