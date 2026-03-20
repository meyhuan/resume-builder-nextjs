import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - AI Resume Pass',
  description: 'Log in to AI Resume Pass, a free AI resume builder. No registration required, data synced across devices.',
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
