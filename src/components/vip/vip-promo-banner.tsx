'use client';

import { Crown, X, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface VipPromoBannerProps {
  onUpgrade: () => void;
}

function shouldShowBanner(): boolean {
  if (typeof window === 'undefined') return false;
  const dismissed = localStorage.getItem('vip_promo_dismissed');
  const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
  const now = Date.now();
  return !dismissed || now - dismissedTime > 24 * 60 * 60 * 1000;
}

/**
 * Sticky banner promoting VIP upgrade for non-VIP users.
 * Shows at bottom of page with dismiss capability (24h cooldown).
 */
export default function VipPromoBanner({ onUpgrade }: VipPromoBannerProps): React.ReactElement | null {
  const [show, setShow] = useState(shouldShowBanner());

  function handleDismiss(): void {
    localStorage.setItem('vip_promo_dismissed', String(Date.now()));
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              解锁无限导出、AI 优化、全部模板
            </p>
            <p className="text-xs text-white/80 hidden sm:block">
              升级 VIP 享受终身权益，制作专业简历更高效
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onUpgrade}
            className="px-4 py-2 bg-white text-rose-600 text-sm font-bold rounded-full hover:bg-white/90 transition-colors shadow-sm whitespace-nowrap"
          >
            立即升级
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="暂不提醒"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
