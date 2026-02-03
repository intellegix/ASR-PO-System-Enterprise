const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  // Use the same database connection as the app
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/po_system',
    ssl: false
  });

  try {
    console.log('🔗 Connecting to database...');

    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully');

    // Hash the password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash('Devops$@2026', 12);
    console.log('✅ Password hashed');

    // Delete existing user if exists
    console.log('🧹 Removing existing admin user if present...');
    await client.query(`DELETE FROM users WHERE email = 'Intellegix@allsurfaceroofing.com'`);

    // Insert the new admin user
    console.log('👤 Creating admin user...');
    const result = await client.query(`
      INSERT INTO users (
        id,
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        role,
        division_id,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        NULL,
        $5,
        NULL,
        true,
        NOW(),
        NOW()
      ) RETURNING id, email, first_name, last_name, role, created_at
    `, [
      'Intellegix@allsurfaceroofing.com',
      passwordHash,
      'Intellegix',
      'Admin',
      'MAJORITY_OWNER'
    ]);

    const user = result.rows[0];
    console.log('🎉 Admin user created successfully!');
    console.log('');
    console.log('📋 User Details:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.first_name, user.last_name);
    console.log('   Role:', user.role);
    console.log('   Created:', user.created_at);
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('   Username: Intellegix');
    console.log('   Password: Devops$@2026');
    console.log('   Role: MAJORITY_OWNER (Full Admin)');
    console.log('');
    console.log('🌐 Login URLs:');
    console.log('   Local: http://localhost:3000/login');
    console.log('   Live: https://asr-po-system-frontend.onrender.com/login');

    client.release();

  } catch (error) {
    console.error('❌ Error creating admin user:');
    console.error('Error details:', error.message);

    if (error.message.includes('connect ECONNREFUSED')) {
      console.log('');
      console.log('💡 Database connection failed. Make sure:');
      console.log('   1. PostgreSQL server is running');
      console.log('   2. Database "po_system" exists');
      console.log('   3. Connection credentials are correct');
      console.log('   4. DATABASE_URL environment variable is set');
    }

    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('');
    console.log('✅ Admin user setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.log('');
    console.log('💥 Failed to create admin user');
    process.exit(1);
  });