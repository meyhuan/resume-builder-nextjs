import type { NextConfig } from "next";

const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
const parsedSupabaseUrl: URL | null = supabaseUrl ? new URL(supabaseUrl) : null;
const supabaseRemotePattern: {
  protocol: 'http' | 'https';
  hostname: string;
  port?: string;
  pathname: '/**';
} | null = parsedSupabaseUrl
  ? {
      protocol: parsedSupabaseUrl.protocol === 'http:' ? 'http' : 'https',
      hostname: parsedSupabaseUrl.hostname,
      ...(parsedSupabaseUrl.port ? { port: parsedSupabaseUrl.port } : {}),
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
