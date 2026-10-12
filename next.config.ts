import type { NextConfig } from "next";

const aliyunOssHostname: string = process.env.ALIYUN_OSS_HOSTNAME || 'aijianli-nextjs.oss-cn-hangzhou.aliyuncs.com';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: aliyunOssHostname,
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'mp.weixin.qq.com',
        pathname: '/cgi-bin/**',
      },
    ],
  },
  experimental: {},
  async headers() {
    if (process.env.NODE_ENV !== 'production') return []
    return [
      {
        source: '/thumbnails/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=2592000',
          },
        ],
      },
    ]
  },
  async rewrites() {
    const indexNowKey: string | undefined = process.env.INDEXNOW_KEY;
    return [
      // Keep resume fonts same-origin in editor, preview, and print pages.
      // OSS does not currently send a CORS header for localhost requests.
      {
        source: '/resume-fonts/v1/:file',
        destination: 'https://aijianli-nextjs.oss-cn-hangzhou.aliyuncs.com/fonts/v1/:file',
      },
      ...(indexNowKey ? [{
        source: `/${indexNowKey}.txt`,
        destination: '/indexnow.txt',
      }] : []),
    ];
  },
};

export default nextConfig;
