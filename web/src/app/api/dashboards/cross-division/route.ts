import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { hasPermission, type UserRole } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import { cachedDashboardData } from '@/lib/cache/dashboard-cache';

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

// Cross-division dashboard for MAJORITY_OWNER and ACCOUNTING
const getCrossDivisionKPIs = async (_userRole: string) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Get all active divisions
  const divisions = await prisma.divisions.findMany({
    where: { is_active: true },
    select: { id: true, division_name: true, division_code: true },
    orderBy: { division_name: 'asc' },
  });

  // Get company-wide metrics
  const [currentMonthPOs, yearToDatePOs, pendingHighValuePOs] = await Promise.all([
    // Current month POs
    prisma.po_headers.findMany({
      where: {
        deleted_at: null,
        created_at: { gte: startOfMonth },
      },
      select: {
        id: true,
        total_amount: true,
        division_id: true,
        status: true,
        created_at: true,
        divisions: {
          select: { division_name: true, division_code: true },
        },
      },
    }),

    // Year to date POs
    prisma.po_headers.findMany({
      where: {
        deleted_at: null,
        created_at: { gte: startOfYear },
      },
      select: {
        total_amount: true,
        division_id: true,
        status: true,
      },
    }),

    // High-value POs pending approval ($25K+)
    prisma.po_headers.findMany({
      where: {
        status: { in: ['Draft', 'Submitted'] },
        total_amount: { gte: 25000 },
        deleted_at: null,
      },
      select: {
        id: true,
        po_number: true,
        total_amount: true,
        created_at: true,
        divisions: {
          select: { division_name: true },
        },
        vendors: {
          select: { vendor_name: true },
        },
      },
      orderBy: { total_amount: 'desc' },
      take: 10,
    }),
  ]);

  // Calculate division-specific metrics
  const divisionMetrics = divisions.map(division => {
    const divisionCurrentMonth = currentMonthPOs.filter(po => po.division_id === division.id);
    const divisionYTD = yearToDatePOs.filter(po => po.division_id === division.id);

    const currentMonthSpend = divisionCurrentMonth.reduce(
      (sum, po) => sum + (po.total_amount?.toNumber() || 0),
      0
    );
    const ytdSpend = divisionYTD.reduce(
      (sum, po) => sum + (po.total_amount?.toNumber() || 0),
      0
    );

    const pendingCount = divisionCurrentMonth.filter(po =>
      po.status && ['Draft', 'Submitted'].includes(po.status)
    ).length;

    return {
      division: {
        id: division.id,
        name: division.division_name,
        code: division.division_code,
      },
      metrics: {
        currentMonthSpend,
        currentMonthCount: divisionCurrentMonth.length,
        ytdSpend,
        ytdCount: divisionYTD.length,
        pendingApprovals: pendingCount,
        averagePOValue: divisionCurrentMonth.length > 0 ? currentMonthSpend / divisionCurrentMonth.length : 0,
      },
    };
  });

  // Overall company metrics
  const totalCurrentMonthSpend = currentMonthPOs.reduce(
    (sum, po) => sum + (po.total_amount?.toNumber() || 0),
    0
  );
  const totalYTDSpend = yearToDatePOs.reduce(
    (sum, po) => sum + (po.total_amount?.toNumber() || 0),
    0
  );

  // Approval bottlenecks - POs pending >24 hours
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const bottleneckPOs = await prisma.po_headers.count({
    where: {
      status: { in: ['Draft', 'Submitted'] },
      created_at: { lt: oneDayAgo },
      deleted_at: null,
    },
  });

  // Top performing divisions by approval velocity
  const approvalVelocityData = await Promise.all(
    divisions.map(async (division) => {
      const approvedPOs = await prisma.po_headers.findMany({
        where: {
          division_id: division.id,
          status: 'Approved',
          created_at: { gte: startOfMonth },
          deleted_at: null,
        },
        select: { id: true, created_at: true },
      });

      let avgApprovalTime = 0;
      if (approvedPOs.length > 0) {
        const approvalTimes = await Promise.all(
          approvedPOs.map(async (po) => {
            const approvalRecord = await prisma.po_approvals.findFirst({
              where: { po_id: po.id, action: 'Approved' },
              orderBy: { timestamp: 'desc' },
            });

            if (approvalRecord?.timestamp && po.created_at) {
              return (approvalRecord.timestamp.getTime() - po.created_at.getTime()) / (1000 * 60 * 60);
            }
            return 0;
          })
        );

        avgApprovalTime = approvalTimes.reduce((sum, time) => sum + time, 0) / approvalTimes.length;
      }

      return {
        divisionName: division.division_name,
        approvedCount: approvedPOs.length,
        avgApprovalTimeHours: avgApprovalTime,
      };
    })
  );

  return {
    companyWide: {
      currentMonth: {
        totalSpend: totalCurrentMonthSpend,
        totalCount: currentMonthPOs.length,
        averagePOValue: currentMonthPOs.length > 0 ? totalCurrentMonthSpend / currentMonthPOs.length : 0,
      },
      yearToDate: {
        totalSpend: totalYTDSpend,
        totalCount: yearToDatePOs.length,
      },
      alerts: {
        highValuePendingCount: pendingHighValuePOs.length,
        approvalBottlenecks: bottleneckPOs,
      },
    },
    divisionBreakdown: divisionMetrics,
    highValuePendings: pendingHighValuePOs.map(po => ({
      id: po.id,
      poNumber: po.po_number,
      amount: po.total_amount?.toNumber() || 0,
      division: po.divisions?.division_name || 'Unknown',
      vendor: po.vendors?.vendor_name || 'TBD',
      daysOld: po.created_at ? Math.floor((now.getTime() - po.created_at.getTime()) / (1000 * 60 * 60 * 24)) : 0,
    })),
    approvalVelocity: approvalVelocityData.sort((a, b) => a.avgApprovalTimeHours - b.avgApprovalTimeHours),
  };
};

