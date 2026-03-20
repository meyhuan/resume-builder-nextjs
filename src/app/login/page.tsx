'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCookie, setCookie } from 'cookies-next';
import { ArrowLeft, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/use-auth-store';
import { syncUserAction } from '@/app/actions';
import { logger } from '@/utils/logger';
import { LegalDialog } from '@/components/legal/LegalDialog';

type WxStatus = 'pending' | 'scanned' | 'confirming' | 'expired';
type LegalTab = 'privacy' | 'terms';

/**
 * Login page that displays the WeChat QR code directly on load
 * without requiring the user to click a button first.
 */
function LoginForm(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath: string = searchParams.get('redirect') || '/dashboard';
  const { setToken, setUserInfo } = useAuthStore();

  // QR code state
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<WxStatus>('pending');
  const [qrcodeUrl, setQrcodeUrl] = useState<string>('');
  const [expireIn, setExpireIn] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sceneStrRef = useRef<string>('');
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const expireTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [legalOpen, setLegalOpen] = useState<boolean>(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('privacy');

  const openLegal = (tab: LegalTab): void => {
    setLegalTab(tab);
    setLegalOpen(true);
  };

  // If already logged in, redirect immediately
  useEffect(() => {
    const authToken = getCookie('auth_uid');
    if (authToken) {
      router.push(redirectPath);
    }
  }, [redirectPath, router]);

  const stopPolling = useCallback((): void => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const stopExpireCountdown = useCallback((): void => {
    if (expireTimerRef.current) {
      clearInterval(expireTimerRef.current);
      expireTimerRef.current = null;
    }
  }, []);

  const handleLoginSuccess = useCallback((uid: string): void => {
    setToken(uid);
    setCookie('auth_uid', uid, { maxAge: 60 * 60 * 24 * 7 });
    setUserInfo({ id: uid, name: `User_${uid}` });
    stopPolling();
    stopExpireCountdown();
    router.push(redirectPath);
  }, [setToken, setUserInfo, stopPolling, stopExpireCountdown, router, redirectPath]);

  const startExpireCountdown = useCallback((): void => {
    stopExpireCountdown();
    expireTimerRef.current = setInterval(() => {
      setExpireIn((prev) => {
        if (prev <= 1) {
          stopPolling();
          setStatus('expired');
          stopExpireCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopExpireCountdown, stopPolling]);

  const startPolling = useCallback((): void => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const resp = await authApi.exchangeWxToken(sceneStrRef.current);
        const payload = resp.data || resp;
        if (payload === 'pending' || payload.status === 'pending') return;
        const uid: string | undefined = payload.uid || (payload.data && payload.data.uid);
        if (uid) {
          logger.success('WxLogin', `Login successful, UID: ${uid}`);
          try {
            await syncUserAction({ wxId: uid, name: `User_${uid}` });
          } catch (syncError) {
            logger.error('WxLogin', 'Failed to sync user', syncError);
          }
          handleLoginSuccess(uid);
        }
      } catch {
        // Continue polling
      }
    }, 2000);
  }, [stopPolling, handleLoginSuccess]);

  const getQr = useCallback(async (): Promise<void> => {
    setLoading(true);
    setStatus('pending');
    setErrorMessage(null);
    const newSceneStr = `wx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sceneStrRef.current = newSceneStr;
    setQrcodeUrl('');
    setExpireIn(0);
    try {
      const resp = await authApi.getWxQrcode(newSceneStr);
      let qrData = resp?.data || resp;
      if (typeof qrData === 'string') {
        try { qrData = JSON.parse(qrData); } catch { /* ignore */ }
      }
      if (qrData?.ticket) {
        setQrcodeUrl(`https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(qrData.ticket)}`);
      } else if (qrData?.url) {
        setQrcodeUrl(qrData.url);
      } else {
        throw new Error('No ticket or URL found in response');
      }
      setExpireIn(qrData?.expire_seconds || 120);
      startExpireCountdown();
      startPolling();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to get QR code. Please check your network or try again later.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [startExpireCountdown, startPolling]);

  // Fetch QR code on mount
  useEffect(() => {
    const authToken = getCookie('auth_uid');
    if (!authToken) {
      getQr();
    }
    return () => {
      stopPolling();
      stopExpireCountdown();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-50">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-500/10 rounded-full blur-[100px] animate-pulse-slow [animation-delay:2s]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to home link */}
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

          {/* Header */}
          <div className="text-center pt-10 pb-4 px-8">
            <div className="mx-auto w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30 mb-4">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">WeChat QR Login</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {redirectPath !== '/dashboard'
                ? 'You will be redirected after login'
                : 'Unlock AI resume superpowers'}
            </p>
          </div>

          {/* QR Code — displayed directly */}
          <div className="px-8 pb-6">
            <div className="bg-white/50 rounded-2xl p-6 border border-white/60 shadow-inner flex flex-col items-center backdrop-blur-sm">
              {errorMessage ? (
                <div className="w-56 h-56 bg-rose-50/50 rounded-xl border border-rose-100 p-6 flex flex-col items-center justify-center text-center gap-3">
                  <AlertCircle className="text-rose-500" size={40} />
                  <p className="text-sm text-rose-600 font-medium">{errorMessage}</p>
                  <button
                    onClick={getQr}
                    className="mt-2 text-xs font-bold text-rose-700 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              ) : (
                <div className="relative w-56 h-56 bg-white rounded-xl border border-slate-100 p-2 shadow-sm flex items-center justify-center group">
                  <div className="absolute -inset-[1px] bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                  {loading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-violet-600" size={36} />
                      <span className="text-xs text-slate-400 font-medium animate-pulse">Generating QR code...</span>
                    </div>
                  ) : qrcodeUrl ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={qrcodeUrl}
                        alt="WeChat Login QR Code"
                        fill
                        className={status === 'expired' ? 'opacity-20 grayscale' : 'mix-blend-multiply'}
                      />
                      {status === 'expired' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 backdrop-blur-[2px]">
                          <button
                            onClick={getQr}
                            className="p-3 bg-violet-600 text-white rounded-full hover:bg-violet-700 transition-all shadow-lg hover:scale-110 active:scale-95 ring-4 ring-violet-100"
                          >
                            <RefreshCw size={24} />
                          </button>
                          <span className="text-sm font-bold text-slate-700">QR code expired</span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="mt-4 flex flex-col items-center gap-1">
                <p className="text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  {status === 'pending' && 'Scan the QR code above with WeChat'}
                  {status === 'scanned' && 'Scanned! Please confirm on your phone'}
                  {status === 'confirming' && 'Confirming login...'}
                  {status === 'expired' && 'QR code expired. Please refresh'}
                </p>
                {expireIn > 0 && status !== 'expired' && (
                  <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                    Expires in {expireIn}s
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Legal footer */}
          <div className="px-8 pb-8 text-center">
            <p className="text-xs text-slate-400">
              By logging in, you agree to our{' '}
              <button type="button" onClick={() => openLegal('privacy')} className="text-violet-600 hover:text-violet-700 hover:underline font-medium">Privacy Policy</button>
              {' '}and{' '}
              <button type="button" onClick={() => openLegal('terms')} className="text-violet-600 hover:text-violet-700 hover:underline font-medium">Terms of Service</button>
            </p>
          </div>
        </div>

        {/* Feature highlights */}
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
