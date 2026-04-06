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
};

export default nextConfig;
