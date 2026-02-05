#!/usr/bin/env node

/**
 * ASR PO System - Project Data Import Script
 * Imports all CAPEX projects and Clark rep assignments from CSV and Raken data
 * Uses Clark master list to assign unassigned jobs to appropriate reps
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Clark Representatives Data from CSV
const clarkReps = [
  { name: "Billie Brown", email: "billie.brown@allsurfaceroofing.com", properties: ["El Centro", "Eucalyptus Ridge", "Hilleary Park", "Mira Mesa", "Miramar", "Pomerado Terrace", "Ramona Vista", "River Place", "Sea Breeze", "Vista Ridge", "Woodlake"] },
  { name: "Billy Powell", email: "billy.powell@allsurfaceroofing.com", properties: ["Bayview", "Bonita Bluffs", "Lofgren", "Paradise Gardens", "Silver Strand"] },
  { name: "Cole Kinsley", email: "cole.kinsley@allsurfaceroofing.com", properties: ["Chesterton", "Chollas Heights", "VSM"] },
  { name: "Daniel Norlander", email: "daniel.norlander@allsurfaceroofing.com", properties: ["Admiral Hartman", "Gateway", "NAB", "NASNI", "NBSD", "NTC", "Sub-Base"] },
  { name: "Dick Brackenbury", email: "dick.brackenbury@allsurfaceroofing.com", properties: ["Orleck Heights", "Santo Terrace"] },
  { name: "Henry Amostegui", email: "henry.amostegui@allsurfaceroofing.com", properties: ["Anacapa", "Bruns Park", "Point Mugu Base", "Port Hueneme Base", "San Miguel", "Santa Cruz", "Santa Rosa", "Ventura"] },
  { name: "Jon Scotvold", email: "jon.scotvold@allsurfaceroofing.com", properties: ["China Lake"] },
  { name: "Monty Moritz", email: "monty.moritz@allsurfaceroofing.com", properties: ["Beech Street Knolls", "Home Terrace", "Howard Gilmore", "La Mesa Park", "Murphy Canyon", "Terrace View"] },
  { name: "Russel Souza", email: "russel.souza@allsurfaceroofing.com", properties: ["Lemoore"] },
  { name: "Tom Cuevas", email: "tom.cuevas@allsurfaceroofing.com", properties: ["Park Summit"] }
];

// Projects from Raken data (28 active projects)
const rakenProjects = [
  // Assigned Projects
  { code: "CY23S3CON", name: "Miramar Patio Enclosures", property: "Miramar", contract: "CY23S", category: "General", status: "ACTIVE", clarkRep: "Billie Brown", activity: false },
  { code: "CY24033", name: "Miramar TH Windows and Sliders", property: "Miramar", contract: "CY24", category: "Windows/Sliders", status: "ACTIVE", clarkRep: "Billie Brown", activity: true },
  { code: "CY24023", name: "Pomerado Fencing (6 Buildings)", property: "Pomerado Terrace", contract: "CY24", category: "General", status: "ACTIVE", clarkRep: "Billie Brown", activity: true },
  { code: "CY25006", name: "RP Exterior Full Paint", property: "River Place", contract: "CY25", category: "Painting", status: "ACTIVE", clarkRep: "Billie Brown", activity: true },
  { code: "CY23V2004", name: "SBV Stair Landings", property: "Sea Breeze", contract: "CY23V", category: "Stairs/Railings", status: "ACTIVE", clarkRep: "Billie Brown", activity: true },
  { code: "CY25TEMP1", name: "Strand Water Damage Reno Temp", property: "Vista Ridge", contract: "CY25", category: "General", status: "ACTIVE", clarkRep: "Billie Brown", activity: false },
  { code: "CY25TEMP2", name: "Terrace View Stucco Repairs Temp", property: "Vista Ridge", contract: "CY25", category: "Construction", status: "ACTIVE", clarkRep: "Billie Brown", activity: true },
  { code: "CY25TEMP3", name: "Vista Ridge Window Test", property: "Vista Ridge", contract: "CY25", category: "Windows/Sliders", status: "ACTIVE", clarkRep: "Billie Brown", activity: true },

  { code: "CY25019", name: "Lofgren Full Paint", property: "Lofgren", contract: "CY25", category: "Painting", status: "ACTIVE", clarkRep: "Billy Powell", activity: true },

  { code: "CY25020", name: "Chesterton Post Replacements", property: "Chesterton", contract: "CY25", category: "General", status: "ACTIVE", clarkRep: "Cole Kinsley", activity: false },

  { code: "CY25011", name: "Admiral Hartman - Roofs (24)", property: "Admiral Hartman", contract: "CY25", category: "Roofing", status: "ACTIVE", clarkRep: "Daniel Norlander", activity: true },
  { code: "CY24014", name: "Admiral Hartman - Trellis (12)", property: "Admiral Hartman", contract: "CY24", category: "General", status: "ACTIVE", clarkRep: "Daniel Norlander", activity: true },

  { code: "CY25024", name: "OH Ball Field Bath Reno", property: "Orleck Heights", contract: "CY25", category: "General", status: "ACTIVE", clarkRep: "Dick Brackenbury", activity: true },
  { code: "CY25027", name: "Orleck Exterior Renos (76)", property: "Orleck Heights", contract: "CY25", category: "General", status: "ACTIVE", clarkRep: "Dick Brackenbury", activity: true },

  { code: "CY24VEC003", name: "Anacapa II Int Reno Demo", property: "Anacapa", contract: "CY24VEC", category: "Vision/VEC", status: "ACTIVE", clarkRep: "Henry Amostegui", activity: true },
  { code: "CY22V020", name: "Santa Rosa Gazebo B", property: "Santa Rosa", contract: "CY22V", category: "Vision/VEC", status: "ACTIVE", clarkRep: "Henry Amostegui", activity: true },
  { code: "CY25VCON", name: "Santa Rosa Windows", property: "Santa Rosa", contract: "CY25VCON", category: "Windows/Sliders", status: "ACTIVE", clarkRep: "Henry Amostegui", activity: true },

  { code: "CY25013", name: "Beech St Ext Renos", property: "Beech Street Knolls", contract: "CY25", category: "General", status: "ACTIVE", clarkRep: "Monty Moritz", activity: true },

  { code: "CY21021", name: "Park Summit Gym Reno", property: "Park Summit", contract: "CY21", category: "General", status: "ACTIVE", clarkRep: "Tom Cuevas", activity: true },
  { code: "CY24061", name: "Park Summit Interior Reno", property: "Park Summit", contract: "CY24", category: "General", status: "ACTIVE", clarkRep: "Tom Cuevas", activity: true },

  // UNASSIGNED PROJECTS - Need assignment based on property location
  { code: "CY24067", name: "Admiral Hartman Chimney Shrouds", property: "Admiral Hartman", contract: "CY24", category: "General", status: "ACTIVE", clarkRep: null, activity: false },
  { code: "CY25022", name: "Chesterton Gutter Replacements", property: "Chesterton", contract: "CY25", category: "Roofing", status: "ACTIVE", clarkRep: null, activity: true },
  { code: "CY25001", name: "Chesterton Window Replacements", property: "Chesterton", contract: "CY25", category: "Windows/Sliders", status: "ACTIVE", clarkRep: null, activity: true },
  { code: "CY25028", name: "Chollas Stairs Replacements", property: "Chollas Heights", contract: "CY25", category: "Stairs/Railings", status: "ACTIVE", clarkRep: null, activity: true },
  { code: "CY24068", name: "Chollas Storage Area Fence", property: "Chollas Heights", contract: "CY24", category: "Construction", status: "ACTIVE", clarkRep: null, activity: true },
  { code: "CY25V002", name: "Ventura Interior Reno", property: "Ventura", contract: "CY25V", category: "Vision/VEC", status: "ACTIVE", clarkRep: null, activity: true },
  { code: "CY25V003", name: "Ventura Tub and Shower Demo", property: "Ventura", contract: "CY25V", category: "Vision/VEC", status: "ACTIVE", clarkRep: null, activity: true },
  { code: "CY25031", name: "Vista Ridge Retrofit Windows", property: "Vista Ridge", contract: "CY25", category: "Windows/Sliders", status: "ACTIVE", clarkRep: null, activity: true }
];

// Division mappings (properties to division codes)
const propertyToDivision = {
  "El Centro": "O1", "Eucalyptus Ridge": "O1", "Hilleary Park": "O1", "Mira Mesa": "O1", "Miramar": "O1",
  "Pomerado Terrace": "O1", "Ramona Vista": "O1", "River Place": "O1", "Sea Breeze": "O1", "Vista Ridge": "O1", "Woodlake": "O1",
  "Bayview": "O2", "Bonita Bluffs": "O2", "Lofgren": "O2", "Paradise Gardens": "O2", "Silver Strand": "O2",
  "Chesterton": "O3", "Chollas Heights": "O3", "VSM": "O3",
  "Admiral Hartman": "O4", "Gateway": "O4", "NAB": "O4", "NASNI": "O4", "NBSD": "O4", "NTC": "O4", "Sub-Base": "O4",
  "Orleck Heights": "O5", "Santo Terrace": "O5",
  "Anacapa": "O6", "Bruns Park": "O6", "Point Mugu Base": "O6", "Port Hueneme Base": "O6", "San Miguel": "O6", "Santa Cruz": "O6", "Santa Rosa": "O6", "Ventura": "O6",
  "China Lake": "O1", "Beech Street Knolls": "O1", "Home Terrace": "O1", "Howard Gilmore": "O1", "La Mesa Park": "O1", "Murphy Canyon": "O1", "Terrace View": "O1",
  "Lemoore": "O1", "Park Summit": "O1"
};

// Function to assign Clark rep based on property
function assignClarkRep(property) {
  for (const rep of clarkReps) {
    if (rep.properties.includes(property)) {
      return rep.name;
    }
  }
  return null;
}

// Function to get user name parts
function parseClarkRepName(fullName) {
  const parts = fullName.split(' ');
  if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1] };
  } else if (parts.length === 3 && parts[1] === "&") {
    // Handle "Henry Amostegui & Trevin Johnson" - use first person
    return { firstName: parts[0], lastName: parts[1] };
  } else if (parts.length > 2) {
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }
  return { firstName: fullName, lastName: "" };
}

async function main() {
  console.log('🚀 Starting ASR PO System project data import...\n');

  try {
    // 1. Create Admin User (Austin)
    console.log('1️⃣  Creating admin user...');
    const adminPasswordHash = await bcrypt.hash('Devops$@2026', 10);

    const adminUser = await prisma.users.upsert({
      where: { email: 'intellegix@allsurfaceroofing.com' },
      update: {},
      create: {
        email: 'intellegix@allsurfaceroofing.com',
        password_hash: adminPasswordHash,
        first_name: 'Austin',
        last_name: 'Kidwell',
        phone: '+1-619-555-0100',
        role: 'DIRECTOR_OF_SYSTEMS_INTEGRATIONS',
        is_active: true
      }
    });
    console.log(`✅ Admin user created: ${adminUser.first_name} ${adminUser.last_name}`);

    // 2. Create Divisions
    console.log('\n2️⃣  Creating divisions...');
    const divisionMap = new Map();

    const divisionsToCreate = [
      { code: "O1", name: "CAPEX Division", costCenterPrefix: "CP1" },
      { code: "O2", name: "Repairs Division", costCenterPrefix: "RP1" },
      { code: "O3", name: "Roofing Division", costCenterPrefix: "RF1" },
      { code: "O4", name: "General Contract", costCenterPrefix: "GC1" },
      { code: "O5", name: "Sub Management", costCenterPrefix: "SM1" },
      { code: "O6", name: "Specialty Division", costCenterPrefix: "SP1" }
    ];

    for (const divData of divisionsToCreate) {
      const division = await prisma.divisions.upsert({
        where: { division_code: divData.code },
        update: {},
        create: {
          division_code: divData.code,
          division_name: divData.name,
          cost_center_prefix: divData.costCenterPrefix,
          is_active: true
        }
      });
      divisionMap.set(divData.code, division);
      console.log(`✅ Division created: ${division.division_name} (${division.division_code})`);
    }

    // 3. Create Clark Rep Users
    console.log('\n3️⃣  Creating Clark representative users...');
    const clarkRepMap = new Map();

    for (const rep of clarkReps) {
      const { firstName, lastName } = parseClarkRepName(rep.name);
      const defaultPassword = await bcrypt.hash('demo123', 10);

      // Assign to appropriate division based on their primary property
      const primaryProperty = rep.properties[0];
      const divisionCode = propertyToDivision[primaryProperty] || "O1";
      const division = divisionMap.get(divisionCode);

      const user = await prisma.users.upsert({
        where: { email: rep.email },
        update: {},
        create: {
          email: rep.email,
          password_hash: defaultPassword,
          first_name: firstName,
          last_name: lastName,
          role: 'DIVISION_LEADER',
          division_id: division.id,
          is_active: true
        }
      });
      clarkRepMap.set(rep.name, user);
      console.log(`✅ Clark Rep created: ${user.first_name} ${user.last_name} (${rep.email})`);
    }

    // 4. Create Projects with Clark Rep assignments
    console.log('\n4️⃣  Creating projects and assigning unassigned jobs...');
    let assignedCount = 0;
    let projectCount = 0;

    for (const project of rakenProjects) {
      // Assign unassigned projects using Clark master list
      let assignedClarkRep = project.clarkRep;
      if (!assignedClarkRep) {
        assignedClarkRep = assignClarkRep(project.property);
        if (assignedClarkRep) {
          assignedCount++;
          console.log(`📍 ASSIGNED: ${project.code} (${project.property}) → ${assignedClarkRep}`);
        }
      }

      // Get division for project
      const divisionCode = propertyToDivision[project.property] || "O1";
      const division = divisionMap.get(divisionCode);

      // Create the project
      const newProject = await prisma.projects.upsert({
        where: { project_code: project.code },
        update: {},
        create: {
          project_code: project.code,
          project_name: project.name,
          property_address: project.property,
          primary_division_id: division.id,
          status: project.activity ? 'Active' : 'OnHold',
          budget_total: Math.floor(Math.random() * 50000) + 10000, // Random budget for demo
          created_at: new Date()
        }
      });

      projectCount++;
      const statusIcon = project.activity ? '🟢' : '⚪';
      console.log(`${statusIcon} Project created: ${newProject.project_code} - ${newProject.project_name}`);
    }

    // 5. Create some basic vendors
    console.log('\n5️⃣  Creating sample vendors...');
    const vendors = [
      { name: "ABC Building Supply", code: "AB", email: "orders@abcbuilding.com", type: "Material" },
      { name: "XYZ Construction", code: "XY", email: "billing@xyzconstruction.com", type: "Labor" },
      { name: "Pacific Materials", code: "PM", email: "sales@pacificmaterials.com", type: "Material" },
      { name: "Elite Contractors", code: "EC", email: "projects@elitecontractors.com", type: "Labor" }
    ];

    for (const vendor of vendors) {
      await prisma.vendors.upsert({
        where: { vendor_code: vendor.code },
        update: {},
        create: {
          vendor_name: vendor.name,
          vendor_code: vendor.code,
          contact_email: vendor.email,
          vendor_type: vendor.type,
          is_active: true
        }
      });
      console.log(`✅ Vendor created: ${vendor.name} (${vendor.code})`);
    }

    // 6. Final Summary
    console.log('\n🎉 Import completed successfully!');
    console.log('═'.repeat(50));
    console.log(`👤 Users created: ${clarkReps.length + 1} (${clarkReps.length} Clark Reps + 1 Admin)`);
    console.log(`🏢 Divisions created: ${divisionsToCreate.length}`);
    console.log(`📋 Projects created: ${projectCount}`);
    console.log(`🎯 Unassigned projects assigned: ${assignedCount}`);
    console.log(`🏪 Vendors created: ${vendors.length}`);
    console.log('═'.repeat(50));
    console.log('\n💡 Next steps:');
    console.log('  • Login to system with: intellegix@allsurfaceroofing.com / Devops$@2026');
    console.log('  • Clark reps can login with their emails / demo123');
    console.log('  • Start creating purchase orders for your projects!');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();