import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADMIN_ROLES = ['DIRECTOR_OF_SYSTEMS_INTEGRATIONS', 'MAJORITY_OWNER'];

const deleteHandler = async (
  _request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Admin role check
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !ADMIN_ROLES.includes(user.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await context!.params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Verify project exists
    const project = await prisma.projects.findUnique({
      where: { id },
      select: { id: true, project_code: true, project_name: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Dependency check: POs and work orders
    const [poCount, woCount] = await Promise.all([
      prisma.po_headers.count({ where: { project_id: id, deleted_at: null } }),
      prisma.work_orders.count({ where: { project_id: id } }),
    ]);

    if (poCount > 0 || woCount > 0) {
      const parts: string[] = [];
      if (poCount > 0) parts.push(`${poCount} PO${poCount !== 1 ? 's' : ''}`);
      if (woCount > 0) parts.push(`${woCount} work order${woCount !== 1 ? 's' : ''}`);
      return NextResponse.json(
        { error: `Cannot delete: ${parts.join(' and ')} reference this project` },
        { status: 409 }
      );
    }

    // Hard delete
    await prisma.projects.delete({ where: { id } });

    log.info('Project deleted', {
      userId: session.user.id,
      userRole: user.role,
      projectId: id,
      projectCode: project.project_code,
    });

    return NextResponse.json({ success: true, project_code: project.project_code });
  } catch (error) {
    log.error('Failed to delete project', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
};

const patchHandler = async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !ADMIN_ROLES.includes(user.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await context!.params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const body = await request.json();
    const { primaryDivisionId } = body;

    if (primaryDivisionId && !UUID_REGEX.test(primaryDivisionId)) {
      return NextResponse.json({ error: 'Invalid division ID' }, { status: 400 });
    }

    const project = await prisma.projects.update({
      where: { id },
      data: {
        primary_division_id: primaryDivisionId || null,
        updated_at: new Date(),
      },
      select: {
        id: true,
        project_code: true,
        project_name: true,
        primary_division_id: true,
      },
    });

    log.info('Project division updated', {
      userId: session.user.id,
      projectId: id,
      primaryDivisionId,
    });

    return NextResponse.json(project);
  } catch (error) {
    log.error('Failed to update project', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
};

export const DELETE = withRateLimit(10, 60 * 1000)(deleteHandler);
export const PATCH = withRateLimit(20, 60 * 1000)(patchHandler);
