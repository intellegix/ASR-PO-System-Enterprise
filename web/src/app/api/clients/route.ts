import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { hasPermission } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const getHandler = async (request: NextRequest) => {
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

    const clients = await prisma.clients.findMany({
      where: { is_active: true },
      orderBy: { client_name: 'asc' },
      select: {
        id: true,
        client_name: true,
        client_code: true,
        category: true,
        parent_entity: true,
        aliases: true,
        contact_name: true,
        contact_email: true,
        contact_phone: true,
        address: true,
      },
    });

    log.info('Clients retrieved', {
      userId: session.user.id,
      userRole: user.role,
      clientCount: clients.length,
    });

    return NextResponse.json(clients);
  } catch (error) {
    log.error('Failed to fetch clients', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
};

export const GET = withRateLimit(100, 60 * 1000)(getHandler);
