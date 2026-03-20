'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

const GA_MEASUREMENT_ID: string = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';
const ANALYTICS_CONSENT_KEY: string = 'analytics-consent';
const ANALYTICS_CONSENT_ACCEPTED: string = 'accepted';

function getHasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  const storedConsent: string | null = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
  return storedConsent === ANALYTICS_CONSENT_ACCEPTED;
}

/**
 * Google Analytics 4 (gtag.js) script component.
 * Set NEXT_PUBLIC_GA_MEASUREMENT_ID in your .env file to enable.
 */
export function GoogleAnalytics(): React.ReactElement | null {
  const [hasConsent, setHasConsent] = useState<boolean>(() => getHasAnalyticsConsent());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleConsentChange = (): void => {
      setHasConsent(getHasAnalyticsConsent());
    };
    window.addEventListener('storage', handleConsentChange);
    window.addEventListener('analytics-consent-updated', handleConsentChange as EventListener);
    return (): void => {
      window.removeEventListener('storage', handleConsentChange);
      window.removeEventListener('analytics-consent-updated', handleConsentChange as EventListener);
    };
  }, []);

  if (!GA_MEASUREMENT_ID || !hasConsent) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
