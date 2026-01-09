const fs = require('fs');
const path = require('path');
const db = require('./db.js');

async function applyMigration() {
  try {
    // Test database connection first
    console.log('🔗 Testing database connection...');
    const isConnected = await db.testConnection();
    if (!isConnected) {
      console.error('❌ Cannot connect to database');
      process.exit(1);
    }

    // Read migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '001_enhance_work_orders.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📊 Migration size: ${migrationSQL.length} characters`);

    // Execute migration
    console.log('🚀 Executing work order enhancement migration...');
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Execute the migration SQL
      await client.query(migrationSQL);

      await client.query('COMMIT');
      console.log('✅ Migration completed successfully!');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Verify the changes
    console.log('🔍 Verifying migration results...');
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'work_orders'
      AND column_name IN ('priority_level', 'work_order_type', 'estimated_completion_date', 'po_count', 'total_po_amount')
      ORDER BY column_name
    `);

    if (result.rows.length > 0) {
      console.log('📋 New work order columns:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }

    await db.closePool();
    console.log('🎉 Work order enhancement migration completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    await db.closePool();
    process.exit(1);
  }
}

// Run the migration
applyMigration();