// Initialize Supabase database table
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initializeDatabase() {
  try {
    console.log('🔌 Connecting to Supabase...');
    console.log('🔗 Connection string:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

    // Test connection
    const testResult = await db.query('SELECT NOW()');
    console.log('✅ Connection successful!');
    console.log('⏰ Server time:', testResult.rows[0].now);

    // Create table
    console.log('\n📦 Creating projects table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        number INTEGER NOT NULL,
        name TEXT NOT NULL,
        practice_name TEXT,
        brief_description TEXT,
        client TEXT,
        value TEXT,
        area TEXT,
        location TEXT,
        project_types TEXT NOT NULL,
        type_color TEXT NOT NULL,
        thumbnail TEXT,
        notes TEXT,
        stages TEXT NOT NULL,
        pauses TEXT,
        responsibilities TEXT,
        completed BOOLEAN DEFAULT FALSE,
        name_link TEXT,
        practice_name_link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Table created successfully!');

    // Check if table has data
    const countResult = await db.query('SELECT COUNT(*) FROM projects');
    console.log(`📊 Current projects in database: ${countResult.rows[0].count}`);

    await db.end();
    console.log('\n🎉 Database initialization complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📝 Error details:', error);
    process.exit(1);
  }
}

initializeDatabase();
