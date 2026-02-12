/**
 * Clark Reps Mapping Service
 * Maps contract codes to Clark representatives and properties.
 *
 * Primary: DB-backed lookup (synced from Certified Payroll via /api/sync/clark-reps)
 * Fallback: Hardcoded data snapshot (2024-12-30) used when DB has no assignments
 */

import prisma from '@/lib/db';

interface ClarkRepData {
  name: string;
  properties: Array<{
    name: string;
    jobs: string[];
  }>;
}

export interface ClarkRepMatch {
  clarkRep: string;
  property: string;
}

export interface PropertyInfo {
  property: string;
  clarkRep: string;
  contracts: string[];
}

const CLARK_REPS_DATA: ClarkRepData[] = [
  {
    name: 'Billie Brown',
    properties: [
      { name: 'El Centro', jobs: ['CY25EC', 'CY24EC'] },
      { name: 'Eucalyptus Ridge', jobs: ['CY21S2 024', 'CY23 001', 'CY20S3 001', 'CY20S3 002', 'CY22S2 022', 'CY21 016', 'CY23S2 001', 'CY22S2 001'] },
      { name: 'Hilleary Park', jobs: ['CY21S2 030', 'CY21S2 026', 'CY21S2 033', 'CY21S2 025', 'CY21S3 008', 'CY21S3 010'] },
      { name: 'Mira Mesa', jobs: ['CY23 004'] },
      { name: 'Miramar', jobs: ['CY24 025', 'CY22 003', 'CY21 011', 'CY23S3 CON', 'CY24 042', 'CY22S3 CON', 'CY20S2 008', 'CY21S2 018', 'CY23 017', 'CY24 018', 'CY24 033', 'CY20S2 012', 'CY23 007', 'CY21S2 012', 'CY22S2 002', 'CY23S2'] },
      { name: 'Pomerado Terrace', jobs: ['CY24 023', 'CY25 005'] },
      { name: 'Ramona Vista', jobs: ['CY22 007', 'CY19S2 023'] },
      { name: 'River Place', jobs: ['CY25 006', 'CY24 005', 'CY19S2 023', 'CY22S2 003', 'CY21 008', 'CY24 020', 'CY23S2 009'] },
      { name: 'Sea Breeze', jobs: ['CY23V 017', 'CY23V2 001', 'CY20V 009', 'CY22V 003', 'CY23V 019', 'CY22V 014', 'CY21V 005', 'CY23V 006', 'CY23V2 004', 'CY22V 001', 'CY21V 004', 'CY20V 010'] },
      { name: 'Vista Ridge', jobs: ['CY23S2 015', 'CY25 TEMP'] },
      { name: 'Woodlake', jobs: ['CY20S3 005'] },
    ],
  },
  {
    name: 'Billy Powell',
    properties: [
      { name: 'Bayview', jobs: ['CY22S2 011', 'CY22S2 019', 'CY24 001', 'CY25 CON', 'CY24 040', 'CY23S2 018'] },
      { name: 'Bonita Bluffs', jobs: ['CY20S2 029', 'CY24 013', 'CY23S2 014', 'CY21S3 014', 'CY24 028', 'CY24 TEMP', 'CY25 012', 'CY25 004', 'CY22 020'] },
      { name: 'Lofgren', jobs: ['CY21S2 019', 'CY20S2 023', 'CY24 008', 'CY20S3 008', 'CY21S3 011', 'CY23 013', 'CY25 019'] },
      { name: 'Paradise Gardens', jobs: ['CY22S2 026', 'CY24 CON'] },
      { name: 'Silver Strand', jobs: ['CY22 012'] },
    ],
  },
  {
    name: 'Cole Kinsley',
    properties: [
      { name: 'Chesterton', jobs: ['CY24 029', 'CY24TEMP', 'CY24 012', 'CY25 015', 'CY24 036', 'CY25 020', 'CY22 002', 'CY24 002', 'CY24 007', 'CY24 019', 'CY23 008'] },
      { name: 'Chollas Heights', jobs: ['CY22S2 013', 'CY24 035', 'CY23 002', 'CY22S2 009', 'CY23 005', 'CY23S2 007', 'CY22S2 015'] },
      { name: 'VSM', jobs: ['CY18A 025', 'CY23S2 025', 'CY21S3 001', 'CY22 018', 'CY24 009'] },
    ],
  },
  {
    name: 'Daniel Norlander',
    properties: [
      { name: 'Admiral Hartman', jobs: ['CY24 014', 'CY24 017', 'CY24 Temp', 'CY25 011', 'CY24LI2012', 'CY24 050'] },
      { name: 'Gateway', jobs: ['CY24 006', 'CY25 010', 'CY24 058'] },
      { name: 'NAB', jobs: ['CY24 039', 'CY24 052'] },
      { name: 'NASNI', jobs: ['CY23S2 002', 'CY22S2 017', 'CY23S2 011'] },
      { name: 'NBSD', jobs: ['CY24 051'] },
      { name: 'NTC', jobs: ['CY22 009', 'CY22S2 016', 'CY21S2 031', 'CY22S2 006'] },
      { name: 'Sub-Base', jobs: ['CY21S3 006'] },
    ],
  },
  {
    name: 'Dick Brackenbury',
    properties: [
      { name: 'Orleck Heights', jobs: ['CY23S2 013', 'CY23S2 016', 'CY23S2 017', 'CY24 015', 'CY25 027', 'CY25 024', 'CY24 021', 'CY24 057', 'CY24 043'] },
      { name: 'Santo Terrace', jobs: ['CY22S2 024', 'CY23S2 008', 'CY24 004', 'CY23S2 001'] },
    ],
  },
  {
    name: 'Henry Amostegui & Trevin Johnson',
    properties: [
      { name: 'Anacapa', jobs: ['CY21V 015', 'CY22V 004', 'CY23V 002', 'CY23V 009', 'CY23V2 005', 'CY24VEC001', 'CY24V 010', 'CY24VEC 004', 'CY25VEC001', 'CY24VEC003', 'CY24VEC 00', 'CY23V 018', 'CY24V 007'] },
      { name: 'Bruns Park', jobs: ['CY22V 008', 'CY22V', 'CY23V 003', 'CY24V CHOR', 'CY24V 003', 'CY23V 020', 'CY22V 007'] },
      { name: 'Point Mugu Base', jobs: ['CY22V 018'] },
      { name: 'Port Hueneme Base', jobs: ['CY24V CON', 'CY22V 017'] },
      { name: 'San Miguel', jobs: ['CY25VECCON'] },
      { name: 'Santa Cruz', jobs: ['CY24VECCON'] },
      { name: 'Santa Rosa', jobs: ['CY21V 012', 'CY22V 020', 'CY20V2 010', 'CY21V 013', 'CY22V 019', 'CY24V 005', 'CY23V 001', 'CY25VCON'] },
      { name: 'Ventura', jobs: ['CY20V 005', 'CY24V SOWO', 'CY22V 002', 'CY21V 010', 'CY23V', 'CY24V 001'] },
    ],
  },
  {
    name: 'Jon Scotvold',
    properties: [
      { name: 'China Lake', jobs: ['CY21CL', 'CY22CL'] },
    ],
  },
  {
    name: 'Monty Moritz',
    properties: [
      { name: 'Beech Street Knolls', jobs: ['CY23 TEMP2', 'CY25 013', 'CY24 046', 'CY23 TEMP3', 'CY21 018', 'CY20S3 003', 'CY22S2 030', 'CY20S3 013', 'CY23S2 020'] },
      { name: 'Home Terrace', jobs: ['CY23 011', 'CY22 001', 'CY22 019'] },
      { name: 'Howard Gilmore', jobs: ['CY23 012', 'CY21 017'] },
      { name: 'La Mesa Park', jobs: ['CY22S2 012', 'CY23S3 001', 'CY23S2 006', 'CY24 027', 'CY23S2 004', 'CY24 055', 'CY24 000', 'CY22 016'] },
      { name: 'Murphy Canyon', jobs: ['CY22 017'] },
      { name: 'Terrace View', jobs: ['CY22S2 008'] },
    ],
  },
  {
    name: 'Russel Souza',
    properties: [
      { name: 'Lemoore', jobs: ['CY21L 002', 'CY23L CON'] },
    ],
  },
  {
    name: 'Tom Cuevas',
    properties: [
      { name: 'Park Summit', jobs: ['CY21 022', 'CY21 021', 'CY24 061', 'CY24 054'] },
    ],
  },
];

