'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/use-auth-store';
import { logger } from '@/utils/logger';
import { syncUserAction } from '@/app/actions';
import { X, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface WxLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type WxStatus = 'pending' | 'scanned' | 'confirming' | 'expired';

export const WxLoginDialog: React.FC<WxLoginDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<WxStatus>('pending');
  const [qrcodeUrl, setQrcodeUrl] = useState('');
  const [expireIn, setExpireIn] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sceneStrRef = useRef('');
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const expireTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      setExpireIn(qrData?.expire_seconds || 120);
      startExpireCountdown();
      startPolling();
    } catch (error: any) {
      logger.error('WxLogin', 'Failed to get QR code', error);
      setErrorMessage(error.message || '获取二维码失败，请检查网络或稍后重试');
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
              name: `用户_${uid}`,
            });
            logger.success('WxLogin', 'User synced to local database via Server Action');
          } catch (syncError) {
            logger.error('WxLogin', 'Failed to sync user to local database', syncError);
          }

          // Since this direct Java API returns a UID instead of a full JWT,
          // we treat the UID as our session token/identifier for now.
          setToken(uid);
          setUserInfo({
            id: uid,
            name: `用户_${uid}`,
          });

          stopPolling();
          stopExpireCountdown();
          onSuccess?.();
          onClose();
        }
      } catch (error) {
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
  }, [isOpen]);

  const handleRefresh = () => {
    getQr();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] p-0 border-none overflow-hidden bg-white rounded-2xl">
        <div className="relative p-8">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-8">
            <DialogTitle className="text-2xl font-bold text-gray-900">微信扫码登录</DialogTitle>
            <p className="text-gray-500 mt-2 text-sm">使用微信扫码快速登录</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-inner flex flex-col items-center">
            {errorMessage ? (
              <div className="w-64 h-64 bg-red-50 rounded-xl border border-red-100 p-6 flex flex-col items-center justify-center text-center gap-3">
                <AlertCircle className="text-red-500" size={40} />
                <p className="text-sm text-red-600 font-medium">{errorMessage}</p>
                <button 
                  onClick={handleRefresh}
                  className="mt-2 text-xs font-bold text-red-700 hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={12} /> 重试
                </button>
              </div>
            ) : (
              <div className="relative w-64 h-64 bg-white rounded-xl border border-gray-200 p-2 shadow-sm flex items-center justify-center">
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-purple-600" size={32} />
                    <span className="text-xs text-gray-400">正在生成二维码...</span>
                  </div>
                ) : qrcodeUrl ? (
                  <div className="relative w-full h-full">
                    <Image 
                      src={qrcodeUrl} 
                      alt="WeChat Login QR Code" 
                      fill 
                      className={status === 'expired' ? 'opacity-20 grayscale' : ''}
                    />
                    {status === 'expired' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/40 backdrop-blur-[2px]">
                        <button 
                          onClick={handleRefresh}
                          className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-all shadow-lg hover:scale-110 active:scale-95"
                        >
                          <RefreshCw size={24} />
                        </button>
                        <span className="text-sm font-bold text-gray-700">二维码已过期</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            <div className="mt-6 text-sm text-gray-600 text-center font-medium">
              {status === 'pending' && '请使用微信扫描上方二维码登录'}
              {status === 'scanned' && '✅ 已扫码，请在手机上确认'}
              {status === 'confirming' && '正在确认登录信息...'}
              {status === 'expired' && '二维码已过期，请刷新'}
            </div>
            
            {expireIn > 0 && status !== 'expired' && (
              <div className="mt-2 text-[10px] text-gray-400 uppercase tracking-widest">
                有效时间: {expireIn}s
              </div>
            )}
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              注册/登录即代表同意{' '}
              <a href="#" className="text-purple-600 hover:underline">隐私协议</a>
              {' '}与{' '}
              <a href="#" className="text-purple-600 hover:underline">服务条款</a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
