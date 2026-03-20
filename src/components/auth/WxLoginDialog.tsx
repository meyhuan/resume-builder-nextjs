'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/use-auth-store';
import { logger } from '@/utils/logger';
import { syncUserAction } from '@/app/actions';
import { X, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { setCookie } from 'cookies-next';
import { LegalDialog } from '@/components/legal/LegalDialog';

type LegalTab = 'privacy' | 'terms';

interface WxLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  closeable?: boolean;
  subtitle?: string;
}

type WxStatus = 'pending' | 'scanned' | 'confirming' | 'expired';

export const WxLoginDialog: React.FC<WxLoginDialogProps> = ({ isOpen, onClose, onSuccess, closeable = true, subtitle }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<WxStatus>('pending');
  const [qrcodeUrl, setQrcodeUrl] = useState('');
  const [expireIn, setExpireIn] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sceneStrRef = useRef('');
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const expireTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOpenRef = useRef(isOpen);
  const [legalOpen, setLegalOpen] = useState<boolean>(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('privacy');

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const openLegal = (tab: LegalTab): void => {
    setLegalTab(tab);
    setLegalOpen(true);
  };

  const { setToken, setUserInfo } = useAuthStore();

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const stopExpireCountdown = useCallback(() => {
    if (expireTimerRef.current) {
      clearInterval(expireTimerRef.current);
      expireTimerRef.current = null;
    }
  }, []);

  const genSceneStr = () => {
    const rnd = Math.random().toString(36).slice(2);
    return `wx_${Date.now()}_${rnd}`;
  };

  const getQr = async () => {
    setLoading(true);
    setStatus('pending');
    setErrorMessage(null);
    const newSceneStr = genSceneStr();
    sceneStrRef.current = newSceneStr;
    setQrcodeUrl('');
    setExpireIn(0);

    logger.info('WxLogin', `Generating QR code with sceneStr: ${newSceneStr}`);

    try {
      const resp = await authApi.getWxQrcode(newSceneStr);
      let qrData = resp?.data || resp;
      
      // Handle Java SSO stringified data
      if (typeof qrData === 'string') {
        try {
          qrData = JSON.parse(qrData);
        } catch (e) {
          logger.error('WxLogin', 'Failed to parse stringified QR data', e);
        }
      }
      
      if (qrData?.ticket) {
        setQrcodeUrl(`https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(qrData.ticket)}`);
        logger.success('WxLogin', 'QR code generated successfully');
      } else if (qrData?.url) {
        setQrcodeUrl(qrData.url);
        logger.success('WxLogin', 'QR code generated successfully (fallback URL)');
      } else {
        throw new Error('No ticket or URL found in response');
      }

      if (!isOpenRef.current) {
        return;
      }

      setExpireIn(qrData?.expire_seconds || 120);
      startExpireCountdown();
      startPolling();
    } catch (error: unknown) {
      logger.error('WxLogin', 'Failed to get QR code', error);
      const msg = error instanceof Error ? error.message : 'Failed to get QR code. Please check your network or try again later.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const startExpireCountdown = () => {
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
  };

  const startPolling = () => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      if (status === 'expired') return;
      try {
        const resp = await authApi.exchangeWxToken(sceneStrRef.current);
        const payload = resp.data || resp;

        // Java SSO returns "pending" string or an object with "pending" status
        if (payload === 'pending' || payload.status === 'pending') {
          return;
        }

        // If data contains uid, it means login is successful
        const uid = payload.uid || (payload.data && payload.data.uid);
        
        if (uid) {
          logger.success('WxLogin', `Login successful, UID: ${uid}`);
          // Sync with local database using Server Action
          try {
            await syncUserAction({
              wxId: uid,
              name: `User_${uid}`,
            });
            logger.success('WxLogin', 'User synced to local database via Server Action');
          } catch (syncError) {
            logger.error('WxLogin', 'Failed to sync user to local database', syncError);
          }

          // Since this direct Java API returns a UID instead of a full JWT,
          // we treat the UID as our session token/identifier for now.
          setToken(uid);
          setCookie('auth_uid', uid, { maxAge: 60 * 60 * 24 * 7 }); // Save UID in cookie for server-side access
          setUserInfo({
            id: uid,
            name: `User_${uid}`,
          });

          stopPolling();
          stopExpireCountdown();
          onSuccess?.();
          onClose();
        }
      } catch {
        // Continue polling on 404/403 while waiting for scan
      }
    }, 2000);
  };

  useEffect(() => {
    if (isOpen) {
      getQr();
    } else {
      stopPolling();
      stopExpireCountdown();
    }
    return () => {
      stopPolling();
      stopExpireCountdown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleRefresh = () => {
    getQr();
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && closeable) onClose(); }}>
      <DialogContent
        className="sm:max-w-[420px] p-0 border-none overflow-hidden bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl ring-1 ring-white/50"
        onPointerDownOutside={closeable ? undefined : (e) => e.preventDefault()}
        onEscapeKeyDown={closeable ? undefined : (e) => e.preventDefault()}
        hideCloseButton={!closeable}
      >
        <div className="relative p-8">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />

          {closeable && (
            <button 
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all z-10"
            >
              <X size={18} />
            </button>
          )}

          <div className="text-center mb-8 relative z-10">
            <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
              </span>
              WeChat QR Login
            </DialogTitle>
            <p className="text-slate-500 mt-2 text-sm font-medium">{subtitle || 'Unlock AI resume superpowers'}</p>
          </div>

          <div className="bg-white/50 rounded-2xl p-6 border border-white/60 shadow-inner flex flex-col items-center relative z-10 backdrop-blur-sm">
            {errorMessage ? (
              <div className="w-64 h-64 bg-rose-50/50 rounded-xl border border-rose-100 p-6 flex flex-col items-center justify-center text-center gap-3">
                <AlertCircle className="text-rose-500" size={40} />
                <p className="text-sm text-rose-600 font-medium">{errorMessage}</p>
                <button 
                  onClick={handleRefresh}
                  className="mt-2 text-xs font-bold text-rose-700 hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            ) : (
              <div className="relative w-64 h-64 bg-white rounded-xl border border-slate-100 p-2 shadow-sm flex items-center justify-center group">
                {/* Border Gradient Animation */}
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
                          onClick={handleRefresh}
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

            <div className="mt-6 flex flex-col items-center justify-center gap-1 h-[44px]">
              <p className="text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                {status === 'pending' && 'Scan the QR code above with WeChat'}
                {status === 'scanned' && '✅ Scanned! Please confirm on your phone'}
                {status === 'confirming' && 'Confirming login...'}
                {status === 'expired' && 'QR code expired. Please refresh'}
              </p>
              {expireIn > 0 && status !== 'expired' ? (
                <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                  Expires in {expireIn}s
                </span>
              ) : (
                <div className="h-[20px]" /> /* Placeholder to maintain height */
              )}
            </div>
          </div>

          <div className="mt-8 text-center relative z-10">
            <p className="text-xs text-slate-400">
              By logging in, you agree to our{' '}
              <button type="button" onClick={() => openLegal('privacy')} className="text-violet-600 hover:text-violet-700 hover:underline font-medium">Privacy Policy</button>
              {' '}and{' '}
              <button type="button" onClick={() => openLegal('terms')} className="text-violet-600 hover:text-violet-700 hover:underline font-medium">Terms of Service</button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <LegalDialog isOpen={legalOpen} onClose={() => setLegalOpen(false)} initialTab={legalTab} />
    </>
  );
};
