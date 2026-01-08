import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json(divisions);
  } catch (error) {
    console.error('Error fetching divisions:', error);
    return NextResponse.json({ error: 'Failed to fetch divisions' }, { status: 500 });
  }
}
