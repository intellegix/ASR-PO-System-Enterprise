import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { hasPermission, isAdmin, type UserRole } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

// Approval Bottleneck Report
interface ApproverAnalysis {
  approver: {
    id: string;
    name: string;
    email: string;
    role: string;
    divisionId?: string;
    divisionName?: string;
  };
  metrics: {
    totalApprovalsHandled: number;
    approvedCount: number;
    rejectedCount: number;
    averageApprovalTimeHours: number;
    approvalVelocity: number; // approvals per day
    currentPendingCount: number;
    oldestPendingDays: number;
  };
  performance: {
    throughputScore: number; // 0-100 based on velocity and timeliness
    consistencyScore: number; // 0-100 based on approval time variance
    responsivenesScore: number; // 0-100 based on pending queue management
    overallScore: number;
    performanceLevel: 'excellent' | 'good' | 'fair' | 'poor';
  };
  bottlenecks: {
    hasBottleneck: boolean;
    bottleneckReasons: string[];
    avgTimeVsPeers: number; // percentage difference from division average
    highValuePendingCount: number; // pending POs >$10k
  };
  workloadTrends: Array<{
    date: string;
    approvalsHandled: number;
    avgTimeHours: number;
    pendingAtEndOfDay: number;
  }>;
}

interface DivisionApprovalAnalysis {
  division: {
    id: string;
    name: string;
    code: string;
  };
  workflow: {
    totalPOsSubmitted: number;
    totalPOsApproved: number;
    totalPOsRejected: number;
    approvalRate: number; // percentage
    avgSubmissionToApprovalTime: number; // hours
    workflowEfficiency: number; // 0-100 score
  };
  bottlenecks: {
    currentlyPending: number;
    pendingOver24Hours: number;
    pendingOver72Hours: number;
    highValuePending: number; // >$10k
    avgPendingDays: number;
    bottleneckLevel: 'none' | 'minor' | 'moderate' | 'severe';
  };
  approvers: ApproverAnalysis[];
  monthlyTrend: Array<{
    month: string;
    year: number;
    submitted: number;
    approved: number;
    rejected: number;
    avgApprovalTime: number;
  }>;
}

interface PendingPOAnalysis {
  po: {
    id: string;
    poNumber: string;
    totalAmount: number;
    vendorName: string;
    divisionName: string;
    projectName?: string;
  };
  timeline: {
    submittedAt: Date;
    daysPending: number;
    hoursPending: number;
    requiredByDate?: Date;
    isOverdue: boolean;
    urgencyScore: number; // 0-100
  };
  approval: {
    currentApprover?: string;
    approvalLevel: string;
    lastActionBy?: string;
    lastActionAt?: Date;
    isStuck: boolean; // no action >72 hours
    bottleneckReason?: string;
  };
}

interface ApprovalBottleneckData {
  summary: {
    totalPendingPOs: number;
    pendingOver24Hours: number;
    pendingOver72Hours: number;
    averagePendingDays: number;
    highValuePending: number;
    totalPendingValue: number;
    overallWorkflowEfficiency: number;
    criticalBottlenecks: number;
  };
  divisionAnalysis: DivisionApprovalAnalysis[];
  approverAnalysis: ApproverAnalysis[];
  pendingPOs: PendingPOAnalysis[];
  workflowMetrics: {
    avgSubmissionToApproval: number;
    avgApprovalToIssue: number;
    avgIssueToReceived: number;
    totalCycleTime: number;
    bottleneckStage: string;
  };
  trends: {
    approvalVolumeTrend: Array<{
      date: string;
      submitted: number;
      approved: number;
      rejected: number;
      pending: number;
    }>;
    performanceTrend: Array<{
      week: string;
      avgApprovalTime: number;
      throughput: number;
      backlog: number;
    }>;
  };
  recommendations: {
    criticalActions: string[];
    processImprovements: string[];
    resourceNeeds: string[];
  };
}

