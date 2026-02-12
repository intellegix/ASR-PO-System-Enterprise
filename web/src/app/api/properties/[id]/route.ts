import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getHandler = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const property = await prisma.properties.findUnique({
      where: { id },
      include: {
        clients: { select: { id: true, client_name: true, client_code: true } },
        projects: {
          where: { status: 'Active' },
          orderBy: { project_name: 'asc' },
          select: {
            id: true,
            project_code: true,
            project_name: true,
            status: true,
            budget_total: true,
            po_count: true,
            primary_division_id: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error) {
    log.error('Failed to fetch property', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });
    return NextResponse.json({ error: 'Failed to fetch property' }, { status: 500 });
  }
};

export const GET = withRateLimit(100, 60 * 1000)(getHandler);
