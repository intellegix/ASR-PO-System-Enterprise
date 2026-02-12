/**
 * POST /api/sync/clark-reps
 * Receives Clark Reps data from Certified Payroll and updates projects in the DB.
 * Auth: SYNC_API_KEY (server-to-server, no session required)
 */

import { NextRequest, NextResponse } from 'next/server';
import log, { auditLog } from '@/lib/logging/logger';
import prisma from '@/lib/db';
import { validateSyncApiKey, syncUnauthorizedResponse } from '@/lib/sync/auth';
import { withRateLimit } from '@/lib/validation/middleware';

export const dynamic = 'force-dynamic';

interface ClarkRepPayload {
  clark_reps: Array<{
    name: string;
    properties: Array<{
      name: string;
      jobs: string[];
    }>;
  }>;
  updated_at?: string;
}

interface SyncResult {
  synced: number;
  updated: number;
  not_found: number;
  errors: string[];
}

const postHandler = async (request: NextRequest): Promise<NextResponse> => {
  // Validate API key
  const auth = validateSyncApiKey(request);
  if (!auth.authenticated) {
    return syncUnauthorizedResponse(auth.error!);
  }

  try {
    const body: ClarkRepPayload = await request.json();

    if (!body.clark_reps || !Array.isArray(body.clark_reps)) {
      return NextResponse.json(
        { error: 'Invalid payload: expected { clark_reps: [...] }' },
        { status: 400 }
      );
    }

    log.info('Clark Reps sync: Starting', {
      reps: body.clark_reps.length,
      source: 'certified-payroll',
    });

    // Build a flat lookup: job_code -> { clark_rep, property }
    const jobLookup = new Map<string, { clarkRep: string; property: string }>();
    for (const rep of body.clark_reps) {
      for (const prop of rep.properties) {
        for (const job of prop.jobs) {
          const normalized = job.toUpperCase().replace(/\s+/g, ' ').trim();
          jobLookup.set(normalized, { clarkRep: rep.name, property: prop.name });
        }
      }
    }

    const result: SyncResult = {
      synced: jobLookup.size,
      updated: 0,
      not_found: 0,
      errors: [],
    };

    // Get all projects from DB
    const allProjects = await prisma.projects.findMany({
      select: { id: true, project_code: true, clark_rep: true, district_name: true },
    });

    const now = new Date();

    for (const project of allProjects) {
      const normalized = project.project_code.toUpperCase().replace(/\s+/g, ' ').trim();

      // Try exact match first
      let match = jobLookup.get(normalized);

      // Try normalized without spaces (e.g. "CY25020" matches "CY25 020")
      if (!match) {
        const noSpaces = normalized.replace(/\s+/g, '');
        for (const [key, val] of jobLookup) {
          if (key.replace(/\s+/g, '') === noSpaces) {
            match = val;
            break;
          }
        }
      }

      if (match) {
        try {
          await prisma.projects.update({
            where: { id: project.id },
            data: {
              clark_rep: match.clarkRep,
              district_name: match.property,
              last_synced_at: now,
              updated_at: now,
            },
          });
          result.updated++;
        } catch (err) {
          const msg = `Failed to update project ${project.project_code}: ${err instanceof Error ? err.message : String(err)}`;
          log.error(msg);
          result.errors.push(msg);
        }
      } else {
        result.not_found++;
      }
    }

    auditLog('CLARK_REPS_SYNC', 'projects', 'batch', {
      synced: result.synced,
      updated: result.updated,
      not_found: result.not_found,
      errorCount: result.errors.length,
    });

    log.info('Clark Reps sync: Complete', result);

    return NextResponse.json(result);
  } catch (error) {
    log.error('Clark Reps sync: Failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Clark Reps sync failed', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};

export const POST = withRateLimit(20, 60 * 1000)(postHandler);
