'use client';

import Script from 'next/script';

const BAIDU_SITE_ID: string = process.env.NEXT_PUBLIC_BAIDU_ANALYTICS_ID ?? '';

/**
 * Baidu Tongji (百度统计) analytics script component.
 * Set NEXT_PUBLIC_BAIDU_ANALYTICS_ID in your .env file to enable.
 */
export function BaiduAnalytics(): React.ReactElement | null {
  if (!BAIDU_SITE_ID) return null;

  return (
    <Script
      src={`https://hm.baidu.com/hm.js?${BAIDU_SITE_ID}`}
      strategy="afterInteractive"
    />
  );
}
