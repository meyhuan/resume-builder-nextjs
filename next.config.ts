import type { NextConfig } from "next";

const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseRemotePattern: { protocol: 'https'; hostname: string; pathname: '/**' } | null = supabaseUrl
  ? {
      protocol: 'https',
      hostname: new URL(supabaseUrl).hostname,
      pathname: '/**',
    }
  : null;

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
      ...(supabaseRemotePattern ? [supabaseRemotePattern] : []),
    ],
  },
  experimental: {
    // serverActions: true, // Enabled by default in Next.js 15
  },
};

export default nextConfig;
