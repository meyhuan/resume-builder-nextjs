import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  experimental: {
    // serverActions: true, // Enabled by default in Next.js 15
  },
};

export default nextConfig;
