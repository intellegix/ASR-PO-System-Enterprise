import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { withRateLimit } from '@/lib/validation/middleware';
import { completePOSchema } from '@/lib/validation/schemas';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';
// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getHandler = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }
    const po = await prisma.po_headers.findUnique({
      where: { id, deleted_at: null },
      include: {
        po_line_items: {
          select: {
            id: true,
            line_number: true,
            item_description: true,
            quantity: true,
            unit_of_measure: true,
            unit_price: true,
            line_subtotal: true,
            gl_account_code: true,
            gl_account_number: true,
            gl_account_name: true,
            is_taxable: true,
            created_at: true,
          },
          orderBy: { line_number: 'asc' },
        },
        clients: true,
        properties: true,
        vendors: true,
        projects: true,
        divisions: true,
        work_orders: true,
        users_po_headers_requested_by_user_idTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        users_po_headers_approved_by_user_idTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        po_approvals: {
          include: {
            users: {
              select: { id: true, first_name: true, last_name: true, email: true },
            },
          },
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    return NextResponse.json(po);
  } catch (error) {
    console.error('Error fetching PO:', error);
    return NextResponse.json({ error: 'Failed to fetch PO' }, { status: 500 });
  }
};

const putHandler = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }
    const body = await request.json();

    // Get current PO
    const currentPO = await prisma.po_headers.findUnique({
      where: { id, deleted_at: null },
    });

    if (!currentPO) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    // Only allow editing draft POs
    if (currentPO.status !== 'Draft') {
      return NextResponse.json(
        { error: 'Only draft POs can be edited' },
        { status: 400 }
      );
    }

    const {
      notesInternal,
      notesVendor,
      requiredByDate,
      termsCode,
    } = body;

    // Check if this is a "complete PO" request (adding vendor + line items to an incomplete draft)
    if (body.vendorId && body.lineItems && !currentPO.vendor_id) {
      const parsed = completePOSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const { vendorId, lineItems, status: newStatus } = parsed.data;

      // Validate vendor exists
      const vendor = await prisma.vendors.findUnique({
        where: { id: vendorId },
      });
      if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      }

      // Look up GL accounts
      const glAccountIds = [...new Set(lineItems.map((item) => item.glAccountId))];
      const glAccounts = await prisma.gl_account_mappings.findMany({
        where: { id: { in: glAccountIds } },
        select: { id: true, gl_code_short: true, gl_account_number: true, gl_account_name: true },
      });
      const glAccountMap = new Map(glAccounts.map((gl) => [gl.id, gl]));

      // Calculate totals
      const TAX_RATE = 0.0775;
      let subtotal = 0;

      const processedLineItems = lineItems.map((item, index) => {
        const lineSubtotal = item.quantity * item.unitPrice;
        subtotal += lineSubtotal;
        const glAccount = glAccountMap.get(item.glAccountId);
        return {
          line_number: index + 1,
          item_description: item.itemDescription,
          quantity: item.quantity,
          unit_of_measure: item.unitOfMeasure,
          unit_price: item.unitPrice,
          line_subtotal: lineSubtotal,
          gl_account_code: glAccount?.gl_code_short || null,
          gl_account_number: glAccount?.gl_account_number || null,
          gl_account_name: glAccount?.gl_account_name || null,
          is_taxable: item.isTaxable ?? true,
          status: 'Pending' as const,
        };
      });

      const taxableAmount = processedLineItems
        .filter((item) => item.is_taxable)
        .reduce((sum, item) => sum + item.line_subtotal, 0);
      const taxAmount = taxableAmount * TAX_RATE;
      const totalAmount = subtotal + taxAmount;

      const finalStatus = newStatus || 'Draft';

      // If approving, set approval fields
      const approvalData: Record<string, unknown> = {};
      if (finalStatus === 'Approved') {
        approvalData.approved_by_user_id = session.user.id;
        approvalData.approved_at = new Date();
      }

      // Update PO with vendor, line items, and totals
      const completedPO = await prisma.po_headers.update({
        where: { id },
        data: {
          vendor_id: vendorId,
          po_vendor_code: vendor.vendor_code,
          subtotal_amount: subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          terms_code: parsed.data.termsCode || vendor.payment_terms_default || 'Net30',
          required_by_date: parsed.data.requiredByDate ? new Date(parsed.data.requiredByDate) : null,
          notes_internal: parsed.data.notesInternal || currentPO.notes_internal,
          notes_vendor: parsed.data.notesVendor || null,
          status: finalStatus as any,
          updated_at: new Date(),
          ...approvalData,
          po_line_items: {
            create: processedLineItems,
          },
        },
        include: {
          po_line_items: true,
          vendors: true,
          projects: true,
          divisions: true,
          work_orders: true,
        },
      });

      // Audit log
      const auditAction = finalStatus === 'Approved' ? 'Approved' : 'Created';
      await prisma.po_approvals.create({
        data: {
          po_id: id,
          action: auditAction,
          actor_user_id: session.user.id,
          status_before: 'Draft',
          status_after: finalStatus,
          notes: `PO completed: vendor ${vendor.vendor_name}, ${lineItems.length} line items, total $${totalAmount.toFixed(2)}`,
        },
      });

      log.business('PO completed with vendor and line items', {
        poId: id,
        poNumber: currentPO.po_number,
        vendorId,
        totalAmount,
        lineItemCount: lineItems.length,
        userId: session.user.id,
      });

      return NextResponse.json(completedPO);
    }

    // Simple field update (existing behavior)
    const updatedPO = await prisma.po_headers.update({
      where: { id },
      data: {
        notes_internal: notesInternal,
        notes_vendor: notesVendor,
        required_by_date: requiredByDate ? new Date(requiredByDate) : null,
        terms_code: termsCode,
        updated_at: new Date(),
      },
      include: {
        po_line_items: true,
        vendors: true,
        projects: true,
        divisions: true,
      },
    });

    return NextResponse.json(updatedPO);
  } catch (error) {
    console.error('Error updating PO:', error);
    return NextResponse.json({ error: 'Failed to update PO' }, { status: 500 });
  }
};

const deleteHandler = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    // Get current PO
    const currentPO = await prisma.po_headers.findUnique({
      where: { id, deleted_at: null },
    });

    if (!currentPO) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    // Only allow deleting draft POs
    if (currentPO.status !== 'Draft') {
      return NextResponse.json(
        { error: 'Only draft POs can be deleted' },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.po_headers.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });

    // Create audit log
    await prisma.po_approvals.create({
      data: {
        po_id: id,
        action: 'Cancelled',
        actor_user_id: session.user.id,
        status_before: currentPO.status,
        status_after: 'Cancelled',
        notes: 'PO deleted',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PO:', error);
    return NextResponse.json({ error: 'Failed to delete PO' }, { status: 500 });
  }
};

export const GET = withRateLimit(200, 60 * 1000)(getHandler);
export const PUT = withRateLimit(20, 60 * 1000)(putHandler);
export const DELETE = withRateLimit(10, 60 * 1000)(deleteHandler);
