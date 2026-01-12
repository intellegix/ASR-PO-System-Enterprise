#!/usr/bin/env tsx

/**
 * Phase 4F Data Audit Script
 * Examines database for test data and production readiness
 */

import { config } from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Load .env.production file
config({ path: path.join(process.cwd(), '.env.production') });

// Create connection using same pattern as main app
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface AuditResults {
  users: {
    total: number;
    testUsers: any[];
    roleDistribution: any[];
  };
  vendors: {
    total: number;
    testVendors: any[];
    duplicates: any[];
  };
  divisions: {
    total: number;
    configuration: any[];
  };
  projects: {
    total: number;
    testProjects: any[];
    statusDistribution: any[];
  };
  purchaseOrders: {
    total: number;
    testPOs: any[];
    statusDistribution: any[];
    recent: any[];
  };
  auditTrail: {
    total: number;
    recent: any[];
    actionDistribution: any[];
  };
  recommendations: string[];
}

async function auditDatabase(): Promise<AuditResults> {
  console.log('🔍 Starting Phase 4F Data Audit...\n');

  const results: AuditResults = {
    users: { total: 0, testUsers: [], roleDistribution: [] },
    vendors: { total: 0, testVendors: [], duplicates: [] },
    divisions: { total: 0, configuration: [] },
    projects: { total: 0, testProjects: [], statusDistribution: [] },
    purchaseOrders: { total: 0, testPOs: [], statusDistribution: [], recent: [] },
    auditTrail: { total: 0, recent: [], actionDistribution: [] },
    recommendations: []
  };

  try {
    // 1. Audit Users
    console.log('📊 Auditing Users...');
    const users = await prisma.users.findMany({
      include: {
        divisions: true,
        division_leaders: true
      }
    });

    results.users.total = users.length;

    // Identify test users (common patterns)
    results.users.testUsers = users.filter(user =>
      user.email.toLowerCase().includes('test') ||
      user.email.toLowerCase().includes('demo') ||
      user.email.toLowerCase().includes('example') ||
      user.first_name.toLowerCase().includes('test') ||
      user.last_name.toLowerCase().includes('test') ||
      user.email.includes('localhost') ||
      user.email.includes('temp')
    );

    // Role distribution
    // @ts-ignore - Prisma groupBy type compatibility issue
    results.users.roleDistribution = await prisma.users.groupBy({
      by: ['role'],
      _count: { role: true }
    });

    console.log(`   Total Users: ${results.users.total}`);
    console.log(`   Test Users Found: ${results.users.testUsers.length}`);

    // 2. Audit Vendors
    console.log('🏪 Auditing Vendors...');
    const vendors = await prisma.vendors.findMany();
    results.vendors.total = vendors.length;

    // Identify test vendors
    results.vendors.testVendors = vendors.filter(vendor =>
      vendor.vendor_name.toLowerCase().includes('test') ||
      vendor.vendor_name.toLowerCase().includes('demo') ||
      vendor.vendor_name.toLowerCase().includes('example') ||
      vendor.vendor_name.toLowerCase().includes('sample') ||
      vendor.contact_name?.toLowerCase().includes('test') ||
      vendor.contact_email?.includes('test') ||
      vendor.contact_email?.includes('example.com')
    );

    // Check for duplicates by name
    const vendorGroups = await prisma.vendors.groupBy({
      by: ['vendor_name'],
      _count: { vendor_name: true },
      having: { vendor_name: { _count: { gt: 1 } } }
    });

    for (const group of vendorGroups) {
      const duplicates = await prisma.vendors.findMany({
        where: { vendor_name: group.vendor_name }
      });
      results.vendors.duplicates.push(...duplicates);
    }

    console.log(`   Total Vendors: ${results.vendors.total}`);
    console.log(`   Test Vendors Found: ${results.vendors.testVendors.length}`);
    console.log(`   Duplicate Vendors: ${results.vendors.duplicates.length}`);

    // 3. Audit Divisions
    console.log('🏢 Auditing Divisions...');
    const divisions = await prisma.divisions.findMany({
      include: {
        division_leaders: true,
        _count: {
          select: {
            po_headers: true,
            users: true,
            projects: true
          }
        }
      }
    });

    results.divisions.total = divisions.length;
    results.divisions.configuration = divisions;

    console.log(`   Total Divisions: ${results.divisions.total}`);

    // 4. Audit Projects
    console.log('📋 Auditing Projects...');
    const projects = await prisma.projects.findMany({
      include: {
        divisions: true,
        _count: {
          select: { po_headers: true, work_orders: true }
        }
      }
    });

    results.projects.total = projects.length;

    // Identify test projects
    results.projects.testProjects = projects.filter(project =>
      project.project_name.toLowerCase().includes('test') ||
      project.project_name.toLowerCase().includes('demo') ||
      project.project_name.toLowerCase().includes('example') ||
      project.project_code.toLowerCase().includes('test')
    );

    // Status distribution
    // @ts-ignore - Prisma groupBy type compatibility issue
    results.projects.statusDistribution = await prisma.projects.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    console.log(`   Total Projects: ${results.projects.total}`);
    console.log(`   Test Projects Found: ${results.projects.testProjects.length}`);

    // 5. Audit Purchase Orders
    console.log('📄 Auditing Purchase Orders...');
    const pos = await prisma.po_headers.findMany({
      include: {
        vendors: true,
        divisions: true,
        projects: true,
        po_line_items: true
      }
    });

    results.purchaseOrders.total = pos.length;

    // Identify test POs
    results.purchaseOrders.testPOs = pos.filter(po =>
      po.notes_internal?.toLowerCase().includes('test') ||
      po.notes_vendor?.toLowerCase().includes('test') ||
      po.vendors.vendor_name.toLowerCase().includes('test') ||
      po.projects.project_name.toLowerCase().includes('test') ||
      po.po_number.includes('TEST') ||
      po.total_amount.toNumber() === 0.01 || // Common test amount
      po.total_amount.toNumber() === 1.00 ||
      po.total_amount.toNumber() === 100.00
    );

    // Status distribution
    // @ts-ignore - Prisma groupBy type compatibility issue
    results.purchaseOrders.statusDistribution = await prisma.po_headers.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    // Recent POs (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    results.purchaseOrders.recent = await prisma.po_headers.findMany({
      where: {
        created_at: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: { created_at: 'desc' },
      take: 10,
      include: {
        vendors: { select: { vendor_name: true } },
        projects: { select: { project_name: true } }
      }
    });

    console.log(`   Total Purchase Orders: ${results.purchaseOrders.total}`);
    console.log(`   Test POs Found: ${results.purchaseOrders.testPOs.length}`);
    console.log(`   Recent POs (30 days): ${results.purchaseOrders.recent.length}`);

    // 6. Audit Trail
    console.log('📝 Auditing Approval Trail...');
    const auditRecords = await prisma.po_approvals.count();
    results.auditTrail.total = auditRecords;

    // Recent audit actions
    results.auditTrail.recent = await prisma.po_approvals.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: {
        users: { select: { email: true, first_name: true, last_name: true } },
        po_headers: { select: { po_number: true } }
      }
    });

    // Action distribution
    // @ts-ignore - Prisma groupBy type compatibility issue
    results.auditTrail.actionDistribution = await prisma.po_approvals.groupBy({
      by: ['action'],
      _count: { action: true }
    });

    console.log(`   Total Audit Records: ${results.auditTrail.total}`);

    // Generate Recommendations
    results.recommendations = generateRecommendations(results);

    console.log('\n✅ Data audit complete!\n');

  } catch (error) {
    console.error('❌ Error during audit:', error);
    throw error;
  }

  return results;
}