// Get budget vs actual analysis (placeholder for future budget integration)
const getBudgetAnalysis = async () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // For now, return actual spend data - budget integration TBD
  const divisionSpend = await prisma.po_headers.groupBy({
    by: ['division_id'],
    where: {
      deleted_at: null,
      created_at: { gte: startOfYear },
      status: { in: ['Approved', 'Issued', 'Received', 'Paid'] }, // Only committed spend
    },
    _sum: {
      total_amount: true,
    },
  });

  const divisionDetails = await prisma.divisions.findMany({
    where: {
      id: { in: divisionSpend.map(d => d.division_id) },
    },
    select: { id: true, division_name: true },
  });

  return divisionSpend.map(spend => {
    const division = divisionDetails.find(d => d.id === spend.division_id);
    return {
      divisionId: spend.division_id,
      divisionName: division?.division_name || 'Unknown',
      actualSpend: spend._sum.total_amount?.toNumber() || 0,
      // TODO: Add budget amounts when budget system is implemented
      budgetAllocated: 0,
      variance: 0,
    };
  });
};

// GET handler for cross-division dashboard
const getHandler = async (_request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user information
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true, division_id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only MAJORITY_OWNER and ACCOUNTING can access cross-division view
    if (!['MAJORITY_OWNER', 'ACCOUNTING'].includes(user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user has permission to view reports
    if (!hasPermission(user.role as UserRole, 'report:view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const [crossDivisionKPIs, budgetAnalysis] = await Promise.all([
      cachedDashboardData.getCrossDivisionKPIs(
        user.role,
        () => getCrossDivisionKPIs(user.role)
      ),
      getBudgetAnalysis(),
    ]);

    // Get company spend trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const companySpendTrend = await prisma.$queryRaw<Array<{
      month: string;
      year: number;
      total_spend: number;
      po_count: number;
    }>>`
      SELECT
        TO_CHAR(created_at, 'Month') as month,
        EXTRACT(YEAR FROM created_at)::int as year,
        COALESCE(SUM(total_amount), 0)::float as total_spend,
        COUNT(*)::int as po_count
      FROM po_headers
      WHERE deleted_at IS NULL
        AND created_at >= ${twelveMonthsAgo}
      GROUP BY TO_CHAR(created_at, 'Month'), EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY year, EXTRACT(MONTH FROM created_at)
    `;

    const dashboardData = {
      kpis: crossDivisionKPIs,
      budgetAnalysis,
      companySpendTrend: companySpendTrend.map(trend => ({
        month: trend.month.trim(),
        year: trend.year,
        totalSpend: trend.total_spend,
        poCount: trend.po_count,
      })),
      userRole: user.role,
      lastUpdated: new Date().toISOString(),
    };

    log.info('Cross-division dashboard data retrieved', {
      userId: session.user.id,
      userRole: user.role,
      divisionsCount: crossDivisionKPIs.divisionBreakdown.length,
    });

    return NextResponse.json(dashboardData);

  } catch (error) {
    log.error('Failed to get cross-division dashboard data', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
};

// Apply rate limiting
export const GET = withRateLimit(50, 60 * 1000)(getHandler);