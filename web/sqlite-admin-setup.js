const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

async function setupSQLiteDatabase() {
  const dbPath = path.join(__dirname, 'po-system.sqlite');
  console.log('📁 Database path:', dbPath);

  const db = new Database(dbPath);
  console.log('✅ SQLite database created/opened');

  try {
    db.exec('PRAGMA foreign_keys = ON;');

    console.log('🏗️  Creating users table...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'USER',
        division_id TEXT,
        is_active INTEGER DEFAULT 1,
        last_login_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tables created successfully');

    console.log('🔐 Hashing admin password...');
    const passwordHash = await bcrypt.hash('Devops$@2026', 12);

    console.log('🧹 Removing existing admin user...');
    const deleteStmt = db.prepare('DELETE FROM users WHERE email = ?');
    deleteStmt.run('Intellegix@allsurfaceroofing.com');

    console.log('👤 Creating Intellegix admin user...');
    const insertStmt = db.prepare(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, role, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const result = insertStmt.run(
      'Intellegix@allsurfaceroofing.com',
      passwordHash,
      'Intellegix',
      'Admin',
      'MAJORITY_OWNER',
      1
    );

    console.log('✅ Admin user created with ID:', result.lastInsertRowid);

    const selectStmt = db.prepare(`
      SELECT id, email, first_name, last_name, role, is_active, created_at
      FROM users WHERE email = ?
    `);
    const user = selectStmt.get('Intellegix@allsurfaceroofing.com');

    if (user) {
      console.log('🎉 SUCCESS! Admin user created:');
      console.log('   ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   Name:', user.first_name, user.last_name);
      console.log('   Role:', user.role);
      console.log('   Active:', user.is_active ? 'Yes' : 'No');
      console.log('   Created:', user.created_at);
      console.log('');
      console.log('🔑 Login Credentials:');
      console.log('   Username: Intellegix');
      console.log('   Password: Devops$@2026');
      console.log('   Access: Full Admin (MAJORITY_OWNER)');
      console.log('');
      console.log('🌐 Login URLs:');
      console.log('   Local: http://localhost:3000/login');
      console.log('   Live: https://asr-po-system-frontend.onrender.com/login');
      console.log('');
      console.log('📁 SQLite Database: po-system.sqlite');
      return user;
    } else {
      throw new Error('Failed to verify user creation');
    }

  } finally {
    db.close();
    console.log('🔒 Database connection closed');
  }
}

setupSQLiteDatabase()
  .then(() => {
    console.log('');
    console.log('🎉 SQLite database and admin user created successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error.message);
    process.exit(1);
  });
