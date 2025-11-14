// Direct sync to Supabase database
import 'dotenv/config';
import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

const LOCAL_DATA_FILE = 'local-data.json';

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function syncToSupabase() {
  try {
    console.log('🔌 Connecting to Supabase...\n');

    // Test connection
    await db.query('SELECT NOW()');
    console.log('✅ Connected to Supabase!\n');

    // Load local data
    if (!fs.existsSync(LOCAL_DATA_FILE)) {
      console.error(`❌ ${LOCAL_DATA_FILE} not found!`);
      console.log('💡 Run "node export-local-data.js" first');
      process.exit(1);
    }

    const localData = JSON.parse(fs.readFileSync(LOCAL_DATA_FILE, 'utf8'));
    console.log(`📦 Local data: ${localData.projects.length} projects\n`);

    // Get current data from Supabase
    const result = await db.query('SELECT * FROM projects');
    console.log(`🌐 Supabase data: ${result.rows.length} projects\n`);

    let successCount = 0;
    let failCount = 0;

    console.log('🚀 Starting sync...\n');

    // Upsert all projects (insert or update)
    for (const project of localData.projects) {
      try {
        await db.query(`
          INSERT INTO projects (
            id, number, name, practice_name, brief_description,
            client, value, area, location, project_types, type_color,
            thumbnail, notes, stages, pauses, responsibilities,
            completed, confidential, name_link, practice_name_link
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
          )
          ON CONFLICT (id) DO UPDATE SET
            number = $2,
            name = $3,
            practice_name = $4,
            brief_description = $5,
            client = $6,
            value = $7,
            area = $8,
            location = $9,
            project_types = $10,
            type_color = $11,
            thumbnail = $12,
            notes = $13,
            stages = $14,
            pauses = $15,
            responsibilities = $16,
            completed = $17,
            confidential = $18,
            name_link = $19,
            practice_name_link = $20,
            updated_at = CURRENT_TIMESTAMP
        `, [
          project.id,
          project.number,
          project.name,
          project.practiceName || null,
          project.briefDescription || null,
          project.client || null,
          project.value || null,
          project.area || null,
          project.location || null,
          JSON.stringify(project.projectTypes || []),
          project.typeColor || '#666666',
          project.thumbnail || null,
          project.notes || null,
          JSON.stringify(project.stages || []),
          project.pauses ? JSON.stringify(project.pauses) : null,
          project.responsibilities ? JSON.stringify(project.responsibilities) : null,
          project.completed || false,
          project.confidential || false,
          project.nameLink || null,
          project.practiceNameLink || null
        ]);

        console.log(`✅ Synced: ${project.name}`);
        successCount++;
      } catch (err) {
        console.log(`❌ Failed: ${project.name} - ${err.message}`);
        failCount++;
      }
    }

    await db.end();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Sync complete!');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📝 Details:', error);
    process.exit(1);
  }
}

syncToSupabase();
