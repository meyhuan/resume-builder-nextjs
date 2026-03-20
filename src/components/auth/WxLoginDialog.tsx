'use client';

import React, { useEffect, useState } from 'react';
import { SignIn, useAuth } from '@clerk/nextjs';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { LegalDialog } from '@/components/legal/LegalDialog';

type LegalTab = 'privacy' | 'terms';

interface WxLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  closeable?: boolean;
  subtitle?: string;
}

export const WxLoginDialog: React.FC<WxLoginDialogProps> = ({ isOpen, onClose, onSuccess, closeable = true, subtitle }) => {
  const { isSignedIn } = useAuth();
  const [legalOpen, setLegalOpen] = useState<boolean>(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('privacy');
  const [redirectUrl] = useState<string>(() => {
    if (typeof window === 'undefined') return '/dashboard';
    return `${window.location.pathname}${window.location.search}`;
  });

  useEffect(() => {
    if (!isOpen || !isSignedIn) return;
    onSuccess?.();
    onClose();
  }, [isOpen, isSignedIn, onClose, onSuccess]);

  const openLegal = (tab: LegalTab): void => {
    setLegalTab(tab);
    setLegalOpen(true);
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
              Sign In
            </DialogTitle>
            <p className="text-slate-500 mt-2 text-sm font-medium">{subtitle || 'Unlock AI resume superpowers'}</p>
          </div>

          <div className="bg-white/50 rounded-2xl p-6 border border-white/60 shadow-inner flex flex-col items-center relative z-10 backdrop-blur-sm">
            <div className="w-full max-w-[320px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
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
