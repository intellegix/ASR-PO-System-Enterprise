import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { hasPermission } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';
// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';


// GET handler for projects
const getHandler = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user information
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions - projects are reference data needed for PO creation
    if (!hasPermission(user.role as any, 'po:create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const divisionId = searchParams.get('divisionId');

    const where: Record<string, unknown> = { status: 'Active' };
    if (divisionId) {
      where.primary_division_id = divisionId;
    }

    const projects = await prisma.projects.findMany({
      where,
      orderBy: { project_name: 'asc' },
      select: {
        id: true,
        project_code: true,
        project_name: true,
        district_name: true,
        property_address: true,
        clark_rep: true,
        raken_uuid: true,
        last_synced_at: true,
        primary_division_id: true,
      },
    });

    log.info('Projects retrieved', {
      userId: session.user.id,
      userRole: user.role,
      projectCount: projects.length,
    });

    return NextResponse.json(projects);
  } catch (error) {
    log.error('Failed to fetch projects', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
};

// POST handler for creating projects
const postHandler = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!hasPermission(user.role as any, 'po:create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { project_code, project_name, customer_id, district_name, property_address } = body;

    if (!project_code || !project_name) {
      return NextResponse.json({ error: 'project_code and project_name are required' }, { status: 400 });
    }

    if (project_code.length > 15) {
      return NextResponse.json({ error: 'project_code must be 15 characters or fewer' }, { status: 400 });
    }

    if (project_name.length > 200) {
      return NextResponse.json({ error: 'project_name must be 200 characters or fewer' }, { status: 400 });
    }

    const existing = await prisma.projects.findUnique({
      where: { project_code },
    });

    if (existing) {
      return NextResponse.json({ error: 'A project with this code already exists' }, { status: 409 });
    }

    const project = await prisma.projects.create({
      data: {
        project_code,
        project_name,
        customer_id: customer_id || null,
        district_name: district_name || null,
        property_address: property_address || null,
        status: 'Active',
      },
      select: {
        id: true,
        project_code: true,
        project_name: true,
        district_name: true,
        property_address: true,
      },
    });

    log.info('Project created', {
      userId: session.user.id,
      userRole: user.role,
      projectId: project.id,
      projectCode: project.project_code,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    log.error('Failed to create project', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
};

// Apply rate limiting
export const GET = withRateLimit(100, 60 * 1000)(getHandler);
export const POST = withRateLimit(20, 60 * 1000)(postHandler);
