import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { generatePONumber, generateSupplierConfirmCode } from '@/lib/po-number';
import { createPOSchema, poQuerySchema } from '@/lib/validation/schemas';
import { withValidation, withRateLimit } from '@/lib/validation/middleware';
import log, { auditLog } from '@/lib/logging/logger';

// GET handler with validation
const getHandler = withValidation(
  async (request: NextRequest, { query }) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where: Record<string, unknown> = {
      deleted_at: null,
    };

    // Use validated query parameters
    if (query?.status) {
      where.status = query.status;
    }

    if (query?.divisionId) {
      where.division_id = query.divisionId;
    }

    const pos = await prisma.po_headers.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: query?.limit || 50,
      skip: query?.page ? (query.page - 1) * (query.limit || 50) : 0,
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
      },
    });

    return NextResponse.json(pos);
  },
  {
    query: poQuerySchema,
  }
);

// Apply rate limiting to GET requests
export const GET = withRateLimit(200, 60 * 1000)(getHandler);

// POST handler with validation
const postHandler = withValidation(
  async (request: NextRequest, { body }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use validated body data
    const {
      projectId,
      workOrderId,
      vendorId,
      divisionId,
      lineItems,
      notesInternal,
      notesVendor,
      requiredByDate,
      termsCode,
      status = 'Draft',
    } = body;

    // Fields are already validated by Zod schema

    // Get division info for PO number
    const division = await prisma.divisions.findUnique({
      where: { id: divisionId },
    });
    if (!division) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 });
    }

    // Get or create work order for sequence number
    let workOrder = null;
    let workOrderSequence = 0;

    if (workOrderId) {
      workOrder = await prisma.work_orders.findUnique({
        where: { id: workOrderId },
      });
      if (!workOrder) {
        return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
      }
      workOrderSequence = workOrder.sequence_number;
    } else {
      // Auto-create a work order if none provided
      const lastWO = await prisma.work_orders.findFirst({
        orderBy: { sequence_number: 'desc' },
      });
      const nextSequence = (lastWO?.sequence_number || 0) + 1;
      const workOrderNumber = `WO-${String(nextSequence).padStart(4, '0')}`;

      workOrder = await prisma.work_orders.create({
        data: {
          work_order_number: workOrderNumber,
          sequence_number: nextSequence,
          division_id: divisionId,
          project_id: projectId,
          title: `PO Work Order - ${new Date().toLocaleDateString()}`,
          status: 'InProgress',
          created_by_id: session.user.id,
        },
      });
      workOrderSequence = nextSequence;
    }

    // Get vendor info
    const vendor = await prisma.vendors.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Get division leader for purchaser ID
    const divisionLeader = await prisma.division_leaders.findFirst({
      where: { division_id: divisionId, is_active: true },
    });

    // Get purchaser ID (01-06 based on division leader code)
    const purchaserId = divisionLeader?.division_code?.replace('O', '0') || '01';

    // Count existing POs for this work order to get purchase sequence
    const existingPOCount = await prisma.po_headers.count({
      where: { work_order_id: workOrderId },
    });
    const purchaseSequence = existingPOCount + 1;

    // Generate supplier confirmation code
    const supplierConfirmCode = generateSupplierConfirmCode(vendor.vendor_code);

    // Generate PO number: [PurchaserID][DivisionCode][WO#]-[PurchaseSeq][SupplierLast4]
    const poNumber = generatePONumber({
      leaderId: purchaserId,
      divisionCode: division.cost_center_prefix,
      workOrderNumber: workOrderSequence,
      purchaseSequence,
      supplierConfirmLast4: supplierConfirmCode,
    });

    // Calculate totals
    const TAX_RATE = 0.0775; // 7.75% tax rate
    let subtotal = 0;

    const processedLineItems = lineItems.map((item: {
      itemDescription: string;
      quantity: number;
      unitOfMeasure: string;
      unitPrice: number;
      glAccountId: string;
      isTaxable?: boolean;
    }, index: number) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      subtotal += lineSubtotal;
      return {
        line_number: index + 1,
        item_description: item.itemDescription,
        quantity: item.quantity,
        unit_of_measure: item.unitOfMeasure,
        unit_price: item.unitPrice,
        line_subtotal: lineSubtotal,
        gl_account_id: item.glAccountId,
        is_taxable: item.isTaxable ?? true,
        status: 'Pending',
      };
    });

    const taxableAmount = processedLineItems
      .filter((item: { is_taxable: boolean }) => item.is_taxable)
      .reduce((sum: number, item: { line_subtotal: number }) => sum + item.line_subtotal, 0);
    const taxAmount = taxableAmount * TAX_RATE;
    const totalAmount = subtotal + taxAmount;

    // Create PO with line items
    const po = await prisma.po_headers.create({
      data: {
        po_number: poNumber,
        po_leader_code: purchaserId,
        po_gl_code: division.cost_center_prefix,
        po_work_order_seq: workOrderSequence,
        po_vendor_code: vendor.vendor_code,
        division_id: divisionId,
        project_id: projectId,
        work_order_id: workOrder.id,
        vendor_id: vendorId,
        cost_center_code: `${division.cost_center_prefix}-${String(workOrderSequence).padStart(4, '0')}-${String(purchaseSequence).padStart(2, '0')}`,
        status,
        required_by_date: requiredByDate ? new Date(requiredByDate) : null,
        terms_code: termsCode || vendor.payment_terms_default || 'Net30',
        tax_rate: TAX_RATE,
        subtotal_amount: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        requested_by_id: session.user.id,
        notes_internal: notesInternal || null,
        notes_vendor: notesVendor || null,
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

    // Create audit log entry
    await prisma.po_approvals.create({
      data: {
        po_id: po.id,
        action: 'POCreated',
        actor_id: session.user.id,
        status_before: null,
        status_after: status,
        notes: `PO ${poNumber} created`,
      },
    });

    // Log successful PO creation for audit trail
    auditLog(
      'PO_CREATED',
      'purchase_order',
      po.id,
      {
        poNumber,
        totalAmount,
        vendorId,
        projectId,
        divisionId,
        lineItemCount: lineItems.length,
      },
      {
        userId: session.user.id,
        sessionId: session.user.id, // Using user ID as session identifier
      }
    );

    log.business('Purchase Order created successfully', {
      poId: po.id,
      poNumber,
      totalAmount,
      userId: session.user.id,
      vendorId,
      projectId,
    });

    return NextResponse.json(po);
  },
  {
    body: createPOSchema,
  }
);

// Apply rate limiting to POST requests (stricter for write operations)
export const POST = withRateLimit(50, 60 * 1000)(postHandler);
