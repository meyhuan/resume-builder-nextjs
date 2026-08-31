'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, CheckCircle2, Copy, ScanLine, Smartphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';

export const MINI_PROGRAM_NAME = '智简简历模板制作';

interface MiniProgramEntryProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  readonly entry: string;
  readonly onActivate?: () => void;
  readonly onDialogClose?: () => void;
}

interface MiniProgramDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly entry: string;
  readonly variant?: 'default' | 'export-success';
}

function MiniProgramDialogContent({
  entry,
  variant = 'default',
}: {
  readonly entry: string;
  readonly variant?: 'default' | 'export-success';
}): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const isExportSuccess = variant === 'export-success';

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copyMiniProgramName = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(MINI_PROGRAM_NAME);
      setCopied(true);
      track('landing_cta_click', {
        cta: 'copy_mini_program_name',
        target: MINI_PROGRAM_NAME,
        entry,
        source: 'mini_program_dialog',
      });
    } catch {
      setCopied(false);
    }
  };

  return (
    <DialogContent
      className="z-[1101] max-w-sm overflow-hidden border-slate-200 p-0"
      overlayClassName="z-[1100]"
    >
      <div className="bg-violet-50 px-6 pb-5 pt-6">
        <DialogHeader className="pr-8 text-left">
          <div className={cn(
            'mb-2 flex h-10 w-10 items-center justify-center rounded-xl text-white',
            isExportSuccess ? 'bg-emerald-500' : 'bg-violet-600',
          )}>
            {isExportSuccess
              ? <CheckCircle2 className="h-5 w-5" />
              : <Smartphone className="h-5 w-5" />}
          </div>
          <DialogTitle className="text-xl text-slate-900">
            {isExportSuccess ? '简历已导出' : '在微信小程序制作简历'}
          </DialogTitle>
          <DialogDescription className="leading-6 text-slate-600">
            {isExportSuccess
              ? '下次不在电脑旁，也可以打开微信小程序，继续编辑并导出这份简历。'
              : '手机端统一使用微信小程序。简历与电脑端账号同步，随时补内容、换模板和导出 PDF。'}
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="flex flex-col items-center px-6 pb-6">
        <div className="-mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <Image
            src="/wechat-mini-program-qr.jpg"
            alt="智简简历模板制作微信小程序二维码"
            width={430}
            height={490}
            className="h-auto w-52"
            priority
          />
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
          <ScanLine className="h-4 w-4 text-emerald-600" />
          电脑端请用微信扫码
        </div>
        <p className="mt-1 text-center text-xs leading-5 text-slate-500">
          手机端可在微信中长按识别图片，或搜索下面的小程序名称。
        </p>

        <button
          type="button"
          onClick={() => void copyMiniProgramName()}
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-violet-200 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-60"
          aria-live="polite"
        >
          <span className="min-w-0">
            <span className="block text-xs text-slate-500">微信搜索</span>
            <span className="block truncate text-sm font-semibold text-slate-900">{MINI_PROGRAM_NAME}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-violet-600">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? '已复制' : '复制名称'}
          </span>
        </button>
      </div>
    </DialogContent>
  );
}

export function MiniProgramDialog({
  open,
  onOpenChange,
  entry,
  variant = 'default',
}: MiniProgramDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MiniProgramDialogContent entry={entry} variant={variant} />
    </Dialog>
  );
}

export function MiniProgramEntry({
  entry,
  onActivate,
  onDialogClose,
  className,
  children,
  ...props
}: MiniProgramEntryProps): React.ReactElement {
  const handleActivate = (): void => {
    track('landing_cta_click', {
      cta: 'wechat_mini_program',
      target: 'wechat_mini_program_qr',
      entry,
      source: 'mini_program_entry',
    });
    onActivate?.();
  };

  return (
    <Dialog onOpenChange={(open) => {
      if (!open) onDialogClose?.();
    }}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn('focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2', className)}
          onClick={handleActivate}
          {...props}
        >
          {children}
        </button>
      </DialogTrigger>

      <MiniProgramDialogContent entry={entry} />
    </Dialog>
  );
}
