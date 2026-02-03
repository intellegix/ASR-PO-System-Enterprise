import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { hasPermission, canApprovePO } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import { cachedDashboardData } from '@/lib/cache/dashboard-cache';
// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';


// Enhanced pending approvals data with approval context
const getPendingApprovals = async (userRole: string, userDivisionId: string | null) => {
  const now = new Date();

  // Build WHERE clause based on user permissions
  let whereClause: any = {
    status: { in: ['Draft', 'Submitted'] },
    deleted_at: null,
  };

  // Filter by division if user has limited access
  if ((userRole === 'DIVISION_LEADER' || userRole === 'OPERATIONS_MANAGER') && userDivisionId) {
    whereClause.division_id = userDivisionId;
  }

  const pendingPOs = await prisma.po_headers.findMany({
    where: whereClause,
    select: {
      id: true,
      po_number: true,
      total_amount: true,
      status: true,
      created_at: true,
      required_by_date: true,
      division_id: true,
      notes_internal: true,
      divisions: {
        select: {
          division_name: true,
          division_code: true,
        },
      },
      vendors: {
        select: {
          vendor_name: true,
          vendor_code: true,
        },
      },
      projects: {
        select: {
          project_name: true,
          project_code: true,
        },
      },
      users_po_headers_requested_by_user_idTousers: {
        select: {
          first_name: true,
          last_name: true,
          email: true,
        },
      },
      po_line_items: {
        select: {
          item_description: true,
          quantity: true,
          unit_price: true,
          line_subtotal: true,
        },
        take: 3, // First 3 line items for preview
      },
    },
    orderBy: [
      { total_amount: 'desc' }, // High value first
      { created_at: 'asc' }, // Oldest first within same value range
    ],
  });

  // Enhance each PO with approval context and urgency
  const enhancedPOs = await Promise.all(
    pendingPOs.map(async (po) => {
      // Calculate days pending
      const daysPending = po.created_at ? Math.floor(
        (now.getTime() - po.created_at.getTime()) / (1000 * 60 * 60 * 24)
      ) : 0;

      // Calculate urgency score (0-100)
      let urgencyScore = 0;

      // Days pending factor (max 40 points)
      urgencyScore += Math.min(daysPending * 5, 40);

      // Amount factor (max 30 points)
      const amount = po.total_amount?.toNumber() || 0;
      if (amount >= 100000) urgencyScore += 30;
      else if (amount >= 50000) urgencyScore += 20;
      else if (amount >= 25000) urgencyScore += 15;
      else if (amount >= 10000) urgencyScore += 10;
      else urgencyScore += 5;

      // Required date factor (max 30 points)
      if (po.required_by_date) {
        const daysUntilRequired = Math.floor(
          (po.required_by_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilRequired < 0) urgencyScore += 30; // Overdue
        else if (daysUntilRequired <= 3) urgencyScore += 20; // Due soon
        else if (daysUntilRequired <= 7) urgencyScore += 10; // Due this week
      }

      // Check if current user can approve this PO
      const approvalCheck = canApprovePO(
        userRole as any,
        userDivisionId,
        po.division_id,
        amount
      );

      // Get approval history
      const approvalHistory = await prisma.po_approvals.findMany({
        where: { po_id: po.id },
        select: {
          action: true,
          timestamp: true,
          notes: true,
        } as any,
        orderBy: { timestamp: 'desc' },
        take: 3,
      });

      return {
        id: po.id,
        poNumber: po.po_number,
        amount: amount,
        status: po.status,
        division: {
          id: po.division_id,
          name: po.divisions?.division_name,
          code: po.divisions?.division_code,
        },
        vendor: {
          name: po.vendors?.vendor_name,
          code: po.vendors?.vendor_code,
        },
        project: {
          name: po.projects?.project_name,
          code: po.projects?.project_code,
        },
        requestedBy: {
          name: po.users_po_headers_requested_by_user_idTousers ?
            `${po.users_po_headers_requested_by_user_idTousers.first_name} ${po.users_po_headers_requested_by_user_idTousers.last_name}` :
            'Unknown',
          email: po.users_po_headers_requested_by_user_idTousers?.email || '',
        },
        timing: {
          createdAt: po.created_at,
          daysPending,
          requiredByDate: po.required_by_date,
          isOverdue: po.required_by_date ? po.required_by_date < now : false,
        },
        urgency: {
          score: Math.min(urgencyScore, 100),
          level: urgencyScore >= 70 ? 'critical' : urgencyScore >= 40 ? 'high' : urgencyScore >= 20 ? 'medium' : 'low',
        },
        approval: {
          canApprove: approvalCheck.canApprove,
          reason: approvalCheck.reason,
          requiresOwnerApproval: amount >= 25000,
        },
        preview: {
          itemsCount: po.po_line_items.length,
          firstItems: po.po_line_items.slice(0, 3).map(item => item.item_description),
          notes: po.notes_internal,
        },
        recentActivity: approvalHistory.map(activity => ({
          action: activity.action,
          timestamp: activity.timestamp,
          actor: 'User', // Simplified for now
          notes: activity.notes,
        })),
      };
    })
  );

  // Sort by urgency score (highest first)
  enhancedPOs.sort((a, b) => b.urgency.score - a.urgency.score);

  // Calculate summary statistics
  const summary = {
    total: enhancedPOs.length,
    byUrgency: {
      critical: enhancedPOs.filter(po => po.urgency.level === 'critical').length,
      high: enhancedPOs.filter(po => po.urgency.level === 'high').length,
      medium: enhancedPOs.filter(po => po.urgency.level === 'medium').length,
      low: enhancedPOs.filter(po => po.urgency.level === 'low').length,
    },
    byAmount: {
      over100k: enhancedPOs.filter(po => po.amount >= 100000).length,
      over50k: enhancedPOs.filter(po => po.amount >= 50000).length,
      over25k: enhancedPOs.filter(po => po.amount >= 25000).length,
      under25k: enhancedPOs.filter(po => po.amount < 25000).length,
    },
    totalValue: enhancedPOs.reduce((sum, po) => sum + po.amount, 0),
    averageAge: enhancedPOs.length > 0
      ? enhancedPOs.reduce((sum, po) => sum + po.timing.daysPending, 0) / enhancedPOs.length
      : 0,
    actionable: enhancedPOs.filter(po => po.approval.canApprove).length,
  };

  return {
    summary,
    items: enhancedPOs,
  };
};

// GET handler for pending approvals
const getHandler = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const divisionId = searchParams.get('divisionId') || undefined;
    const urgencyLevel = searchParams.get('urgencyLevel') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

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

    // Get pending approvals data (with caching)
    const pendingData = await cachedDashboardData.getPendingApprovals(
      user.role,
      user.division_id,
      () => getPendingApprovals(user.role, user.division_id)
    );

    // Apply filters
    let filteredItems = pendingData.items;

    if (divisionId) {
      filteredItems = filteredItems.filter(po => po.division.id === divisionId);
    }

    if (urgencyLevel) {
      filteredItems = filteredItems.filter(po => po.urgency.level === urgencyLevel);
    }

    // Apply limit
    filteredItems = filteredItems.slice(0, limit);

    // Update summary for filtered results
    const filteredSummary = {
      ...pendingData.summary,
      total: filteredItems.length,
      totalValue: filteredItems.reduce((sum, po) => sum + po.amount, 0),
    };

    const response = {
      summary: filteredSummary,
      items: filteredItems,
      filters: {
        divisionId: divisionId || null,
        urgencyLevel: urgencyLevel || null,
        limit,
      },
      userContext: {
        role: user.role,
        divisionId: user.division_id,
        canApproveAny: ['MAJORITY_OWNER'].includes(user.role),
        canApproveOwn: ['DIVISION_LEADER'].includes(user.role),
      },
      lastUpdated: new Date().toISOString(),
    };

    log.info('Pending approvals retrieved', {
      userId: session.user.id,
      userRole: user.role,
      totalItems: pendingData.items.length,
      filteredItems: filteredItems.length,
      actionableItems: filteredSummary.actionable,
    });

    return NextResponse.json(response);

  } catch (error) {
    log.error('Failed to get pending approvals', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    );
  }
};

// Apply rate limiting
export const GET = withRateLimit(200, 60 * 1000)(getHandler);