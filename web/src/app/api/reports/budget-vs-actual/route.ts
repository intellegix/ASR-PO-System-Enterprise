import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { hasPermission } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';

// Budget vs Actual Report
interface ProjectBudgetAnalysis {
  project: {
    id: string;
    code: string;
    name: string;
    status: string;
    divisionId?: string;
    divisionName?: string;
    startDate?: Date;
    endDate?: Date;
  };
  budget: {
    originalBudget: number;
    currentActual: number;
    poCommitted: number; // PO amounts that are committed but not yet received
    totalProjectedSpend: number; // actual + committed
    variance: number; // budget - projected spend
    variancePercentage: number;
    utilizationPercentage: number;
  };
  workOrders: {
    totalWorkOrders: number;
    workOrderBudgetEstimate: number;
    workOrderActual: number;
    workOrderVariance: number;
    workOrderUtilization: number;
  };
  timeline: {
    daysActive: number;
    daysRemaining: number;
    budgetBurnRate: number; // daily spend rate
    projectedCompletionSpend: number;
    isOverBudget: boolean;
    isOnTrack: boolean; // based on timeline vs budget utilization
  };
  riskFactors: {
    budgetRisk: 'low' | 'medium' | 'high';
    timelineRisk: 'low' | 'medium' | 'high';
    overallRisk: 'low' | 'medium' | 'high';
    riskReasons: string[];
  };
  monthlyTrend: Array<{
    month: string;
    year: number;
    actualSpend: number;
    cumulativeSpend: number;
    budgetUtilization: number;
  }>;
}

interface DivisionBudgetSummary {
  division: {
    id: string;
    name: string;
    code: string;
  };
  aggregate: {
    totalProjectBudgets: number;
    totalActualSpend: number;
    totalCommittedSpend: number;
    overallVariance: number;
    overallUtilization: number;
    projectCount: number;
    overBudgetProjects: number;
  };
  performance: {
    averageVariancePercentage: number;
    bestPerformingProject: string;
    worstPerformingProject: string;
    completionRate: number;
  };
}

interface BudgetSummaryData {
  summary: {
    totalProjects: number;
    totalProjectBudgets: number;
    totalActualSpend: number;
    totalCommittedSpend: number;
    overallVariance: number;
    overallUtilization: number;
    projectsOverBudget: number;
    projectsOnTrack: number;
    averageVariancePercentage: number;
    totalWorkOrderBudgets: number;
    totalWorkOrderActuals: number;
    workOrderUtilization: number;
  };
  projectAnalysis: ProjectBudgetAnalysis[];
  divisionSummary: DivisionBudgetSummary[];
  budgetTrends: Array<{
    month: string;
    year: number;
    budgetAllocated: number;
    actualSpend: number;
    commitments: number;
    utilization: number;
  }>;
  riskAnalysis: {
    highRiskProjects: ProjectBudgetAnalysis[];
    budgetOverruns: ProjectBudgetAnalysis[];
    timelineRisks: ProjectBudgetAnalysis[];
  };
  forecasting: {
    projectedYearEndSpend: number;
    projectedBudgetUtilization: number;
    recommendedActions: string[];
  };
}

