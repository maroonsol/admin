import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  },
};

export default nextConfig;
