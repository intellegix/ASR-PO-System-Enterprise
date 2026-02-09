import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';
import { fetchActiveProjects } from '@/lib/raken/client';
import { findClarkRepForJob } from '@/lib/raken/clark-reps';

export const dynamic = 'force-dynamic';

interface GroupedContract {
  id: string | null;
  code: string;
  name: string;
  rakenUuid: string | null;
  status: string;
  lastSyncedAt: string | null;
}

interface GroupedProperty {
  name: string;
  contracts: GroupedContract[];
}

interface GroupedClarkRep {
  clarkRep: string;
  properties: GroupedProperty[];
}

/**
 * GET /api/raken/projects - Returns projects grouped by clark rep and property.
 * Query params:
 *   ?live=true  - Fetch directly from Raken API (bypasses DB)
 */
const getHandler = async (request: NextRequest): Promise<NextResponse> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const live = searchParams.get('live') === 'true';

    if (live) {
      // Fetch directly from Raken API and enrich with Clark rep data
      const rakenProjects = await fetchActiveProjects();
      const grouped = groupProjects(
        rakenProjects.map((rp) => {
          const match = findClarkRepForJob(rp.number);
          return {
            id: null,
            code: rp.number,
            name: rp.name,
            rakenUuid: rp.uuid,
            status: rp.status,
            lastSyncedAt: null,
            clarkRep: match?.clarkRep || 'Unassigned',
            property: match?.property || 'Unknown',
          };
        })
      );
      return NextResponse.json({ source: 'live', data: grouped });
    }

    // Return from local DB, grouped by clark_rep and district_name
    const projects = await prisma.projects.findMany({
      where: { status: 'Active' },
      orderBy: [{ clark_rep: 'asc' }, { district_name: 'asc' }, { project_code: 'asc' }],
      select: {
        id: true,
        project_code: true,
        project_name: true,
        raken_uuid: true,
        clark_rep: true,
        district_name: true,
        status: true,
        last_synced_at: true,
      },
    });

    const grouped = groupProjects(
      projects.map((p) => ({
        id: p.id,
        code: p.project_code,
        name: p.project_name,
        rakenUuid: p.raken_uuid,
        status: p.status || 'Active',
        lastSyncedAt: p.last_synced_at?.toISOString() || null,
        clarkRep: p.clark_rep || 'Unassigned',
        property: p.district_name || 'Unknown',
      }))
    );

    log.info('Raken projects: Retrieved grouped projects', {
      userId: session.user.id,
      repCount: grouped.length,
      projectCount: projects.length,
    });

    return NextResponse.json({ source: 'database', data: grouped });
  } catch (error) {
    log.error('Raken projects: Failed to fetch', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json({ error: 'Failed to fetch Raken projects' }, { status: 500 });
  }
};

function groupProjects(
  items: Array<{
    id: string | null;
    code: string;
    name: string;
    rakenUuid: string | null;
    status: string;
    lastSyncedAt: string | null;
    clarkRep: string;
    property: string;
  }>
): GroupedClarkRep[] {
  const repMap = new Map<string, Map<string, GroupedContract[]>>();

  for (const item of items) {
    if (!repMap.has(item.clarkRep)) {
      repMap.set(item.clarkRep, new Map());
    }
    const propMap = repMap.get(item.clarkRep)!;
    if (!propMap.has(item.property)) {
      propMap.set(item.property, []);
    }
    propMap.get(item.property)!.push({
      id: item.id,
      code: item.code,
      name: item.name,
      rakenUuid: item.rakenUuid,
      status: item.status,
      lastSyncedAt: item.lastSyncedAt,
    });
  }

  const result: GroupedClarkRep[] = [];
  for (const [repName, propMap] of repMap) {
    const properties: GroupedProperty[] = [];
    for (const [propName, contracts] of propMap) {
      properties.push({ name: propName, contracts });
    }
    properties.sort((a, b) => a.name.localeCompare(b.name));
    result.push({ clarkRep: repName, properties });
  }
  result.sort((a, b) => a.clarkRep.localeCompare(b.clarkRep));

  return result;
}

export const GET = withRateLimit(100, 60 * 1000)(getHandler);
