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
  async rewrites() {
    const indexNowKey: string | undefined = process.env.INDEXNOW_KEY;
    if (!indexNowKey) return [];

    return [
      {
        source: `/${indexNowKey}.txt`,
        destination: '/indexnow.txt',
      },
    ];
  },
};

export default nextConfig;
