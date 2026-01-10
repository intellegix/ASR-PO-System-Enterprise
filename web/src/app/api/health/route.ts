import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    // Test basic database connectivity
    await prisma.$queryRaw`SELECT 1 as test`;

    // Get basic metrics
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
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}