// Build a lookup index: normalized contract code -> { clarkRep, property }
// Normalize by uppercasing and stripping extra whitespace
const contractIndex = new Map<string, ClarkRepMatch>();

for (const rep of CLARK_REPS_DATA) {
  for (const prop of rep.properties) {
    for (const job of prop.jobs) {
      const normalized = job.toUpperCase().replace(/\s+/g, ' ').trim();
      contractIndex.set(normalized, {
        clarkRep: rep.name,
        property: prop.name,
      });
    }
  }
}

/**
 * Find the Clark rep and property for a given contract/job code.
 * Tries exact match first, then normalized match.
 */
export function findClarkRepForJob(contractCode: string): ClarkRepMatch | null {
  const normalized = contractCode.toUpperCase().replace(/\s+/g, ' ').trim();
  return contractIndex.get(normalized) || null;
}

/**
 * Get all properties grouped by Clark rep.
 */
export function getAllProperties(): PropertyInfo[] {
  const result: PropertyInfo[] = [];
  for (const rep of CLARK_REPS_DATA) {
    for (const prop of rep.properties) {
      result.push({
        property: prop.name,
        clarkRep: rep.name,
        contracts: prop.jobs,
      });
    }
  }
  return result;
}

/**
 * Get the raw Clark reps data for API responses.
 * Returns hardcoded fallback data (used by Raken sync for initial lookup).
 */
