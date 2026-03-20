import type { NextConfig } from "next";

const aliyunOssPublicBaseUrl: string | undefined = process.env.ALIYUN_OSS_PUBLIC_BASE_URL;
const aliyunOssRemotePattern: { protocol: 'https'; hostname: string; pathname: '/**' } | null = aliyunOssPublicBaseUrl
  ? {
      protocol: 'https',
      hostname: new URL(aliyunOssPublicBaseUrl).hostname,
      pathname: '/**',
    }
  : null;

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    remotePatterns: [
      ...(aliyunOssRemotePattern ? [aliyunOssRemotePattern] : []),
    ],
  },
  experimental: {
    // serverActions: true, // Enabled by default in Next.js 15
  },
};

export default nextConfig;
