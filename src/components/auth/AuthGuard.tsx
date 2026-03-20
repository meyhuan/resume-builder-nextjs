'use client';

import { useEffect, type ReactNode, Suspense } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

function AuthGuardContent({ children, fallback }: AuthGuardProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''))}`;
      router.push(loginUrl);
    }
  }, [isLoaded, isSignedIn, pathname, searchParams, router]);

  const isChecking: boolean = !isLoaded;
  const isAuthenticated: boolean = isLoaded && Boolean(isSignedIn);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Verifying authentication...</p>
          </div>
        </div>
      )
    );
  }

  // Only render children if authenticated
  return isAuthenticated ? <>{children}</> : null;
}

/**
 * AuthGuard - Client-side authentication guard component
 * Wraps protected pages to ensure user is authenticated
 * Redirects to login page if not authenticated
 */
export default function AuthGuard(props: AuthGuardProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthGuardContent {...props} />
    </Suspense>
  );
}