const generateApprovalBottleneckReport = async (
  startDate: Date,
  endDate: Date,
  divisionFilter?: string,
  userFilter?: string
): Promise<ApprovalBottleneckData> => {
  // Get all approval records in the date range
  const approvalWhereClause: Record<string, unknown> = {
    timestamp: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (divisionFilter) {
    approvalWhereClause.actor_division_id = divisionFilter;
  }

  if (userFilter) {
    approvalWhereClause.actor_user_id = userFilter;
  }

  const approvals = await prisma.po_approvals.findMany({
    where: approvalWhereClause,
    select: {
      id: true,
      po_id: true,
      action: true,
      actor_user_id: true,
      actor_division_id: true,
      status_before: true,
      status_after: true,
      notes: true,
      timestamp: true,
      users: {
        select: {
          first_name: true,
          last_name: true,
          email: true,
          role: true,
        },
      },
      divisions: {
        select: {
          division_name: true,
          division_code: true,
        },
      },
      po_headers: {
        select: {
          id: true,
          po_number: true,
          total_amount: true,
          status: true,
          created_at: true,
          required_by_date: true,
          project_id: true,
          vendor_id: true,
          vendors: {
            select: { vendor_name: true },
          },
          projects: {
            select: { project_name: true },
          },
        },
      },
    },
  });

  // Get currently pending POs
  const pendingPOs = await prisma.po_headers.findMany({
    where: {
      status: { in: ['Draft', 'Submitted'] },
      deleted_at: null,
    },
    select: {
      id: true,
      po_number: true,
      total_amount: true,
      status: true,
      created_at: true,
      required_by_date: true,
      division_id: true,
      vendor_id: true,
      project_id: true,
      vendors: {
        select: { vendor_name: true },
      },
      projects: {
        select: { project_name: true },
      },
      divisions: {
        select: { division_name: true },
      },
    },
  });

  // Get all users who have approval responsibilities
  const approverUsers = await prisma.users.findMany({
    where: {
      role: { in: ['DIRECTOR_OF_SYSTEMS_INTEGRATIONS', 'MAJORITY_OWNER', 'DIVISION_LEADER', 'OPERATIONS_MANAGER'] },
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      role: true,
      division_id: true,
      divisions: {
        select: {
          division_name: true,
          division_code: true,
        },
      },
    },
  });

  // Process approver analysis
  const approverAnalysis: ApproverAnalysis[] = approverUsers.map(user => {
    const userApprovals = approvals.filter(approval => approval.actor_user_id === user.id);

    const totalApprovalsHandled = userApprovals.length;
    const approvedCount = userApprovals.filter(a => a.action === 'Approved').length;
    const rejectedCount = userApprovals.filter(a => a.action === 'Rejected').length;

    // Calculate approval times (from submission to approval)
    const approvalTimes: number[] = [];
    userApprovals.forEach(approval => {
      if (approval.action === 'Approved' && approval.po_headers) {
        const submissionApproval = approvals.find(a =>
          a.po_id === approval.po_id && a.action === 'Submitted'
        );
        if (submissionApproval && approval.timestamp && submissionApproval.timestamp) {
          const timeHours = (approval.timestamp.getTime() - submissionApproval.timestamp.getTime()) / (1000 * 60 * 60);
          if (timeHours > 0 && timeHours < 720) { // Reasonable range: 0-30 days
            approvalTimes.push(timeHours);
          }
        }
      }
    });

    const averageApprovalTimeHours = approvalTimes.length > 0
      ? approvalTimes.reduce((sum, time) => sum + time, 0) / approvalTimes.length
      : 0;

    // Calculate approval velocity (approvals per day)
    const dateRange = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const approvalVelocity = dateRange > 0 ? (approvedCount + rejectedCount) / dateRange : 0;

    // Current pending count for this approver (based on division and role)
    let currentPendingCount = 0;
    let oldestPendingDays = 0;

    if (isAdmin(user.role)) {
      // Admins can approve any high-value PO
      const highValuePending = pendingPOs.filter(po => (po.total_amount?.toNumber() || 0) > 10000);
      currentPendingCount = highValuePending.length;
    } else if (user.division_id) {
      // Division-specific pending POs
      const divisionPending = pendingPOs.filter(po => po.division_id === user.division_id);
      currentPendingCount = divisionPending.length;
    }

    if (currentPendingCount > 0) {
      const validPendingPOs = pendingPOs.filter(po => po.created_at !== null);
      if (validPendingPOs.length > 0) {
        const oldestPO = validPendingPOs.reduce((oldest, po) =>
          po.created_at! < oldest.created_at! ? po : oldest
        );
        oldestPendingDays = Math.floor((new Date().getTime() - oldestPO.created_at!.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    // Performance scoring (0-100)
    const throughputScore = Math.min(100, approvalVelocity * 20); // 5 approvals/day = 100
    const timelinessScore = averageApprovalTimeHours > 0
      ? Math.max(0, 100 - (averageApprovalTimeHours / 24) * 20) // 24 hours = 80, 48 hours = 60
      : 100;
    const consistencyScore = approvalTimes.length > 1
      ? Math.max(0, 100 - (Math.sqrt(approvalTimes.reduce((sum, time) =>
          sum + Math.pow(time - averageApprovalTimeHours, 2), 0) / approvalTimes.length) / averageApprovalTimeHours) * 50)
      : 100;
    const responsivenesScore = currentPendingCount > 0
      ? Math.max(0, 100 - (oldestPendingDays * 10)) // 10 days pending = 0 score
      : 100;

    const overallScore = Math.round((throughputScore + timelinessScore + consistencyScore + responsivenesScore) / 4);
    const performanceLevel: 'excellent' | 'good' | 'fair' | 'poor' = overallScore >= 85 ? 'excellent' :
                            overallScore >= 70 ? 'good' :
                            overallScore >= 55 ? 'fair' : 'poor';

    // Bottleneck analysis
    const divisionPeers = approverUsers.filter(u =>
      u.division_id === user.division_id && u.id !== user.id
    );
    const peerAverageTimes = divisionPeers.map(peer => {
      const peerApprovals = approvals.filter(a => a.actor_user_id === peer.id && a.action === 'Approved');
      const peerTimes = peerApprovals.map(a => {
        const sub = approvals.find(s => s.po_id === a.po_id && s.action === 'Submitted');
        return sub && a.timestamp && sub.timestamp
          ? (a.timestamp.getTime() - sub.timestamp.getTime()) / (1000 * 60 * 60) : 0;
      }).filter(t => t > 0);
      return peerTimes.length > 0 ? peerTimes.reduce((s, t) => s + t, 0) / peerTimes.length : 0;
    }).filter(t => t > 0);

    const avgPeerTime = peerAverageTimes.length > 0
      ? peerAverageTimes.reduce((s, t) => s + t, 0) / peerAverageTimes.length
      : averageApprovalTimeHours;
    const avgTimeVsPeers = avgPeerTime > 0 ? ((averageApprovalTimeHours - avgPeerTime) / avgPeerTime) * 100 : 0;

    const bottleneckReasons: string[] = [];
    let hasBottleneck = false;

    if (averageApprovalTimeHours > 48) {
      hasBottleneck = true;
      bottleneckReasons.push('Slow approval time (>48 hours)');
    }
    if (currentPendingCount > 10) {
      hasBottleneck = true;
      bottleneckReasons.push('High pending queue (>10 items)');
    }
    if (oldestPendingDays > 7) {
      hasBottleneck = true;
      bottleneckReasons.push('Stale items in queue (>7 days)');
    }
    if (avgTimeVsPeers > 50) {
      hasBottleneck = true;
      bottleneckReasons.push('Significantly slower than peers');
    }

    const highValuePendingCount = pendingPOs.filter(po =>
      po.division_id === user.division_id && (po.total_amount?.toNumber() || 0) > 10000
    ).length;

    return {
      approver: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}` || 'Unknown User',
        email: user.email,
        role: user.role,
        divisionId: user.division_id || undefined,
        divisionName: user.divisions?.division_name,
      },
      metrics: {
        totalApprovalsHandled,
        approvedCount,
        rejectedCount,
        averageApprovalTimeHours,
        approvalVelocity,
        currentPendingCount,
        oldestPendingDays,
      },
      performance: {
        throughputScore,
        consistencyScore,
        responsivenesScore,
        overallScore,
        performanceLevel,
      },
      bottlenecks: {
        hasBottleneck,
        bottleneckReasons,
        avgTimeVsPeers,
        highValuePendingCount,
      },
      workloadTrends: [], // Would require daily data aggregation
    };
  }).filter(analysis => analysis.metrics.totalApprovalsHandled > 0)
    .sort((a, b) => b.performance.overallScore - a.performance.overallScore);

  // Division analysis
  const divisions = await prisma.divisions.findMany({
    where: { is_active: true },
    select: { id: true, division_name: true, division_code: true },
  });

  const divisionAnalysis: DivisionApprovalAnalysis[] = divisions.map(division => {
    const divisionApprovals = approvals.filter(a => a.actor_division_id === division.id);
    const _divisionPOs = divisionApprovals.map(a => a.po_headers).filter(Boolean);

    const submittedCount = divisionApprovals.filter(a => a.action === 'Submitted').length;
    const approvedCount = divisionApprovals.filter(a => a.action === 'Approved').length;
    const rejectedCount = divisionApprovals.filter(a => a.action === 'Rejected').length;
    const approvalRate = submittedCount > 0 ? (approvedCount / submittedCount) * 100 : 0;

    // Calculate workflow times
    const workflowTimes: number[] = [];
    divisionApprovals.filter(a => a.action === 'Approved').forEach(approval => {
      const submission = divisionApprovals.find(a =>
        a.po_id === approval.po_id && a.action === 'Submitted'
      );
      if (submission && approval.timestamp && submission.timestamp) {
        const timeHours = (approval.timestamp.getTime() - submission.timestamp.getTime()) / (1000 * 60 * 60);
        if (timeHours > 0 && timeHours < 720) {
          workflowTimes.push(timeHours);
        }
      }
    });

    const avgSubmissionToApprovalTime = workflowTimes.length > 0
      ? workflowTimes.reduce((sum, time) => sum + time, 0) / workflowTimes.length
      : 0;

    // Workflow efficiency score (based on approval rate and speed)
    const speedScore = avgSubmissionToApprovalTime > 0
      ? Math.max(0, 100 - (avgSubmissionToApprovalTime / 24) * 25)
      : 100;
    const workflowEfficiency = Math.round((approvalRate + speedScore) / 2);

    // Current bottlenecks for this division
    const divisionPendingPOs = pendingPOs.filter(po => po.division_id === division.id);
    const currentlyPending = divisionPendingPOs.length;
    const now = new Date();
    const pendingOver24Hours = divisionPendingPOs.filter(po =>
      po.created_at && (now.getTime() - po.created_at.getTime()) / (1000 * 60 * 60) > 24
    ).length;
    const pendingOver72Hours = divisionPendingPOs.filter(po =>
      po.created_at && (now.getTime() - po.created_at.getTime()) / (1000 * 60 * 60) > 72
    ).length;
    const highValuePending = divisionPendingPOs.filter(po =>
      (po.total_amount?.toNumber() || 0) > 10000
    ).length;

    const avgPendingDays = divisionPendingPOs.length > 0
      ? divisionPendingPOs.filter(po => po.created_at).reduce((sum, po) =>
          sum + ((now.getTime() - po.created_at!.getTime()) / (1000 * 60 * 60 * 24)), 0
        ) / divisionPendingPOs.filter(po => po.created_at).length
      : 0;

    const bottleneckLevel: 'none' | 'minor' | 'moderate' | 'severe' = pendingOver72Hours > 5 ? 'severe' :
                           pendingOver24Hours > 10 ? 'moderate' :
                           currentlyPending > 5 ? 'minor' : 'none';

    const divisionApprovers = approverAnalysis.filter(a => a.approver.divisionId === division.id);

    return {
      division: {
        id: division.id,
        name: division.division_name,
        code: division.division_code,
      },
      workflow: {
        totalPOsSubmitted: submittedCount,
        totalPOsApproved: approvedCount,
        totalPOsRejected: rejectedCount,
        approvalRate,
        avgSubmissionToApprovalTime,
        workflowEfficiency,
      },
      bottlenecks: {
        currentlyPending,
        pendingOver24Hours,
        pendingOver72Hours,
        highValuePending,
        avgPendingDays,
        bottleneckLevel,
      },
      approvers: divisionApprovers,
      monthlyTrend: [], // Would require monthly aggregation
    };
  }).filter(analysis => analysis.workflow.totalPOsSubmitted > 0)
    .sort((a, b) => b.bottlenecks.currentlyPending - a.bottlenecks.currentlyPending);

  // Detailed pending PO analysis
  const pendingPOAnalysis: PendingPOAnalysis[] = pendingPOs.filter(po => po.created_at !== null).map(po => {
    const now = new Date();
    const daysPending = Math.floor((now.getTime() - po.created_at!.getTime()) / (1000 * 60 * 60 * 24));
    const hoursPending = (now.getTime() - po.created_at!.getTime()) / (1000 * 60 * 60);

    const isOverdue = po.required_by_date ? now > po.required_by_date : false;
    const amount = po.total_amount?.toNumber() || 0;

    // Urgency scoring (0-100)
    let urgencyScore = 0;
    urgencyScore += Math.min(50, daysPending * 5); // Up to 50 points for age
    urgencyScore += amount > 50000 ? 30 : amount > 10000 ? 20 : amount > 5000 ? 10 : 0; // Value points
    urgencyScore += isOverdue ? 20 : 0; // Overdue bonus

    const lastAction = approvals
      .filter(a => a.po_id === po.id)
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))[0];

    const isStuck = lastAction && lastAction.timestamp
      ? (now.getTime() - lastAction.timestamp.getTime()) / (1000 * 60 * 60) > 72
      : hoursPending > 72;

    let bottleneckReason: string | undefined;
    if (isStuck) {
      bottleneckReason = 'No action for >72 hours';
    } else if (amount > 50000 && daysPending > 2) {
      bottleneckReason = 'High-value PO pending approval';
    } else if (isOverdue) {
      bottleneckReason = 'Past required-by date';
    }

    return {
      po: {
        id: po.id,
        poNumber: po.po_number,
        totalAmount: amount,
        vendorName: po.vendors?.vendor_name || 'Unknown Vendor',
        divisionName: po.divisions?.division_name || 'Unknown Division',
        projectName: po.projects?.project_name,
      },
      timeline: {
        submittedAt: po.created_at!,
        daysPending,
        hoursPending,
        requiredByDate: po.required_by_date || undefined,
        isOverdue,
        urgencyScore: Math.min(100, urgencyScore),
      },
      approval: {
        currentApprover: lastAction?.users ? `${lastAction.users.first_name} ${lastAction.users.last_name}` : undefined,
        approvalLevel: amount > 50000 ? 'Owner Required' : 'Division Leader',
        lastActionBy: lastAction?.users ? `${lastAction.users.first_name} ${lastAction.users.last_name}` : undefined,
        lastActionAt: lastAction?.timestamp || undefined,
        isStuck,
        bottleneckReason,
      },
    };
  }).sort((a, b) => b.timeline.urgencyScore - a.timeline.urgencyScore);

  // Workflow metrics
  const approvedPOs = approvals.filter(a => a.action === 'Approved' && a.po_headers);
  const _issuedPOs = approvals.filter(a => a.action === 'Issued' && a.po_headers);
  const _receivedPOs = approvals.filter(a => a.action === 'Received' && a.po_headers);

  // Calculate stage timing
  let avgSubmissionToApproval = 0;
  const avgApprovalToIssue = 0;
  const avgIssueToReceived = 0;

  // Implementation would calculate these metrics by matching approval sequences
  // For brevity, using placeholder calculations based on available data
  if (approvedPOs.length > 0) {
    const times = approvedPOs.map(approval => {
      const submission = approvals.find(a =>
        a.po_id === approval.po_id && a.action === 'Submitted'
      );
      return submission && approval.timestamp && submission.timestamp
        ? (approval.timestamp.getTime() - submission.timestamp.getTime()) / (1000 * 60 * 60)
        : 0;
    }).filter(t => t > 0);
    avgSubmissionToApproval = times.length > 0
      ? times.reduce((s, t) => s + t, 0) / times.length : 0;
  }

  const totalCycleTime = avgSubmissionToApproval + avgApprovalToIssue + avgIssueToReceived;
  const bottleneckStage = avgSubmissionToApproval > avgApprovalToIssue && avgSubmissionToApproval > avgIssueToReceived
    ? 'Approval' : avgApprovalToIssue > avgIssueToReceived ? 'Issue' : 'Receiving';

  // Summary calculations
  const totalPendingPOs = pendingPOs.length;
  const pendingOver24Hours = pendingPOAnalysis.filter(p => p.timeline.daysPending > 1).length;
  const pendingOver72Hours = pendingPOAnalysis.filter(p => p.timeline.daysPending > 3).length;
  const averagePendingDays = pendingPOAnalysis.length > 0
    ? pendingPOAnalysis.reduce((sum, p) => sum + p.timeline.daysPending, 0) / pendingPOAnalysis.length
    : 0;
  const highValuePending = pendingPOAnalysis.filter(p => p.po.totalAmount > 10000).length;
  const totalPendingValue = pendingPOAnalysis.reduce((sum, p) => sum + p.po.totalAmount, 0);

  const overallWorkflowEfficiency = divisionAnalysis.length > 0
    ? Math.round(divisionAnalysis.reduce((sum, d) => sum + d.workflow.workflowEfficiency, 0) / divisionAnalysis.length)
    : 0;
  const criticalBottlenecks = approverAnalysis.filter(a => a.bottlenecks.hasBottleneck).length;

  // Recommendations
  const criticalActions: string[] = [];
  const processImprovements: string[] = [];
  const resourceNeeds: string[] = [];

  if (pendingOver72Hours > 0) {
    criticalActions.push(`Review ${pendingOver72Hours} POs pending >72 hours immediately`);
  }
  if (highValuePending > 0) {
    criticalActions.push(`Prioritize ${highValuePending} high-value POs for approval`);
  }
  if (criticalBottlenecks > 2) {
    resourceNeeds.push('Consider additional approval authority delegation');
  }
  if (avgSubmissionToApproval > 48) {
    processImprovements.push('Implement automated approval reminders');
  }
  if (overallWorkflowEfficiency < 70) {
    processImprovements.push('Review and optimize approval workflow');
  }

  return {
    summary: {
      totalPendingPOs,
      pendingOver24Hours,
      pendingOver72Hours,
      averagePendingDays,
      highValuePending,
      totalPendingValue,
      overallWorkflowEfficiency,
      criticalBottlenecks,
    },
    divisionAnalysis,
    approverAnalysis,
    pendingPOs: pendingPOAnalysis.slice(0, 50), // Limit for performance
    workflowMetrics: {
      avgSubmissionToApproval,
      avgApprovalToIssue,
      avgIssueToReceived,
      totalCycleTime,
      bottleneckStage,
    },
    trends: {
      approvalVolumeTrend: [], // Would require daily aggregation
      performanceTrend: [], // Would require weekly aggregation
    },
    recommendations: {
      criticalActions,
      processImprovements,
      resourceNeeds,
    },
  };
};

// GET handler for Approval Bottleneck report
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

    // Check permissions - all authenticated users can view reports
    if (!hasPermission(user.role as UserRole, 'report:view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date();
    const divisionId = searchParams.get('divisionId') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const format = searchParams.get('format') || 'json';

    // No division filtering — all users see all division data
    const divisionFilter = divisionId;

    // Generate report data
    const reportData = await generateApprovalBottleneckReport(startDate, endDate, divisionFilter, userId);

    const response = {
      reportType: 'approval-bottleneck',
      parameters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        divisionFilter,
        userFilter: userId,
        userRole: user.role,
      },
      summary: reportData.summary,
      divisionAnalysis: reportData.divisionAnalysis,
      approverAnalysis: reportData.approverAnalysis,
      pendingPOs: reportData.pendingPOs,
      workflowMetrics: reportData.workflowMetrics,
      trends: reportData.trends,
      recommendations: reportData.recommendations,
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
        'Approver Name',
        'Role',
        'Division',
        'Total Handled',
        'Approved',
        'Rejected',
        'Avg Approval Time (hrs)',
        'Current Pending',
        'Performance Score',
        'Has Bottleneck'
      ].join(',');

      const csvRows = reportData.approverAnalysis.map(approver => [
        `"${approver.approver.name}"`,
        approver.approver.role,
        approver.approver.divisionName || 'N/A',
        approver.metrics.totalApprovalsHandled,
        approver.metrics.approvedCount,
        approver.metrics.rejectedCount,
        approver.metrics.averageApprovalTimeHours.toFixed(1),
        approver.metrics.currentPendingCount,
        approver.performance.overallScore,
        approver.bottlenecks.hasBottleneck ? 'Yes' : 'No'
      ].join(',')).join('\n');

      const csvContent = `${csvHeader}\n${csvRows}`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=approval-bottleneck-report.csv',
        },
      });
    }

    log.info('Approval Bottleneck report generated', {
      userId: session.user.id,
      userRole: user.role,
      pendingPOsAnalyzed: reportData.pendingPOs.length,
      approversAnalyzed: reportData.approverAnalysis.length,
      dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      totalPendingValue: reportData.summary.totalPendingValue,
    });

    return NextResponse.json(response);

  } catch (error) {
    log.error('Failed to generate Approval Bottleneck report', {
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
export const GET = withRateLimit(15, 60 * 1000)(getHandler);