/**
 * QuickBooks Service Layer
 * High-level service functions for QB integration
 */

import { syncPOToQB, retryFailedSyncs } from './sync';
import { createOAuthClient } from './config';
import prisma from '@/lib/db';

// Service response interface
interface QBServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Sync a single PO to QuickBooks
 */
export async function syncSinglePO(poId: string): Promise<QBServiceResponse> {
  try {
    // Check if PO is in the right status for syncing
    const po = await prisma.po_headers.findUnique({
      where: { id: poId, deleted_at: null },
      select: { po_number: true, status: true, qb_sync_status: true, qb_bill_id: true },
    });

    if (!po) {
      return {
        success: false,
        error: `Purchase Order not found: ${poId}`,
      };
    }

    // Check if already synced successfully
    if (po.qb_sync_status === 'SUCCESS' && po.qb_bill_id) {
      return {
        success: true,
        message: `PO ${po.po_number} is already synced to QuickBooks (Bill ID: ${po.qb_bill_id})`,
        data: { qb_bill_id: po.qb_bill_id },
      };
    }

    // Perform sync
    const result = await syncPOToQB(poId);

    return {
      success: result.success,
      error: result.error,
      message: result.success
        ? `PO ${po.po_number} synced successfully to QuickBooks`
        : `Failed to sync PO ${po.po_number}`,
      data: result.qb_bill_id ? { qb_bill_id: result.qb_bill_id } : undefined,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown service error',
    };
  }
}

/**
 * Sync multiple POs by IDs
 */
