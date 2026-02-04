import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL && process.env.DATABASE_URL !== 'postgresql://placeholder'
      ? process.env.DATABASE_URL
      : 'postgresql://postgres:password@localhost:5432/po_system?schema=public',
  },
});