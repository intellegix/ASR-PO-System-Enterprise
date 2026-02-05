import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration for hybrid architecture (v2.1):
  // - Full-stack mode for local development and backend
  // - Frontend deployed as static site, connects to localhost backend
  // Updated: Feb 5, 2026 - Render deployment configuration

  // Static export for Render frontend deployment
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    trailingSlash: true,
    distDir: 'out',
  }),

  // Image optimization
  images: {
    unoptimized: true,
  },

  // CORS headers for hybrid architecture (static frontend calling local backend)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production'
              ? 'https://asr-po-system-frontend.onrender.com'
              : '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400', // 24 hours
          },
        ],
      },
    ];
  },

  // Environment configuration
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://your-ngrok-url.ngrok.io' : 'http://localhost:8765'),
    NEXT_PUBLIC_ENVIRONMENT: process.env.NODE_ENV === 'production' ? 'render-frontend' : 'development',
  },

  // Security headers
  poweredByHeader: false,

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production', // Skip type checking in production builds
  },

  // Basic optimization
  compress: true,

  // External packages configuration
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;