const generateBudgetActualReport = async (
  startDate: Date,
  endDate: Date,
  divisionFilter?: string,
  projectFilter?: string
): Promise<BudgetSummaryData> => {
  // Get projects based on filters
  const projectWhereClause: any = {
    OR: [
      { status: 'Active' },
      { status: 'InProgress' },
      { status: 'Completed' },
    ],
    budget_total: { not: null },
  };

  if (divisionFilter) {
    projectWhereClause.primary_division_id = divisionFilter;
  }

  if (projectFilter) {
    projectWhereClause.id = projectFilter;
  }

  const projects = await prisma.projects.findMany({
    where: projectWhereClause,
    select: {
      id: true,
      project_code: true,
      project_name: true,
      status: true,
      primary_division_id: true,
      start_date: true,
      end_date: true,
      budget_total: true,
      budget_actual: true,
      divisions: {
        select: {
          division_name: true,
          division_code: true,
        },
      },
    },
  });

  // Get PO data for budget analysis
  const poData = await prisma.po_headers.findMany({
    where: {
      project_id: { in: projects.map(p => p.id) },
      deleted_at: null,
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      project_id: true,
      total_amount: true,
      status: true,
      created_at: true,
    },
  });

  // Get Work Order data for additional budget tracking
  const workOrderData = await prisma.work_orders.findMany({
    where: {
      project_id: { in: projects.map(p => p.id) },
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      project_id: true,
      budget_estimate: true,
      budget_actual: true,
      status: true,
      created_at: true,
    },
  });

  // Process each project
  const projectAnalysis: ProjectBudgetAnalysis[] = projects.map(project => {
    // Get POs for this project
    const projectPOs = poData.filter(po => po.project_id === project.id);
    const projectWorkOrders = workOrderData.filter(wo => wo.project_id === project.id);

    // Calculate financial metrics
    const originalBudget = project.budget_total?.toNumber() || 0;
    const currentActual = project.budget_actual?.toNumber() || 0;

    // Calculate committed spend (approved/issued POs not yet received)
    const poCommitted = projectPOs
      .filter(po => po.status && ['Approved', 'Issued'].includes(po.status))
      .reduce((sum, po) => sum + (po.total_amount?.toNumber() || 0), 0);

    const totalProjectedSpend = currentActual + poCommitted;
    const variance = originalBudget - totalProjectedSpend;
    const variancePercentage = originalBudget > 0 ? (variance / originalBudget) * 100 : 0;
    const utilizationPercentage = originalBudget > 0 ? (totalProjectedSpend / originalBudget) * 100 : 0;

    // Work order analysis
    const totalWorkOrders = projectWorkOrders.length;
    const workOrderBudgetEstimate = projectWorkOrders.reduce(
      (sum, wo) => sum + (wo.budget_estimate?.toNumber() || 0), 0
    );
    const workOrderActual = projectWorkOrders.reduce(
      (sum, wo) => sum + (wo.budget_actual?.toNumber() || 0), 0
    );
    const workOrderVariance = workOrderBudgetEstimate - workOrderActual;
    const workOrderUtilization = workOrderBudgetEstimate > 0
      ? (workOrderActual / workOrderBudgetEstimate) * 100 : 0;

    // Timeline analysis
    const now = new Date();
    const startDate = project.start_date || new Date();
    const endDate = project.end_date;
    const daysActive = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = endDate
      ? Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const budgetBurnRate = daysActive > 0 ? currentActual / daysActive : 0;
    const projectedCompletionSpend = daysRemaining > 0
      ? totalProjectedSpend + (budgetBurnRate * daysRemaining)
      : totalProjectedSpend;

    const isOverBudget = utilizationPercentage > 100;
    const timelineProgressPercentage = endDate && daysActive > 0
      ? (daysActive / ((daysActive + daysRemaining) || 1)) * 100 : 0;
    const isOnTrack = Math.abs(utilizationPercentage - timelineProgressPercentage) < 20;

    // Risk assessment
    const riskReasons: string[] = [];
    let budgetRisk: 'low' | 'medium' | 'high' = 'low';
    let timelineRisk: 'low' | 'medium' | 'high' = 'low';

    if (utilizationPercentage > 110) {
      budgetRisk = 'high';
      riskReasons.push('Significantly over budget');
    } else if (utilizationPercentage > 95) {
      budgetRisk = 'medium';
      riskReasons.push('Approaching budget limit');
    }

    if (!isOnTrack && utilizationPercentage > timelineProgressPercentage + 30) {
      timelineRisk = 'high';
      riskReasons.push('Spending ahead of timeline');
    } else if (!isOnTrack) {
      timelineRisk = 'medium';
      riskReasons.push('Timeline and budget misaligned');
    }

    if (projectedCompletionSpend > originalBudget * 1.2) {
      budgetRisk = 'high';
      riskReasons.push('Projected overrun exceeds 20%');
    }

    const overallRisk: 'low' | 'medium' | 'high' = (budgetRisk === 'high' || timelineRisk === 'high') ? 'high' :
                       (budgetRisk === 'medium' || timelineRisk === 'medium') ? 'medium' : 'low';

    // Monthly trend will be calculated separately for performance
    return {
      project: {
        id: project.id,
        code: project.project_code,
        name: project.project_name,
        status: project.status || 'Active',
        divisionId: project.primary_division_id || undefined,
        divisionName: project.divisions?.division_name,
        startDate: project.start_date || undefined,
        endDate: project.end_date || undefined,
      },
      budget: {
        originalBudget,
        currentActual,
        poCommitted,
        totalProjectedSpend,
        variance,
        variancePercentage,
        utilizationPercentage,
      },
      workOrders: {
        totalWorkOrders,
        workOrderBudgetEstimate,
        workOrderActual,
        workOrderVariance,
        workOrderUtilization,
      },
      timeline: {
        daysActive,
        daysRemaining,
        budgetBurnRate,
        projectedCompletionSpend,
        isOverBudget,
        isOnTrack,
      },
      riskFactors: {
        budgetRisk,
        timelineRisk,
        overallRisk,
        riskReasons,
      },
      monthlyTrend: [], // Will be populated separately
    };
  }).sort((a, b) => b.budget.originalBudget - a.budget.originalBudget);

  // Calculate monthly trends using raw SQL for performance
  const monthlyTrendData = await prisma.$queryRaw<Array<{
    project_id: string;
    month: string;
    year: number;
    actual_spend: number;
    cumulative_spend: number;
  }>>`
    SELECT
      project_id,
      TO_CHAR(created_at, 'Month') as month,
      EXTRACT(YEAR FROM created_at)::int as year,
      COALESCE(SUM(total_amount), 0)::float as actual_spend,
      COALESCE(SUM(SUM(total_amount)) OVER (PARTITION BY project_id ORDER BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)), 0)::float as cumulative_spend
    FROM po_headers
    WHERE project_id = ANY(${projects.map(p => p.id)})
      AND deleted_at IS NULL
      AND created_at >= ${startDate}
      AND created_at <= ${endDate}
    GROUP BY project_id, TO_CHAR(created_at, 'Month'), EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
    ORDER BY project_id, year, EXTRACT(MONTH FROM created_at)
  `;

  // Add monthly trends to each project
  projectAnalysis.forEach(project => {
    const originalBudget = project.budget.originalBudget;
    const projectTrends = monthlyTrendData
      .filter(trend => trend.project_id === project.project.id)
      .map(trend => ({
        month: trend.month.trim(),
        year: trend.year,
        actualSpend: trend.actual_spend,
        cumulativeSpend: trend.cumulative_spend,
        budgetUtilization: originalBudget > 0 ? (trend.cumulative_spend / originalBudget) * 100 : 0,
      }));
    project.monthlyTrend = projectTrends;
  });

  // Division summary
  const divisionGroups = new Map<string, ProjectBudgetAnalysis[]>();
  projectAnalysis.forEach(project => {
    if (project.project.divisionId) {
      if (!divisionGroups.has(project.project.divisionId)) {
        divisionGroups.set(project.project.divisionId, []);
      }
      divisionGroups.get(project.project.divisionId)!.push(project);
    }
  });

  const divisionSummary: DivisionBudgetSummary[] = Array.from(divisionGroups.entries()).map(([divisionId, projects]) => {
    const firstProject = projects[0];
    const totalProjectBudgets = projects.reduce((sum, p) => sum + p.budget.originalBudget, 0);
    const totalActualSpend = projects.reduce((sum, p) => sum + p.budget.currentActual, 0);
    const totalCommittedSpend = projects.reduce((sum, p) => sum + p.budget.poCommitted, 0);
    const overallVariance = projects.reduce((sum, p) => sum + p.budget.variance, 0);
    const overallUtilization = totalProjectBudgets > 0
      ? ((totalActualSpend + totalCommittedSpend) / totalProjectBudgets) * 100 : 0;
    const overBudgetProjects = projects.filter(p => p.budget.utilizationPercentage > 100).length;

    const variancePercentages = projects.map(p => p.budget.variancePercentage).filter(v => !isNaN(v));
    const averageVariancePercentage = variancePercentages.length > 0
      ? variancePercentages.reduce((sum, v) => sum + v, 0) / variancePercentages.length : 0;

    const completedProjects = projects.filter(p => p.project.status === 'Completed').length;
    const completionRate = projects.length > 0 ? (completedProjects / projects.length) * 100 : 0;

    const sortedByVariance = [...projects].sort((a, b) => b.budget.variancePercentage - a.budget.variancePercentage);
    const bestPerformingProject = sortedByVariance[0]?.project.name || 'N/A';
    const worstPerformingProject = sortedByVariance[sortedByVariance.length - 1]?.project.name || 'N/A';

    return {
      division: {
        id: divisionId,
        name: firstProject.project.divisionName || 'Unknown Division',
        code: projects.find(p => p.project.divisionName)?.project.divisionName?.substring(0, 2) || 'XX',
      },
      aggregate: {
        totalProjectBudgets,
        totalActualSpend,
        totalCommittedSpend,
        overallVariance,
        overallUtilization,
        projectCount: projects.length,
        overBudgetProjects,
      },
      performance: {
        averageVariancePercentage,
        bestPerformingProject,
        worstPerformingProject,
        completionRate,
      },
    };
  }).sort((a, b) => b.aggregate.totalProjectBudgets - a.aggregate.totalProjectBudgets);

  // Calculate budget trends for company-wide view
  const budgetTrends = Array.from(
    monthlyTrendData.reduce((acc, trend) => {
      const key = `${trend.month.trim()}-${trend.year}`;
      if (!acc.has(key)) {
        acc.set(key, {
          month: trend.month.trim(),
          year: trend.year,
          budgetAllocated: 0,
          actualSpend: 0,
          commitments: 0,
          utilization: 0,
        });
      }

      const monthData = acc.get(key)!;
      monthData.actualSpend += trend.actual_spend;

      return acc;
    }, new Map())
  ).map(([_, data]) => data);

  // Add budget allocated data and calculate utilization
  budgetTrends.forEach(trend => {
    const monthProjects = projectAnalysis.filter(p =>
      p.monthlyTrend.some(mt => mt.month === trend.month && mt.year === trend.year)
    );
    trend.budgetAllocated = monthProjects.reduce((sum, p) => sum + p.budget.originalBudget, 0);
    trend.commitments = monthProjects.reduce((sum, p) => sum + p.budget.poCommitted, 0);
    trend.utilization = trend.budgetAllocated > 0
      ? ((trend.actualSpend + trend.commitments) / trend.budgetAllocated) * 100 : 0;
  });

  // Risk analysis
  const highRiskProjects = projectAnalysis.filter(p => p.riskFactors.overallRisk === 'high');
  const budgetOverruns = projectAnalysis.filter(p => p.budget.utilizationPercentage > 100);
  const timelineRisks = projectAnalysis.filter(p => !p.timeline.isOnTrack);

  // Forecasting
  const currentYearProjects = projectAnalysis.filter(p =>
    p.project.startDate && p.project.startDate.getFullYear() === new Date().getFullYear()
  );
  const avgBurnRate = currentYearProjects.reduce((sum, p) => sum + p.timeline.budgetBurnRate, 0) /
                     (currentYearProjects.length || 1);
  const remainingDaysInYear = Math.max(0,
    Math.floor((new Date(new Date().getFullYear(), 11, 31).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  );

  const currentTotalSpend = projectAnalysis.reduce((sum, p) => sum + p.budget.currentActual, 0);
  const projectedYearEndSpend = currentTotalSpend + (avgBurnRate * remainingDaysInYear * currentYearProjects.length);
  const totalBudgetsThisYear = projectAnalysis.reduce((sum, p) => sum + p.budget.originalBudget, 0);
  const projectedBudgetUtilization = totalBudgetsThisYear > 0
    ? (projectedYearEndSpend / totalBudgetsThisYear) * 100 : 0;

  const recommendedActions: string[] = [];
  if (highRiskProjects.length > 0) {
    recommendedActions.push(`Review ${highRiskProjects.length} high-risk projects for budget reallocation`);
  }
  if (projectedBudgetUtilization > 110) {
    recommendedActions.push('Consider budget increase or project scope reduction');
  }
  if (budgetOverruns.length > projectAnalysis.length * 0.2) {
    recommendedActions.push('Implement enhanced budget monitoring and approval controls');
  }
  if (timelineRisks.length > 0) {
    recommendedActions.push('Align project timelines with budget burn rates');
  }

  // Summary calculations
  const totalProjectBudgets = projectAnalysis.reduce((sum, p) => sum + p.budget.originalBudget, 0);
  const totalActualSpend = projectAnalysis.reduce((sum, p) => sum + p.budget.currentActual, 0);
  const totalCommittedSpend = projectAnalysis.reduce((sum, p) => sum + p.budget.poCommitted, 0);
  const overallVariance = projectAnalysis.reduce((sum, p) => sum + p.budget.variance, 0);
  const overallUtilization = totalProjectBudgets > 0
    ? ((totalActualSpend + totalCommittedSpend) / totalProjectBudgets) * 100 : 0;
  const projectsOverBudget = projectAnalysis.filter(p => p.budget.utilizationPercentage > 100).length;
  const projectsOnTrack = projectAnalysis.filter(p => p.timeline.isOnTrack).length;

  const validVariances = projectAnalysis.map(p => p.budget.variancePercentage).filter(v => !isNaN(v));
  const averageVariancePercentage = validVariances.length > 0
    ? validVariances.reduce((sum, v) => sum + v, 0) / validVariances.length : 0;

  const totalWorkOrderBudgets = projectAnalysis.reduce((sum, p) => sum + p.workOrders.workOrderBudgetEstimate, 0);
  const totalWorkOrderActuals = projectAnalysis.reduce((sum, p) => sum + p.workOrders.workOrderActual, 0);
  const workOrderUtilization = totalWorkOrderBudgets > 0
    ? (totalWorkOrderActuals / totalWorkOrderBudgets) * 100 : 0;

  return {
    summary: {
      totalProjects: projectAnalysis.length,
      totalProjectBudgets,
      totalActualSpend,
      totalCommittedSpend,
      overallVariance,
      overallUtilization,
      projectsOverBudget,
      projectsOnTrack,
      averageVariancePercentage,
      totalWorkOrderBudgets,
      totalWorkOrderActuals,
      workOrderUtilization,
    },
    projectAnalysis,
    divisionSummary,
    budgetTrends: budgetTrends.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    }),
    riskAnalysis: {
      highRiskProjects,
      budgetOverruns,
      timelineRisks,
    },
    forecasting: {
      projectedYearEndSpend,
      projectedBudgetUtilization,
      recommendedActions,
    },
  };
};

