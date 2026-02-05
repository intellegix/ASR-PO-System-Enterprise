import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration for hybrid architecture (v2.1):
  // - Full-stack mode for local development and backend
  // - Frontend deployed as static site, connects to localhost backend
  // Updated: Feb 5, 2026 - Render deployment configuration

  // Full-stack deployment for Render

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
            value: '*'
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
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NODE_ENV || 'development',
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