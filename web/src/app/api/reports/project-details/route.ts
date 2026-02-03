import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { hasPermission } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

// Project Details Report
interface ProjectDetailsData {
  project: {
    id: string;
    projectCode: string;
    projectName: string;
    status: string;
  };
  budget: {
    originalBudget: number;
    currentBudget: number;
    spentToDate: number;
    remainingBudget: number;
    budgetUtilization: number; // percentage
    projectedOverrun: number;
  };
  spending: {
    totalPOAmount: number;
    totalPOCount: number;
    averagePOSize: number;
    spendingByDivision: Array<{
      divisionId: string;
      divisionName: string;
      divisionCode: string;
      amount: number;
      poCount: number;
      percentage: number;
    }>;
  };
  workOrders: {
    totalWorkOrders: number;
    completedWorkOrders: number;
    averageCompletionTime: number; // in days
    workOrderToPORatio: number;
  };
  timeline: {
    projectStartDate?: Date | null;
    estimatedCompletion?: Date | null;
    daysActive: number;
    isOverdue: boolean;
  };
  performance: {
    onTimeDelivery: number; // percentage
    budgetVariance: number; // actual vs planned
    qualityScore: number; // placeholder for future implementation
  };
}

const generateProjectDetailsReport = async (
  startDate: Date,
  endDate: Date,
  projectFilter?: string
) => {
  // Get projects based on filter
  const projects = projectFilter
    ? await prisma.projects.findMany({
        where: { id: projectFilter },
        select: {
          id: true,
          project_code: true,
          project_name: true,
          status: true,
          start_date: true,
          end_date: true,
          budget_total: true,
        },
      })
    : await prisma.projects.findMany({
        where: { status: 'Active' },
        select: {
          id: true,
          project_code: true,
          project_name: true,
          status: true,
          start_date: true,
          end_date: true,
          budget_total: true,
        },
        orderBy: { project_name: 'asc' },
      });

  const projectDetails: ProjectDetailsData[] = await Promise.all(
    projects.map(async (project) => {
      // Get POs for this project in the date range
      const pos = await prisma.po_headers.findMany({
        where: {
          project_id: project.id,
          deleted_at: null,
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          total_amount: true,
          status: true,
          created_at: true,
          required_by_date: true,
          division_id: true,
          divisions: {
            select: {
              division_name: true,
              division_code: true,
            },
          },
        },
      });

      // Calculate spending metrics
      const totalPOAmount = pos.reduce((sum, po) => sum + (po.total_amount?.toNumber() || 0), 0);
      const totalPOCount = pos.length;
      const averagePOSize = totalPOCount > 0 ? totalPOAmount / totalPOCount : 0;

      // Calculate spending by division
      const divisionSpending = new Map<string, {
        divisionId: string;
        divisionName: string;
        divisionCode: string;
        amount: number;
        poCount: number;
      }>();

      pos.forEach((po) => {
        const divId = po.division_id;
        const amount = po.total_amount?.toNumber() || 0;

        if (!divisionSpending.has(divId)) {
          divisionSpending.set(divId, {
            divisionId: divId,
            divisionName: po.divisions?.division_name || 'Unknown',
            divisionCode: po.divisions?.division_code || 'XX',
            amount: 0,
            poCount: 0,
          });
        }

        const divData = divisionSpending.get(divId)!;
        divData.amount += amount;
        divData.poCount += 1;
      });

      const spendingByDivision = Array.from(divisionSpending.values()).map(div => ({
        ...div,
        percentage: totalPOAmount > 0 ? (div.amount / totalPOAmount) * 100 : 0,
      })).sort((a, b) => b.amount - a.amount);

      // Get work orders for this project
      const workOrders = await prisma.work_orders.findMany({
        where: {
          project_id: project.id,
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          status: true,
          created_at: true,
        },
      });

      const totalWorkOrders = workOrders.length;
      const completedWorkOrders = workOrders.filter(wo => wo.status === 'Completed').length;

      // Calculate average completion time for completed work orders
      // Note: Without completed_at field, we'll use a placeholder
      let averageCompletionTime = 0;
      if (completedWorkOrders > 0) {
        // Placeholder calculation - in a real system, this would use actual completion dates
        averageCompletionTime = 7; // Assume 7 days average completion time
      }

      const workOrderToPORatio = totalWorkOrders > 0 ? totalPOCount / totalWorkOrders : 0;

      // Calculate budget metrics
      const originalBudget = project.budget_total?.toNumber() || 0;
      const currentBudget = originalBudget; // Placeholder - would be adjusted for change orders
      const spentToDate = totalPOAmount;
      const remainingBudget = currentBudget - spentToDate;
      const budgetUtilization = currentBudget > 0 ? (spentToDate / currentBudget) * 100 : 0;
      const projectedOverrun = Math.max(0, spentToDate - currentBudget);

      // Calculate timeline metrics
      const now = new Date();
      const projectStartDate = project.start_date;
      const estimatedCompletion = project.end_date;

      let daysActive = 0;
      if (projectStartDate) {
        daysActive = Math.floor((now.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      const isOverdue = estimatedCompletion ? now > estimatedCompletion : false;

      // Calculate performance metrics
      const completedPOs = pos.filter(po => po.status && ['Received', 'Paid'].includes(po.status));
      const onTimePOs = completedPOs.filter(po => {
        if (!po.required_by_date || !po.created_at) return true; // No requirement = on time
        return po.created_at <= po.required_by_date;
      });
      const onTimeDelivery = completedPOs.length > 0 ? (onTimePOs.length / completedPOs.length) * 100 : 100;

      const budgetVariance = originalBudget > 0 ? ((spentToDate - originalBudget) / originalBudget) * 100 : 0;
      const qualityScore = 85; // Placeholder for future implementation

      return {
        project: {
          id: project.id,
          projectCode: project.project_code || 'N/A',
          projectName: project.project_name,
          status: project.status || 'Active',
        },
        budget: {
          originalBudget,
          currentBudget,
          spentToDate,
          remainingBudget,
          budgetUtilization,
          projectedOverrun,
        },
        spending: {
          totalPOAmount,
          totalPOCount,
          averagePOSize,
          spendingByDivision,
        },
        workOrders: {
          totalWorkOrders,
          completedWorkOrders,
          averageCompletionTime,
          workOrderToPORatio,
        },
        timeline: {
          projectStartDate,
          estimatedCompletion,
          daysActive,
          isOverdue,
        },
        performance: {
          onTimeDelivery,
          budgetVariance,
          qualityScore,
        },
      };
    })
  );

  return projectDetails;
};

// GET handler for Project Details report
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
    const projectId = searchParams.get('projectId') || undefined;
    const format = searchParams.get('format') || 'json';

    // Generate report data
    const reportData = await generateProjectDetailsReport(startDate, endDate, projectId);

    // Calculate summary totals
    const summary = {
      totalProjects: reportData.length,
      totalBudget: reportData.reduce((sum, proj) => sum + proj.budget.originalBudget, 0),
      totalSpent: reportData.reduce((sum, proj) => sum + proj.budget.spentToDate, 0),
      overallBudgetUtilization: 0,
      projectsOverBudget: reportData.filter(p => p.budget.budgetUtilization > 100).length,
      projectsOverdue: reportData.filter(p => p.timeline.isOverdue).length,
      averageOnTimeDelivery: 0,
    };

    summary.overallBudgetUtilization = summary.totalBudget > 0
      ? (summary.totalSpent / summary.totalBudget) * 100
      : 0;

    const projectsWithDelivery = reportData.filter(p => p.spending.totalPOCount > 0);
    summary.averageOnTimeDelivery = projectsWithDelivery.length > 0
      ? projectsWithDelivery.reduce((sum, p) => sum + p.performance.onTimeDelivery, 0) / projectsWithDelivery.length
      : 100;

    const response = {
      reportType: 'project-details',
      parameters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        projectFilter: projectId,
        userRole: user.role,
      },
      summary,
      projects: reportData,
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
        'Status',
        'Original Budget',
        'Spent to Date',
        'Budget Utilization %',
        'Days Active',
        'Total POs',
        'On Time Delivery %'
      ].join(',');

      const csvRows = reportData.map(proj => [
        proj.project.projectCode,
        `"${proj.project.projectName}"`,
        proj.project.status,
        proj.budget.originalBudget.toFixed(2),
        proj.budget.spentToDate.toFixed(2),
        proj.budget.budgetUtilization.toFixed(1),
        proj.timeline.daysActive,
        proj.spending.totalPOCount,
        proj.performance.onTimeDelivery.toFixed(1)
      ].join(',')).join('\n');

      const csvContent = `${csvHeader}\n${csvRows}`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=project-details-report.csv',
        },
      });
    }

    log.info('Project Details report generated', {
      userId: session.user.id,
      userRole: user.role,
      projectsIncluded: reportData.length,
      dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      totalSpent: summary.totalSpent,
    });

    return NextResponse.json(response);

  } catch (error) {
    log.error('Failed to generate Project Details report', {
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