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

    // All users see all pending POs across all divisions
    const pendingPOs = await prisma.po_headers.findMany({
      where: {
        status: 'Submitted',
        deleted_at: null,
      },
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
  _userRole: string,
  _userDivisionId: string | null,
  _po: { division_id: string; total_amount: unknown }
): boolean {
  // All authenticated users can approve any PO
  return true;
}
