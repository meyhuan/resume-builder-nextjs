import type { NextConfig } from "next";

const aliyunOssHostname: string = process.env.ALIYUN_OSS_HOSTNAME || 'aijianli-nextjs.oss-cn-hangzhou.aliyuncs.com';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The shared Job Fit engine intentionally depends on Node-only modules (for
  // hashing and provider calls). Keep it outside Next's instrumentation bundle.
  serverExternalPackages: ['@meyhuan/job-fit-engine'],
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals ??= [];
      config.externals.push({
        crypto: 'commonjs crypto',
        'node:crypto': 'commonjs node:crypto',
      });
    }
    return config;
  },
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
