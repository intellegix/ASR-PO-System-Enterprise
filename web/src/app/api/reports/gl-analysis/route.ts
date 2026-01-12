import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { hasPermission } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import { ReportExportService } from '@/lib/reports/export-service';

// GL Analysis Report
interface GLAnalysisData {
  glAccount: {
    number: string;
    name: string;
    category: string;
  };
  metrics: {
    totalAmount: number;
    totalLineItems: number;
    averageLineItemValue: number;
    taxableAmount: number;
    nonTaxableAmount: number;
    taxablePercentage: number;
  };
  categoryBreakdown: {
    totalCOGS: number;
    totalOpEx: number;
    totalOther: number;
    totalCreditCard: number;
  };
  monthlyTrend: Array<{
    month: string;
    year: number;
    totalAmount: number;
    lineItemCount: number;
    cogsCOGSAmount: number;
    opexAmount: number;
  }>;
  divisionBreakdown: Array<{
    divisionId: string;
    divisionName: string;
    divisionCode: string;
    amount: number;
    lineItemCount: number;
    percentage: number;
  }>;
  topProjects: Array<{
    projectId: string;
    projectName: string;
    projectCode: string;
    amount: number;
    lineItemCount: number;
  }>;
}

interface GLSummaryData {
  summary: {
    totalAnalyzed: number;
    totalGLAccounts: number;
    totalCOGSSpend: number;
    totalOpExSpend: number;
    totalOtherSpend: number;
    totalCreditCardSpend: number;
    overallTaxablePercentage: number;
    averageGLAccountUtilization: number;
  };
  accountAnalysis: GLAnalysisData[];
  categoryTrends: Array<{
    month: string;
    year: number;
    cogs: number;
    opex: number;
    other: number;
    creditCard: number;
  }>;
  topGLAccounts: Array<{
    glAccountNumber: string;
    glAccountName: string;
    category: string;
    totalAmount: number;
    utilization: number;
  }>;
}

