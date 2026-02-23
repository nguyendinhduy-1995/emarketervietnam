import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Allow external images if needed
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
