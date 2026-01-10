import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { hasPermission } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
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

    // Check permissions
    if (!hasPermission(user.role as any, 'report:view') ||
        !['MAJORITY_OWNER', 'DIVISION_LEADER', 'ACCOUNTING'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get available users who have performed actions
    let usersWhere: any = {
      is_active: true,
    };

    // Division leaders only see users from their division
    if (user.role === 'DIVISION_LEADER' && user.division_id) {
      usersWhere.division_id = user.division_id;
    }

    const users = await prisma.users.findMany({
      where: usersWhere,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
      },
      orderBy: [
        { first_name: 'asc' },
        { last_name: 'asc' },
      ],
    });

    // Transform users for dropdown
    const userOptions = users.map(user => ({
      id: user.id,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      email: user.email,
      role: user.role,
    }));

    // Get available actions
    const actions = [
      'Created',
      'Submitted',
      'Approved',
      'Rejected',
      'Issued',
      'Received',
      'Invoiced',
      'Paid',
      'Cancelled',
    ];

    return NextResponse.json({
      users: userOptions,
      actions,
    });

  } catch (error) {
    console.error('Failed to fetch audit filters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filters' },
      { status: 500 }
    );
  }
}