const generateGLAnalysisReport = async (
  startDate: Date,
  endDate: Date,
  divisionFilter?: string,
  glAccountFilter?: string
): Promise<GLSummaryData> => {
  // Build WHERE clause for line items
  const whereClause: any = {
    po_headers: {
      deleted_at: null,
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    },
  };

  if (divisionFilter) {
    whereClause.po_headers.division_id = divisionFilter;
  }

  if (glAccountFilter) {
    whereClause.gl_account_number = glAccountFilter;
  }

  // Get all line items in the date range
  const lineItems = await prisma.po_line_items.findMany({
    where: whereClause,
    select: {
      id: true,
      unit_price: true,
      quantity: true,
      line_subtotal: true,
      gl_account_number: true,
      gl_account_name: true,
      is_taxable: true,
      po_headers: {
        select: {
          id: true,
          division_id: true,
          project_id: true,
          divisions: {
            select: {
              division_name: true,
              division_code: true,
            },
          },
          projects: {
            select: {
              project_name: true,
              project_code: true,
            },
          },
        },
      },
    },
  });

  // Get GL account mappings for category information
  const glMappings = await prisma.gl_account_mappings.findMany({
    select: {
      gl_account_number: true,
      gl_account_name: true,
      gl_account_category: true,
    },
  });

  const glMappingLookup = new Map(
    glMappings.map(gl => [gl.gl_account_number, gl])
  );

  // Group line items by GL account
  const glAccountGroups = new Map<string, {
    glAccountNumber: string;
    glAccountName: string;
    category: string;
    lineItems: typeof lineItems;
  }>();

  lineItems.forEach(lineItem => {
    const glNumber = lineItem.gl_account_number || 'Unknown';
    const glMapping = glMappingLookup.get(glNumber);
    const glName = lineItem.gl_account_name || glMapping?.gl_account_name || 'Unknown Account';
    const category = glMapping?.gl_account_category || 'Other';

    if (!glAccountGroups.has(glNumber)) {
      glAccountGroups.set(glNumber, {
        glAccountNumber: glNumber,
        glAccountName: glName,
        category,
        lineItems: [],
      });
    }

    glAccountGroups.get(glNumber)!.lineItems.push(lineItem);
  });

  // Process each GL account
  const accountAnalysis: GLAnalysisData[] = Array.from(glAccountGroups.values()).map(glGroup => {
    const lineItems = glGroup.lineItems;

    // Calculate totals
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.line_subtotal?.toNumber() || 0), 0);
    const totalLineItems = lineItems.length;
    const averageLineItemValue = totalLineItems > 0 ? totalAmount / totalLineItems : 0;

    // Tax analysis
    const taxableAmount = lineItems
      .filter(item => item.is_taxable)
      .reduce((sum, item) => sum + (item.line_subtotal?.toNumber() || 0), 0);
    const nonTaxableAmount = totalAmount - taxableAmount;
    const taxablePercentage = totalAmount > 0 ? (taxableAmount / totalAmount) * 100 : 0;

    // Division breakdown
    const divisionSpending = new Map<string, {
      divisionId: string;
      divisionName: string;
      divisionCode: string;
      amount: number;
      lineItemCount: number;
    }>();

    lineItems.forEach(item => {
      const divId = item.po_headers.division_id;
      const amount = item.line_subtotal?.toNumber() || 0;

      if (!divisionSpending.has(divId)) {
        divisionSpending.set(divId, {
          divisionId: divId,
          divisionName: item.po_headers.divisions?.division_name || 'Unknown',
          divisionCode: item.po_headers.divisions?.division_code || 'XX',
          amount: 0,
          lineItemCount: 0,
        });
      }

      const divData = divisionSpending.get(divId)!;
      divData.amount += amount;
      divData.lineItemCount += 1;
    });

    const divisionBreakdown = Array.from(divisionSpending.values()).map(div => ({
      ...div,
      percentage: totalAmount > 0 ? (div.amount / totalAmount) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount);

    // Project breakdown (top 10)
    const projectSpending = new Map<string, {
      projectId: string;
      projectName: string;
      projectCode: string;
      amount: number;
      lineItemCount: number;
    }>();

    lineItems.forEach(item => {
      const projId = item.po_headers.project_id;
      if (!projId) return;

      const amount = item.line_subtotal?.toNumber() || 0;

      if (!projectSpending.has(projId)) {
        projectSpending.set(projId, {
          projectId: projId,
          projectName: item.po_headers.projects?.project_name || 'Unknown Project',
          projectCode: item.po_headers.projects?.project_code || 'UNK',
          amount: 0,
          lineItemCount: 0,
        });
      }

      const projData = projectSpending.get(projId)!;
      projData.amount += amount;
      projData.lineItemCount += 1;
    });

    const topProjects = Array.from(projectSpending.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return {
      glAccount: {
        number: glGroup.glAccountNumber,
        name: glGroup.glAccountName,
        category: glGroup.category,
      },
      metrics: {
        totalAmount,
        totalLineItems,
        averageLineItemValue,
        taxableAmount,
        nonTaxableAmount,
        taxablePercentage,
      },
      categoryBreakdown: {
        totalCOGS: glGroup.category === 'COGS' ? totalAmount : 0,
        totalOpEx: glGroup.category === 'OpEx' ? totalAmount : 0,
        totalOther: glGroup.category === 'Other' ? totalAmount : 0,
        totalCreditCard: glGroup.category === 'CreditCard' ? totalAmount : 0,
      },
      monthlyTrend: [], // Will be calculated separately for performance
      divisionBreakdown,
      topProjects,
    };
  }).sort((a, b) => b.metrics.totalAmount - a.metrics.totalAmount);

  // Calculate monthly trends using raw SQL for performance
  const monthlyTrendData = await prisma.$queryRaw<Array<{
    month: string;
    year: number;
    gl_account_number: string;
    gl_category: string;
    line_subtotal: number;
    line_count: number;
  }>>`
    SELECT
      TO_CHAR(h.created_at, 'Month') as month,
      EXTRACT(YEAR FROM h.created_at)::int as year,
      COALESCE(l.gl_account_number, 'Unknown') as gl_account_number,
      COALESCE(g.gl_account_category::text, 'Other') as gl_category,
      COALESCE(SUM(l.line_subtotal), 0)::float as line_subtotal,
      COUNT(l.id)::int as line_count
    FROM po_line_items l
    JOIN po_headers h ON h.id = l.po_id
    LEFT JOIN gl_account_mappings g ON g.gl_account_number = l.gl_account_number
    WHERE h.deleted_at IS NULL
      AND h.created_at >= ${startDate}
      AND h.created_at <= ${endDate}
      ${divisionFilter ? Prisma.sql`AND h.division_id = ${divisionFilter}` : Prisma.empty}
      ${glAccountFilter ? Prisma.sql`AND l.gl_account_number = ${glAccountFilter}` : Prisma.empty}
    GROUP BY TO_CHAR(h.created_at, 'Month'), EXTRACT(YEAR FROM h.created_at), EXTRACT(MONTH FROM h.created_at),
             l.gl_account_number, g.gl_account_category
    ORDER BY year, EXTRACT(MONTH FROM h.created_at), line_subtotal DESC
  `;

  // Process monthly trends by GL account
  const monthlyTrendsByGL = new Map<string, Array<{
    month: string;
    year: number;
    totalAmount: number;
    lineItemCount: number;
    cogsCOGSAmount: number;
    opexAmount: number;
  }>>();

  monthlyTrendData.forEach(trend => {
    const glNumber = trend.gl_account_number;
    if (!monthlyTrendsByGL.has(glNumber)) {
      monthlyTrendsByGL.set(glNumber, []);
    }

    const monthKey = `${trend.month.trim()}-${trend.year}`;
    const glTrends = monthlyTrendsByGL.get(glNumber)!;
    let monthData = glTrends.find(t => t.month === trend.month.trim() && t.year === trend.year);

    if (!monthData) {
      monthData = {
        month: trend.month.trim(),
        year: trend.year,
        totalAmount: 0,
        lineItemCount: 0,
        cogsCOGSAmount: 0,
        opexAmount: 0,
      };
      glTrends.push(monthData);
    }

    monthData.totalAmount += trend.line_subtotal;
    monthData.lineItemCount += trend.line_count;

    if (trend.gl_category === 'COGS') {
      monthData.cogsCOGSAmount += trend.line_subtotal;
    } else if (trend.gl_category === 'OpEx') {
      monthData.opexAmount += trend.line_subtotal;
    }
  });

  // Add monthly trends to each GL account analysis
  accountAnalysis.forEach(analysis => {
    const trends = monthlyTrendsByGL.get(analysis.glAccount.number) || [];
    analysis.monthlyTrend = trends.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    });
  });

  // Calculate category trends for company-wide view
  const categoryTrends = Array.from(
    monthlyTrendData.reduce((acc, trend) => {
      const key = `${trend.month.trim()}-${trend.year}`;
      if (!acc.has(key)) {
        acc.set(key, {
          month: trend.month.trim(),
          year: trend.year,
          cogs: 0,
          opex: 0,
          other: 0,
          creditCard: 0,
        });
      }

      const monthData = acc.get(key)!;
      switch (trend.gl_category) {
        case 'COGS':
          monthData.cogs += trend.line_subtotal;
          break;
        case 'OpEx':
          monthData.opex += trend.line_subtotal;
          break;
        case 'CreditCard':
          monthData.creditCard += trend.line_subtotal;
          break;
        default:
          monthData.other += trend.line_subtotal;
      }

      return acc;
    }, new Map())
  ).map(([_, data]) => data);

  // Calculate summary metrics
  const totalAnalyzed = lineItems.length;
  const totalGLAccounts = glAccountGroups.size;
  const totalCOGSSpend = accountAnalysis.reduce((sum, acc) => sum + acc.categoryBreakdown.totalCOGS, 0);
  const totalOpExSpend = accountAnalysis.reduce((sum, acc) => sum + acc.categoryBreakdown.totalOpEx, 0);
  const totalOtherSpend = accountAnalysis.reduce((sum, acc) => sum + acc.categoryBreakdown.totalOther, 0);
  const totalCreditCardSpend = accountAnalysis.reduce((sum, acc) => sum + acc.categoryBreakdown.totalCreditCard, 0);
  const totalSpend = totalCOGSSpend + totalOpExSpend + totalOtherSpend + totalCreditCardSpend;

  const totalTaxable = accountAnalysis.reduce((sum, acc) => sum + acc.metrics.taxableAmount, 0);
  const overallTaxablePercentage = totalSpend > 0 ? (totalTaxable / totalSpend) * 100 : 0;

  const averageGLAccountUtilization = accountAnalysis.length > 0
    ? accountAnalysis.reduce((sum, acc) => sum + acc.metrics.totalLineItems, 0) / accountAnalysis.length
    : 0;

  // Top GL accounts by spend
  const topGLAccounts = accountAnalysis.slice(0, 10).map(analysis => ({
    glAccountNumber: analysis.glAccount.number,
    glAccountName: analysis.glAccount.name,
    category: analysis.glAccount.category,
    totalAmount: analysis.metrics.totalAmount,
    utilization: analysis.metrics.totalLineItems,
  }));

  return {
    summary: {
      totalAnalyzed,
      totalGLAccounts,
      totalCOGSSpend,
      totalOpExSpend,
      totalOtherSpend,
      totalCreditCardSpend,
      overallTaxablePercentage,
      averageGLAccountUtilization,
    },
    accountAnalysis,
    categoryTrends: categoryTrends.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    }),
    topGLAccounts,
  };
};

