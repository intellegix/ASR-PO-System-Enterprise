import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for frontend-only deployment
  output: 'export',
  trailingSlash: true,
  distDir: 'out',

  // Disable server-side features for static export
  images: {
    unoptimized: true,
  },

  // Environment configuration
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://your-ngrok-url.ngrok.io',
    NEXT_PUBLIC_ENVIRONMENT: 'render-frontend',
  },

  // Disable problematic features
  poweredByHeader: false,

  // TypeScript and ESLint bypass for build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Basic optimization
  compress: true,

  // Skip dynamic routes during static export
  experimental: {
    // Allow dynamic routes to be skipped during static export
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;