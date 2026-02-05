#!/usr/bin/env tsx

/**
 * Test Production Database Connection
 * Verifies database connectivity and basic functionality
 */

import { config } from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// Load .env.production file
config({ path: path.join(process.cwd(), '.env.production') });
console.log('🔧 Loaded environment from .env.production');

async function testDatabaseConnection(): Promise<void> {
  console.log('🔍 Testing Production Database Connection...\n');

  // Check for DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.log('💡 Add DATABASE_URL to your .env.production file');
    process.exit(1);
  }

  console.log('✅ DATABASE_URL environment variable found');
  console.log(`🔗 Connecting to: ${databaseUrl.replace(/:\/\/[^@]+@/, '://***:***@')}`);

  try {
    // Test direct PostgreSQL connection
    console.log('\n📡 Testing direct PostgreSQL connection...');
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
    });

    const client = await pool.connect();
    const result = await client.query('SELECT version(), current_database(), current_user');

    console.log('✅ Direct PostgreSQL connection successful');
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);
    console.log(`   Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);

    client.release();
    await pool.end();

    // Test Prisma connection
    console.log('\n🔧 Testing Prisma connection...');
    const prisma = new PrismaClient();

    // Test basic query
    await prisma.$executeRaw`SELECT 1 as test`;
    console.log('✅ Prisma connection successful');

    // Check if schema is deployed
    console.log('\n📋 Checking database schema...');

    try {
      const tableCheck = await prisma.$executeRaw`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('users', 'divisions', 'vendors', 'po_headers', 'projects')
      `;

      const tableCount = Number(tableCheck);

      if (tableCount === 5) {
        console.log('✅ Database schema deployed (5/5 core tables found)');

        // Test sample queries
        console.log('\n🧪 Testing sample queries...');

        const userCount = await prisma.users.count();
        const divisionCount = await prisma.divisions.count();
        const vendorCount = await prisma.vendors.count();
        const poCount = await prisma.po_headers.count();
        const projectCount = await prisma.projects.count();

        console.log(`   Users: ${userCount}`);
        console.log(`   Divisions: ${divisionCount}`);
        console.log(`   Vendors: ${vendorCount}`);
        console.log(`   Purchase Orders: ${poCount}`);
        console.log(`   Projects: ${projectCount}`);

        if (userCount === 0 && divisionCount === 0) {
          console.log('\n📝 Database is empty - ready for initial data setup');
        } else {
          console.log('\n📊 Database contains existing data');
        }

        // Test index existence
        console.log('\n🏎️  Checking database indexes...');
        const indexCheck = await prisma.$executeRaw`
          SELECT COUNT(*) as count
          FROM pg_indexes
          WHERE schemaname = 'public'
          AND indexname LIKE 'idx_%'
        `;

        const indexCount = Number(indexCheck);

        if (indexCount > 0) {
          console.log(`✅ Performance indexes found: ${indexCount} custom indexes`);
        } else {
          console.log('⚠️  No custom performance indexes found');
          console.log('💡 Consider running the database optimization script');
        }

      } else {
        console.log(`❌ Database schema incomplete (${tableCount}/5 core tables found)`);
        console.log('💡 Run: npm run db:push');
      }

    } catch (schemaError) {
      console.log('❌ Database schema not deployed');
      console.log('💡 Run: npm run db:push');
    }

    await prisma.$disconnect();

    // Connection performance test
    console.log('\n⚡ Testing connection performance...');
    const startTime = Date.now();

    const testPrisma = new PrismaClient();
    await testPrisma.$executeRaw`SELECT 1`;
    await testPrisma.$disconnect();

    const duration = Date.now() - startTime;
    console.log(`✅ Connection latency: ${duration}ms`);

    if (duration < 100) {
      console.log('🚀 Excellent connection speed');
    } else if (duration < 300) {
      console.log('✅ Good connection speed');
    } else if (duration < 1000) {
      console.log('⚠️  Acceptable connection speed');
    } else {
      console.log('❌ Slow connection - consider database region proximity');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATABASE CONNECTION TEST RESULTS:');
    console.log('✅ Direct PostgreSQL connection: SUCCESS');
    console.log('✅ Prisma ORM connection: SUCCESS');
    console.log('✅ Database accessibility: CONFIRMED');
    console.log(`⚡ Connection performance: ${duration}ms`);
    console.log('🎯 Database ready for ASR Purchase Order System');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Database connection failed:', error.message);

    if (error.message.includes('authentication')) {
      console.log('\n💡 Authentication failed - check credentials in DATABASE_URL');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Connection timeout - check network connectivity');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Host not found - check DATABASE_URL hostname');
    } else if (error.message.includes('SSL')) {
      console.log('\n💡 SSL issue - try adding ?sslmode=require to DATABASE_URL');
    }

    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Verify DATABASE_URL is correct in .env.production');
    console.log('2. Check database service is running');
    console.log('3. Verify network connectivity');
    console.log('4. Confirm database user permissions');

    process.exit(1);
  }
}

async function main() {
  await testDatabaseConnection();
}

if (require.main === module) {
  main().catch(console.error);
}