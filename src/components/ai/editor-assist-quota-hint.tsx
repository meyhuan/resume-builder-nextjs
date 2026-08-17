'use client';

import type { ReactElement } from 'react';
import { useVipCheck } from '@/hooks/use-vip-check';
import { useAuthStore } from '@/store/use-auth-store';
import { cn } from '@/lib/utils';

export function EditorAssistQuotaHint(props: {
  readonly className?: string;
}): ReactElement {
  const { quota, quotaLoaded, setShowUpgrade } = useVipCheck();
  const token = useAuthStore((state) => state.token);
  const feature = quota.aiEditorAssist;
  const limit = feature.limit ?? 5;
  const remaining = typeof feature.remaining === 'number' ? feature.remaining : 0;

  const openUpgrade = (): void => {
    setShowUpgrade(true, 'ai');
  };

  if (feature.isVip || feature.remaining === 'unlimited') {
    return (
      <p className={cn('text-center text-[11px] text-slate-400', props.className)}>
        会员无限次
      </p>
    );
  }

  if (!quotaLoaded) {
    if (!token) {
      return (
        <p className={cn('text-center text-[11px] text-slate-400', props.className)}>
          登录后每日 {limit} 次 ·{' '}
          <button
            type="button"
            onClick={openUpgrade}
            className="font-medium text-violet-600 hover:text-violet-700 hover:underline"
          >
            开通会员不限次
          </button>
        </p>
      );
    }
    return (
      <p className={cn('text-center text-[11px] text-slate-400', props.className)}>
        今日剩余 {limit} 次
      </p>
    );
  }

  if (remaining <= 0) {
    return (
      <p className={cn('text-center text-[11px] text-slate-500', props.className)}>
        今日次数已用完 ·{' '}
        <button
          type="button"
          onClick={openUpgrade}
          className="font-medium text-violet-600 hover:text-violet-700 hover:underline"
        >
          开通会员不限次
        </button>
      </p>
    );
  }

  if (remaining <= 2) {
    return (
      <p className={cn('text-center text-[11px] text-slate-500', props.className)}>
        还剩 {remaining} 次，
        <button
          type="button"
          onClick={openUpgrade}
          className="font-medium text-violet-600 hover:text-violet-700 hover:underline"
        >
          开通会员可继续用
        </button>
      </p>
    );
  }

  return (
    <p className={cn('text-center text-[11px] text-slate-400', props.className)}>
      今日剩余 {remaining}/{limit} 次
    </p>
  );
}
