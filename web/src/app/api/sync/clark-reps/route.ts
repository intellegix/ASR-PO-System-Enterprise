/**
 * POST /api/sync/clark-reps
 * Receives Clark Reps data from Certified Payroll and updates projects in the DB.
 * Auth: SYNC_API_KEY (server-to-server, no session required)
 *
 * Hardening: idempotency keys, transaction wrapping, source_system tracking.
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
  source_system?: string;
}

interface SyncResult {
  synced: number;
  updated: number;
  not_found: number;
  not_found_projects: string[];
  errors: string[];
}

const postHandler = async (request: NextRequest): Promise<NextResponse> => {
  // Validate API key
  const auth = validateSyncApiKey(request);
  if (!auth.authenticated) {
    return syncUnauthorizedResponse(auth.error!);
  }

  const idempotencyKey = request.headers.get('X-Idempotency-Key');
  const sourceSystem = request.headers.get('X-Source-System') || 'unknown';

  // Idempotency check: if we've seen this key before, return the cached response
  if (idempotencyKey) {
    try {
      const existing = await prisma.syncIdempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });
      if (existing && existing.expires_at > new Date()) {
        log.info('Clark Reps sync: Returning cached response for idempotency key', {
          key: idempotencyKey,
          source: sourceSystem,
        });
        return NextResponse.json(existing.response as object);
      }
      // If expired, delete it so we can re-process
      if (existing) {
        await prisma.syncIdempotencyKey.delete({ where: { key: idempotencyKey } });
      }
    } catch (err) {
      // If the model doesn't exist yet (migration pending), log and continue
      log.warn('Idempotency check failed (table may not exist yet)', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
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
      source: sourceSystem,
      idempotencyKey: idempotencyKey || 'none',
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
      not_found_projects: [],
      errors: [],
    };

    // Get all projects from DB
    const allProjects = await prisma.projects.findMany({
      select: { id: true, project_code: true, clark_rep: true, district_name: true },
    });

    const now = new Date();

    // Batch updates inside a transaction for atomicity
    const updates: Array<{ id: string; clarkRep: string; property: string }> = [];

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
        updates.push({ id: project.id, clarkRep: match.clarkRep, property: match.property });
      } else {
        result.not_found++;
        result.not_found_projects.push(project.project_code);
      }
    }

    // Execute all updates in a single transaction
    if (updates.length > 0) {
      try {
        await prisma.$transaction(
          updates.map((u) =>
            prisma.projects.update({
              where: { id: u.id },
              data: {
                clark_rep: u.clarkRep,
                district_name: u.property,
                last_synced_at: now,
                updated_at: now,
              },
            })
          )
        );
        result.updated = updates.length;
      } catch (err) {
        const msg = `Transaction failed: ${err instanceof Error ? err.message : String(err)}`;
        log.error(msg);
        result.errors.push(msg);
      }
    }

    auditLog('CLARK_REPS_SYNC', 'projects', 'batch', {
      synced: result.synced,
      updated: result.updated,
      not_found: result.not_found,
      errorCount: result.errors.length,
      source: sourceSystem,
    });

    log.info('Clark Reps sync: Complete', result as unknown as Record<string, unknown>);

    const responseData = { success: true, ...result };

    // Store idempotency key with 24h TTL
    if (idempotencyKey) {
      try {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await prisma.syncIdempotencyKey.upsert({
          where: { key: idempotencyKey },
          update: { response: responseData as object, expires_at: expiresAt },
          create: {
            key: idempotencyKey,
            endpoint: '/api/sync/clark-reps',
            response: responseData as object,
            expires_at: expiresAt,
          },
        });
      } catch (err) {
        // Non-fatal: log and continue (table may not exist yet)
        log.warn('Failed to store idempotency key', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json(responseData);
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
