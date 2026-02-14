import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://web-intellegix.vercel.app';
const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';

const connectSources = [
  "'self'",
  appUrl,
  vercelUrl,
  'https://*.vercel.app',
  'https://*.neon.tech',
].filter(Boolean).join(' ');

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    unoptimized: true,
  },

  // Security + CORS headers
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
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.vercel-storage.com https://*.public.blob.vercel-storage.com; font-src 'self' data:; connect-src ${connectSources}; frame-ancestors 'none';`,
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: appUrl,
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, X-Request-Id',
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
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },

  // Basic optimization
  compress: true,

  // External packages configuration
  serverExternalPackages: ['@prisma/client'],
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || 'intellegix',
  project: process.env.SENTRY_PROJECT || 'asr-po-system',
  silent: true,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
});
