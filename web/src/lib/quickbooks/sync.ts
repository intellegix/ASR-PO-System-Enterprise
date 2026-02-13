/**
 * QuickBooks Sync Engine
 * Transforms PO data and syncs to QuickBooks Bills
 */

import QuickBooks from 'quickbooks';
import { QB_RATE_LIMITS } from './config';
import prisma from '@/lib/db';

// PO data interface for sync operations
interface POSyncData {
  id: string;
  po_number: string;
  total_amount: number;
  subtotal_amount: number;
  tax_amount: number;
  required_by_date: Date | null;
  notes_vendor: string | null;
  created_at: Date;
  vendor: {
    qb_vendor_id?: string | null;
    vendor_name: string;
    vendor_code: string;
  };
  division: {
    qb_class_name?: string | null;
    division_name: string;
    division_code: string;
  };
  project: {
    project_name: string;
    project_code: string;
  };
  po_line_items: Array<{
    item_description: string;
    line_subtotal: number;
    gl_account_number?: string | null;
  }>;
}

// QB Bill structure for API calls
interface QBBillData {
  VendorRef?: { value: string; name?: string };
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  PrivateNote?: string;
  Line: Array<{
    Amount: number;
    Description?: string;
    AccountRef?: { value: string; name?: string };
    ClassRef?: { value: string; name?: string };
  }>;
  TotalAmt: number;
}

// Sync result interface
interface SyncResult {
  success: boolean;
  qb_bill_id?: string;
  error?: string;
  details?: unknown;
}

/**
 * Get active QB tokens and create authenticated client
 */
