// Jest setup file for DOM testing
import '@testing-library/jest-dom';

// Mock Next.js modules that cause issues in test environment
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock Next.js image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...props} />;
  },
}));

// Polyfill Text encoding APIs for testing
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill Web Stream APIs for Next.js
const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');
global.ReadableStream = ReadableStream;
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;

// Mock environment variables for testing
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-jest-testing-environment-at-least-32-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Global test utilities
global.mockConsoleError = () => {
  const originalError = console.error;
  console.error = jest.fn();
  return () => {
    console.error = originalError;
  };
};

global.mockConsoleLog = () => {
  const originalLog = console.log;
  console.log = jest.fn();
  return () => {
    console.log = originalLog;
  };
};

// Mock fetch for API testing
global.fetch = jest.fn();

// Helper to reset all mocks
global.resetAllMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.restoreAllMocks();
};

// Database connection mock for Prisma (commented out - let individual tests mock as needed)
// Integration tests will mock @/lib/db themselves to avoid conflicts

// Mock bcrypt for password testing (commented out - let individual tests mock as needed)
// Mock NextAuth (commented out - let individual tests mock as needed)
// Mock NextAuth configuration (commented out - let individual tests mock as needed)

// Setup and teardown for each test
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllTimers();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});