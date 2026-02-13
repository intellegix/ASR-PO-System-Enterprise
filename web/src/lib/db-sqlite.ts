import Database from 'better-sqlite3';
import path from 'path';

// SQLite database setup
const dbPath = path.join(process.cwd(), 'po-system.sqlite');
console.log('🔗 Connecting to SQLite database:', dbPath);

export const sqliteDb = new Database(dbPath);

// Enable foreign keys and other SQLite optimizations
sqliteDb.exec('PRAGMA foreign_keys = ON;');
sqliteDb.exec('PRAGMA journal_mode = WAL;');
sqliteDb.exec('PRAGMA synchronous = NORMAL;');

// Database user type
interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  division_id: string | null;
  is_active: number;
}

// Simple user authentication function for SQLite
export async function authenticateUser(identifier: string, password: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bcrypt = require('bcrypt');

  try {
    // Handle username-only login (append domain)
    let emailToSearch = identifier;
    if (!identifier.includes('@')) {
      emailToSearch = `${identifier}@allsurfaceroofing.com`;
    }

    // Query user from SQLite
    const stmt = sqliteDb.prepare(`
      SELECT id, email, password_hash, first_name, last_name, role, division_id, is_active
      FROM users
      WHERE email = ? AND is_active = 1
    `);

    const user = stmt.get(emailToSearch) as DbUser | undefined;

    if (!user || !user.password_hash) {
      return null;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    // Update last login
    const updateStmt = sqliteDb.prepare(`
      UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    updateStmt.run(user.id);

    return {
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role,
      divisionId: user.division_id,
      divisionName: null, // TODO: Join with divisions table if needed
      divisionCode: null,
    };

  } catch (error: unknown) {
    console.error('Authentication error:', error);
    return null;
  }
}

export default sqliteDb;
