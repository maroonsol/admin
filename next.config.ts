import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium-min', 'puppeteer-core'],
  },
};

export default nextConfig;
