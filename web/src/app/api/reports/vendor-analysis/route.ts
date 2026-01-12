import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { hasPermission } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';

// Vendor Analysis Report
interface VendorAnalysisData {
  vendor: {
    id: string;
    name: string;
    code: string;
    type: string;
    contactInfo: {
      contactName: string | undefined;
      contactPhone: string | undefined;
      contactEmail: string | undefined;
    };
    compliance: {
      is1099Required: boolean;
      w9OnFile: boolean;
      taxId: string | undefined;
    };
  };
  financialMetrics: {
    totalSpend: number;
    totalPOCount: number;
    averagePOSize: number;
    largestPO: number;
    smallestPO: number;
    spendRank: number;
    spendShare: number; // percentage of total company spend
  };
  performance: {
    onTimeDeliveryRate: number; // percentage
    averageDeliveryDays: number;
    completionRate: number; // percentage of POs completed
    qualityScore: number; // calculated performance score (0-100)
  };
  paymentTerms: {
    defaultTerms: string;
    actualTermsUsed: Record<string, number>; // terms -> count
    averagePaymentDays: number;
  };
  spendingTrends: Array<{
    month: string;
    year: number;
    totalAmount: number;
    poCount: number;
    averagePOSize: number;
  }>;
  divisionUsage: Array<{
    divisionId: string;
    divisionName: string;
    divisionCode: string;
    totalAmount: number;
    poCount: number;
    percentage: number;
  }>;
  topProjects: Array<{
    projectId: string;
    projectName: string;
    projectCode: string;
    totalAmount: number;
    poCount: number;
  }>;
  riskFactors: {
    concentration: 'low' | 'medium' | 'high';
    compliance: 'good' | 'warning' | 'poor';
    performance: 'excellent' | 'good' | 'fair' | 'poor';
    overallRisk: 'low' | 'medium' | 'high';
  };
}

interface VendorSummaryData {
  summary: {
    totalVendors: number;
    activeVendors: number;
    totalSpend: number;
    averageSpendPerVendor: number;
    vendorConcentrationRisk: number; // percentage spent with top 5 vendors
    complianceRate: number; // percentage with W9 on file
    overallPerformanceScore: number;
  };
  vendorAnalysis: VendorAnalysisData[];
  industryBreakdown: Array<{
    vendorType: string;
    vendorCount: number;
    totalSpend: number;
    averageSpend: number;
    performanceScore: number;
  }>;
  paymentTermsAnalysis: Array<{
    terms: string;
    vendorCount: number;
    totalSpend: number;
    utilizationRate: number;
  }>;
  topPerformers: {
    bySpend: VendorAnalysisData[];
    byPerformance: VendorAnalysisData[];
    byGrowth: VendorAnalysisData[];
  };
}

