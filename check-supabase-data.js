// Check specific fields in Supabase
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkData() {
  try {
    console.log('🔍 Checking Supabase data...\n');

    // Get first project
    const result = await db.query(`
      SELECT id, name, responsibilities, name_link, practice_name_link
      FROM projects
      WHERE number = 1
    `);

    const project = result.rows[0];
    console.log('📦 Project:', project.name);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Responsibilities:', project.responsibilities);
    console.log('\nName Link:', project.name_link);
    console.log('Practice Name Link:', project.practice_name_link);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Count stats
    const stats = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(responsibilities) FILTER (WHERE responsibilities IS NOT NULL AND responsibilities != '[]') as with_resp,
        COUNT(name_link) as with_name_link,
        COUNT(practice_name_link) as with_practice_link
      FROM projects
    `);

    console.log('📊 Statistics:');
    console.log(`  Total projects: ${stats.rows[0].total}`);
    console.log(`  With responsibilities: ${stats.rows[0].with_resp}`);
    console.log(`  With name link: ${stats.rows[0].with_name_link}`);
    console.log(`  With practice link: ${stats.rows[0].with_practice_link}\n`);

    await db.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkData();
