import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import "@/styles/tailwind.css";
import "@/styles/print.css";
import "@/styles/base.css";
import "@/styles/theme-override.css";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_LOCALE, SITE_LANG, SITE_CURRENCY } from '@/lib/site-config';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Free AI Resume Builder | ATS-Friendly Templates & PDF Export`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'AI resume builder', 'free resume builder', 'resume maker', 'ATS-friendly resume',
    'resume templates', 'AI resume generator', 'free resume templates', 'PDF resume export',
    'professional resume', 'resume builder online', 'AI resume writer', 'resume creator',
    'one-page resume', 'modern resume template', 'job application', 'career tools',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: SITE_LOCALE,
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Free AI Resume Builder`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Free AI Resume Builder`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Free AI Resume Builder`,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  verification: {
    google: 'cVe-KetUGJvP2TVefybZxWIy3YUxXXqQiiGErncNY9M',
    other: {
      'msvalidate.01': ['35C8C4B7C0CCF7E6A6D7B7F2477D48E0'],
    },
  },
};

import { Toaster } from 'sonner';
import { GoogleAnalytics } from '../components/analytics/GoogleAnalytics';
import { CookieConsentBanner } from '../components/legal/cookie-consent-banner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": SITE_NAME,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": SITE_CURRENCY
    },
    "description": SITE_DESCRIPTION,
    "url": SITE_URL
  };

  return (
    <html lang={SITE_LANG}>
      <body className="antialiased text-slate-900 bg-white font-sans">
        <ClerkProvider>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          {children}
          <CookieConsentBanner />
          <Toaster position="top-center" richColors />
          <GoogleAnalytics />
        </ClerkProvider>
      </body>
    </html>
  );
}
