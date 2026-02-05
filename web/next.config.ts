import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration for hybrid architecture (v2.1):
  // - Full-stack mode for local development and backend
  // - Frontend deployed as static site, connects to localhost backend
  // Updated: Feb 4, 2026 - Hybrid architecture active, backend on port 8765

  // Allow ngrok tunnels and external hosts - configured via hostname checks in middleware

  // Uncomment for static export deployment:
  // output: 'export',
  // trailingSlash: true,
  // distDir: 'out',

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
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8765',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NODE_ENV || 'development',
  },

  // Security headers
  poweredByHeader: false,

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false, // Enable type checking in development
  },

  // Basic optimization
  compress: true,

  // External packages configuration
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;