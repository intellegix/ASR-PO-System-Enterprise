/**
 * GET /api/sync/projects
 * Returns all active projects with client info for Certified Payroll to consume.
 * Auth: SYNC_API_KEY (server-to-server, no session required)
 */

import { NextRequest, NextResponse } from 'next/server';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';
import { validateSyncApiKey, syncUnauthorizedResponse } from '@/lib/sync/auth';
import { withRateLimit } from '@/lib/validation/middleware';

export const dynamic = 'force-dynamic';

const getHandler = async (request: NextRequest): Promise<NextResponse> => {
  // Validate API key
  const auth = validateSyncApiKey(request);
  if (!auth.authenticated) {
    return syncUnauthorizedResponse(auth.error!);
  }

  try {
    // Only return Clark projects (CY## codes) — Certified Payroll doesn't need non-Clark data
    const projects = await prisma.projects.findMany({
      where: {
        status: 'Active',
        project_code: { startsWith: 'CY', mode: 'insensitive' },
      },
      include: {
        clients: {
          select: {
            id: true,
            client_name: true,
            client_code: true,
            category: true,
          },
        },
      },
      orderBy: { project_code: 'asc' },
    });

    // Only return clients associated with Clark projects (not the full client list)
    const clientIds = new Set(projects.map((p) => p.customer_id).filter(Boolean));
    const clients = await prisma.clients.findMany({
      where: {
        id: { in: [...clientIds] as string[] },
        is_active: true,
      },
      select: {
        id: true,
        client_name: true,
        client_code: true,
        category: true,
      },
      orderBy: { client_name: 'asc' },
    });

    // Format response
    const projectsFormatted = projects.map((p) => ({
      id: p.id,
      project_code: p.project_code,
      project_name: p.project_name,
      clark_rep: p.clark_rep,
      property: p.district_name,
      status: p.status,
      client: p.clients
        ? {
            name: p.clients.client_name,
            code: p.clients.client_code,
          }
        : null,
    }));

    log.info('Sync projects: Served', {
      projects: projectsFormatted.length,
      clients: clients.length,
    });

    return NextResponse.json({
      projects: projectsFormatted,
      clients: clients.map((c) => ({
        id: c.id,
        client_name: c.client_name,
        client_code: c.client_code,
        category: c.category,
      })),
    });
  } catch (error) {
    log.error('Sync projects: Failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to fetch projects', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};

export const GET = withRateLimit(60, 60 * 1000)(getHandler);
