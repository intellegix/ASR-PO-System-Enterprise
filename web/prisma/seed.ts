import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper function to generate secure passwords and hash them
const SALT_ROUNDS = 12;

async function generateSecurePasswordHash(): Promise<{ password: string; hash: string }> {
  // Generate a secure random password (16 characters, URL-safe)
  const password = crypto.randomBytes(12).toString('base64').slice(0, 16);
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return { password, hash };
}

async function main() {
  console.log('🌱 Starting seed...');

  // =====================================================
  // SEED DIVISIONS
  // =====================================================
  console.log('📁 Seeding divisions...');

  const divisions = await Promise.all([
    // Division 1: CAPEX
    prisma.divisions.upsert({
      where: { division_code: 'O1' },
      update: { division_name: 'CAPEX', qb_class_name: 'CAPEX' },
      create: {
        division_name: 'CAPEX',
        division_code: 'O1',
        cost_center_prefix: 'CP',
        qb_class_name: 'CAPEX',
        is_active: true,
      },
    }),
    // Division 2: Repairs
    prisma.divisions.upsert({
      where: { division_code: 'O2' },
      update: { division_name: 'Repairs', qb_class_name: 'Repairs', cost_center_prefix: 'RP' },
      create: {
        division_name: 'Repairs',
        division_code: 'O2',
        cost_center_prefix: 'RP',
        qb_class_name: 'Repairs',
        is_active: true,
      },
    }),
    // Division 3: Roofing
    prisma.divisions.upsert({
      where: { division_code: 'O3' },
      update: { division_name: 'Roofing', qb_class_name: 'Roofing', cost_center_prefix: 'RF' },
      create: {
        division_name: 'Roofing',
        division_code: 'O3',
        cost_center_prefix: 'RF',
        qb_class_name: 'Roofing',
        is_active: true,
      },
    }),
    // Division 4: General Contracting
    prisma.divisions.upsert({
      where: { division_code: 'O4' },
      update: { division_name: 'General Contracting', qb_class_name: 'General Contracting', cost_center_prefix: 'GC' },
      create: {
        division_name: 'General Contracting',
        division_code: 'O4',
        cost_center_prefix: 'GC',
        qb_class_name: 'General Contracting',
        is_active: true,
      },
    }),
    // Division 5: Subcontractor Management
    prisma.divisions.upsert({
      where: { division_code: 'O5' },
      update: { division_name: 'Subcontractor Management', qb_class_name: 'Subcontractor Management' },
      create: {
        division_name: 'Subcontractor Management',
        division_code: 'O5',
        cost_center_prefix: 'SM',
        qb_class_name: 'Subcontractor Management',
        is_active: true,
      },
    }),
    // Division 6: Specialty Trades
    prisma.divisions.upsert({
      where: { division_code: 'O6' },
      update: { division_name: 'Specialty Trades', qb_class_name: 'Specialty Trades' },
      create: {
        division_name: 'Specialty Trades',
        division_code: 'O6',
        cost_center_prefix: 'ST',
        qb_class_name: 'Specialty Trades',
        is_active: true,
      },
    }),
  ]);

  console.log(`✅ Created ${divisions.length} divisions`);

  // =====================================================
  // SEED GL ACCOUNT MAPPINGS
  // =====================================================
  console.log('📊 Seeding GL account mappings...');

  const glAccounts = [
    { gl_code_short: '10', gl_account_number: '5010', gl_account_name: 'Roofing Materials', gl_account_category: 'COGS' as const },
    { gl_code_short: '17', gl_account_number: '6170', gl_account_name: 'Equipment Rental', gl_account_category: 'OpEx' as const },
    { gl_code_short: '20', gl_account_number: '5020', gl_account_name: 'Wages Direct Labor', gl_account_category: 'COGS' as const },
    { gl_code_short: '25', gl_account_number: '6090', gl_account_name: 'Building Supplies', gl_account_category: 'OpEx' as const },
    { gl_code_short: '30', gl_account_number: '6750', gl_account_name: 'Subcontractors', gl_account_category: 'OpEx' as const },
    { gl_code_short: '35', gl_account_number: '6935', gl_account_name: 'Small Tools', gl_account_category: 'OpEx' as const },
    { gl_code_short: '40', gl_account_number: '6100', gl_account_name: 'Safety Equipment', gl_account_category: 'OpEx' as const },
    { gl_code_short: '50', gl_account_number: '6290', gl_account_name: 'Rent', gl_account_category: 'OpEx' as const },
    { gl_code_short: '55', gl_account_number: '6550', gl_account_name: 'Office Expense', gl_account_category: 'OpEx' as const },
    { gl_code_short: '60', gl_account_number: '6270', gl_account_name: 'Professional Fees', gl_account_category: 'OpEx' as const },
    { gl_code_short: '70', gl_account_number: '6390', gl_account_name: 'Utilities', gl_account_category: 'OpEx' as const },
    { gl_code_short: '75', gl_account_number: '6110', gl_account_name: 'Insurance', gl_account_category: 'OpEx' as const },
    { gl_code_short: '80', gl_account_number: '6530', gl_account_name: 'Advertising', gl_account_category: 'OpEx' as const },
    { gl_code_short: '95', gl_account_number: '5111', gl_account_name: 'Tax Charged', gl_account_category: 'COGS' as const },
  ];

  for (const gl of glAccounts) {
    await prisma.gl_account_mappings.upsert({
      where: { gl_code_short: gl.gl_code_short },
      update: {},
      create: {
        gl_code_short: gl.gl_code_short,
        gl_account_number: gl.gl_account_number,
        gl_account_name: gl.gl_account_name,
        gl_account_category: gl.gl_account_category,
        is_taxable_default: gl.gl_code_short !== '95', // Tax line not taxable
        qb_sync_enabled: true,
        is_active: true,
      },
    });
  }

  console.log(`✅ Created ${glAccounts.length} GL account mappings`);

  // =====================================================
  // SEED USERS
  // =====================================================
  console.log('👥 Seeding users...');

  const capexDiv = divisions.find(d => d.division_code === 'O1')!;
  const repairsDiv = divisions.find(d => d.division_code === 'O2')!;
  const roofingDiv = divisions.find(d => d.division_code === 'O3')!;
  const gcDiv = divisions.find(d => d.division_code === 'O4')!;
  const subsMgmtDiv = divisions.find(d => d.division_code === 'O5')!;
  const specialtyDiv = divisions.find(d => d.division_code === 'O6')!;

  // Generate secure passwords for all users
  console.log('🔐 Generating secure passwords...');
  const owner1Creds = await generateSecurePasswordHash();
  const owner2Creds = await generateSecurePasswordHash();
  const owner3Creds = await generateSecurePasswordHash();
  const owner4Creds = await generateSecurePasswordHash();
  const owner5Creds = await generateSecurePasswordHash();
  const owner6Creds = await generateSecurePasswordHash();
  const opsMgrCreds = await generateSecurePasswordHash();
  const accountingCreds = await generateSecurePasswordHash();

  const users = await Promise.all([
    // Owner 1 - CAPEX (Majority Owner)
    prisma.users.upsert({
      where: { email: 'owner1@allsurfaceroofing.com' },
      update: { division_id: capexDiv.id },
      create: {
        email: 'owner1@allsurfaceroofing.com',
        password_hash: owner1Creds.hash,
        first_name: 'Owner',
        last_name: 'One',
        phone: '619-555-0101',
        role: 'MAJORITY_OWNER',
        division_id: capexDiv.id,
        is_active: true,
      },
    }),
    // Owner 2 - Repairs (Division Leader)
    prisma.users.upsert({
      where: { email: 'owner2@allsurfaceroofing.com' },
      update: { division_id: repairsDiv.id },
      create: {
        email: 'owner2@allsurfaceroofing.com',
        password_hash: owner2Creds.hash,
        first_name: 'Owner',
        last_name: 'Two',
        phone: '619-555-0102',
        role: 'DIVISION_LEADER',
        division_id: repairsDiv.id,
        is_active: true,
      },
    }),
    // Owner 3 - Roofing (Division Leader)
    prisma.users.upsert({
      where: { email: 'owner3@allsurfaceroofing.com' },
      update: { division_id: roofingDiv.id },
      create: {
        email: 'owner3@allsurfaceroofing.com',
        password_hash: owner3Creds.hash,
        first_name: 'Owner',
        last_name: 'Three',
        phone: '619-555-0103',
        role: 'DIVISION_LEADER',
        division_id: roofingDiv.id,
        is_active: true,
      },
    }),
    // Owner 4 - General Contracting (Division Leader)
    prisma.users.upsert({
      where: { email: 'owner4@allsurfaceroofing.com' },
      update: { division_id: gcDiv.id },
      create: {
        email: 'owner4@allsurfaceroofing.com',
        password_hash: owner4Creds.hash,
        first_name: 'Owner',
        last_name: 'Four',
        phone: '619-555-0104',
        role: 'DIVISION_LEADER',
        division_id: gcDiv.id,
        is_active: true,
      },
    }),
    // Owner 5 - Subcontractor Management (Division Leader)
    prisma.users.upsert({
      where: { email: 'owner5@allsurfaceroofing.com' },
      update: { division_id: subsMgmtDiv.id },
      create: {
        email: 'owner5@allsurfaceroofing.com',
        password_hash: owner5Creds.hash,
        first_name: 'Owner',
        last_name: 'Five',
        phone: '619-555-0105',
        role: 'DIVISION_LEADER',
        division_id: subsMgmtDiv.id,
        is_active: true,
      },
    }),
    // Owner 6 - Specialty Trades (Division Leader)
    prisma.users.upsert({
      where: { email: 'owner6@allsurfaceroofing.com' },
      update: { division_id: specialtyDiv.id },
      create: {
        email: 'owner6@allsurfaceroofing.com',
        password_hash: owner6Creds.hash,
        first_name: 'Owner',
        last_name: 'Six',
        phone: '619-555-0106',
        role: 'DIVISION_LEADER',
        division_id: specialtyDiv.id,
        is_active: true,
      },
    }),
    // Operations Manager
    prisma.users.upsert({
      where: { email: 'opsmgr@allsurfaceroofing.com' },
      update: {},
      create: {
        email: 'opsmgr@allsurfaceroofing.com',
        password_hash: opsMgrCreds.hash,
        first_name: 'Operations',
        last_name: 'Manager',
        phone: '619-555-0107',
        role: 'OPERATIONS_MANAGER',
        division_id: null,
        is_active: true,
      },
    }),
    // Accounting
    prisma.users.upsert({
      where: { email: 'accounting@allsurfaceroofing.com' },
      update: {},
      create: {
        email: 'accounting@allsurfaceroofing.com',
        password_hash: accountingCreds.hash,
        first_name: 'Accounting',
        last_name: 'Staff',
        phone: '619-555-0108',
        role: 'ACCOUNTING',
        division_id: null,
        is_active: true,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // =====================================================
  // SEED DIVISION LEADERS
  // =====================================================
  console.log('👔 Seeding division leaders...');

  const owner1 = users.find(u => u.email === 'owner1@allsurfaceroofing.com')!;
  const owner2 = users.find(u => u.email === 'owner2@allsurfaceroofing.com')!;
  const owner3 = users.find(u => u.email === 'owner3@allsurfaceroofing.com')!;
  const owner4 = users.find(u => u.email === 'owner4@allsurfaceroofing.com')!;
  const owner5 = users.find(u => u.email === 'owner5@allsurfaceroofing.com')!;
  const owner6 = users.find(u => u.email === 'owner6@allsurfaceroofing.com')!;

  await Promise.all([
    // O1 - CAPEX
    prisma.division_leaders.upsert({
      where: { division_code: 'O1' },
      update: { qb_class_name: 'CAPEX' },
      create: {
        user_id: owner1.id,
        name: 'Owner One',
        email: owner1.email,
        phone: owner1.phone,
        division_code: 'O1',
        division_id: capexDiv.id,
        qb_class_name: 'CAPEX',
        approval_limit: 100000,
        is_active: true,
      },
    }),
    // O2 - Repairs
    prisma.division_leaders.upsert({
      where: { division_code: 'O2' },
      update: { qb_class_name: 'Repairs', division_id: repairsDiv.id },
      create: {
        user_id: owner2.id,
        name: 'Owner Two',
        email: owner2.email,
        phone: owner2.phone,
        division_code: 'O2',
        division_id: repairsDiv.id,
        qb_class_name: 'Repairs',
        approval_limit: 50000,
        is_active: true,
      },
    }),
    // O3 - Roofing
    prisma.division_leaders.upsert({
      where: { division_code: 'O3' },
      update: { qb_class_name: 'Roofing', division_id: roofingDiv.id },
      create: {
        user_id: owner3.id,
        name: 'Owner Three',
        email: owner3.email,
        phone: owner3.phone,
        division_code: 'O3',
        division_id: roofingDiv.id,
        qb_class_name: 'Roofing',
        approval_limit: 50000,
        is_active: true,
      },
    }),
    // O4 - General Contracting
    prisma.division_leaders.upsert({
      where: { division_code: 'O4' },
      update: { qb_class_name: 'General Contracting', division_id: gcDiv.id },
      create: {
        user_id: owner4.id,
        name: 'Owner Four',
        email: owner4.email,
        phone: owner4.phone,
        division_code: 'O4',
        division_id: gcDiv.id,
        qb_class_name: 'General Contracting',
        approval_limit: 50000,
        is_active: true,
      },
    }),
    // O5 - Subcontractor Management
    prisma.division_leaders.upsert({
      where: { division_code: 'O5' },
      update: { qb_class_name: 'Subcontractor Management' },
      create: {
        user_id: owner5.id,
        name: 'Owner Five',
        email: owner5.email,
        phone: owner5.phone,
        division_code: 'O5',
        division_id: subsMgmtDiv.id,
        qb_class_name: 'Subcontractor Management',
        approval_limit: 50000,
        is_active: true,
      },
    }),
    // O6 - Specialty Trades
    prisma.division_leaders.upsert({
      where: { division_code: 'O6' },
      update: { qb_class_name: 'Specialty Trades' },
      create: {
        user_id: owner6.id,
        name: 'Owner Six',
        email: owner6.email,
        phone: owner6.phone,
        division_code: 'O6',
        division_id: specialtyDiv.id,
        qb_class_name: 'Specialty Trades',
        approval_limit: 50000,
        is_active: true,
      },
    }),
  ]);

  console.log('✅ Created 6 division leaders');

  // =====================================================
  // SEED VENDORS
  // =====================================================
  console.log('🏪 Seeding vendors...');

  const vendors = [
    { vendor_name: 'ABC Roofing Supply', vendor_code: 'AB', vendor_type: 'Material' as const, contact_name: 'John Smith', contact_email: 'invoices@abcroof.com', contact_phone: '619-555-1001', city: 'San Diego', state: 'CA' },
    { vendor_name: 'Home Depot Pro', vendor_code: 'HD', vendor_type: 'Material' as const, contact_name: 'Pro Desk', contact_email: 'supplies@homedepot.com', contact_phone: '619-555-1002', city: 'San Diego', state: 'CA' },
    { vendor_name: 'Local Sub LLC', vendor_code: 'LS', vendor_type: 'Subcontractor' as const, contact_name: 'Mike Johnson', contact_email: 'contact@localsub.com', contact_phone: '619-555-1003', city: 'San Diego', state: 'CA' },
    { vendor_name: 'Equipment Rentals Co', vendor_code: 'ER', vendor_type: 'Equipment' as const, contact_name: 'Rental Desk', contact_email: 'rentals@equipmentco.com', contact_phone: '619-555-1004', city: 'San Diego', state: 'CA' },
    { vendor_name: 'Johnson Plumbing', vendor_code: 'JP', vendor_type: 'Subcontractor' as const, contact_name: 'Tom Johnson', contact_email: 'orders@johnsonplumb.com', contact_phone: '619-555-1005', city: 'San Diego', state: 'CA' },
    { vendor_name: 'Phoenix Materials', vendor_code: 'PM', vendor_type: 'Material' as const, contact_name: 'Sarah Lee', contact_email: 'sales@phoenixmaterials.com', contact_phone: '619-555-1006', city: 'San Diego', state: 'CA' },
    { vendor_name: 'Casavida Management', vendor_code: 'CA', vendor_type: 'Other' as const, contact_name: 'Maria Garcia', contact_email: 'pm@casavida.com', contact_phone: '619-555-1007', city: 'San Diego', state: 'CA' },
    { vendor_name: 'Beacon Building Products', vendor_code: 'BB', vendor_type: 'Material' as const, contact_name: 'Sales Team', contact_email: 'orders@beacon.com', contact_phone: '619-555-1008', city: 'San Diego', state: 'CA' },
    { vendor_name: 'SRS Distribution', vendor_code: 'SR', vendor_type: 'Material' as const, contact_name: 'Order Desk', contact_email: 'orders@srsdistribution.com', contact_phone: '619-555-1009', city: 'San Diego', state: 'CA' },
    { vendor_name: 'Triangle Fastener', vendor_code: 'TF', vendor_type: 'Material' as const, contact_name: 'Parts Dept', contact_email: 'orders@trianglefastener.com', contact_phone: '619-555-1010', city: 'San Diego', state: 'CA' },
  ];

  for (const v of vendors) {
    await prisma.vendors.upsert({
      where: { vendor_code: v.vendor_code },
      update: {},
      create: {
        vendor_name: v.vendor_name,
        vendor_code: v.vendor_code,
        vendor_type: v.vendor_type,
        contact_name: v.contact_name,
        contact_email: v.contact_email,
        contact_phone: v.contact_phone,
        city: v.city,
        state: v.state,
        payment_terms_default: 'Net30',
        is_active: true,
        is_1099_required: v.vendor_type === 'Subcontractor',
      },
    });
  }

  console.log(`✅ Created ${vendors.length} vendors`);

  // =====================================================
  // SEED PROJECTS
  // =====================================================
  console.log('📋 Seeding projects...');

  const projects = [
    { project_code: 'A-001', project_name: 'Admiral Hartman District', district_code: 'A', district_name: 'Admiral Hartman', budget_total: 500000 },
    { project_code: 'CA-001', project_name: 'Casavida Major Complex', district_code: 'CA', district_name: 'Casavida', budget_total: 1200000 },
    { project_code: 'D-001', project_name: 'Desert Winds', district_code: 'D', district_name: 'Desert Winds', budget_total: 350000 },
    { project_code: 'B-001', project_name: 'Bayview Apartments', district_code: 'B', district_name: 'Bayview', budget_total: 250000 },
    { project_code: 'F-001', project_name: 'Officer Housing - Base', district_code: 'F', district_name: 'Fort Housing', budget_total: 800000 },
  ];

  for (const p of projects) {
    await prisma.projects.upsert({
      where: { project_code: p.project_code },
      update: {},
      create: {
        project_code: p.project_code,
        project_name: p.project_name,
        district_code: p.district_code,
        district_name: p.district_name,
        primary_division_id: capexDiv.id,
        status: 'Active',
        budget_total: p.budget_total,
        budget_actual: 0,
        po_count: 0,
      },
    });
  }

  console.log(`✅ Created ${projects.length} projects`);

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📊 6 Divisions (matching QuickBooks Classes):');
  console.log('   O1: CAPEX');
  console.log('   O2: Repairs');
  console.log('   O3: Roofing');
  console.log('   O4: General Contracting');
  console.log('   O5: Subcontractor Management');
  console.log('   O6: Specialty Trades');
  console.log('');
  console.log('🔐 Demo Account Login Credentials (Secure Generated Passwords):');
  console.log(`   - owner1@allsurfaceroofing.com (CAPEX - Majority Owner): ${owner1Creds.password}`);
  console.log(`   - owner2@allsurfaceroofing.com (Repairs - Division Leader): ${owner2Creds.password}`);
  console.log(`   - owner3@allsurfaceroofing.com (Roofing - Division Leader): ${owner3Creds.password}`);
  console.log(`   - owner4@allsurfaceroofing.com (General Contracting - Division Leader): ${owner4Creds.password}`);
  console.log(`   - owner5@allsurfaceroofing.com (Subcontractor Management - Division Leader): ${owner5Creds.password}`);
  console.log(`   - owner6@allsurfaceroofing.com (Specialty Trades - Division Leader): ${owner6Creds.password}`);
  console.log(`   - opsmgr@allsurfaceroofing.com (Operations Manager): ${opsMgrCreds.password}`);
  console.log(`   - accounting@allsurfaceroofing.com (Accounting - Read Only): ${accountingCreds.password}`);
  console.log('');
  console.log('🔒 All passwords are securely hashed with bcrypt (salt rounds: 12)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
