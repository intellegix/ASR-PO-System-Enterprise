// Work Orders API - Enhanced CRUD operations for work orders with enterprise features
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Validation schemas
const workOrderCreateSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  division_id: z.string().uuid('Invalid division ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().min(1, 'Description is required'),
  priority_level: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  work_order_type: z.string().min(1, 'Work order type is required'),
  primary_trade: z.string().optional(),
  budget_estimate: z.number().min(0).max(10000000).optional(),
  estimated_completion_date: z.string().optional().refine(
    (date) => !date || new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)),
    { message: 'Completion date cannot be in the past' }
  ),
  start_date_planned: z.string().optional().refine(
    (date) => !date || new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)),
    { message: 'Start date cannot be in the past' }
  ),
  end_date_planned: z.string().optional(),
}).refine((data) => {
  if (data.start_date_planned && data.end_date_planned) {
    return new Date(data.end_date_planned) > new Date(data.start_date_planned);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['end_date_planned']
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const userRole = session.user.role;
    const hasPermission = ['MAJORITY_OWNER', 'DIVISION_LEADER', 'OPERATIONS_MANAGER', 'ACCOUNTING'].includes(userRole);

    if (!hasPermission) {
      logger.warn('Unauthorized work order access attempt', {
        userId: session.user.id,
        role: userRole
      });
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const divisionId = searchParams.get('divisionId');

    // Build where clause
    const where: Record<string, unknown> = {};

    // Apply role-based filtering
    if (userRole === 'DIVISION_LEADER') {
      where.division_id = session.user.division_id;
    }

    if (projectId) {
      where.project_id = projectId;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority_level = priority;
    }

    if (divisionId && userRole !== 'DIVISION_LEADER') {
      where.division_id = divisionId;
    }

    const workOrders = await prisma.work_orders.findMany({
      where,
      orderBy: [
        { priority_level: 'desc' },
        { created_at: 'desc' }
      ],
      include: {
        projects: {
          select: {
            id: true,
            project_name: true,
            project_code: true,
            budget_total: true,
          }
        },
        divisions: {
          select: {
            id: true,
            division_name: true,
            division_code: true,
          }
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          }
        }
      },
    });

    logger.info('Work orders fetched', {
      userId: session.user.id,
      count: workOrders.length,
      filters: { projectId, status, priority, divisionId }
    });

    return NextResponse.json({ workOrders });
  } catch (error) {
    logger.error('Error fetching work orders', { error: error.message });
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only certain roles can create work orders
    const userRole = session.user.role;
    const canCreateWorkOrders = ['MAJORITY_OWNER', 'DIVISION_LEADER', 'OPERATIONS_MANAGER'].includes(userRole);

    if (!canCreateWorkOrders) {
      logger.warn('Unauthorized work order creation attempt', {
        userId: session.user.id,
        role: userRole
      });
      return NextResponse.json({ error: 'Insufficient permissions to create work orders' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = workOrderCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const data = validationResult.data;

    // Additional permission checks for division leaders
    if (userRole === 'DIVISION_LEADER' && data.division_id !== session.user.division_id) {
      return NextResponse.json({
        error: 'Division leaders can only create work orders for their own division'
      }, { status: 403 });
    }

    // Verify project and division exist and user has access
    const [project, division] = await Promise.all([
      prisma.projects.findUnique({
        where: { id: data.project_id },
        select: { id: true, project_name: true, primary_division_id: true }
      }),
      prisma.divisions.findUnique({
        where: { id: data.division_id },
        select: { id: true, division_name: true }
      })
    ]);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!division) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 });
    }

    // Get next sequence number by parsing work_order_number strings
    const lastWO = await prisma.work_orders.findFirst({
      orderBy: { work_order_number: 'desc' },
    });

    // Parse sequence from "WO-0001" format
    let nextSequence = 1;
    if (lastWO?.work_order_number) {
      const match = lastWO.work_order_number.match(/WO-(\d+)/);
      if (match) {
        nextSequence = parseInt(match[1], 10) + 1;
      }
    }

    // Generate work order number
    const workOrderNumber = `WO-${String(nextSequence).padStart(4, '0')}`;

    // Create work order
    const workOrder = await prisma.work_orders.create({
      data: {
        work_order_number: workOrderNumber,
        division_id: data.division_id,
        project_id: data.project_id,
        title: data.title,
        description: data.description,
        priority_level: data.priority_level,
        work_order_type: data.work_order_type,
        primary_trade: data.primary_trade || null,
        budget_estimate: data.budget_estimate || null,
        estimated_completion_date: data.estimated_completion_date ? new Date(data.estimated_completion_date) : null,
        start_date_planned: data.start_date_planned ? new Date(data.start_date_planned) : null,
        end_date_planned: data.end_date_planned ? new Date(data.end_date_planned) : null,
        status: 'Pending',
        po_count: 0,
        total_po_amount: 0,
        created_by_user_id: session.user.id,
      },
      include: {
        projects: {
          select: {
            id: true,
            project_name: true,
            project_code: true,
          }
        },
        divisions: {
          select: {
            id: true,
            division_name: true,
            division_code: true,
          }
        }
      }
    });

    logger.info('Work order created', {
      userId: session.user.id,
      workOrderId: workOrder.id,
      workOrderNumber: workOrder.work_order_number,
      projectId: data.project_id,
      divisionId: data.division_id,
      priority: data.priority_level,
      type: data.work_order_type
    });

    return NextResponse.json({
      workOrder,
      message: 'Work order created successfully'
    }, { status: 201 });

  } catch (error) {
    logger.error('Error creating work order', {
      error: error.message,
      userId: session?.user?.id
    });

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Work order number already exists' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 });
  }
}
