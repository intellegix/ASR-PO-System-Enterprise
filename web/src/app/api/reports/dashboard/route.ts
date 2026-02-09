import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Fetch dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const startDate = url.searchParams.get('start');
    const endDate = url.searchParams.get('end');

    // Default to last 30 days if no date range provided
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.created_at = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter.created_at = {
        gte: thirtyDaysAgo,
      };
    }

    // Get basic counts
    const [
      totalPOs,
      pendingApprovals,
      activeVendors,
      totalSpendingResult
    ] = await Promise.all([
      prisma.po_headers.count({
        where: { ...dateFilter, deleted_at: null },
      }),
      prisma.po_headers.count({
        where: {
          ...dateFilter,
          deleted_at: null,
          status: { in: ['Submitted', 'Draft'] },
        },
      }),
      prisma.vendors.count({
        where: { is_active: true },
      }),
      prisma.po_headers.aggregate({
        where: { ...dateFilter, deleted_at: null },
        _sum: { total_amount: true },
      }),
    ]);

    const totalSpending = Number(totalSpendingResult._sum.total_amount) || 0;

    // Get spending by division
    const spendingByDivisionData = await prisma.po_headers.groupBy({
      by: ['division_id'],
      where: { ...dateFilter, deleted_at: null },
      _sum: { total_amount: true },
      _count: true,
    });

    // Get division names
    const divisions = await prisma.divisions.findMany({
      where: {
        id: { in: spendingByDivisionData.map(item => item.division_id).filter(Boolean) }
      },
      select: { id: true, division_name: true },
    });

    const divisionMap = new Map(divisions.map(d => [d.id, d.division_name]));

    const spendingByDivision = spendingByDivisionData.map(item => ({
      division: item.division_id ? divisionMap.get(item.division_id) || 'Unknown' : 'Unassigned',
      amount: Number(item._sum.total_amount) || 0,
      percentage: totalSpending > 0 ? ((Number(item._sum.total_amount) || 0) / totalSpending) * 100 : 0,
    }));

    // Get recent POs
    const recentPOsData = await prisma.po_headers.findMany({
      where: { ...dateFilter, deleted_at: null },
      orderBy: { created_at: 'desc' },
      take: 10,
      include: {
        vendors: { select: { vendor_name: true } },
      },
    });

    const recentPOs = recentPOsData.map(po => ({
      id: po.id,
      poNumber: po.po_number,
      vendor: po.vendors?.vendor_name || 'Unknown',
      amount: Number(po.total_amount) || 0,
      status: po.status || 'Draft',
      requestedDate: po.created_at?.toISOString() || new Date().toISOString(),
    }));

    // Get approval trends (by month for last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const approvalTrendsData = await prisma.po_headers.findMany({
      where: {
        created_at: { gte: sixMonthsAgo },
        deleted_at: null,
      },
      select: {
        created_at: true,
        status: true,
      },
    });

    // Group by month and status
    const monthlyData: Record<string, { approved: number; rejected: number; pending: number }> = {};

    approvalTrendsData.forEach(po => {
      if (!po.created_at) return;

      const monthKey = po.created_at.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { approved: 0, rejected: 0, pending: 0 };
      }

      const status = po.status?.toLowerCase() || 'draft';
      if (status === 'approved') {
        monthlyData[monthKey].approved++;
      } else if (status === 'rejected') {
        monthlyData[monthKey].rejected++;
      } else {
        monthlyData[monthKey].pending++;
      }
    });

    const approvalTrends = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data,
    })).sort((a, b) => a.month.localeCompare(b.month));

    const dashboardStats = {
      totalPOs,
      pendingApprovals,
      totalSpending,
      activeVendors,
      spendingByDivision,
      recentPOs,
      approvalTrends,
    };

    return NextResponse.json({
      data: dashboardStats,
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}