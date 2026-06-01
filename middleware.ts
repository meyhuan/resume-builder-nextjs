import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'auth_uid';

/**
 * Protected routes that require authentication
 * Add or remove routes as needed
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/editor',
  '/admin',
];

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/api',
];

/**
 * Check if a path matches any of the protected routes
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if a path matches any of the public routes
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api') || pathname.startsWith('/next-api')) {
    return NextResponse.next();
  }

  // Get auth token from cookies
  const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = !!authToken;

  if (!isAuthenticated && isLocalE2eAutoLoginEnabled(request)) {
    const setupUrl = new URL('/next-api/e2e/login', request.url);
    setupUrl.searchParams.set('next', pathname + request.nextUrl.search);
    return NextResponse.redirect(setupUrl, { status: 307 });
  }
  
  // Debug logging
  console.log('[Middleware]', {
    pathname,
    authToken: authToken ? '✓ exists' : '✗ missing',
    isAuthenticated,
    isProtected: isProtectedRoute(pathname)
  });

  // If accessing a protected route without authentication
  if (isProtectedRoute(pathname) && !isAuthenticated) {
    console.log('[Middleware] Redirecting to login:', pathname);
    const loginUrl = new URL('/login', request.url);
    // Store the original URL to redirect back after login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated user tries to access login page, redirect to dashboard
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

function isLocalE2eAutoLoginEnabled(request: NextRequest): boolean {
  if (process.env.E2E_AUTH_ENABLED !== 'true') return false;
  if (process.env.E2E_AUTH_AUTO_LOGIN !== 'true') return false;
  return isLoopbackHost(request);
}

function isLoopbackHost(request: NextRequest): boolean {
  const hostname = request.nextUrl.hostname.toLowerCase();
  if (hostname === 'localhost') return true;
  if (hostname === '::1' || hostname === '[::1]') return true;
  if (hostname === '0:0:0:0:0:0:0:1') return true;
  if (hostname.startsWith('127.')) return true;
  return false;
}

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
