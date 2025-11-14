// Compare SQLite and Supabase data
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import pg from 'pg';
const { Pool } = pg;

const supabase = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function openSQLite() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database('fenwick-data.db', (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function querySQLite(db, query) {
  return new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function compareData() {
  console.log('🔍 COMPARING DATABASES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Open SQLite
    console.log('📂 Opening SQLite database...');
    const sqlite = await openSQLite();
    console.log('✅ SQLite connected\n');

    // Connect to Supabase
    console.log('🔌 Connecting to Supabase...');
    await supabase.query('SELECT NOW()');
    console.log('✅ Supabase connected\n');

    // Get SQLite data
    console.log('📊 Fetching SQLite data...');
    const sqliteProjects = await querySQLite(sqlite, `
      SELECT id, number, name, responsibilities, name_link, practice_name_link
      FROM projects
      ORDER BY number
      LIMIT 3
    `);
    console.log(`✅ Found ${sqliteProjects.length} projects in SQLite\n`);

    // Get Supabase data
    console.log('📊 Fetching Supabase data...');
    const supabaseResult = await supabase.query(`
      SELECT id, number, name, responsibilities, name_link, practice_name_link
      FROM projects
      ORDER BY number
      LIMIT 3
    `);
    const supabaseProjects = supabaseResult.rows;
    console.log(`✅ Found ${supabaseProjects.length} projects in Supabase\n`);

    // Compare first 3 projects
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 COMPARISON OF FIRST 3 PROJECTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (let i = 0; i < 3; i++) {
      const sqliteProject = sqliteProjects[i];
      const supabaseProject = supabaseProjects[i];

      console.log(`\n📦 Project #${sqliteProject.number}: ${sqliteProject.name}`);
      console.log('─────────────────────────────────────────');

      // Compare responsibilities
      console.log('\n🔸 Responsibilities:');
      console.log('SQLite:', sqliteProject.responsibilities || 'NULL');
      console.log('Supabase:', supabaseProject.responsibilities || 'NULL');

      if (sqliteProject.responsibilities !== supabaseProject.responsibilities) {
        console.log('⚠️  MISMATCH!');
      } else {
        console.log('✅ Match');
      }

      // Compare name_link
      console.log('\n🔸 Name Link:');
      console.log('SQLite:', sqliteProject.name_link || 'NULL');
      console.log('Supabase:', supabaseProject.name_link || 'NULL');

      if (sqliteProject.name_link !== supabaseProject.name_link) {
        console.log('⚠️  MISMATCH!');
      } else {
        console.log('✅ Match');
      }

      // Compare practice_name_link
      console.log('\n🔸 Practice Name Link:');
      console.log('SQLite:', sqliteProject.practice_name_link || 'NULL');
      console.log('Supabase:', supabaseProject.practice_name_link || 'NULL');

      if (sqliteProject.practice_name_link !== supabaseProject.practice_name_link) {
        console.log('⚠️  MISMATCH!');
      } else {
        console.log('✅ Match');
      }

      console.log('\n─────────────────────────────────────────');
    }

    // Check full database counts
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FULL DATABASE STATISTICS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Count projects with responsibilities
    const sqliteRespCount = await querySQLite(sqlite, `
      SELECT COUNT(*) as count FROM projects
      WHERE responsibilities IS NOT NULL AND responsibilities != '[]'
    `);

    const supabaseRespCount = await supabase.query(`
      SELECT COUNT(*) as count FROM projects
      WHERE responsibilities IS NOT NULL AND responsibilities != '[]'
    `);

    console.log('Projects with responsibilities:');
    console.log(`  SQLite: ${sqliteRespCount[0].count}`);
    console.log(`  Supabase: ${supabaseRespCount.rows[0].count}`);

    // Count projects with name_link
    const sqliteNameLinkCount = await querySQLite(sqlite, `
      SELECT COUNT(*) as count FROM projects
      WHERE name_link IS NOT NULL
    `);

    const supabaseNameLinkCount = await supabase.query(`
      SELECT COUNT(*) as count FROM projects
      WHERE name_link IS NOT NULL
    `);

    console.log('\nProjects with name_link:');
    console.log(`  SQLite: ${sqliteNameLinkCount[0].count}`);
    console.log(`  Supabase: ${supabaseNameLinkCount.rows[0].count}`);

    // Count projects with practice_name_link
    const sqlitePracticeLinkCount = await querySQLite(sqlite, `
      SELECT COUNT(*) as count FROM projects
      WHERE practice_name_link IS NOT NULL
    `);

    const supabasePracticeLinkCount = await supabase.query(`
      SELECT COUNT(*) as count FROM projects
      WHERE practice_name_link IS NOT NULL
    `);

    console.log('\nProjects with practice_name_link:');
    console.log(`  SQLite: ${sqlitePracticeLinkCount[0].count}`);
    console.log(`  Supabase: ${supabasePracticeLinkCount.rows[0].count}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    sqlite.close();
    await supabase.end();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

compareData();
