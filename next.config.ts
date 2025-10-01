// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Static export configuration for Firebase Hosting
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Webpack configuration for client-side fallbacks
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        encoding: false,
        'pino-pretty': false,
      };
    }
    return config;
  },
};

export default nextConfig;