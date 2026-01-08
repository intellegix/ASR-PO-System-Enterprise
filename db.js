const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool for better performance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection function
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, current_database() as database');
    console.log('✅ Connected to PostgreSQL successfully!');
    console.log(`   Database: ${result.rows[0].database}`);
    console.log(`   Server Time: ${result.rows[0].current_time}`);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    return false;
  }
}

// Query helper function
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log(`Query executed in ${duration}ms, rows: ${result.rowCount}`);
  return result;
}

// Get a client from the pool for transactions
async function getClient() {
  const client = await pool.connect();
  return client;
}

// Close the pool (for graceful shutdown)
async function closePool() {
  await pool.end();
  console.log('Database pool closed');
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool
};
