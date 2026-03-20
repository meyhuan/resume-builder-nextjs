'use client';

import Script from 'next/script';

const GA_MEASUREMENT_ID: string = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';

/**
 * Google Analytics 4 (gtag.js) script component.
 * Set NEXT_PUBLIC_GA_MEASUREMENT_ID in your .env file to enable.
 */
export function GoogleAnalytics(): React.ReactElement | null {
  if (!GA_MEASUREMENT_ID) return null;

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
