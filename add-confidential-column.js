// Add confidential column to Supabase projects table
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addColumn() {
  console.log('🔧 Adding confidential column to projects table...\n');

  try {
    // Check if column already exists
    const checkColumn = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'projects' AND column_name = 'confidential'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Column "confidential" already exists!\n');
      await db.end();
      return;
    }

    // Add the column
    await db.query(`
      ALTER TABLE projects
      ADD COLUMN confidential BOOLEAN DEFAULT FALSE
    `);

    console.log('✅ Successfully added "confidential" column!\n');

    // Verify
    const verify = await db.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'projects' AND column_name = 'confidential'
    `);

    console.log('📊 Column details:');
    console.log('  Name:', verify.rows[0].column_name);
    console.log('  Type:', verify.rows[0].data_type);
    console.log('  Default:', verify.rows[0].column_default);
    console.log('');

    await db.end();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addColumn();
