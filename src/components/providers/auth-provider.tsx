'use client';

import type { ReactElement, ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';

type AuthProviderProps = {
  children: ReactNode;
};

/**
 * Provides Clerk client auth context behind an explicit client boundary.
 */
export function AuthProvider(props: AuthProviderProps): ReactElement {
  const { children } = props;
  return <ClerkProvider>{children}</ClerkProvider>;
}
