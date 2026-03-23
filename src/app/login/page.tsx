'use client';

import { Suspense, useEffect, useState } from 'react';
import { SignIn, useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { LegalDialog } from '@/components/legal/LegalDialog';

type LegalTab = 'privacy' | 'terms';

/**
 * Login page for the Clerk-based authentication flow.
 */
function LoginForm(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const redirectPath: string = searchParams.get('redirect') || '/dashboard';
  const [legalOpen, setLegalOpen] = useState<boolean>(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('privacy');
  const [redirectUrl, setRedirectUrl] = useState<string>(redirectPath);

  const openLegal = (tab: LegalTab): void => {
    setLegalTab(tab);
    setLegalOpen(true);
  };

  useEffect(() => {
    if (isSignedIn) {
      router.push(redirectPath);
    }
  }, [isSignedIn, redirectPath, router]);

  useEffect(() => {
    setRedirectUrl(redirectPath);
  }, [redirectPath]);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-50">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-500/10 rounded-full blur-[100px] animate-pulse-slow [animation-delay:2s]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-600 mb-8 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Back to Home
        </Link>

        <div className="w-full flex justify-center drop-shadow-2xl">
          <SignIn
            routing="hash"
            fallbackRedirectUrl={redirectUrl}
            appearance={{
              elements: {
                card: 'rounded-3xl border border-white/60 shadow-none bg-white/80 backdrop-blur-xl',
                rootBox: 'w-full',
                headerTitle: 'text-slate-900 text-2xl font-bold',
                headerSubtitle: 'text-slate-500',
                socialButtonsBlockButton: 'rounded-xl',
                formButtonPrimary: 'bg-violet-600 hover:bg-violet-700 text-sm',
                footerActionLink: 'text-violet-600 hover:text-violet-700',
              },
            }}
          />
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            By logging in, you agree to our{' '}
            <button type="button" onClick={() => openLegal('privacy')} className="text-violet-600 hover:text-violet-700 hover:underline font-medium">Privacy Policy</button>
            {' '}and{' '}
            <button type="button" onClick={() => openLegal('terms')} className="text-violet-600 hover:text-violet-700 hover:underline font-medium">Terms of Service</button>
          </p>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-6 text-center">
          <div className="space-y-3 group cursor-default">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-slate-100 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
              <span className="text-2xl group-hover:animate-bounce">🎨</span>
            </div>
            <p className="text-xs font-medium text-slate-600">Rich Templates</p>
          </div>
          <div className="space-y-3 group cursor-default">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-slate-100 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
              <span className="text-2xl group-hover:animate-spin-slow">⚡</span>
            </div>
            <p className="text-xs font-medium text-slate-600">AI Fast Generation</p>
          </div>
          <div className="space-y-3 group cursor-default">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-slate-100 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
              <span className="text-2xl group-hover:animate-pulse">💯</span>
            </div>
            <p className="text-xs font-medium text-slate-600">Free Forever</p>
          </div>
        </div>
      </div>

      <LegalDialog isOpen={legalOpen} onClose={() => setLegalOpen(false)} initialTab={legalTab} />
    </div>
  );
}

export default function LoginPage(): React.ReactElement {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
