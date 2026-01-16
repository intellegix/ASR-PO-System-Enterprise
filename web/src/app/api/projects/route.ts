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

    const projects = await prisma.projects.findMany({
      where: { status: 'Active' },
      orderBy: { project_name: 'asc' },
      select: {
        id: true,
        project_code: true,
        project_name: true,
        district_name: true,
        property_address: true,
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

// Apply rate limiting
export const GET = withRateLimit(100, 60 * 1000)(getHandler);