const generateVendorAnalysisReport = async (
  startDate: Date,
  endDate: Date,
  divisionFilter?: string,
  vendorTypeFilter?: string,
  vendorIdFilter?: string
): Promise<VendorSummaryData> => {
  // Build WHERE clause for POs
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

  if (vendorIdFilter) {
    whereClause.vendor_id = vendorIdFilter;
  }

  // Get all vendors based on filter
  const vendorTypeWhere: any = { is_active: true };
  if (vendorTypeFilter) {
    vendorTypeWhere.vendor_type = vendorTypeFilter;
  }

  const vendors = await prisma.vendors.findMany({
    where: vendorTypeWhere,
    select: {
      id: true,
      vendor_name: true,
      vendor_code: true,
      vendor_type: true,
      contact_name: true,
      contact_phone: true,
      contact_email: true,
      payment_terms_default: true,
      is_1099_required: true,
      w9_on_file: true,
      tax_id: true,
    },
  });

  // Get all POs for these vendors in the date range
  const pos = await prisma.po_headers.findMany({
    where: {
      ...whereClause,
      vendor_id: vendorIdFilter ? vendorIdFilter : { in: vendors.map(v => v.id) },
    },
    select: {
      id: true,
      vendor_id: true,
      total_amount: true,
      status: true,
      required_by_date: true,
      created_at: true,
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
  });

  // Calculate total spend for concentration analysis
  const totalCompanySpend = pos.reduce((sum, po) => sum + (po.total_amount?.toNumber() || 0), 0);

  // Process each vendor
  const vendorAnalysisRaw = await Promise.all(
    vendors.map(async (vendor, index) => {
      // Get POs for this vendor
      const vendorPOs = pos.filter(po => po.vendor_id === vendor.id);
      const totalSpend = vendorPOs.reduce((sum, po) => sum + (po.total_amount?.toNumber() || 0), 0);
      const totalPOCount = vendorPOs.length;

      // Skip vendors with no activity
      if (totalPOCount === 0) {
        return null;
      }

      // Financial metrics
      const poAmounts = vendorPOs.map(po => po.total_amount?.toNumber() || 0);
      const averagePOSize = totalSpend / totalPOCount;
      const largestPO = Math.max(...poAmounts);
      const smallestPO = Math.min(...poAmounts);
      const spendShare = totalCompanySpend > 0 ? (totalSpend / totalCompanySpend) * 100 : 0;

      // Performance metrics
      const completedStatuses = ['Received', 'Paid'];
      const completedPOs = vendorPOs.filter(po => po.status && completedStatuses.includes(po.status));
      const completionRate = totalPOCount > 0 ? (completedPOs.length / totalPOCount) * 100 : 0;

      // On-time delivery calculation (using required_by_date vs created_at as proxy)
      const onTimeCount = vendorPOs.filter(po => {
        if (!po.required_by_date || !po.created_at) return true; // No requirement = on time
        const daysDiff = (po.required_by_date.getTime() - po.created_at.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff >= 0; // Created before or on required date
      }).length;
      const onTimeDeliveryRate = totalPOCount > 0 ? (onTimeCount / totalPOCount) * 100 : 100;

      // Average delivery days (estimated from creation to requirement)
      const deliveryTimes = vendorPOs
        .filter(po => po.required_by_date && po.created_at)
        .map(po => (po.required_by_date!.getTime() - po.created_at!.getTime()) / (1000 * 60 * 60 * 24));
      const averageDeliveryDays = deliveryTimes.length > 0
        ? deliveryTimes.reduce((sum, days) => sum + days, 0) / deliveryTimes.length
        : 0;

      // Quality score calculation (0-100)
      const qualityScore = Math.round(
        (onTimeDeliveryRate * 0.4) + // 40% on-time delivery
        (completionRate * 0.3) + // 30% completion rate
        (Math.min(100, averagePOSize / 1000) * 0.2) + // 20% order size stability
        (vendor.w9_on_file ? 10 : 0) // 10% compliance bonus
      );

      // Payment terms analysis
      const paymentTermsUsed = new Map<string, number>();
      vendorPOs.forEach(po => {
        const terms = vendor.payment_terms_default || 'Net30';
        paymentTermsUsed.set(terms, (paymentTermsUsed.get(terms) || 0) + 1);
      });

      const actualTermsUsed = Object.fromEntries(paymentTermsUsed);

      // Division usage breakdown
      const divisionSpending = new Map<string, {
        divisionId: string;
        divisionName: string;
        divisionCode: string;
        totalAmount: number;
        poCount: number;
      }>();

      vendorPOs.forEach(po => {
        const divId = po.division_id;
        const amount = po.total_amount?.toNumber() || 0;

        if (!divisionSpending.has(divId)) {
          divisionSpending.set(divId, {
            divisionId: divId,
            divisionName: po.divisions?.division_name || 'Unknown',
            divisionCode: po.divisions?.division_code || 'XX',
            totalAmount: 0,
            poCount: 0,
          });
        }

        const divData = divisionSpending.get(divId)!;
        divData.totalAmount += amount;
        divData.poCount += 1;
      });

      const divisionUsage = Array.from(divisionSpending.values()).map(div => ({
        ...div,
        percentage: totalSpend > 0 ? (div.totalAmount / totalSpend) * 100 : 0,
      })).sort((a, b) => b.totalAmount - a.totalAmount);

      // Project breakdown (top 10)
      const projectSpending = new Map<string, {
        projectId: string;
        projectName: string;
        projectCode: string;
        totalAmount: number;
        poCount: number;
      }>();

      vendorPOs.forEach(po => {
        if (!po.project_id) return;
        const projId = po.project_id;
        const amount = po.total_amount?.toNumber() || 0;

        if (!projectSpending.has(projId)) {
          projectSpending.set(projId, {
            projectId: projId,
            projectName: po.projects?.project_name || 'Unknown Project',
            projectCode: po.projects?.project_code || 'UNK',
            totalAmount: 0,
            poCount: 0,
          });
        }

        const projData = projectSpending.get(projId)!;
        projData.totalAmount += amount;
        projData.poCount += 1;
      });

      const topProjects = Array.from(projectSpending.values())
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10);

      // Risk assessment
      const concentration = spendShare > 20 ? 'high' : spendShare > 10 ? 'medium' : 'low';
      const compliance = vendor.w9_on_file && vendor.tax_id ? 'good' :
                        vendor.is_1099_required && !vendor.w9_on_file ? 'poor' : 'warning';
      const performance = qualityScore >= 85 ? 'excellent' :
                         qualityScore >= 70 ? 'good' :
                         qualityScore >= 55 ? 'fair' : 'poor';
      const overallRisk = (concentration === 'high' || compliance === 'poor' || performance === 'poor') ? 'high' :
                         (concentration === 'medium' || compliance === 'warning' || performance === 'fair') ? 'medium' : 'low';

      return {
        vendor: {
          id: vendor.id,
          name: vendor.vendor_name,
          code: vendor.vendor_code,
          type: (vendor.vendor_type as string) || 'Other',
          contactInfo: {
            contactName: vendor.contact_name || undefined,
            contactPhone: vendor.contact_phone || undefined,
            contactEmail: vendor.contact_email || undefined,
          },
          compliance: {
            is1099Required: vendor.is_1099_required || false,
            w9OnFile: vendor.w9_on_file || false,
            taxId: vendor.tax_id || undefined,
          },
        },
        financialMetrics: {
          totalSpend,
          totalPOCount,
          averagePOSize,
          largestPO,
          smallestPO,
          spendRank: 0, // Will be calculated later
          spendShare,
        },
        performance: {
          onTimeDeliveryRate,
          averageDeliveryDays,
          completionRate,
          qualityScore,
        },
        paymentTerms: {
          defaultTerms: vendor.payment_terms_default || 'Net30',
          actualTermsUsed,
          averagePaymentDays: 30, // Placeholder - would need invoice data for actual calculation
        },
        spendingTrends: [], // Will be calculated separately
        divisionUsage,
        topProjects,
        riskFactors: {
          concentration: concentration as 'low' | 'medium' | 'high',
          compliance: compliance as 'good' | 'warning' | 'poor',
          performance: performance as 'excellent' | 'good' | 'fair' | 'poor',
          overallRisk: overallRisk as 'low' | 'medium' | 'high',
        },
      };
    })
  );

  // Filter out null results and sort by spend
  const activeVendorAnalysis = (vendorAnalysisRaw
    .filter((analysis) => analysis !== null) as VendorAnalysisData[])
    .sort((a, b) => b.financialMetrics.totalSpend - a.financialMetrics.totalSpend);

  // Assign spend ranks
  activeVendorAnalysis.forEach((vendor, index) => {
    vendor.financialMetrics.spendRank = index + 1;
  });

  // Calculate spending trends using raw SQL for performance
  const spendingTrendData = await prisma.$queryRaw<Array<{
    vendor_id: string;
    month: string;
    year: number;
    total_amount: number;
    po_count: number;
  }>>`
    SELECT
      vendor_id,
      TO_CHAR(created_at, 'Month') as month,
      EXTRACT(YEAR FROM created_at)::int as year,
      COALESCE(SUM(total_amount), 0)::float as total_amount,
      COUNT(*)::int as po_count
    FROM po_headers
    WHERE deleted_at IS NULL
      AND created_at >= ${startDate}
      AND created_at <= ${endDate}
      AND vendor_id IS NOT NULL
      ${divisionFilter ? Prisma.sql`AND division_id = ${divisionFilter}` : Prisma.empty}
      ${vendorIdFilter ? Prisma.sql`AND vendor_id = ${vendorIdFilter}` : Prisma.empty}
    GROUP BY vendor_id, TO_CHAR(created_at, 'Month'), EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
    ORDER BY vendor_id, year, EXTRACT(MONTH FROM created_at)
  `;

  // Add spending trends to each vendor
  activeVendorAnalysis.forEach(vendor => {
    const vendorTrends = spendingTrendData
      .filter(trend => trend.vendor_id === vendor.vendor.id)
      .map(trend => ({
        month: trend.month.trim(),
        year: trend.year,
        totalAmount: trend.total_amount,
        poCount: trend.po_count,
        averagePOSize: trend.po_count > 0 ? trend.total_amount / trend.po_count : 0,
      }));
    vendor.spendingTrends = vendorTrends;
  });

  // Industry breakdown
  const industryBreakdown = Array.from(
    activeVendorAnalysis.reduce((acc, vendor) => {
      const type = vendor.vendor.type;
      if (!acc.has(type)) {
        acc.set(type, {
          vendors: [],
          totalSpend: 0,
        });
      }
      const typeData = acc.get(type)!;
      typeData.vendors.push(vendor);
      typeData.totalSpend += vendor.financialMetrics.totalSpend;
      return acc;
    }, new Map())
  ).map(([vendorType, data]) => ({
    vendorType,
    vendorCount: data.vendors.length,
    totalSpend: data.totalSpend,
    averageSpend: data.totalSpend / data.vendors.length,
    performanceScore: Math.round(
      data.vendors.reduce((sum: number, v: any) => sum + v.performance.qualityScore, 0) / data.vendors.length
    ),
  }));

  // Payment terms analysis
  const paymentTermsAnalysis = Array.from(
    activeVendorAnalysis.reduce((acc, vendor) => {
      const defaultTerms = vendor.paymentTerms.defaultTerms;
      if (!acc.has(defaultTerms)) {
        acc.set(defaultTerms, {
          vendors: [],
          totalSpend: 0,
        });
      }
      const termsData = acc.get(defaultTerms)!;
      termsData.vendors.push(vendor);
      termsData.totalSpend += vendor.financialMetrics.totalSpend;
      return acc;
    }, new Map())
  ).map(([terms, data]) => ({
    terms,
    vendorCount: data.vendors.length,
    totalSpend: data.totalSpend,
    utilizationRate: (data.vendors.length / activeVendorAnalysis.length) * 100,
  }));

  // Top performers
  const topPerformers = {
    bySpend: activeVendorAnalysis.slice(0, 10),
    byPerformance: [...activeVendorAnalysis]
      .sort((a, b) => b.performance.qualityScore - a.performance.qualityScore)
      .slice(0, 10),
    byGrowth: [...activeVendorAnalysis]
      .filter(v => v.spendingTrends.length >= 2)
      .sort((a, b) => {
        const aGrowth = a.spendingTrends[a.spendingTrends.length - 1]?.totalAmount || 0;
        const bGrowth = b.spendingTrends[b.spendingTrends.length - 1]?.totalAmount || 0;
        return bGrowth - aGrowth;
      })
      .slice(0, 10),
  };

  // Summary metrics
  const totalVendors = vendors.length;
  const activeVendors = activeVendorAnalysis.length;
  const totalSpend = activeVendorAnalysis.reduce((sum, v) => sum + v.financialMetrics.totalSpend, 0);
  const averageSpendPerVendor = activeVendors > 0 ? totalSpend / activeVendors : 0;
  const top5Spend = activeVendorAnalysis.slice(0, 5).reduce((sum, v) => sum + v.financialMetrics.totalSpend, 0);
  const vendorConcentrationRisk = totalSpend > 0 ? (top5Spend / totalSpend) * 100 : 0;
  const complianceRate = activeVendorAnalysis.filter(v => v.vendor.compliance.w9OnFile).length / activeVendors * 100;
  const overallPerformanceScore = Math.round(
    activeVendorAnalysis.reduce((sum, v) => sum + v.performance.qualityScore, 0) / activeVendors
  );

  return {
    summary: {
      totalVendors,
      activeVendors,
      totalSpend,
      averageSpendPerVendor,
      vendorConcentrationRisk,
      complianceRate: activeVendors > 0 ? complianceRate : 0,
      overallPerformanceScore: activeVendors > 0 ? overallPerformanceScore : 0,
    },
    vendorAnalysis: activeVendorAnalysis,
    industryBreakdown: industryBreakdown.sort((a, b) => b.totalSpend - a.totalSpend),
    paymentTermsAnalysis: paymentTermsAnalysis.sort((a, b) => b.totalSpend - a.totalSpend),
    topPerformers,
  };
};

// GET handler for Vendor Analysis report
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
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date();
    const divisionId = searchParams.get('divisionId') || undefined;
    const vendorType = searchParams.get('vendorType') || undefined;
    const vendorId = searchParams.get('vendorId') || undefined;
    const format = searchParams.get('format') || 'json';

    // Apply division filtering based on user permissions
    let divisionFilter = divisionId;
    if (!['MAJORITY_OWNER', 'ACCOUNTING'].includes(user.role) && user.division_id) {
      // Non-cross-division users can only see their own division
      divisionFilter = user.division_id;
    }

    // Generate report data
    const reportData = await generateVendorAnalysisReport(startDate, endDate, divisionFilter, vendorType, vendorId);

    const response = {
      reportType: 'vendor-analysis',
      parameters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        divisionFilter,
        vendorTypeFilter: vendorType,
        vendorIdFilter: vendorId,
        userRole: user.role,
      },
      summary: reportData.summary,
      vendorAnalysis: reportData.vendorAnalysis,
      industryBreakdown: reportData.industryBreakdown,
      paymentTermsAnalysis: reportData.paymentTermsAnalysis,
      topPerformers: reportData.topPerformers,
      generatedAt: new Date().toISOString(),
      generatedBy: {
        userId: session.user.id,
        userName: session.user.name,
        userRole: user.role,
      },
    };

    // Handle CSV export
    if (format === 'csv') {
      const csvHeader = [
        'Vendor Name',
        'Vendor Code',
        'Type',
        'Total Spend',
        'PO Count',
        'Avg PO Size',
        'Spend Rank',
        'Quality Score',
        'On-Time %',
        'Completion %',
        'Risk Level',
        'W9 On File'
      ].join(',');

      const csvRows = reportData.vendorAnalysis.map(vendor => [
        `"${vendor.vendor.name}"`,
        vendor.vendor.code,
        vendor.vendor.type,
        vendor.financialMetrics.totalSpend.toFixed(2),
        vendor.financialMetrics.totalPOCount,
        vendor.financialMetrics.averagePOSize.toFixed(2),
        vendor.financialMetrics.spendRank,
        vendor.performance.qualityScore,
        vendor.performance.onTimeDeliveryRate.toFixed(1),
        vendor.performance.completionRate.toFixed(1),
        vendor.riskFactors.overallRisk,
        vendor.vendor.compliance.w9OnFile ? 'Yes' : 'No'
      ].join(',')).join('\n');

      const csvContent = `${csvHeader}\n${csvRows}`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=vendor-analysis-report.csv',
        },
      });
    }

    log.info('Vendor Analysis report generated', {
      userId: session.user.id,
      userRole: user.role,
      vendorsAnalyzed: reportData.vendorAnalysis.length,
      dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      totalSpend: reportData.summary.totalSpend,
    });

    return NextResponse.json(response);

  } catch (error) {
    log.error('Failed to generate Vendor Analysis report', {
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