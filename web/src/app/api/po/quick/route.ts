import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { quickCreatePOSchema } from '@/lib/validation/schemas';
import { withRateLimit } from '@/lib/validation/middleware';
import { generatePONumber, LEADER_ID_MAP } from '@/lib/po-number';
import log, { auditLog } from '@/lib/logging/logger';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const postHandler = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = quickCreatePOSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { projectId, divisionId, clientId, propertyId, workOrderId, createWorkOrder, notesInternal } = parsed.data;

    // Fetch division
    const division = await prisma.divisions.findUnique({
      where: { id: divisionId },
    });
    if (!division) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 });
    }

    // Fetch project
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { id: true, project_code: true, project_name: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Resolve or create work order
    let workOrder;
    let workOrderSequence: number;

    if (workOrderId) {
      workOrder = await prisma.work_orders.findUnique({
        where: { id: workOrderId },
      });
      if (!workOrder) {
        return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
      }
      const woMatch = workOrder.work_order_number.match(/WO-(\d+)/);
      workOrderSequence = woMatch ? parseInt(woMatch[1]) : 1;
    } else if (createWorkOrder) {
      // Create new work order
      const currentYear = new Date().getFullYear();
      const sequenceRecord = await prisma.work_order_sequences.upsert({
        where: {
          division_id_year: {
            division_id: divisionId,
            year: currentYear,
          },
        },
        update: {
          last_sequence: { increment: 1 },
          updated_at: new Date(),
        },
        create: {
          division_id: divisionId,
          year: currentYear,
          last_sequence: 1,
        },
      });

      const nextSequence = sequenceRecord.last_sequence || 1;
      const workOrderNumber = `WO-${String(nextSequence).padStart(4, '0')}`;

      workOrder = await prisma.work_orders.create({
        data: {
          work_order_number: workOrderNumber,
          division_id: divisionId,
          project_id: projectId,
          title: createWorkOrder.title,
          status: 'InProgress',
          created_by_user_id: session.user.id,
        },
      });
      workOrderSequence = nextSequence;
    } else {
      // Auto-create a generic work order
      const currentYear = new Date().getFullYear();
      const sequenceRecord = await prisma.work_order_sequences.upsert({
        where: {
          division_id_year: {
            division_id: divisionId,
            year: currentYear,
          },
        },
        update: {
          last_sequence: { increment: 1 },
          updated_at: new Date(),
        },
        create: {
          division_id: divisionId,
          year: currentYear,
          last_sequence: 1,
        },
      });

      const nextSequence = sequenceRecord.last_sequence || 1;
      const workOrderNumber = `WO-${String(nextSequence).padStart(4, '0')}`;

      workOrder = await prisma.work_orders.create({
        data: {
          work_order_number: workOrderNumber,
          division_id: divisionId,
          project_id: projectId,
          title: `Quick PO - ${new Date().toLocaleDateString()}`,
          status: 'InProgress',
          created_by_user_id: session.user.id,
        },
      });
      workOrderSequence = nextSequence;
    }

    // Get division leader for leader ID
    const divisionLeader = await prisma.division_leaders.findFirst({
      where: { division_id: divisionId, is_active: true },
    });
    const leaderId = LEADER_ID_MAP[divisionLeader?.division_code || ''] || '01';

    // Count existing POs for this work order to determine purchase sequence
    const existingPOCount = await prisma.po_headers.count({
      where: { work_order_id: workOrder.id },
    });
    const purchaseSequence = existingPOCount + 1;

    // Generate PO number (v2 format, no vendor suffix)
    const poNumber = generatePONumber({
      leaderId,
      divisionCode: division.cost_center_prefix || 'XX',
      workOrderNumber: workOrderSequence,
      purchaseSequence,
    });

    // Create PO header with no vendor, no line items, $0 total
    const po = await prisma.po_headers.create({
      data: {
        po_number: poNumber,
        po_leader_code: leaderId,
        po_gl_code: division.cost_center_prefix,
        po_work_order_num: workOrderSequence,
        po_vendor_code: null,
        division_id: divisionId,
        project_id: projectId,
        work_order_id: workOrder.id,
        client_id: clientId || null,
        property_id: propertyId || null,
        vendor_id: null,
        cost_center_code: `${division.cost_center_prefix}${String(workOrderSequence).padStart(4, '0')}${String(purchaseSequence).padStart(2, '0')}`,
        status: 'Draft',
        tax_rate: 0.0775,
        subtotal_amount: 0,
        tax_amount: 0,
        total_amount: 0,
        requested_by_user_id: session.user.id,
        notes_internal: notesInternal || null,
        division_leader_id: divisionLeader?.id || null,
      },
      include: {
        divisions: { select: { division_name: true } },
        projects: { select: { project_name: true, project_code: true } },
        work_orders: { select: { work_order_number: true, title: true } },
      },
    });

    // Audit log
    await prisma.po_approvals.create({
      data: {
        po_id: po.id,
        action: 'Created',
        actor_user_id: session.user.id,
        status_before: null,
        status_after: 'Draft',
        notes: `Quick PO ${poNumber} created (incomplete - needs vendor & line items)`,
      },
    });

    auditLog(
      'QUICK_PO_CREATED',
      'purchase_order',
      po.id,
      { poNumber, divisionId, projectId, workOrderId: workOrder.id },
      { userId: session.user.id, sessionId: session.user.id }
    );

    log.business('Quick PO created', {
      poId: po.id,
      poNumber,
      userId: session.user.id,
      divisionId,
      projectId,
    });

    return NextResponse.json({
      id: po.id,
      poNumber,
      divisionName: po.divisions.division_name,
      projectName: `${po.projects.project_code} - ${po.projects.project_name}`,
      workOrderNumber: po.work_orders?.work_order_number,
      workOrderTitle: po.work_orders?.title,
    });
  } catch (error) {
    log.error('Quick PO creation failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Quick PO creation failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};

export const POST = withRateLimit(50, 60 * 1000)(postHandler);
