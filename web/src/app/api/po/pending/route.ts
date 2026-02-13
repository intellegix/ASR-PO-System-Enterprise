import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { withRateLimit } from '@/lib/validation/middleware';
import prisma from '@/lib/db';
// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';


// Approval threshold - POs over this amount require owner approval
const OWNER_APPROVAL_THRESHOLD = 25000;

const getHandler = async (_request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user info for filtering
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = user.role;
    const userDivisionId = user.division_id;

    // Build query based on role
    // Majority Owner sees all pending POs
    // Division Leader sees their division's POs under threshold
    // Operations Manager sees all POs under threshold
    // Accounting sees none (read-only)

    const where = {
      status: 'Submitted' as const,
      deleted_at: null,
      division_id: undefined as string | undefined,
      total_amount: undefined as { lte: number } | undefined,
    };

    if (userRole === 'MAJORITY_OWNER' || userRole === 'DIRECTOR_OF_SYSTEMS_INTEGRATIONS') {
      // See all pending POs - use base where object as is
    } else if (userRole === 'DIVISION_LEADER') {
      // See only own division's POs under threshold
      if (userDivisionId) {
        where.division_id = userDivisionId;
      }
      where.total_amount = { lte: OWNER_APPROVAL_THRESHOLD };
    } else if (userRole === 'OPERATIONS_MANAGER') {
      // See all POs under threshold
      where.total_amount = { lte: OWNER_APPROVAL_THRESHOLD };
    } else {
      // Accounting - no approval permissions
      return NextResponse.json([]);
    }

    // Clean up undefined properties for Prisma query
    const cleanWhere = Object.fromEntries(
      Object.entries(where).filter(([_key, value]) => value !== undefined)
    );

    const pendingPOs = await prisma.po_headers.findMany({
      where: cleanWhere,
      orderBy: [
        { total_amount: 'desc' }, // Higher amounts first
        { created_at: 'asc' }, // Oldest first within same amount
      ],
      include: {
        vendors: {
          select: { vendor_name: true, vendor_code: true },
        },
        projects: {
          select: { project_code: true, project_name: true },
        },
        divisions: {
          select: { division_name: true, division_code: true },
        },
        users_po_headers_requested_by_user_idTousers: {
          select: { id: true, first_name: true, last_name: true },
        },
        po_line_items: {
          select: { id: true, item_description: true },
        },
      },
    });

    // Add approval info to each PO
    const enrichedPOs = pendingPOs.map((po) => ({
      ...po,
      requiresOwnerApproval: Number(po.total_amount) > OWNER_APPROVAL_THRESHOLD,
      canApprove: canUserApprove(userRole, userDivisionId, po),
      lineItemCount: po.po_line_items.length,
    }));

    return NextResponse.json(enrichedPOs);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    );
  }
};

export const GET = withRateLimit(100, 60 * 1000)(getHandler);

function canUserApprove(
  userRole: string,
  userDivisionId: string | null,
  po: { division_id: string; total_amount: unknown }
): boolean {
  const poAmount = Number(po.total_amount);
  const requiresOwner = poAmount > OWNER_APPROVAL_THRESHOLD;

  if (userRole === 'MAJORITY_OWNER') {
    return true;
  }

  if (userRole === 'DIVISION_LEADER') {
    return userDivisionId === po.division_id && !requiresOwner;
  }

  if (userRole === 'OPERATIONS_MANAGER') {
    return !requiresOwner;
  }

  return false;
}
