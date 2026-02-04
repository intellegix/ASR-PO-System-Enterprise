import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Global singleton for Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Initialize PostgreSQL adapter if DATABASE_URL is provided and valid
let prismaClient: PrismaClient;

// Check if DATABASE_URL is a valid PostgreSQL connection string
const isValidPostgresUrl = (url: string) => {
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
};

if (process.env.DATABASE_URL && isValidPostgresUrl(process.env.DATABASE_URL) && process.env.DATABASE_URL !== 'postgresql://placeholder') {
  // Use PostgreSQL adapter for production/remote databases
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);

  prismaClient = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
} else {
  // Fallback for development or build time without valid DATABASE_URL
  prismaClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? prismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;