export async function syncMultiplePOs(poIds: string[]): Promise<QBServiceResponse<{ results: any[] }>> {
  const results = [];

  for (const poId of poIds) {
    try {
      const result = await syncSinglePO(poId);
      results.push({
        po_id: poId,
        ...result,
      });

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      results.push({
        po_id: poId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;

  return {
    success: successCount > 0,
    message: `Sync completed: ${successCount} successful, ${failCount} failed`,
    data: { results },
  };
}

/**
 * Auto-sync POs that are marked as "Paid" but not yet synced
 */
export async function autoSyncPaidPOs(): Promise<QBServiceResponse<{ synced: number }>> {
  try {
    // Find POs that are Paid but not synced
    const unsyncedPaidPOs = await prisma.po_headers.findMany({
      where: {
        status: 'Paid',
        OR: [
          { qb_sync_status: 'PENDING' },
          { qb_sync_status: null },
        ],
        deleted_at: null,
      },
      select: { id: true, po_number: true },
      orderBy: { created_at: 'asc' },
      take: 20, // Process in batches to avoid overwhelming QB API
    });

    if (unsyncedPaidPOs.length === 0) {
      return {
        success: true,
        message: 'No paid POs found that require syncing',
        data: { synced: 0 },
      };
    }

    console.log(`Found ${unsyncedPaidPOs.length} paid POs to sync to QuickBooks`);

    let syncedCount = 0;
    for (const po of unsyncedPaidPOs) {
      try {
        const result = await syncPOToQB(po.id);
        if (result.success) {
          syncedCount++;
          console.log(`Auto-synced PO ${po.po_number} to QuickBooks`);
        } else {
          console.error(`Auto-sync failed for PO ${po.po_number}: ${result.error}`);
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Auto-sync error for PO ${po.po_number}:`, error);
      }
    }

    return {
      success: syncedCount > 0,
      message: `Auto-sync completed: ${syncedCount}/${unsyncedPaidPOs.length} POs synced successfully`,
      data: { synced: syncedCount },
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Auto-sync failed',
    };
  }
}

/**
 * Get QB sync statistics
 */
export async function getQBSyncStats(): Promise<QBServiceResponse<any>> {
  try {
    const stats = await prisma.$transaction(async (tx) => {
      const totalPOs = await tx.po_headers.count({
        where: { deleted_at: null },
      });

      const paidPOs = await tx.po_headers.count({
        where: { status: 'Paid', deleted_at: null },
      });

      const syncedPOs = await tx.po_headers.count({
        where: { qb_sync_status: 'SUCCESS', deleted_at: null },
      });

      const failedSyncs = await tx.po_headers.count({
        where: { qb_sync_status: 'FAILED', deleted_at: null },
      });

      const pendingSyncs = await tx.po_headers.count({
        where: {
          status: 'Paid',
          OR: [
            { qb_sync_status: 'PENDING' },
            { qb_sync_status: null },
          ],
          deleted_at: null,
        },
      });

      const syncByStatus = await tx.po_headers.groupBy({
        by: ['qb_sync_status'],
        _count: { qb_sync_status: true },
        where: { deleted_at: null },
      });

      return {
        totalPOs,
        paidPOs,
        syncedPOs,
        failedSyncs,
        pendingSyncs,
        syncRate: totalPOs > 0 ? ((syncedPOs / totalPOs) * 100).toFixed(1) : '0.0',
        byStatus: syncByStatus.reduce((acc, item) => {
          acc[item.qb_sync_status || 'NULL'] = item._count.qb_sync_status;
          return acc;
        }, {} as Record<string, number>),
      };
    });

    return {
      success: true,
      data: stats,
      message: 'QB sync statistics retrieved successfully',
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sync statistics',
    };
  }
}

/**
 * Store QB vendor ID for future syncs
 */
export async function storeQBVendorId(vendorId: string, qbVendorId: string): Promise<QBServiceResponse> {
  try {
    await prisma.vendors.update({
      where: { id: vendorId },
      data: { qb_vendor_id: qbVendorId },
    });

    return {
      success: true,
      message: 'QB vendor ID stored successfully',
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store QB vendor ID',
    };
  }
}

/**
 * Check QB connection health
 */
export async function checkQBConnection(): Promise<QBServiceResponse<{ connected: boolean; details: any }>> {
  try {
    // Check for active tokens
    const activeToken = await prisma.qb_auth_tokens.findFirst({
      where: {
        is_active: true,
        token_expires_at: { gte: new Date() },
      },
    });

    if (!activeToken) {
      return {
        success: false,
        error: 'No active QuickBooks token found',
        data: { connected: false, details: null },
      };
    }

    // Try to create a simple OAuth client to validate configuration
    try {
      const oauthClient = createOAuthClient();
      return {
        success: true,
        message: 'QuickBooks connection is healthy',
        data: {
          connected: true,
          details: {
            realm_id: activeToken.realm_id,
            expires_at: activeToken.token_expires_at,
            environment: process.env.QB_ENVIRONMENT,
          },
        },
      };
    } catch (configError) {
      return {
        success: false,
        error: 'QB configuration error: ' + (configError as Error).message,
        data: { connected: false, details: null },
      };
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection check failed',
      data: { connected: false, details: null },
    };
  }
}

/**
 * Retry failed syncs service wrapper
 */
export async function retryFailedSyncsService(): Promise<QBServiceResponse<{ retried: number }>> {
  try {
    // Get count before retry
    const failedCount = await prisma.po_headers.count({
      where: {
        qb_sync_status: { in: ['FAILED', 'RETRY'] },
        deleted_at: null,
      },
    });

    if (failedCount === 0) {
      return {
        success: true,
        message: 'No failed syncs found to retry',
        data: { retried: 0 },
      };
    }

    // Perform retry
    await retryFailedSyncs();

    // Get count after retry to calculate success
    const stillFailedCount = await prisma.po_headers.count({
      where: {
        qb_sync_status: { in: ['FAILED', 'RETRY'] },
        deleted_at: null,
      },
    });

    const retriedCount = failedCount - stillFailedCount;

    return {
      success: retriedCount > 0,
      message: `Retry completed: ${retriedCount}/${failedCount} syncs resolved`,
      data: { retried: retriedCount },
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Retry operation failed',
    };
  }
}