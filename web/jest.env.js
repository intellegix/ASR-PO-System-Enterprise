// Environment variables for Jest testing
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-jest-testing-environment-at-least-32-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Disable logging during tests
process.env.LOG_LEVEL = 'error';

// Mock external service URLs
process.env.SMTP_HOST = 'test-smtp.example.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';