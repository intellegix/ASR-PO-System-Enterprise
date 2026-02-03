import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/db';

async function addAdminUser() {
  try {
    // Hash the password
    const passwordHash = await bcrypt.hash('Devops$@2026', 12);

    // Create the admin user
    const adminUser = await prisma.users.upsert({
      where: {
        email: 'Intellegix@allsurfaceroofing.com'
      },
      update: {
        password_hash: passwordHash,
        first_name: 'Intellegix',
        last_name: 'Admin',
        role: 'MAJORITY_OWNER',
        is_active: true,
        updated_at: new Date(),
      },
      create: {
        email: 'Intellegix@allsurfaceroofing.com',
        password_hash: passwordHash,
        first_name: 'Intellegix',
        last_name: 'Admin',
        role: 'MAJORITY_OWNER',
        division_id: null, // No specific division - system-wide admin
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log('✅ Admin user created/updated successfully:');
    console.log('📧 Email:', adminUser.email);
    console.log('👤 Name:', adminUser.first_name, adminUser.last_name);
    console.log('🔑 Role:', adminUser.role);
    console.log('🆔 User ID:', adminUser.id);
    console.log('');
    console.log('🎯 Login credentials:');
    console.log('   Username: Intellegix');
    console.log('   Email: Intellegix@allsurfaceroofing.com');
    console.log('   Password: Devops$@2026');
    console.log('');
    console.log('🚀 You can now login with either:');
    console.log('   - Username: Intellegix (system will auto-append @allsurfaceroofing.com)');
    console.log('   - Full email: Intellegix@allsurfaceroofing.com');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addAdminUser()
  .then(() => {
    console.log('🎉 Admin user setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to create admin user:', error);
    process.exit(1);
  });