import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { isAdmin } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const getHandler = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !isAdmin(user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const divisions = await prisma.divisions.findMany({
      include: {
        users: { where: { is_active: true }, select: { id: true, first_name: true, last_name: true, role: true } },
        division_leaders: { select: { id: true, name: true, email: true } },
        _count: { select: { po_headers: true, work_orders: true, projects: true } },
      },
      orderBy: { division_code: 'asc' },
    });

    return NextResponse.json(divisions.map(d => ({
      id: d.id,
      divisionName: d.division_name,
      divisionCode: d.division_code,
      qbClassName: d.qb_class_name,
      costCenterPrefix: d.cost_center_prefix,
      isActive: d.is_active,
      users: d.users.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`, role: u.role })),
      leaders: d.division_leaders.map(l => ({ id: l.id, name: l.name, email: l.email })),
      counts: { pos: d._count.po_headers, workOrders: d._count.work_orders, projects: d._count.projects },
      createdAt: d.created_at,
    })));
  } catch (error) {
    log.error('Failed to fetch divisions', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to fetch divisions' }, { status: 500 });
  }
};

const putHandler = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUser = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!adminUser || !isAdmin(adminUser.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, divisionName, qbClassName, costCenterPrefix, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Division ID required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (divisionName !== undefined) updateData.division_name = divisionName;
    if (qbClassName !== undefined) updateData.qb_class_name = qbClassName || null;
    if (costCenterPrefix !== undefined) updateData.cost_center_prefix = costCenterPrefix || null;
    if (isActive !== undefined) updateData.is_active = isActive;

    const division = await prisma.divisions.update({
      where: { id },
      data: updateData,
    });

    log.info('Admin updated division', {
      adminUserId: session.user.id,
      divisionId: id,
      changes: Object.keys(updateData).filter(k => k !== 'updated_at'),
    });

    return NextResponse.json(division);
  } catch (error) {
    log.error('Failed to update division', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to update division' }, { status: 500 });
  }
};

export const GET = withRateLimit(50, 60 * 1000)(getHandler);
export const PUT = withRateLimit(10, 60 * 1000)(putHandler);
