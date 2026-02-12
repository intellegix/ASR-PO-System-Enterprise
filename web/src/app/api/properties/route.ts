import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { hasPermission } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import { createPropertySchema } from '@/lib/validation/schemas';
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

    if (!user || !hasPermission(user.role as any, 'po:create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    const where: Record<string, unknown> = { is_active: true };
    if (clientId) {
      where.client_id = clientId;
    }

    const properties = await prisma.properties.findMany({
      where,
      orderBy: { property_name: 'asc' },
      include: {
        clients: { select: { id: true, client_name: true, client_code: true } },
        _count: { select: { projects: true, po_headers: true } },
      },
    });

    return NextResponse.json(properties);
  } catch (error) {
    log.error('Failed to fetch properties', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
};

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

    if (!user || !hasPermission(user.role as any, 'po:create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createPropertySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { clientId, propertyName, propertyAddress, city, state, zip, notes } = parsed.data;

    // Verify client exists
    const client = await prisma.clients.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const property = await prisma.properties.create({
      data: {
        client_id: clientId,
        property_name: propertyName,
        property_address: propertyAddress || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        notes: notes || null,
      },
      include: {
        clients: { select: { id: true, client_name: true, client_code: true } },
      },
    });

    log.info('Property created', {
      userId: session.user.id,
      propertyId: property.id,
      clientId,
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    log.error('Failed to create property', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });
    return NextResponse.json({ error: 'Failed to create property' }, { status: 500 });
  }
};

export const GET = withRateLimit(100, 60 * 1000)(getHandler);
export const POST = withRateLimit(20, 60 * 1000)(postHandler);