async function getQBClient(): Promise<QuickBooks | null> {
  try {
    const activeToken = await prisma.qb_auth_tokens.findFirst({
      where: {
        is_active: true,
        token_expires_at: { gte: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!activeToken) {
      console.error('No active QuickBooks token found');
      return null;
    }

    // Create QB client with current token
    const qb = new QuickBooks({
      consumerKey: process.env.QB_CLIENT_ID!,
      consumerSecret: process.env.QB_CLIENT_SECRET!,
      token: activeToken.access_token,
      tokenSecret: '', // OAuth 2.0 doesn't use token secret
      realmId: activeToken.realm_id,
      useSandbox: process.env.QB_ENVIRONMENT === 'sandbox',
      debug: process.env.NODE_ENV === 'development',
    });

    return qb;
  } catch (error) {
    console.error('Failed to create QB client:', error);
    return null;
  }
}

/**
 * Find or create vendor in QuickBooks
 */
async function ensureQBVendor(qb: QuickBooks, vendorData: POSyncData['vendor']): Promise<string | null> {
  return new Promise((resolve) => {
    // First, try to find existing vendor
    qb.findVendors([{ field: 'Name', value: vendorData.vendor_name, operator: '=' }], (_err: unknown, vendors?: Array<{ Id?: string }>) => {
      if (!_err && vendors && vendors.length > 0) {
        console.log(`Found existing QB vendor: ${vendors[0].Id}`);
        resolve(vendors[0].Id!);
        return;
      }

      // If not found, create new vendor
      const newVendor = {
        Name: vendorData.vendor_name,
        AcctNum: vendorData.vendor_code,
        Active: true,
      };

      qb.createVendor(newVendor, (createErr: unknown, vendor?: { Id?: string }) => {
        if (createErr) {
          console.error('Failed to create QB vendor:', createErr);
          resolve(null);
          return;
        }

        console.log(`Created new QB vendor: ${vendor!.Id}`);
        resolve(vendor!.Id!);
      });
    });
  });
}

/**
 * Find QB account by GL account number
 */
async function findQBAccount(qb: QuickBooks, glAccountNumber: string | null): Promise<string | null> {
  if (!glAccountNumber) return null;

  return new Promise((resolve) => {
    qb.getAccounts((err, accounts) => {
      if (err || !accounts) {
        console.error('Failed to get QB accounts:', err);
        resolve(null);
        return;
      }

      // Find account by account number
      const account = accounts.find(acc => acc.AcctNum === glAccountNumber);
      if (account) {
        resolve(account.Id!);
      } else {
        console.warn(`No QB account found for GL number: ${glAccountNumber}`);
        resolve(null);
      }
    });
  });
}

/**
 * Find QB class by division QB class name
 */
async function findQBClass(qb: QuickBooks, className: string | null): Promise<string | null> {
  if (!className) return null;

  return new Promise((resolve) => {
    qb.getClasses((err, classes) => {
      if (err || !classes) {
        console.error('Failed to get QB classes:', err);
        resolve(null);
        return;
      }

      // Find class by name
      const qbClass = classes.find(cls => cls.Name === className);
      if (qbClass) {
        resolve(qbClass.Id!);
      } else {
        console.warn(`No QB class found for name: ${className}`);
        resolve(null);
      }
    });
  });
}

/**
 * Transform PO data to QB Bill format
 */
export async function transformPOToQBBill(poData: POSyncData): Promise<QBBillData | null> {
  const qb = await getQBClient();
  if (!qb) {
    console.error('Cannot transform PO: No QB client available');
    return null;
  }

  try {
    // Ensure vendor exists in QB
    const vendorId = await ensureQBVendor(qb, poData.vendor);
    if (!vendorId) {
      throw new Error('Failed to find or create vendor in QuickBooks');
    }

    // Find QB class for division
    const classId = await findQBClass(qb, poData.division.qb_class_name || null);

    // Transform line items
    const lines: QBBillData['Line'] = [];

    for (const lineItem of poData.po_line_items) {
      const accountId = await findQBAccount(qb, lineItem.gl_account_number || null);

      lines.push({
        Amount: Number(lineItem.line_subtotal),
        Description: lineItem.item_description,
        AccountRef: accountId ? { value: accountId } : undefined,
        ClassRef: classId ? { value: classId } : undefined,
      });
    }

    // Construct QB Bill data
    const qbBillData: QBBillData = {
      VendorRef: { value: vendorId, name: poData.vendor.vendor_name },
      DocNumber: poData.po_number,
      TxnDate: poData.created_at.toISOString().split('T')[0], // YYYY-MM-DD format
      DueDate: poData.required_by_date?.toISOString().split('T')[0],
      PrivateNote: poData.notes_vendor || undefined,
      Line: lines,
      TotalAmt: Number(poData.total_amount),
    };

    return qbBillData;
  } catch (error) {
    console.error('Failed to transform PO to QB Bill:', error);
    return null;
  }
}

/**
 * Create bill in QuickBooks
 */
export async function createQBBill(billData: QBBillData): Promise<SyncResult> {
  const qb = await getQBClient();
  if (!qb) {
    return {
      success: false,
      error: 'No active QuickBooks connection available',
    };
  }

  return new Promise((resolve) => {
    qb.createBill(billData, (err, bill) => {
      if (err) {
        console.error('QB Bill creation failed:', err);
        resolve({
          success: false,
          error: 'Failed to create bill in QuickBooks',
          details: err,
        });
        return;
      }

      console.log(`QB Bill created successfully: ${bill!.Id}`);
      resolve({
        success: true,
        qb_bill_id: bill!.Id!,
      });
    });
  });
}

/**
 * Main sync function: PO → QB Bill
 */
export async function syncPOToQB(poId: string): Promise<SyncResult> {
  try {
    console.log(`Starting QB sync for PO: ${poId}`);

    // Fetch PO data with required relations
    const po = await prisma.po_headers.findUnique({
      where: { id: poId, deleted_at: null },
      include: {
        vendors: true,
        divisions: true,
        projects: true,
        po_line_items: {
          orderBy: { line_number: 'asc' },
        },
      },
    });

    if (!po) {
      return {
        success: false,
        error: `Purchase Order not found: ${poId}`,
      };
    }

    // Validate required data
    if (!po.vendors) {
      return {
        success: false,
        error: 'PO missing vendor information',
      };
    }

    if (!po.divisions) {
      return {
        success: false,
        error: 'PO missing division information',
      };
    }

    if (!po.projects) {
      return {
        success: false,
        error: 'PO missing project information',
      };
    }

    if (!po.po_line_items || po.po_line_items.length === 0) {
      return {
        success: false,
        error: 'PO has no line items',
      };
    }

    // Transform to sync data format
    const syncData: POSyncData = {
      id: po.id,
      po_number: po.po_number,
      total_amount: Number(po.total_amount),
      subtotal_amount: Number(po.subtotal_amount || 0),
      tax_amount: Number(po.tax_amount || 0),
      required_by_date: po.required_by_date,
      notes_vendor: po.notes_vendor,
      created_at: po.created_at!,
      vendor: {
        qb_vendor_id: po.vendors.qb_vendor_id || null,
        vendor_name: po.vendors.vendor_name,
        vendor_code: po.vendors.vendor_code,
      },
      division: {
        qb_class_name: po.divisions.qb_class_name || null,
        division_name: po.divisions.division_name,
        division_code: po.divisions.division_code,
      },
      project: {
        project_name: po.projects.project_name,
        project_code: po.projects.project_code,
      },
      po_line_items: po.po_line_items.map(item => ({
        item_description: item.item_description,
        line_subtotal: Number(item.line_subtotal),
        gl_account_number: item.gl_account_number || null,
      })),
    };

    // Transform to QB Bill format
    const billData = await transformPOToQBBill(syncData);
    if (!billData) {
      return {
        success: false,
        error: 'Failed to transform PO data to QB Bill format',
      };
    }

    // Create bill in QuickBooks
    const result = await createQBBill(billData);

    // Update PO sync status in database
    await prisma.po_headers.update({
      where: { id: poId },
      data: {
        qb_bill_id: result.qb_bill_id,
        qb_sync_status: result.success ? 'SUCCESS' : 'FAILED',
        qb_synced_at: new Date(),
      },
    });

    console.log(`PO sync completed: ${poId}, Success: ${result.success}`);
    return result;

  } catch (error) {
    console.error(`PO sync failed for ${poId}:`, error);

    // Update sync status to FAILED
    try {
      await prisma.po_headers.update({
        where: { id: poId },
        data: {
          qb_sync_status: 'FAILED',
          qb_synced_at: new Date(),
        },
      });
    } catch (dbError) {
      console.error('Failed to update sync status:', dbError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown sync error',
    };
  }
}

/**
 * Retry failed syncs with exponential backoff
 */
export async function retryFailedSyncs(): Promise<void> {
  console.log('Starting retry of failed QB syncs...');

  const failedSyncs = await prisma.po_headers.findMany({
    where: {
      qb_sync_status: { in: ['FAILED', 'RETRY'] },
      deleted_at: null,
    },
    take: 10, // Limit to avoid overwhelming QB API
    orderBy: { qb_synced_at: 'asc' }, // Retry oldest failures first
  });

  console.log(`Found ${failedSyncs.length} failed syncs to retry`);

  for (const po of failedSyncs) {
    try {
      // Mark as retry status
      await prisma.po_headers.update({
        where: { id: po.id },
        data: { qb_sync_status: 'RETRY' },
      });

      // Attempt sync
      await syncPOToQB(po.id);

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, QB_RATE_LIMITS.retryDelayMs));

    } catch (error) {
      console.error(`Retry failed for PO ${po.po_number}:`, error);
    }
  }

  console.log('Retry of failed QB syncs completed');
}