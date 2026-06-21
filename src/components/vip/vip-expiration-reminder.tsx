'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Clock, Crown } from 'lucide-react';

interface VipExpirationReminderProps {
  vipExpireTime: string | null;
  isVip: boolean;
}

export function VipExpirationReminder({ vipExpireTime, isVip }: VipExpirationReminderProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    // Check if user has dismissed the reminder recently
    const dismissedUntil = localStorage.getItem('vipReminderDismissed');
    if (dismissedUntil) {
      const until = parseInt(dismissedUntil, 10);
      if (Date.now() < until) {
        // eslint-disable-next-line
        setIsDismissed(true);
        return;
      }
    }

    // Show reminder if VIP is expiring within 7 days
    if (isVip && vipExpireTime) {
      const now = Date.now();
      const expire = new Date(vipExpireTime);
      const days = Math.ceil((expire.getTime() - now) / (1000 * 60 * 60 * 24));
      setDaysRemaining(days);
      
      if (days <= 7 && days > 0) {
        setIsVisible(true);
      }
    }
  }, [isVip, vipExpireTime]);

  const handleDismiss = (): void => {
    setIsVisible(false);
    setIsDismissed(true);
    // Dismiss for 24 hours
    localStorage.setItem('vipReminderDismissed', String(Date.now() + 24 * 60 * 60 * 1000));
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-2xl p-4 shadow-lg shadow-orange-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4" />
              <span className="font-bold text-sm">会员续费提醒</span>
            </div>
            <p className="text-sm text-white/90 mb-3">
              会员将在 <strong>{daysRemaining} 天</strong> 后过期，可续费月会员或直接购买永久会员。
            </p>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/membership"
                className="inline-flex items-center px-4 py-1.5 bg-white text-orange-600 text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
              >
                去续费
              </Link>
              <button
                onClick={handleDismiss}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
