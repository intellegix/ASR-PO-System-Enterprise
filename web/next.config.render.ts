import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for frontend-only deployment
  output: 'export',
  trailingSlash: true,

  // Disable server-side features for static export
  images: {
    unoptimized: true,
  },

  // Production optimization settings
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@tanstack/react-query'],
  },

  // Compression and performance
  compress: true,
  poweredByHeader: false,

  // Environment-based API URL configuration
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_ENVIRONMENT: 'render-frontend',
  },

  // CORS headers for frontend-only deployment
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      // Static asset caching
      {
        source: '/:path*\\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|avif|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Webpack optimizations for static build
  webpack: (config) => {
    config.optimization.splitChunks = {
      ...config.optimization.splitChunks,
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    };
    return config;
  },
};

export default nextConfig;