// GET handler for GL Analysis report
const getHandler = async (request: NextRequest): Promise<NextResponse> => {
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
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date();
    const divisionId = searchParams.get('divisionId') || undefined;
    const glAccountNumber = searchParams.get('glAccountNumber') || undefined;
    const format = searchParams.get('format') || 'json';

    // Apply division filtering based on user permissions
    let divisionFilter = divisionId;
    if (!['MAJORITY_OWNER', 'ACCOUNTING'].includes(user.role) && user.division_id) {
      // Non-cross-division users can only see their own division
      divisionFilter = user.division_id;
    }

    // Generate report data
    const reportData = await generateGLAnalysisReport(startDate, endDate, divisionFilter, glAccountNumber);

    const response = {
      reportType: 'gl-analysis',
      parameters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        divisionFilter,
        glAccountFilter: glAccountNumber,
        userRole: user.role,
      },
      summary: reportData.summary,
      accountAnalysis: reportData.accountAnalysis,
      categoryTrends: reportData.categoryTrends,
      topGLAccounts: reportData.topGLAccounts,
      generatedAt: new Date().toISOString(),
      generatedBy: {
        userId: session.user.id,
        userName: session.user.name,
        userRole: user.role,
      },
    };

    // Handle export formats
    if (format === 'csv') {
      const csvHeader = [
        'GL Account Number',
        'GL Account Name',
        'Category',
        'Total Amount',
        'Line Items',
        'Avg Line Value',
        'Taxable Amount',
        'Non-Taxable Amount',
        'Taxable %'
      ].join(',');

      const csvRows = reportData.accountAnalysis.map(account => [
        account.glAccount.number,
        `"${account.glAccount.name}"`,
        account.glAccount.category,
        account.metrics.totalAmount.toFixed(2),
        account.metrics.totalLineItems,
        account.metrics.averageLineItemValue.toFixed(2),
        account.metrics.taxableAmount.toFixed(2),
        account.metrics.nonTaxableAmount.toFixed(2),
        account.metrics.taxablePercentage.toFixed(1)
      ].join(',')).join('\n');

      const csvContent = `${csvHeader}\n${csvRows}`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=gl-analysis-report.csv',
        },
      });
    }

    // Handle PDF export
    if (format === 'pdf') {
      try {
        const exportData = {
          totalSpend: reportData.summary.totalCOGSSpend + reportData.summary.totalOpExSpend + reportData.summary.totalOtherSpend + reportData.summary.totalCreditCardSpend,
          cogsAmount: reportData.summary.totalCOGSSpend,
          opexAmount: reportData.summary.totalOpExSpend,
          taxableAmount: reportData.accountAnalysis.reduce((sum, acc) => sum + acc.metrics.taxableAmount, 0),
          nonTaxableAmount: reportData.accountAnalysis.reduce((sum, acc) => sum + acc.metrics.nonTaxableAmount, 0),
          categories: reportData.accountAnalysis.map(account => ({
            category: account.glAccount.category,
            amount: account.metrics.totalAmount,
            percentage: (account.metrics.totalAmount / (reportData.summary.totalCOGSSpend + reportData.summary.totalOpExSpend + reportData.summary.totalOtherSpend + reportData.summary.totalCreditCardSpend)) * 100,
            accountCount: 1,
            topAccounts: [{
              accountNumber: account.glAccount.number,
              accountName: account.glAccount.name,
              amount: account.metrics.totalAmount
            }]
          })),
          divisionBreakdown: reportData.accountAnalysis.reduce((divMap, account) => {
            account.divisionBreakdown.forEach(div => {
              if (!divMap.has(div.divisionName)) {
                divMap.set(div.divisionName, {
                  divisionName: div.divisionName,
                  totalSpend: 0,
                  cogsAmount: 0,
                  opexAmount: 0,
                  topGLAccounts: []
                });
              }
              const division = divMap.get(div.divisionName)!;
              division.totalSpend += div.amount;
              if (account.glAccount.category.includes('COGS')) {
                division.cogsAmount += div.amount;
              } else {
                division.opexAmount += div.amount;
              }
            });
            return divMap;
          }, new Map()).values()
        };

        const filename = `gl-analysis-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}`;

        return await ReportExportService.exportToPDF({
          filename,
          title: 'GL Account Analysis',
          subtitle: 'Financial categorization and budget analysis',
          data: Array.from(exportData as any),
          format: 'pdf',
          reportType: 'gl-analysis'
        });
      } catch (error) {
        log.error('PDF export failed for GL Analysis report', { error, userId: session.user.id });
        return NextResponse.json({ error: 'PDF export failed' }, { status: 500 });
      }
    }

    // Handle Excel export
    if (format === 'excel') {
      try {
        const exportData = {
          totalSpend: reportData.summary.totalCOGSSpend + reportData.summary.totalOpExSpend + reportData.summary.totalOtherSpend + reportData.summary.totalCreditCardSpend,
          cogsAmount: reportData.summary.totalCOGSSpend,
          opexAmount: reportData.summary.totalOpExSpend,
          taxableAmount: reportData.accountAnalysis.reduce((sum, acc) => sum + acc.metrics.taxableAmount, 0),
          nonTaxableAmount: reportData.accountAnalysis.reduce((sum, acc) => sum + acc.metrics.nonTaxableAmount, 0),
          categories: reportData.accountAnalysis.map(account => ({
            category: account.glAccount.category,
            amount: account.metrics.totalAmount,
            percentage: (account.metrics.totalAmount / (reportData.summary.totalCOGSSpend + reportData.summary.totalOpExSpend + reportData.summary.totalOtherSpend + reportData.summary.totalCreditCardSpend)) * 100,
            accountCount: 1,
          })),
          divisionBreakdown: reportData.accountAnalysis.reduce((divMap, account) => {
            account.divisionBreakdown.forEach(div => {
              if (!divMap.has(div.divisionName)) {
                divMap.set(div.divisionName, {
                  divisionName: div.divisionName,
                  totalSpend: 0,
                  cogsAmount: 0,
                  opexAmount: 0,
                });
              }
              const division = divMap.get(div.divisionName)!;
              division.totalSpend += div.amount;
              if (account.glAccount.category.includes('COGS')) {
                division.cogsAmount += div.amount;
              } else {
                division.opexAmount += div.amount;
              }
            });
            return divMap;
          }, new Map()).values()
        };

        const filename = `gl-analysis-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}`;

        return await ReportExportService.exportToExcel({
          filename,
          title: 'GL Account Analysis',
          subtitle: 'Financial categorization and budget analysis',
          data: Array.from(exportData as any),
          format: 'excel',
          reportType: 'gl-analysis'
        });
      } catch (error) {
        log.error('Excel export failed for GL Analysis report', { error, userId: session.user.id });
        return NextResponse.json({ error: 'Excel export failed' }, { status: 500 });
      }
    }

    log.info('GL Analysis report generated', {
      userId: session.user.id,
      userRole: user.role,
      accountsAnalyzed: reportData.accountAnalysis.length,
      dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      totalSpend: reportData.summary.totalCOGSSpend + reportData.summary.totalOpExSpend + reportData.summary.totalOtherSpend + reportData.summary.totalCreditCardSpend,
    });

    return NextResponse.json(response);

  } catch (error) {
    log.error('Failed to generate GL Analysis report', {
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
export const GET = withRateLimit(20, 60 * 1000)(getHandler);