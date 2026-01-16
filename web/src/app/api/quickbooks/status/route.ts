/**
 * QuickBooks Status Route
 * Provides detailed status information about QuickBooks integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { QB_CONFIG, validateQBConfig } from '@/lib/quickbooks/config';
import prisma from '@/lib/db';
// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Configuration status
    let configStatus = {
      isValid: false,
      environment: QB_CONFIG.environment,
      hasClientId: !!process.env.QB_CLIENT_ID,
      hasClientSecret: !!process.env.QB_CLIENT_SECRET,
      hasRedirectUri: !!process.env.QB_REDIRECT_URI,
      errors: [] as string[],
    };

    try {
      validateQBConfig();
      configStatus.isValid = true;
    } catch (error: any) {
      configStatus.errors.push(error.message);
    }

    // Token status
    const activeToken = await prisma.qb_auth_tokens.findFirst({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });

    const allTokens = await prisma.qb_auth_tokens.count();
    const activeTokens = await prisma.qb_auth_tokens.count({
      where: { is_active: true },
    });

    const tokenStatus = {
      hasActiveToken: !!activeToken,
      isExpired: activeToken ? activeToken.token_expires_at < new Date() : null,
      totalTokens: allTokens,
      activeTokens: activeTokens,
      currentToken: activeToken ? {
        realm_id: activeToken.realm_id,
        created_at: activeToken.created_at,
        expires_at: activeToken.token_expires_at,
        expires_in_hours: Math.round(
          (activeToken.token_expires_at.getTime() - Date.now()) / (1000 * 60 * 60)
        ),
      } : null,
    };

    // Sync status from PO headers
    const syncStats = await prisma.po_headers.groupBy({
      by: ['qb_sync_status'],
      _count: { qb_sync_status: true },
      where: { qb_sync_status: { not: null } },
    });

    const syncStatus = {
      totalPOs: await prisma.po_headers.count(),
      syncedPOs: syncStats.reduce((sum, stat) => sum + stat._count.qb_sync_status, 0),
      byStatus: syncStats.reduce((acc, stat) => {
        acc[stat.qb_sync_status!] = stat._count.qb_sync_status;
        return acc;
      }, {} as Record<string, number>),
    };

    // Overall health check
    const isHealthy = configStatus.isValid &&
                      tokenStatus.hasActiveToken &&
                      !tokenStatus.isExpired;

    const healthCheck = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks: {
        configuration: configStatus.isValid,
        authentication: tokenStatus.hasActiveToken && !tokenStatus.isExpired,
        database: true, // If we got this far, DB is working
      },
      issues: [] as string[],
    };

    if (!configStatus.isValid) {
      healthCheck.issues.push('Configuration missing or invalid');
    }
    if (!tokenStatus.hasActiveToken) {
      healthCheck.issues.push('No active QuickBooks connection');
    }
    if (tokenStatus.isExpired) {
      healthCheck.issues.push('QuickBooks token has expired');
    }

    // Capability assessment
    const capabilities = {
      canSync: isHealthy,
      canConnect: configStatus.isValid,
      canCreateBills: isHealthy,
      canRefreshTokens: tokenStatus.hasActiveToken,
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: QB_CONFIG.environment,
      health: healthCheck,
      configuration: configStatus,
      authentication: tokenStatus,
      synchronization: syncStatus,
      capabilities,
    });

  } catch (error) {
    console.error('QB status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve QuickBooks status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}