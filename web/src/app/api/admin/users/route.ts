import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { isAdmin } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

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
    const users = await prisma.users.findMany({
      include: { divisions: { select: { division_name: true, division_code: true } } },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(users.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      phone: u.phone,
      role: u.role,
      divisionId: u.division_id,
      divisionName: u.divisions?.division_name || null,
      divisionCode: u.divisions?.division_code || null,
      isActive: u.is_active,
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at,
    })));
  } catch (error) {
    log.error('Failed to fetch users', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
};

const postHandler = async (request: NextRequest) => {
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
    const { email, firstName, lastName, phone, role, divisionId, password } = body;

    if (!email || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Missing required fields: email, firstName, lastName, role' }, { status: 400 });
    }

    if (!['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Role must be USER or ADMIN' }, { status: 400 });
    }

    // Check email uniqueness
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const newUser = await prisma.users.create({
      data: {
        email,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        role,
        division_id: divisionId || null,
        password_hash: passwordHash,
        is_active: true,
      },
      include: { divisions: { select: { division_name: true, division_code: true } } },
    });

    log.info('Admin created user', {
      adminUserId: session.user.id,
      newUserId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return NextResponse.json({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      phone: newUser.phone,
      role: newUser.role,
      divisionId: newUser.division_id,
      divisionName: newUser.divisions?.division_name || null,
      isActive: newUser.is_active,
      createdAt: newUser.created_at,
    }, { status: 201 });
  } catch (error) {
    log.error('Failed to create user', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
};

export const GET = withRateLimit(50, 60 * 1000)(getHandler);
export const POST = withRateLimit(10, 60 * 1000)(postHandler);
