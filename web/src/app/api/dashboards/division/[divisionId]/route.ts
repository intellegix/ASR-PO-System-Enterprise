import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { hasPermission, canViewFullPODetails } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import { cachedDashboardData, CachedDivisionKPIs } from '@/lib/cache/dashboard-cache';

// Division dashboard KPI calculations
const getDivisionKPIs = async (divisionId: string, userRole: string, userDivisionId: string | null) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Check if user can view full details for this division
  const canViewDetails = canViewFullPODetails(userRole as any, userDivisionId, divisionId);

  // Current month metrics
  const currentMonthPOs = await prisma.po_headers.findMany({
    where: {
      division_id: divisionId,
      deleted_at: null,
      created_at: {
        gte: startOfMonth,
      },
    },
    select: {
      id: true,
      total_amount: true,
      status: true,
      created_at: true,
    },
  });

  // Last month metrics for comparison
  const lastMonthPOs = await prisma.po_headers.findMany({
    where: {
      division_id: divisionId,
      deleted_at: null,
      created_at: {
        gte: lastMonth,
        lt: startOfMonth,
      },
    },
    select: {
      total_amount: true,
    },
  });

  // Year to date metrics
  const yearToDatePOs = await prisma.po_headers.findMany({
    where: {
      division_id: divisionId,
      deleted_at: null,
      created_at: {
        gte: startOfYear,
      },
    },
    select: {
      total_amount: true,
      status: true,
    },
  });

  // Pending approvals
  const pendingApprovals = await prisma.po_headers.findMany({
    where: {
      division_id: divisionId,
      status: { in: ['Draft', 'Submitted'] },
      deleted_at: null,
    },
    select: {
      id: true,
      po_number: true,
      total_amount: true,
      created_at: true,
      vendors: {
        select: { vendor_name: true },
      },
    },
    orderBy: { created_at: 'asc' },
  });

  // Calculate metrics
  const currentMonthSpend = currentMonthPOs.reduce(
    (sum, po) => sum + (po.total_amount?.toNumber() || 0),
    0
  );
  const lastMonthSpend = lastMonthPOs.reduce(
    (sum, po) => sum + (po.total_amount?.toNumber() || 0),
    0
  );
  const yearToDateSpend = yearToDatePOs.reduce(
    (sum, po) => sum + (po.total_amount?.toNumber() || 0),
    0
  );

  const monthOverMonthChange = lastMonthSpend > 0
    ? ((currentMonthSpend - lastMonthSpend) / lastMonthSpend) * 100
    : 0;

  const currentMonthCount = currentMonthPOs.length;
  const averagePOValue = currentMonthCount > 0 ? currentMonthSpend / currentMonthCount : 0;

  const pendingApprovalAmount = pendingApprovals.reduce(
    (sum, po) => sum + (po.total_amount?.toNumber() || 0),
    0
  );

  // Approval velocity - average time from creation to approval
  const approvedThisMonth = currentMonthPOs.filter(po => po.status === 'Approved');
  let averageApprovalTime = 0;

  if (approvedThisMonth.length > 0) {
    const approvalTimes = await Promise.all(
      approvedThisMonth.map(async (po) => {
        const approvalRecord = await prisma.po_approvals.findFirst({
          where: {
            po_id: po.id,
            action: 'Approved',
          },
          orderBy: { timestamp: 'desc' },
        });

        if (approvalRecord?.timestamp && po.created_at) {
          const timeDiff = approvalRecord.timestamp.getTime() - po.created_at.getTime();
          return timeDiff / (1000 * 60 * 60); // Convert to hours
        }
        return 0;
      })
    );

    averageApprovalTime = approvalTimes.reduce((sum, time) => sum + time, 0) / approvalTimes.length;
  }

  return {
    currentMonth: {
      spend: currentMonthSpend,
      count: currentMonthCount,
      averageValue: averagePOValue,
    },
    yearToDate: {
      spend: yearToDateSpend,
      count: yearToDatePOs.length,
    },
    trends: {
      monthOverMonthChange: monthOverMonthChange,
      averageApprovalTimeHours: averageApprovalTime,
    },
    pending: {
      count: pendingApprovals.length,
      totalAmount: pendingApprovalAmount,
      items: canViewDetails ? pendingApprovals.map(po => ({
        id: po.id,
        poNumber: po.po_number,
        amount: po.total_amount?.toNumber() || 0,
        vendor: po.vendors?.vendor_name,
        daysOld: po.created_at ? Math.floor((now.getTime() - po.created_at.getTime()) / (1000 * 60 * 60 * 24)) : 0,
      })) : [],
    },
    canViewDetails,
  };
};

// GET handler for division dashboard
const getHandler = async (
  request: NextRequest,
  { params }: { params: { divisionId: string } }
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { divisionId } = params;

  try {
    // Get user information
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true, division_id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has permission to view dashboards
    if (!hasPermission(user.role as any, 'report:view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify division exists
    const division = await prisma.divisions.findUnique({
      where: { id: divisionId },
      select: { id: true, division_name: true, division_code: true },
    });

    if (!division) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 });
    }

    // Get division KPIs (with caching)
    const kpis = await cachedDashboardData.getDivisionKPIs(
      divisionId,
      user.role,
      user.division_id,
      () => getDivisionKPIs(divisionId, user.role, user.division_id)
    );

    // Get top vendors for this division (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const topVendors = await prisma.po_headers.groupBy({
      by: ['vendor_id'],
      where: {
        division_id: divisionId,
        deleted_at: null,
        created_at: {
          gte: sixMonthsAgo,
        },
      },
      _sum: {
        total_amount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          total_amount: 'desc',
        },
      },
      take: 5,
    });

    // Get vendor details
    const vendorDetails = await prisma.vendors.findMany({
      where: {
        id: { in: topVendors.map(v => v.vendor_id) },
      },
      select: {
        id: true,
        vendor_name: true,
        vendor_code: true,
      },
    });

    const topVendorsWithDetails = topVendors.map(vendor => {
      const details = vendorDetails.find(v => v.id === vendor.vendor_id);
      return {
        vendorId: vendor.vendor_id,
        vendorName: details?.vendor_name || 'Unknown',
        vendorCode: details?.vendor_code || '',
        totalSpend: vendor._sum.total_amount?.toNumber() || 0,
        poCount: vendor._count.id,
      };
    });

    // Get spend trend by month (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const spendTrend = await prisma.$queryRaw<Array<{
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
      WHERE division_id = ${divisionId}
        AND deleted_at IS NULL
        AND created_at >= ${twelveMonthsAgo}
      GROUP BY TO_CHAR(created_at, 'Month'), EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY year, EXTRACT(MONTH FROM created_at)
    `;

    const dashboardData = {
      division,
      kpis,
      topVendors: topVendorsWithDetails,
      spendTrend: spendTrend.map(trend => ({
        month: trend.month.trim(),
        year: trend.year,
        totalSpend: trend.total_spend,
        poCount: trend.po_count,
      })),
      lastUpdated: new Date().toISOString(),
    };

    log.info('Division dashboard data retrieved', {
      divisionId,
      userId: session.user.id,
      userRole: user.role,
      kpiCount: Object.keys(kpis).length,
    });

    return NextResponse.json(dashboardData);

  } catch (error) {
    log.error('Failed to get division dashboard data', {
      error: error instanceof Error ? error.message : String(error),
      divisionId,
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
};

// Apply rate limiting
export const GET = withRateLimit(100, 60 * 1000)(getHandler);