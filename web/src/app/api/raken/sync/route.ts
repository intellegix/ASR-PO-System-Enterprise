import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { withRateLimit } from '@/lib/validation/middleware';
import log, { auditLog } from '@/lib/logging/logger';
import prisma from '@/lib/db';
import { fetchActiveProjects } from '@/lib/raken/client';
import { findClarkRepForJobFromDB } from '@/lib/raken/clark-reps';

export const dynamic = 'force-dynamic';

interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * POST /api/raken/sync - Trigger a Raken project sync
 */
const postHandler = async (_request: NextRequest): Promise<NextResponse> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    log.info('Raken sync: Starting', { userId: session.user.id });

    const rakenProjects = await fetchActiveProjects();
    const result: SyncResult = {
      synced: rakenProjects.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (const rp of rakenProjects) {
      try {
        const clarkMatch = await findClarkRepForJobFromDB(rp.number);

        // Try to find existing project by raken_uuid first, then by project_code
        const existing = await prisma.projects.findFirst({
          where: {
            OR: [
              { raken_uuid: rp.uuid },
              { project_code: rp.number },
            ],
          },
        });

        const now = new Date();

        if (existing) {
          // Update existing project - don't overwrite budget or PO-specific fields
          await prisma.projects.update({
            where: { id: existing.id },
            data: {
              raken_uuid: rp.uuid,
              project_name: rp.name,
              project_code: existing.project_code, // keep original if manually set
              district_name: clarkMatch?.property || existing.district_name,
              clark_rep: clarkMatch?.clarkRep || existing.clark_rep,
              status: 'Active',
              last_synced_at: now,
              updated_at: now,
            },
          });
          result.updated++;
        } else {
          // Create new project from Raken data
          await prisma.projects.create({
            data: {
              project_code: rp.number,
              project_name: rp.name,
              raken_uuid: rp.uuid,
              district_name: clarkMatch?.property || null,
              clark_rep: clarkMatch?.clarkRep || null,
              status: 'Active',
              last_synced_at: now,
            },
          });
          result.created++;
        }
      } catch (err) {
        const msg = `Failed to sync project ${rp.number}: ${err instanceof Error ? err.message : String(err)}`;
        log.error(msg);
        result.errors.push(msg);
      }
    }

    auditLog('RAKEN_SYNC', 'projects', 'batch', {
      synced: result.synced,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errorCount: result.errors.length,
    }, { userId: session.user.id });

    log.info('Raken sync: Complete', {
      userId: session.user.id,
      ...result,
      errors: result.errors.length,
    });

    return NextResponse.json(result);
  } catch (error) {
    log.error('Raken sync: Failed', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: 'Raken sync failed', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};

/**
 * GET /api/raken/sync - Get last sync status
 */
const getHandler = async (_request: NextRequest): Promise<NextResponse> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find the most recently synced project to get last sync time
    const lastSynced = await prisma.projects.findFirst({
      where: { last_synced_at: { not: null } },
      orderBy: { last_synced_at: 'desc' },
      select: { last_synced_at: true },
    });

    const syncedCount = await prisma.projects.count({
      where: { raken_uuid: { not: null } },
    });

    const totalProjects = await prisma.projects.count();

    return NextResponse.json({
      lastSyncedAt: lastSynced?.last_synced_at || null,
      syncedProjects: syncedCount,
      totalProjects,
    });
  } catch (error) {
    log.error('Raken sync status: Failed', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 });
  }
};

export const POST = withRateLimit(10, 60 * 1000)(postHandler);
export const GET = withRateLimit(100, 60 * 1000)(getHandler);
