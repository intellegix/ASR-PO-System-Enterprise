import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { isAdmin } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const putHandler = async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
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
    const { id } = await context!.params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, role, divisionId, isActive, password } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (phone !== undefined) updateData.phone = phone || null;
    if (role !== undefined) {
      if (!['USER', 'ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Role must be USER or ADMIN' }, { status: 400 });
      }
      updateData.role = role;
    }
    if (divisionId !== undefined) updateData.division_id = divisionId || null;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (password) updateData.password_hash = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.users.update({
      where: { id },
      data: updateData,
      include: { divisions: { select: { division_name: true, division_code: true } } },
    });

    log.info('Admin updated user', {
      adminUserId: session.user.id,
      targetUserId: id,
      changes: Object.keys(updateData).filter(k => k !== 'updated_at'),
    });

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      phone: updatedUser.phone,
      role: updatedUser.role,
      divisionId: updatedUser.division_id,
      divisionName: updatedUser.divisions?.division_name || null,
      isActive: updatedUser.is_active,
      lastLoginAt: updatedUser.last_login_at,
    });
  } catch (error) {
    log.error('Failed to update user', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
};

export const PUT = withRateLimit(20, 60 * 1000)(putHandler);
