import pg from 'pg';
const { Pool } = pg;

// This will use PostgreSQL in production, SQLite locally
const isProduction = process.env.NODE_ENV === 'production';

let db;

if (isProduction) {
  // PostgreSQL for production (online)
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log('✅ Using PostgreSQL database');
} else {
  // SQLite for local development (your laptop)
  // We'll keep using SQLite locally for now
  console.log('✅ Using SQLite database (local mode)');
}

export default db;