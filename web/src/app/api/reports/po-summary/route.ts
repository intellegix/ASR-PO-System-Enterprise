import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { hasPermission } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';

// PO Summary by Division Report
interface POSummaryData {
  division: {
    id: string;
    name: string;
    code: string;
  };
  metrics: {
    totalPOCount: number;
    totalAmount: number;
    averagePOSize: number;
    averageProcessingTime: number; // in hours
    completionRate: number; // percentage of completed POs
  };
  statusBreakdown: Record<string, { count: number; amount: number }>;
  monthlyTrend: Array<{
    month: string;
    year: number;
    totalAmount: number;
    poCount: number;
  }>;
  topVendors: Array<{
    vendorId: string;
    vendorName: string;
    totalAmount: number;
    poCount: number;
    averagePOSize: number;
  }>;
}

const generatePOSummaryReport = async (
  startDate: Date,
  endDate: Date,
  divisionFilter?: string
) => {
  // Base WHERE clause
  const whereClause: any = {
    deleted_at: null,
    created_at: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (divisionFilter) {
    whereClause.division_id = divisionFilter;
  }

  // Get all divisions if no filter
  const divisions = divisionFilter
    ? await prisma.divisions.findMany({
        where: { id: divisionFilter },
        select: { id: true, division_name: true, division_code: true },
      })
    : await prisma.divisions.findMany({
        where: { is_active: true },
        select: { id: true, division_name: true, division_code: true },
        orderBy: { division_name: 'asc' },
      });

  const summaryData: POSummaryData[] = await Promise.all(
    divisions.map(async (division) => {
      // Get POs for this division
      const pos = await prisma.po_headers.findMany({
        where: {
          ...whereClause,
          division_id: division.id,
        },
        select: {
          id: true,
          total_amount: true,
          status: true,
          created_at: true,
          vendor_id: true,
          vendors: {
            select: { vendor_name: true },
          },
        },
      });

      // Calculate basic metrics
      const totalPOCount = pos.length;
      const totalAmount = pos.reduce((sum, po) => sum + (po.total_amount?.toNumber() || 0), 0);
      const averagePOSize = totalPOCount > 0 ? totalAmount / totalPOCount : 0;

      // Calculate completion rate (Approved, Issued, Received, Paid)
      const completedStatuses = ['Approved', 'Issued', 'Received', 'Paid'];
      const completedPOs = pos.filter(po => completedStatuses.includes(po.status));
      const completionRate = totalPOCount > 0 ? (completedPOs.length / totalPOCount) * 100 : 0;

      // Calculate average processing time for completed POs
      let averageProcessingTime = 0;
      if (completedPOs.length > 0) {
        const processingTimes = await Promise.all(
          completedPOs.map(async (po) => {
            const approvalRecord = await prisma.po_approvals.findFirst({
              where: {
                po_id: po.id,
                action: { in: ['Approved', 'Issued'] },
              },
              orderBy: { timestamp: 'desc' },
            });

            if (approvalRecord?.timestamp && po.created_at) {
              return (approvalRecord.timestamp.getTime() - po.created_at.getTime()) / (1000 * 60 * 60);
            }
            return 0;
          })
        );

        averageProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      }

      // Status breakdown
      const statusBreakdown: Record<string, { count: number; amount: number }> = {};
      pos.forEach((po) => {
        const status = po.status;
        if (!statusBreakdown[status]) {
          statusBreakdown[status] = { count: 0, amount: 0 };
        }
        statusBreakdown[status].count++;
        statusBreakdown[status].amount += po.total_amount?.toNumber() || 0;
      });

      // Monthly trend (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlyTrend = await prisma.$queryRaw<Array<{
        month: string;
        year: number;
        total_amount: number;
        po_count: number;
      }>>`
        SELECT
          TO_CHAR(created_at, 'Month') as month,
          EXTRACT(YEAR FROM created_at)::int as year,
          COALESCE(SUM(total_amount), 0)::float as total_amount,
          COUNT(*)::int as po_count
        FROM po_headers
        WHERE division_id = ${division.id}
          AND deleted_at IS NULL
          AND created_at >= ${twelveMonthsAgo}
          AND created_at <= ${endDate}
        GROUP BY TO_CHAR(created_at, 'Month'), EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
        ORDER BY year, EXTRACT(MONTH FROM created_at)
      `;

      // Top vendors for this division
      const vendorData = await prisma.po_headers.groupBy({
        by: ['vendor_id'],
        where: {
          division_id: division.id,
          deleted_at: null,
          created_at: {
            gte: startDate,
            lte: endDate,
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
        take: 10,
      });

      const vendorDetails = await prisma.vendors.findMany({
        where: {
          id: { in: vendorData.map(v => v.vendor_id) },
        },
        select: { id: true, vendor_name: true },
      });

      const topVendors = vendorData.map(vendor => {
        const details = vendorDetails.find(v => v.id === vendor.vendor_id);
        const totalAmount = vendor._sum.total_amount?.toNumber() || 0;
        const poCount = vendor._count.id;
        return {
          vendorId: vendor.vendor_id,
          vendorName: details?.vendor_name || 'Unknown Vendor',
          totalAmount,
          poCount,
          averagePOSize: poCount > 0 ? totalAmount / poCount : 0,
        };
      });

      return {
        division: {
          id: division.id,
          name: division.division_name,
          code: division.division_code,
        },
        metrics: {
          totalPOCount,
          totalAmount,
          averagePOSize,
          averageProcessingTime,
          completionRate,
        },
        statusBreakdown,
        monthlyTrend: monthlyTrend.map(trend => ({
          month: trend.month.trim(),
          year: trend.year,
          totalAmount: trend.total_amount,
          poCount: trend.po_count,
        })),
        topVendors,
      };
    })
  );

  return summaryData;
};

// GET handler for PO Summary report
const getHandler = async (request: NextRequest) => {
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

    // Check permissions
    if (!hasPermission(user.role as any, 'report:view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(new Date().getFullYear(), 0, 1); // Start of year
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date(); // Now
    const divisionId = searchParams.get('divisionId') || undefined;
    const format = searchParams.get('format') || 'json'; // json, csv, excel

    // Apply division filtering based on user permissions
    let divisionFilter = divisionId;
    if (!['MAJORITY_OWNER', 'ACCOUNTING'].includes(user.role) && user.division_id) {
      // Non-cross-division users can only see their own division
      divisionFilter = user.division_id;
    }

    // Generate report data
    const reportData = await generatePOSummaryReport(startDate, endDate, divisionFilter);

    // Calculate summary totals
    const summary = {
      totalDivisions: reportData.length,
      grandTotalAmount: reportData.reduce((sum, div) => sum + div.metrics.totalAmount, 0),
      grandTotalPOCount: reportData.reduce((sum, div) => sum + div.metrics.totalPOCount, 0),
      overallAveragePOSize: 0,
      overallCompletionRate: 0,
    };

    summary.overallAveragePOSize = summary.grandTotalPOCount > 0
      ? summary.grandTotalAmount / summary.grandTotalPOCount
      : 0;

    const weightedCompletionRate = reportData.reduce(
      (sum, div) => sum + (div.metrics.completionRate * div.metrics.totalPOCount), 0
    );
    summary.overallCompletionRate = summary.grandTotalPOCount > 0
      ? weightedCompletionRate / summary.grandTotalPOCount
      : 0;

    const response = {
      reportType: 'po-summary',
      parameters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        divisionFilter,
        userRole: user.role,
      },
      summary,
      divisions: reportData,
      generatedAt: new Date().toISOString(),
      generatedBy: {
        userId: session.user.id,
        userName: session.user.name,
        userRole: user.role,
      },
    };

    // Handle different export formats
    if (format === 'csv') {
      // Generate CSV response
      const csvHeader = [
        'Division Code',
        'Division Name',
        'Total POs',
        'Total Amount',
        'Average PO Size',
        'Completion Rate %',
        'Avg Processing Hours'
      ].join(',');

      const csvRows = reportData.map(div => [
        div.division.code,
        `"${div.division.name}"`,
        div.metrics.totalPOCount,
        div.metrics.totalAmount.toFixed(2),
        div.metrics.averagePOSize.toFixed(2),
        div.metrics.completionRate.toFixed(1),
        div.metrics.averageProcessingTime.toFixed(1)
      ].join(',')).join('\n');

      const csvContent = `${csvHeader}\n${csvRows}`;

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=po-summary-report.csv',
        },
      });
    }

    log.info('PO Summary report generated', {
      userId: session.user.id,
      userRole: user.role,
      divisionsIncluded: reportData.length,
      dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      totalPOs: summary.grandTotalPOCount,
    });

    return NextResponse.json(response);

  } catch (error) {
    log.error('Failed to generate PO Summary report', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
};

// Apply rate limiting
export const GET = withRateLimit(30, 60 * 1000)(getHandler);