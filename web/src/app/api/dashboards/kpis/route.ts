import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { hasPermission } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import { cachedDashboardData, CACHE_TTL } from '@/lib/cache/dashboard-cache';

// Quick KPIs endpoint for real-time dashboard updates
interface KPIFilter {
  divisionId?: string;
  timeframe?: 'current_month' | 'ytd' | 'last_30_days';
}

// Get lightweight KPI metrics
const getQuickKPIs = async (filter: KPIFilter, userRole: string, userDivisionId: string | null) => {
  const now = new Date();
  const { divisionId, timeframe = 'current_month' } = filter;

  // Define time ranges
  const timeRanges = {
    current_month: {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      label: 'Current Month',
    },
    ytd: {
      start: new Date(now.getFullYear(), 0, 1),
      label: 'Year to Date',
    },
    last_30_days: {
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      label: 'Last 30 Days',
    },
  };

  const timeRange = timeRanges[timeframe];

  // Build WHERE clause based on permissions and filters
  let whereClause: any = {
    deleted_at: null,
    created_at: { gte: timeRange.start },
  };

  // Add division filter if specified or if user has limited access
  if (divisionId) {
    whereClause.division_id = divisionId;
  } else if (userRole === 'DIVISION_LEADER' || userRole === 'OPERATIONS_MANAGER') {
    // These roles can only see their own division by default
    if (userDivisionId) {
      whereClause.division_id = userDivisionId;
    }
  }

  // Get PO data
  const pos = await prisma.po_headers.findMany({
    where: whereClause,
    select: {
      id: true,
      total_amount: true,
      status: true,
      created_at: true,
      division_id: true,
      divisions: {
        select: { division_name: true },
      },
    },
  });

  // Calculate basic metrics
  const totalSpend = pos.reduce((sum, po) => sum + (po.total_amount?.toNumber() || 0), 0);
  const totalCount = pos.length;
  const averagePOValue = totalCount > 0 ? totalSpend / totalCount : 0;

  // Status breakdown
  const statusBreakdown = pos.reduce((acc, po) => {
    if (po.status) {
      acc[po.status] = (acc[po.status] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Pending items
  const pendingPOs = pos.filter(po => po.status && ['Draft', 'Submitted'].includes(po.status));
  const pendingAmount = pendingPOs.reduce((sum, po) => sum + (po.total_amount?.toNumber() || 0), 0);

  // High-value alerts ($25K+)
  const highValuePending = pendingPOs.filter(po => (po.total_amount?.toNumber() || 0) >= 25000);

  // Approval bottlenecks (pending >24 hours)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const bottlenecks = pendingPOs.filter(po => po.created_at && po.created_at < oneDayAgo);

  return {
    timeframe: {
      period: timeframe,
      label: timeRange.label,
      startDate: timeRange.start.toISOString(),
      endDate: now.toISOString(),
    },
    metrics: {
      totalSpend,
      totalCount,
      averagePOValue,
      pendingCount: pendingPOs.length,
      pendingAmount,
    },
    status: statusBreakdown,
    alerts: {
      highValuePending: highValuePending.length,
      approvalBottlenecks: bottlenecks.length,
    },
    scope: {
      divisionId: divisionId || null,
      divisionName: divisionId ? pos[0]?.divisions?.division_name || null : null,
      isCompanyWide: !divisionId && ['MAJORITY_OWNER', 'ACCOUNTING'].includes(userRole),
    },
  };
};

// Get system health metrics
const getSystemHealth = async () => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalActivePOs,
    recentActivity,
    systemErrors,
    qbSyncStatus,
  ] = await Promise.all([
    // Total active POs
    prisma.po_headers.count({
      where: {
        deleted_at: null,
        status: { notIn: ['Cancelled', 'Paid'] },
      },
    }),

    // Recent activity (last 24 hours)
    prisma.po_approvals.count({
      where: {
        timestamp: { gte: oneDayAgo },
      },
    }),

    // Recent errors from logs (placeholder - would need to implement log table)
    0, // TODO: Implement error tracking

    // QB sync status (placeholder - would check last sync time)
    {
      lastSync: new Date().toISOString(),
      status: 'healthy',
      pendingSyncs: 0,
    },
  ]);

  return {
    activePOs: totalActivePOs,
    recentActivity,
    systemErrors,
    qbSyncStatus,
    uptime: '99.9%', // Placeholder
    lastUpdated: now.toISOString(),
  };
};

// GET handler with query parameters
const getHandler = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const divisionId = searchParams.get('divisionId') || undefined;
    const timeframe = (searchParams.get('timeframe') as any) || 'current_month';
    const includeHealth = searchParams.get('includeHealth') === 'true';

    // Get user information
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true, division_id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    if (!hasPermission(user.role as any, 'report:view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate timeframe
    if (!['current_month', 'ytd', 'last_30_days'].includes(timeframe)) {
      return NextResponse.json({ error: 'Invalid timeframe' }, { status: 400 });
    }

    // Get KPIs (with caching)
    const kpis = await cachedDashboardData.getQuickKPIs(
      { divisionId, timeframe, userRole: user.role, userDivisionId: user.division_id },
      () => getQuickKPIs({ divisionId, timeframe }, user.role, user.division_id)
    );

    // Add system health if requested (only for MAJORITY_OWNER)
    let systemHealth = null;
    if (includeHealth && user.role === 'MAJORITY_OWNER') {
      systemHealth = await getSystemHealth();
    }

    const response = {
      kpis,
      systemHealth,
      userContext: {
        role: user.role,
        divisionId: user.division_id,
        canViewAllDivisions: ['MAJORITY_OWNER', 'ACCOUNTING'].includes(user.role),
      },
      lastUpdated: new Date().toISOString(),
    };

    log.info('KPIs retrieved', {
      userId: session.user.id,
      userRole: user.role,
      timeframe,
      divisionId: divisionId || 'all',
      includeHealth,
    });

    return NextResponse.json(response);

  } catch (error) {
    log.error('Failed to get KPIs', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: 'Failed to fetch KPIs' },
      { status: 500 }
    );
  }
};

// Apply rate limiting (higher limit for KPIs as they're used frequently)
export const GET = withRateLimit(300, 60 * 1000)(getHandler);