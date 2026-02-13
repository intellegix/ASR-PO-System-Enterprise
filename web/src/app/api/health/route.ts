import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { hasPermission } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1 as test`;

    // Check if caller is an authenticated admin
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.id
      ? await prisma.users.findUnique({ where: { id: session.user.id }, select: { role: true } })
          .then(u => u && hasPermission(u.role, 'report:view'))
      : false;

    if (isAdmin) {
      const userCount = await prisma.users.count();
      const vendorCount = await prisma.vendors.count();
      const activeProjectsCount = await prisma.projects.count({
        where: { status: 'Active' }
      });

      return NextResponse.json({
        status: 'healthy',
        database: 'connected',
        metrics: {
          users: userCount,
          vendors: vendorCount,
          activeProjects: activeProjectsCount
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    }

    // Public: minimal response only
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}