export function getClarkRepsData(): ClarkRepData[] {
  return CLARK_REPS_DATA;
}

/**
 * DB-backed Clark Rep lookup.
 * Queries the projects table for clark_rep/district_name assignments.
 * Falls back to hardcoded data if DB has no synced assignments.
 */
export async function findClarkRepForJobFromDB(contractCode: string): Promise<ClarkRepMatch | null> {
  const normalized = contractCode.toUpperCase().replace(/\s+/g, ' ').trim();

  try {
    // Try DB first — exact case-insensitive match
    let project = await prisma.projects.findFirst({
      where: {
        project_code: { equals: normalized, mode: 'insensitive' },
        clark_rep: { not: null },
      },
      select: { clark_rep: true, district_name: true },
    });

    // If no match, try with spaces stripped (e.g. "CY25020" matches "CY25 020")
    if (!project) {
      const noSpaces = normalized.replace(/\s+/g, '');
      const candidates = await prisma.projects.findMany({
        where: { clark_rep: { not: null } },
        select: { project_code: true, clark_rep: true, district_name: true },
      });
      project = candidates.find(
        (c) => c.project_code.toUpperCase().replace(/\s+/g, '') === noSpaces
      ) || null;
    }

    if (project?.clark_rep) {
      return {
        clarkRep: project.clark_rep,
        property: project.district_name || '',
      };
    }
  } catch {
    // DB error — fall through to hardcoded data
  }

  // Fallback to hardcoded index
  return contractIndex.get(normalized) || null;
}

/**
 * Get all Clark Rep assignments from the DB, grouped like the hardcoded data.
 * Falls back to hardcoded data if DB has no synced assignments.
 */
export async function getClarkRepsFromDB(): Promise<ClarkRepData[]> {
  try {
    const projects = await prisma.projects.findMany({
      where: {
        clark_rep: { not: null },
        last_synced_at: { not: null },
      },
      select: { project_code: true, clark_rep: true, district_name: true },
      orderBy: [{ clark_rep: 'asc' }, { district_name: 'asc' }],
    });

    if (projects.length === 0) {
      return CLARK_REPS_DATA;
    }

    // Group by clark_rep -> property -> jobs
    const repMap = new Map<string, Map<string, string[]>>();
    for (const p of projects) {
      if (!p.clark_rep) continue;
      const propName = p.district_name || 'Unassigned';
      if (!repMap.has(p.clark_rep)) {
        repMap.set(p.clark_rep, new Map());
      }
      const propMap = repMap.get(p.clark_rep)!;
      if (!propMap.has(propName)) {
        propMap.set(propName, []);
      }
      propMap.get(propName)!.push(p.project_code);
    }

    const result: ClarkRepData[] = [];
    for (const [repName, propMap] of repMap) {
      const properties: Array<{ name: string; jobs: string[] }> = [];
      for (const [propName, jobs] of propMap) {
        properties.push({ name: propName, jobs });
      }
      result.push({ name: repName, properties });
    }

    return result;
  } catch {
    return CLARK_REPS_DATA;
  }
}