function generateRecommendations(results: AuditResults): string[] {
  const recommendations: string[] = [];

  if (results.users.testUsers.length > 0) {
    recommendations.push(`🧹 Remove ${results.users.testUsers.length} test user accounts`);
  }

  if (results.vendors.testVendors.length > 0) {
    recommendations.push(`🧹 Remove ${results.vendors.testVendors.length} test vendor records`);
  }

  if (results.vendors.duplicates.length > 0) {
    recommendations.push(`🔄 Merge or remove ${results.vendors.duplicates.length} duplicate vendor records`);
  }

  if (results.projects.testProjects.length > 0) {
    recommendations.push(`🧹 Remove ${results.projects.testProjects.length} test project records`);
  }

  if (results.purchaseOrders.testPOs.length > 0) {
    recommendations.push(`🧹 Remove ${results.purchaseOrders.testPOs.length} test purchase orders`);
  }

  // Check for missing division leaders
  const divisionsWithoutLeaders = results.divisions.configuration.filter(div =>
    div.division_leaders.length === 0 && div.is_active
  );

  if (divisionsWithoutLeaders.length > 0) {
    recommendations.push(`⚠️ Assign division leaders to ${divisionsWithoutLeaders.length} divisions`);
  }

  // Check for inactive users in critical roles
  const majorityOwners = results.users.roleDistribution.find(r => r.role === 'MAJORITY_OWNER')?._count.role || 0;
  if (majorityOwners === 0) {
    recommendations.push('❗ Create at least one MAJORITY_OWNER user account');
  }

  const accountingUsers = results.users.roleDistribution.find(r => r.role === 'ACCOUNTING')?._count.role || 0;
  if (accountingUsers === 0) {
    recommendations.push('❗ Create at least one ACCOUNTING user account');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Database appears production-ready!');
  }

  return recommendations;
}

