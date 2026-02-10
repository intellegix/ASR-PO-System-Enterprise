// Work Orders API - handles CRUD operations for work orders
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (projectId) {
      where.project_id = projectId;
    }

    const workOrders = await prisma.work_orders.findMany({
      where,
      orderBy: { work_order_number: 'desc' },
      select: {
        id: true,
        work_order_number: true,
        title: true,
        description: true,
        primary_trade: true,
        status: true,
        division_id: true,
        project_id: true,
        divisions: {
          select: { division_name: true },
        },
        projects: {
          select: { project_code: true, project_name: true },
        },
      },
    });

    return NextResponse.json(workOrders);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, divisionId, title, description, primaryTrade } = body;

    if (!projectId || !divisionId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    const workOrder = await prisma.work_orders.create({
      data: {
        work_order_number: workOrderNumber,
        division_id: divisionId,
        project_id: projectId,
        title,
        description: description || null,
        primary_trade: primaryTrade || null,
        status: 'InProgress',
        created_by_user_id: session.user.id,
      },
    });

    return NextResponse.json(workOrder);
  } catch (error) {
    console.error('Error creating work order:', error);
    return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 });
  }
}
