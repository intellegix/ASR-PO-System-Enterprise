import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import {
  sendApprovalNeededEmails,
  sendPOApprovedEmail,
  sendPORejectedEmail,
  sendPOIssuedInternalEmail,
  sendPOToVendor,
} from '@/lib/email/service';
import { syncSinglePO } from '@/lib/quickbooks/service';

// Approval threshold - POs over this amount require owner approval
const OWNER_APPROVAL_THRESHOLD = 25000;

type POAction = 'submit' | 'approve' | 'reject' | 'issue' | 'receive' | 'pay' | 'cancel';

interface ActionRequest {
  action: POAction;
  notes?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body: ActionRequest = await request.json();
    const { action, notes } = body;

    // Get current PO with relations
    const currentPO = await prisma.po_headers.findUnique({
      where: { id, deleted_at: null },
      include: {
        divisions: true,
        vendors: true,
      },
    });

    if (!currentPO) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    // Get user info for permission checking
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      include: { divisions: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = user.role;
    const userDivisionId = user.division_id;
    const poAmount = Number(currentPO.total_amount);
    const requiresOwnerApproval = poAmount > OWNER_APPROVAL_THRESHOLD;

    let newStatus: string;
    let auditAction: string;

    switch (action) {
      case 'submit':
        // Submit for approval - only from Draft status
        if (currentPO.status !== 'Draft') {
          return NextResponse.json(
            { error: 'PO must be in Draft status to submit for approval' },
            { status: 400 }
          );
        }
        newStatus = 'Submitted';
        auditAction = 'Submitted';
        break;

      case 'approve':
        // Approve PO - only from Submitted status
        if (currentPO.status !== 'Submitted') {
          return NextResponse.json(
            { error: 'PO must be pending approval to approve' },
            { status: 400 }
          );
        }

        // Check approval permissions
        // Majority Owner can approve any PO
        // Division Leader can approve their division's POs under threshold
        // Operations Manager can approve any PO under threshold
        if (userRole === 'MAJORITY_OWNER') {
          // Can approve anything
        } else if (userRole === 'DIVISION_LEADER') {
          // Can only approve own division's POs under threshold
          if (userDivisionId !== currentPO.division_id) {
            return NextResponse.json(
              { error: 'You can only approve POs in your division' },
              { status: 403 }
            );
          }
          if (requiresOwnerApproval) {
            return NextResponse.json(
              { error: `POs over $${OWNER_APPROVAL_THRESHOLD.toLocaleString()} require owner approval` },
              { status: 403 }
            );
          }
        } else if (userRole === 'OPERATIONS_MANAGER') {
          if (requiresOwnerApproval) {
            return NextResponse.json(
              { error: `POs over $${OWNER_APPROVAL_THRESHOLD.toLocaleString()} require owner approval` },
              { status: 403 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'You do not have permission to approve POs' },
            { status: 403 }
          );
        }

        newStatus = 'Approved';
        auditAction = 'POApproved';
        break;

      case 'reject':
        // Reject PO - only from Submitted status
        if (currentPO.status !== 'Submitted') {
          return NextResponse.json(
            { error: 'PO must be pending approval to reject' },
            { status: 400 }
          );
        }

        // Same permission check as approve
        if (userRole === 'ACCOUNTING') {
          return NextResponse.json(
            { error: 'You do not have permission to reject POs' },
            { status: 403 }
          );
        }

        if (userRole === 'DIVISION_LEADER' && userDivisionId !== currentPO.division_id) {
          return NextResponse.json(
            { error: 'You can only reject POs in your division' },
            { status: 403 }
          );
        }

        newStatus = 'Rejected';
        auditAction = 'PORejected';
        break;

      case 'issue':
        // Issue to vendor - only from Approved status
        if (currentPO.status !== 'Approved') {
          return NextResponse.json(
            { error: 'PO must be approved before issuing to vendor' },
            { status: 400 }
          );
        }

        newStatus = 'Issued';
        auditAction = 'POIssued';
        break;

      case 'receive':
        // Mark as received - only from Issued status
        if (currentPO.status !== 'Issued') {
          return NextResponse.json(
            { error: 'PO must be issued before marking as received' },
            { status: 400 }
          );
        }

        newStatus = 'Received';
        auditAction = 'LineReceived';
        break;

      case 'pay':
        // Mark as paid - only from Received status, only accounting can do this
        if (currentPO.status !== 'Received') {
          return NextResponse.json(
            { error: 'PO must be received before marking as paid' },
            { status: 400 }
          );
        }

        // Only accounting and majority owners can mark POs as paid
        if (userRole !== 'ACCOUNTING' && userRole !== 'MAJORITY_OWNER') {
          return NextResponse.json(
            { error: 'Only accounting staff can mark POs as paid' },
            { status: 403 }
          );
        }

        newStatus = 'Paid';
        auditAction = 'POPaid';
        break;

      case 'cancel':
        // Cancel PO - from Draft, Submitted, or Approved
        if (!['Draft', 'Submitted', 'Approved'].includes(currentPO.status || '')) {
          return NextResponse.json(
            { error: 'PO cannot be cancelled in current status' },
            { status: 400 }
          );
        }

        newStatus = 'Cancelled';
        auditAction = 'POCancelled';
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update PO status
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date(),
    };

    // Set approved_by and approved_at for approve action
    if (action === 'approve') {
      updateData.approved_by_id = session.user.id;
      updateData.approved_at = new Date();
    }

    // Set issued_at for issue action
    if (action === 'issue') {
      updateData.issued_at = new Date();
    }

    const updatedPO = await prisma.po_headers.update({
      where: { id },
      data: updateData,
      include: {
        po_line_items: true,
        vendors: true,
        projects: true,
        divisions: true,
        users_po_headers_requested_by_user_idTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        users_po_headers_approved_by_user_idTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    // Create audit log entry
    await prisma.po_approvals.create({
      data: {
        po_id: id,
        action: auditAction as any,
        actor_user_id: session.user.id,
        status_before: currentPO.status,
        status_after: newStatus,
        notes: notes || null,
      },
    });

    // Send email notifications (non-blocking)
    try {
      switch (action) {
        case 'submit':
          // Notify approvers that a PO needs approval
          sendApprovalNeededEmails(id).catch(console.error);
          break;

        case 'approve':
          // Notify requester that their PO was approved
          sendPOApprovedEmail(id, `${user.first_name} ${user.last_name}`).catch(console.error);
          break;

        case 'reject':
          // Notify requester that their PO was rejected
          sendPORejectedEmail(id, `${user.first_name} ${user.last_name}`, notes).catch(console.error);
          break;

        case 'issue':
          // Send PO to vendor with PDF attachment
          sendPOToVendor(id).catch(console.error);
          // Notify internal team
          sendPOIssuedInternalEmail(id, `${user.first_name} ${user.last_name}`).catch(console.error);
          break;
      }
    } catch (emailError) {
      // Log email errors but don't fail the action
      console.error('Error sending email notifications:', emailError);
    }

    // QuickBooks sync for paid POs (non-blocking)
    if (action === 'pay' && newStatus === 'Paid') {
      try {
        console.log(`Triggering QB sync for paid PO: ${updatedPO.po_number}`);
        syncSinglePO(id).then((result) => {
          if (result.success) {
            console.log(`QB sync successful for PO ${updatedPO.po_number}: ${result.message}`);
          } else {
            console.error(`QB sync failed for PO ${updatedPO.po_number}: ${result.error}`);
          }
        }).catch((error) => {
          console.error(`QB sync error for PO ${updatedPO.po_number}:`, error);
        });
      } catch (syncError) {
        // Log sync errors but don't fail the action
        console.error('Error initiating QB sync:', syncError);
      }
    }

    return NextResponse.json({
      success: true,
      po: updatedPO,
      message: getSuccessMessage(action, updatedPO.po_number),
    });
  } catch (error) {
    console.error('Error processing PO action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}

function getSuccessMessage(action: POAction, poNumber: string): string {
  switch (action) {
    case 'submit':
      return `PO ${poNumber} submitted for approval`;
    case 'approve':
      return `PO ${poNumber} approved`;
    case 'reject':
      return `PO ${poNumber} rejected`;
    case 'issue':
      return `PO ${poNumber} issued to vendor`;
    case 'receive':
      return `PO ${poNumber} marked as received`;
    case 'pay':
      return `PO ${poNumber} marked as paid and synced to QuickBooks`;
    case 'cancel':
      return `PO ${poNumber} cancelled`;
    default:
      return `Action completed for PO ${poNumber}`;
  }
}