function displayResults(results: AuditResults): void {
  console.log('📊 PHASE 4F DATA AUDIT REPORT');
  console.log('=' .repeat(50));

  console.log('\n👥 USERS:');
  console.log(`   Total: ${results.users.total}`);
  console.log(`   Role Distribution:`);
  results.users.roleDistribution.forEach(role => {
    console.log(`     ${role.role}: ${role._count.role}`);
  });

  if (results.users.testUsers.length > 0) {
    console.log(`   ⚠️  Test Users to Remove:`);
    results.users.testUsers.forEach(user => {
      console.log(`     - ${user.email} (${user.first_name} ${user.last_name})`);
    });
  }

  console.log('\n🏪 VENDORS:');
  console.log(`   Total: ${results.vendors.total}`);

  if (results.vendors.testVendors.length > 0) {
    console.log(`   ⚠️  Test Vendors to Remove:`);
    results.vendors.testVendors.forEach(vendor => {
      console.log(`     - ${vendor.vendor_name} (${vendor.vendor_code})`);
    });
  }

  if (results.vendors.duplicates.length > 0) {
    console.log(`   ⚠️  Duplicate Vendors to Review:`);
    results.vendors.duplicates.forEach(vendor => {
      console.log(`     - ${vendor.vendor_name} (ID: ${vendor.id})`);
    });
  }

  console.log('\n🏢 DIVISIONS:');
  console.log(`   Total: ${results.divisions.total}`);
  results.divisions.configuration.forEach(div => {
    console.log(`   - ${div.division_name} (${div.division_code}): ${div._count.users} users, ${div._count.po_headers} POs`);
  });

  console.log('\n📋 PROJECTS:');
  console.log(`   Total: ${results.projects.total}`);
  console.log(`   Status Distribution:`);
  results.projects.statusDistribution.forEach(status => {
    console.log(`     ${status.status}: ${status._count.status}`);
  });

  console.log('\n📄 PURCHASE ORDERS:');
  console.log(`   Total: ${results.purchaseOrders.total}`);
  console.log(`   Status Distribution:`);
  results.purchaseOrders.statusDistribution.forEach(status => {
    console.log(`     ${status.status}: ${status._count.status}`);
  });

  if (results.purchaseOrders.recent.length > 0) {
    console.log(`   Recent POs (Last 30 days):`);
    results.purchaseOrders.recent.forEach(po => {
      console.log(`     - ${po.po_number}: $${po.total_amount} (${po.vendors.vendor_name})`);
    });
  }

  console.log('\n📝 AUDIT TRAIL:');
  console.log(`   Total Records: ${results.auditTrail.total}`);
  console.log(`   Action Distribution:`);
  results.auditTrail.actionDistribution.forEach(action => {
    console.log(`     ${action.action}: ${action._count.action}`);
  });

  console.log('\n🎯 RECOMMENDATIONS:');
  results.recommendations.forEach(rec => {
    console.log(`   ${rec}`);
  });

  console.log('\n' + '=' .repeat(50));
}

async function main() {
  try {
    const results = await auditDatabase();
    displayResults(results);
  } catch (error) {
    console.error('Failed to complete audit:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Run the audit
if (require.main === module) {
  main().catch(console.error);
}

export { auditDatabase, displayResults };
export type { AuditResults };