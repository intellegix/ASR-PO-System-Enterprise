import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { withRateLimit } from '@/lib/validation/middleware';
import { isAdmin } from '@/lib/auth/permissions';
import log, { auditLog } from '@/lib/logging/logger';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * QB Supplier List — 43 material/building suppliers
 * Source: Digital Billing Records (QB Organized)/Supplier_List.csv
 * All vendors are type: Material (Building & Roofing Materials / Supplies)
 */
const SUPPLIER_LIST: Array<{
  vendor_name: string;
  vendor_code: string;
  name_variants: string[];
}> = [
  { vendor_name: 'ABC Supply Co', vendor_code: 'ABC', name_variants: ['ABC Supply Co', 'ABC Supply Co Inc'] },
  { vendor_name: 'Beacon', vendor_code: 'BCN', name_variants: ['Beacon', 'Beacon Building Products'] },
  { vendor_name: 'BFS Group of California LLC', vendor_code: 'BFS', name_variants: ['BFS Group of California LLC', 'Dixieline', 'Builders FirstSource'] },
  { vendor_name: 'Brandguard Vents', vendor_code: 'BGV', name_variants: ['Brandguard Vents', 'Brandguard Vents Inc'] },
  { vendor_name: 'Bryan Bauer Glass', vendor_code: 'BBG', name_variants: ['Bryan Bauer Glass'] },
  { vendor_name: "Builder's Fence Company", vendor_code: 'BFC', name_variants: ["Builder's Fence Company"] },
  { vendor_name: 'CAL Electrical Supply', vendor_code: 'CAL', name_variants: ['CAL Electrical Supply'] },
  { vendor_name: 'Classic Roof Tile', vendor_code: 'CRT', name_variants: ['Classic Roof Tile'] },
  { vendor_name: 'Coddington Lock and Supply', vendor_code: 'CLS', name_variants: ['Coddington Lock and Supply'] },
  { vendor_name: 'Dunn-Edwards', vendor_code: 'DE', name_variants: ['Dunn-Edwards', 'Dunn-Edwards Corporation', 'Dunn-Edwards Paints', 'Dunn-Edwards Commercial'] },
  { vendor_name: 'Escondido Metal Supply', vendor_code: 'EMS', name_variants: ['Escondido Metal Supply'] },
  { vendor_name: 'Ferguson', vendor_code: 'FRG', name_variants: ['Ferguson'] },
  { vendor_name: 'Flashing Warehouse', vendor_code: 'FW', name_variants: ['Flashing Warehouse'] },
  { vendor_name: 'Ganahl Lumber', vendor_code: 'GL', name_variants: ['Ganahl Lumber'] },
  { vendor_name: 'HD Supply', vendor_code: 'HDS', name_variants: ['HD Supply'] },
  { vendor_name: 'Home Depot', vendor_code: 'HD', name_variants: ['Home Depot', 'Home Depot Pro'] },
  { vendor_name: 'Industrial Metal Supply Co', vendor_code: 'IMS', name_variants: ['Industrial Metal Supply Co'] },
  { vendor_name: 'JB Wholesale Roofing Supply', vendor_code: 'JBW', name_variants: ['JB Wholesale Roofing Supply'] },
  { vendor_name: 'JW Lumber (El Cajon)', vendor_code: 'JWL', name_variants: ['JW Lumber (El Cajon)'] },
  { vendor_name: 'La Mesa Lumber', vendor_code: 'LML', name_variants: ['La Mesa Lumber'] },
  { vendor_name: 'Metal Fab Logistics', vendor_code: 'MFL', name_variants: ['Metal Fab Logistics'] },
  { vendor_name: 'Modern Fence Technologies', vendor_code: 'MFT', name_variants: ['Modern Fence Technologies'] },
  { vendor_name: 'Modern Stairways', vendor_code: 'MSW', name_variants: ['Modern Stairways'] },
  { vendor_name: 'Professional Contractor Supply', vendor_code: 'PCS', name_variants: ['Professional Contractor Supply'] },
  { vendor_name: 'QXO', vendor_code: 'QXO', name_variants: ['QXO', 'QXO Waterproofing Products'] },
  { vendor_name: 'Quanex', vendor_code: 'QNX', name_variants: ['Quanex', 'Quanex Screens'] },
  { vendor_name: 'R&H Steel', vendor_code: 'RHS', name_variants: ['R&H Steel'] },
  { vendor_name: 'RCP Block and Brick', vendor_code: 'RCP', name_variants: ['RCP Block and Brick'] },
  { vendor_name: 'San Diego Building Materials', vendor_code: 'SDB', name_variants: ['San Diego Building Materials'] },
  { vendor_name: 'Santa Rosa Windows', vendor_code: 'SRW', name_variants: ['Santa Rosa Windows'] },
  { vendor_name: 'SD Powder Coatings', vendor_code: 'SDP', name_variants: ['SD Powder Coatings'] },
  { vendor_name: 'SD Rock Supply', vendor_code: 'SDR', name_variants: ['SD Rock Supply'] },
  { vendor_name: 'Sherwin Williams', vendor_code: 'SW', name_variants: ['Sherwin Williams'] },
  { vendor_name: 'Simpson Strong Tie', vendor_code: 'SST', name_variants: ['Simpson Strong Tie'] },
  { vendor_name: 'SiteOne', vendor_code: 'S1', name_variants: ['SiteOne', 'SiteOne Landscape Supply'] },
  { vendor_name: 'SRS Building Products', vendor_code: 'SRS', name_variants: ['SRS Building Products', 'SRS Distribution'] },
  { vendor_name: 'Thompson Building Materials', vendor_code: 'TBM', name_variants: ['Thompson Building Materials'] },
  { vendor_name: 'Thunderbird Products', vendor_code: 'TBP', name_variants: ['Thunderbird Products'] },
  { vendor_name: 'Vinylvisions', vendor_code: 'VV', name_variants: ['Vinylvisions'] },
  { vendor_name: 'Vision Recycling', vendor_code: 'VR', name_variants: ['Vision Recycling'] },
  { vendor_name: 'Westair Gases', vendor_code: 'WG', name_variants: ['Westair Gases'] },
  { vendor_name: 'White Cap', vendor_code: 'WC', name_variants: ['White Cap', 'White Cap LP'] },
  { vendor_name: 'WNC Foam Shapes', vendor_code: 'WNC', name_variants: ['WNC Foam Shapes', 'Walter N Coffman Inc'] },
];

