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
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = await prisma.clients.findUnique({
      where: { id },
      include: {
        properties: {
          where: { is_active: true },
          orderBy: { property_name: 'asc' },
          include: {
            _count: { select: { projects: true } },
          },
        },
        _count: { select: { projects: true, po_headers: true } },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    log.error('Failed to fetch client', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
};

export const GET = withRateLimit(100, 60 * 1000)(getHandler as (request: NextRequest, context?: { params: Promise<{ id: string }> }) => Promise<NextResponse>);
