import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { hasPermission } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';
// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';


// GET handler for divisions
const getHandler = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user information
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true, division_id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions - divisions are reference data needed for PO creation
    if (!hasPermission(user.role as any, 'po:create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // For division leaders, they might only need to see their own division
    // For now, return all active divisions as they're needed for dropdowns
    const divisions = await prisma.divisions.findMany({
      where: { is_active: true },
      orderBy: { division_code: 'asc' },
      select: {
        id: true,
        division_code: true,
        division_name: true,
        cost_center_prefix: true,
        qb_class_name: true,
      },
    });

    log.info('Divisions retrieved', {
      userId: session.user.id,
      userRole: user.role,
      divisionCount: divisions.length,
    });

    return NextResponse.json(divisions);
  } catch (error) {
    log.error('Failed to fetch divisions', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json({ error: 'Failed to fetch divisions' }, { status: 500 });
  }
};

// Apply rate limiting
export const GET = withRateLimit(100, 60 * 1000)(getHandler);
