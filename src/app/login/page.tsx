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

        <div className="shadow-2xl shadow-violet-500/10 border border-white/60 bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" />

          <div className="text-center pt-10 pb-4 px-8">
            <div className="mx-auto w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30 mb-4">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Sign In</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {redirectPath !== '/dashboard'
                ? 'You will be redirected after login'
                : 'Unlock AI resume superpowers'}
            </p>
          </div>

          <div className="px-8 pb-6">
            <div className="bg-white/50 rounded-2xl p-6 border border-white/60 shadow-inner flex flex-col items-center backdrop-blur-sm">
              <div className="w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <SignIn
                  routing="hash"
                  fallbackRedirectUrl={redirectUrl}
                  appearance={{
                    elements: {
                      card: 'shadow-none border-0 rounded-none',
                      rootBox: 'w-full',
                      headerTitle: 'text-slate-900',
                      headerSubtitle: 'text-slate-500',
                      socialButtonsBlockButton: 'rounded-xl',
                      formButtonPrimary: 'bg-violet-600 hover:bg-violet-700 text-sm',
                      footerActionLink: 'text-violet-600 hover:text-violet-700',
                    },
                  }}
                />
              </div>
            </div>
          </div>

          <div className="px-8 pb-8 text-center">
            <p className="text-xs text-slate-400">
              By logging in, you agree to our{' '}
              <button type="button" onClick={() => openLegal('privacy')} className="text-violet-600 hover:text-violet-700 hover:underline font-medium">Privacy Policy</button>
              {' '}and{' '}
              <button type="button" onClick={() => openLegal('terms')} className="text-violet-600 hover:text-violet-700 hover:underline font-medium">Terms of Service</button>
            </p>
          </div>
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
