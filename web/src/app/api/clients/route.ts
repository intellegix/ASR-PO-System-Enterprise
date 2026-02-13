import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { hasPermission, type UserRole } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const getHandler = async (_request: NextRequest) => {
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

    if (!hasPermission(user.role as UserRole, 'po:create')) {
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

    if (!hasPermission(user.role as UserRole, 'po:create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { client_name, client_code, category, parent_entity, contact_name, contact_email, contact_phone, address } = body;

    if (!client_name || !client_code) {
      return NextResponse.json({ error: 'client_name and client_code are required' }, { status: 400 });
    }

    const existing = await prisma.clients.findUnique({
      where: { client_code },
    });

    if (existing) {
      return NextResponse.json({ error: 'A client with this code already exists' }, { status: 409 });
    }

    const client = await prisma.clients.create({
      data: {
        client_name,
        client_code,
        category: category || null,
        parent_entity: parent_entity || null,
        contact_name: contact_name || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        address: address || null,
        is_active: true,
      },
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

    log.info('Client created', {
      userId: session.user.id,
      userRole: user.role,
      clientId: client.id,
      clientCode: client.client_code,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    log.error('Failed to create client', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
};

export const POST = withRateLimit(20, 60 * 1000)(postHandler);
