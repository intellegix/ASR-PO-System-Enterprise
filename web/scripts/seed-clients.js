/**
 * Seed clients from ASR_Client_Master_List.csv into the clients table.
 *
 * Usage:
 *   node scripts/seed-clients.js
 *
 * Reads the CSV relative to the repo root (one level up from web/).
 * Uses prisma client to upsert by client_code.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function generateClientCode(name) {
  // Take first word (up to 3 chars) + dash + second word (up to 4 chars), uppercase
  const words = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/);
  const part1 = (words[0] || '').substring(0, 3).toUpperCase();
  const part2 = (words[1] || '').substring(0, 4).toUpperCase();
  if (!part2) {
    return part1.substring(0, 6);
  }
  return `${part1}-${part2}`;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  const csvPath = path.resolve(__dirname, '..', '..', '..', 'ASR_Client_Master_List.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found at: ${csvPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(Boolean);

  // Skip header
  const header = parseCsvLine(lines[0]);
  console.log('CSV headers:', header);

  const codesSeen = new Set();
  let created = 0;
  let updated = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const clientName = cols[0];
    if (!clientName) continue;

    let code = generateClientCode(clientName);
    // Ensure uniqueness
    if (codesSeen.has(code)) {
      let suffix = 2;
      while (codesSeen.has(`${code}${suffix}`)) suffix++;
      code = `${code}${suffix}`;
    }
    codesSeen.add(code);

    const category = cols[1] || null;
    const parentEntity = cols[2] || null;
    const aliases = cols[3] || null;
    const subProjects = cols[4] || null;
    const status = (cols[5] || '').trim().toUpperCase();
    const notes = cols[6] || null;

    const isActive = status !== 'CLOSED';

    try {
      const result = await prisma.clients.upsert({
        where: { client_code: code },
        update: {
          client_name: clientName,
          category,
          parent_entity: parentEntity,
          aliases,
          sub_projects: subProjects,
          notes,
          is_active: isActive,
          updated_at: new Date(),
        },
        create: {
          client_name: clientName,
          client_code: code,
          category,
          parent_entity: parentEntity,
          aliases,
          sub_projects: subProjects,
          notes,
          is_active: isActive,
        },
      });
      if (result) {
        // upsert doesn't tell us if it was create vs update easily, just count
        created++;
      }
    } catch (err) {
      console.error(`Error upserting client "${clientName}" (code: ${code}):`, err.message);
    }
  }

  console.log(`\nDone! Processed ${created} clients.`);

  // Verify
  const count = await prisma.clients.count();
  console.log(`Total clients in database: ${count}`);

  const byCategory = await prisma.$queryRaw`
    SELECT category, COUNT(*)::int as count FROM clients GROUP BY category ORDER BY count DESC
  `;
  console.log('\nClients by category:');
  for (const row of byCategory) {
    console.log(`  ${row.category || 'Uncategorized'}: ${row.count}`);
  }
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
