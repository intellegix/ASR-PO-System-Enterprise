/**
 * One-time data migration: Create properties from existing project data.
 * Groups projects by (customer_id, property_address) and creates a
 * properties record for each unique combination.
 *
 * Idempotent — skips if properties already exist.
 *
 * Usage: npx tsx prisma/migrate-properties.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if properties already exist
  const existingCount = await prisma.properties.count();
  if (existingCount > 0) {
    console.log(`Skipping migration: ${existingCount} properties already exist.`);
    return;
  }

  // Fetch all projects that have a customer_id
  const projects = await prisma.projects.findMany({
    where: { customer_id: { not: null } },
    select: {
      id: true,
      customer_id: true,
      project_name: true,
      property_address: true,
    },
  });

  if (projects.length === 0) {
    console.log('No projects with customer_id found. Nothing to migrate.');
    return;
  }

  // Group by (customer_id, property_address)
  const groups = new Map<string, { customerId: string; address: string | null; projectIds: string[]; projectName: string }>();

  for (const p of projects) {
    const key = `${p.customer_id}::${p.property_address || 'NO_ADDRESS'}`;
    if (!groups.has(key)) {
      groups.set(key, {
        customerId: p.customer_id!,
        address: p.property_address,
        projectIds: [],
        projectName: p.project_name,
      });
    }
    groups.get(key)!.projectIds.push(p.id);
  }

  console.log(`Found ${groups.size} unique property groups from ${projects.length} projects.`);

  let created = 0;
  let linked = 0;

  for (const [, group] of groups) {
    // Derive property name from address or first project name
    const propertyName = group.address || group.projectName;

    // Parse address into components if possible
    let city: string | undefined;
    let state: string | undefined;
    let zip: string | undefined;

    if (group.address) {
      // Try to parse "City, ST ZIP" or "City, ST" from end of address
      const match = group.address.match(/,\s*([^,]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
      if (match) {
        city = match[1].trim();
        state = match[2];
        zip = match[3] || undefined;
      }
    }

    const property = await prisma.properties.create({
      data: {
        client_id: group.customerId,
        property_name: propertyName,
        property_address: group.address,
        city: city || null,
        state: state || null,
        zip: zip || null,
      },
    });
    created++;

    // Link projects to this property
    await prisma.projects.updateMany({
      where: { id: { in: group.projectIds } },
      data: { property_id: property.id },
    });
    linked += group.projectIds.length;

    console.log(`  Created property "${propertyName}" → ${group.projectIds.length} project(s)`);
  }

  console.log(`\nMigration complete: ${created} properties created, ${linked} projects linked.`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
