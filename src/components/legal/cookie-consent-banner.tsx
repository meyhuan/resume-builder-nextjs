'use client';

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';

const ANALYTICS_CONSENT_KEY: string = 'analytics-consent';
const ANALYTICS_CONSENT_ACCEPTED: string = 'accepted';
const ANALYTICS_CONSENT_DECLINED: string = 'declined';

function shouldShowCookieBanner(): boolean {
  if (typeof window === 'undefined') return false;
  const storedConsent: string | null = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
  return storedConsent !== ANALYTICS_CONSENT_ACCEPTED && storedConsent !== ANALYTICS_CONSENT_DECLINED;
}

/**
 * Cookie consent banner for analytics preferences.
 */
export function CookieConsentBanner(): ReactElement | null {
  const [isVisible, setIsVisible] = useState<boolean>(() => shouldShowCookieBanner());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleConsentChange = (): void => {
      setIsVisible(shouldShowCookieBanner());
    };
    window.addEventListener('storage', handleConsentChange);
    window.addEventListener('analytics-consent-updated', handleConsentChange as EventListener);
    return (): void => {
      window.removeEventListener('storage', handleConsentChange);
      window.removeEventListener('analytics-consent-updated', handleConsentChange as EventListener);
    };
  }, []);

  const updateConsent = (value: string): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
    window.dispatchEvent(new Event('analytics-consent-updated'));
    setIsVisible(false);
  };
  if (!isVisible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">Privacy & cookie preferences</p>
          <p className="text-xs leading-5 text-slate-600">
            We use optional analytics cookies to understand product usage and improve the experience. You can accept or decline analytics tracking.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="button" variant="outline" onClick={(): void => updateConsent(ANALYTICS_CONSENT_DECLINED)}>
            Decline analytics
          </Button>
          <Button type="button" onClick={(): void => updateConsent(ANALYTICS_CONSENT_ACCEPTED)}>
            Accept analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