/**
 * Mapping of existing vendor names to their CSV equivalents for dedup.
 * Existing DB vendor -> CSV vendor_code to adopt
 */
const EXISTING_VENDOR_MAP: Record<string, string> = {
  'ABC Roofing Supply': 'ABC',       // -> ABC Supply Co
  'Beacon Building Products': 'BCN', // -> Beacon
  'Home Depot Pro': 'HD',            // -> Home Depot
  'SRS Distribution': 'SRS',         // -> SRS Building Products
};

interface SeedResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  details: Array<{ vendor: string; action: string }>;
}

/**
 * POST /api/vendors/seed - Import 43 QB suppliers into the vendors table.
 * Upserts by vendor_code, updates existing matches by name.
 */
const postHandler = async (_request: NextRequest): Promise<NextResponse> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can seed vendors
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    log.info('Vendor seed: Starting import of QB suppliers', { userId: session.user.id });

    const result: SeedResult = { created: 0, updated: 0, skipped: 0, errors: [], details: [] };

    // First, update existing vendors that map to CSV entries
    const existingVendors = await prisma.vendors.findMany();
    const existingByName = new Map(existingVendors.map(v => [v.vendor_name, v]));
    const _existingByCode = new Map(existingVendors.map(v => [v.vendor_code, v]));

    // Track which codes are now taken (after potential renames)
    const usedCodes = new Set(existingVendors.map(v => v.vendor_code));

    // Update existing vendors that match CSV names
    for (const [existingName, newCode] of Object.entries(EXISTING_VENDOR_MAP)) {
      const existing = existingByName.get(existingName);
      if (existing) {
        const csvEntry = SUPPLIER_LIST.find(s => s.vendor_code === newCode);
        if (csvEntry) {
          // Update the existing vendor to match CSV data
          usedCodes.delete(existing.vendor_code);
          usedCodes.add(newCode);

          await prisma.vendors.update({
            where: { id: existing.id },
            data: {
              vendor_name: csvEntry.vendor_name,
              vendor_code: newCode,
              name_variants: csvEntry.name_variants,
              updated_at: new Date(),
            },
          });
          result.updated++;
          result.details.push({ vendor: csvEntry.vendor_name, action: `updated (was "${existingName}" / code ${existing.vendor_code} -> ${newCode})` });
        }
      }
    }

    // Now upsert all CSV vendors
    for (const supplier of SUPPLIER_LIST) {
      try {
        // Skip if we already updated this vendor via the mapping above
        const alreadyHandled = Object.values(EXISTING_VENDOR_MAP).includes(supplier.vendor_code)
          && result.details.some(d => d.vendor === supplier.vendor_name && d.action.startsWith('updated'));
        if (alreadyHandled) continue;

        // Check if vendor_code already exists
        const existingByCodeNow = await prisma.vendors.findUnique({
          where: { vendor_code: supplier.vendor_code },
        });

        if (existingByCodeNow) {
          // Update existing with name_variants
          await prisma.vendors.update({
            where: { vendor_code: supplier.vendor_code },
            data: {
              name_variants: supplier.name_variants,
              updated_at: new Date(),
            },
          });
          result.skipped++;
          result.details.push({ vendor: supplier.vendor_name, action: `skipped (code ${supplier.vendor_code} exists)` });
          continue;
        }

        // Create new vendor
        await prisma.vendors.create({
          data: {
            vendor_name: supplier.vendor_name,
            vendor_code: supplier.vendor_code,
            vendor_type: 'Material',
            name_variants: supplier.name_variants,
            payment_terms_default: 'Net30',
            is_active: true,
          },
        });
        result.created++;
        result.details.push({ vendor: supplier.vendor_name, action: `created (code: ${supplier.vendor_code})` });
      } catch (err) {
        const msg = `Failed to upsert vendor ${supplier.vendor_name}: ${err instanceof Error ? err.message : String(err)}`;
        log.error(msg);
        result.errors.push(msg);
      }
    }

    auditLog('VENDOR_SEED', 'vendors', 'batch', {
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errorCount: result.errors.length,
    }, { userId: session.user.id });

    log.info('Vendor seed: Complete', {
      userId: session.user.id,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.length,
    });

    return NextResponse.json(result);
  } catch (error) {
    log.error('Vendor seed: Failed', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: 'Vendor seed failed', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};

/**
 * GET /api/vendors/seed - Preview what the seed would do (dry run)
 */
const getHandler = async (_request: NextRequest): Promise<NextResponse> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existingVendors = await prisma.vendors.findMany({
    select: { vendor_code: true, vendor_name: true },
  });
  const existingCodes = new Set(existingVendors.map(v => v.vendor_code));

  const preview = SUPPLIER_LIST.map(s => ({
    vendor_name: s.vendor_name,
    vendor_code: s.vendor_code,
    name_variants: s.name_variants,
    action: existingCodes.has(s.vendor_code) ? 'update' : 'create',
  }));

  return NextResponse.json({
    totalSuppliers: SUPPLIER_LIST.length,
    existingVendors: existingVendors.length,
    willCreate: preview.filter(p => p.action === 'create').length,
    willUpdate: preview.filter(p => p.action === 'update').length,
    preview,
  });
};

export const POST = withRateLimit(5, 60 * 1000)(postHandler);
export const GET = withRateLimit(30, 60 * 1000)(getHandler);