// GET handler for Budget vs Actual report
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
    const projectId = searchParams.get('projectId') || undefined;
    const format = searchParams.get('format') || 'json';

    // Apply division filtering based on user permissions
    let divisionFilter = divisionId;
    if (!['MAJORITY_OWNER', 'ACCOUNTING'].includes(user.role) && user.division_id) {
      // Non-cross-division users can only see their own division
      divisionFilter = user.division_id;
    }

    // Generate report data
    const reportData = await generateBudgetActualReport(startDate, endDate, divisionFilter, projectId);

    const response = {
      reportType: 'budget-vs-actual',
      parameters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        divisionFilter,
        projectFilter: projectId,
        userRole: user.role,
      },
      summary: reportData.summary,
      projectAnalysis: reportData.projectAnalysis,
      divisionSummary: reportData.divisionSummary,
      budgetTrends: reportData.budgetTrends,
      riskAnalysis: reportData.riskAnalysis,
      forecasting: reportData.forecasting,
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
        'Project Code',
        'Project Name',
        'Division',
        'Original Budget',
        'Current Actual',
        'Committed',
        'Total Projected',
        'Variance',
        'Variance %',
        'Utilization %',
        'Risk Level',
        'Status'
      ].join(',');

      const csvRows = reportData.projectAnalysis.map(project => [
        project.project.code,
        `"${project.project.name}"`,
        project.project.divisionName || 'Unknown',
        project.budget.originalBudget.toFixed(2),
        project.budget.currentActual.toFixed(2),
        project.budget.poCommitted.toFixed(2),
        project.budget.totalProjectedSpend.toFixed(2),
        project.budget.variance.toFixed(2),
        project.budget.variancePercentage.toFixed(1),
        project.budget.utilizationPercentage.toFixed(1),
        project.riskFactors.overallRisk,
        project.project.status
      ].join(',')).join('\n');

      const csvContent = `${csvHeader}\n${csvRows}`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=budget-vs-actual-report.csv',
        },
      });
    }

    log.info('Budget vs Actual report generated', {
      userId: session.user.id,
      userRole: user.role,
      projectsAnalyzed: reportData.projectAnalysis.length,
      dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      totalProjectBudgets: reportData.summary.totalProjectBudgets,
      overallUtilization: reportData.summary.overallUtilization,
    });

    return NextResponse.json(response);

  } catch (error) {
    log.error('Failed to generate Budget vs Actual report', {
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