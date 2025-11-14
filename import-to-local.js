// Import Supabase export data into local SQLite database
// Usage: node import-to-local.js

import sqlite3 from 'sqlite3';
import fs from 'fs';

const DB_FILE = './fenwick.db';
const INPUT_FILE = 'supabase-export.json';

console.log('🔄 Importing Supabase data to local SQLite...\n');
console.log(`📁 Source: ${INPUT_FILE}`);
console.log(`📁 Target: ${DB_FILE}\n`);

// Load export data
if (!fs.existsSync(INPUT_FILE)) {
  console.error(`❌ ${INPUT_FILE} not found!`);
  console.log('💡 Run "node export-from-supabase.js" first');
  process.exit(1);
}

const exportData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
console.log(`📦 Loaded ${exportData.projects.length} projects from export\n`);

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to local SQLite database\n');
});

db.serialize(() => {
  // Delete all existing projects
  db.run('DELETE FROM projects', (err) => {
    if (err) {
      console.error('❌ Failed to clear projects:', err.message);
      process.exit(1);
    }
    console.log('🗑️  Cleared existing projects\n');
    console.log('━'.repeat(80));
  });

  // Insert all projects from export
  const stmt = db.prepare(`
    INSERT INTO projects (
      id, number, name, practice_name, brief_description,
      client, value, area, location, project_types, type_color,
      thumbnail, notes, stages, pauses, responsibilities,
      completed, confidential, name_link, practice_name_link
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let successCount = 0;
  let failCount = 0;

  exportData.projects.forEach((project) => {
    stmt.run(
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
      JSON.stringify(project.stages || {}),
      JSON.stringify(project.pauses || []),
      JSON.stringify(project.responsibilities || []),
      project.completed ? 1 : 0,
      project.confidential ? 1 : 0,
      project.nameLink || null,
      project.practiceNameLink || null,
      (err) => {
        if (err) {
          console.error(`❌ Failed to import ${project.name}:`, err.message);
          failCount++;
        } else {
          console.log(`✅ Imported: ${project.name}`);
          successCount++;
        }
      }
    );
  });

  stmt.finalize(() => {
    console.log('━'.repeat(80));
    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📁 Total: ${exportData.projects.length}\n`);

    // Verify import
    db.get('SELECT COUNT(*) as count FROM projects', (err, row) => {
      if (err) {
        console.error('❌ Verification failed:', err.message);
      } else {
        console.log(`✅ Verification: ${row.count} projects in local database`);

        // Check data completeness
        db.get("SELECT COUNT(*) as count FROM projects WHERE practice_name IS NOT NULL AND practice_name != ''", (err, row) => {
          console.log(`   practice_name: ${row.count} projects`);
        });

        db.get("SELECT COUNT(*) as count FROM projects WHERE brief_description IS NOT NULL AND brief_description != ''", (err, row) => {
          console.log(`   brief_description: ${row.count} projects`);
        });

        db.get("SELECT COUNT(*) as count FROM projects WHERE thumbnail IS NOT NULL AND thumbnail != ''", (err, row) => {
          console.log(`   thumbnail: ${row.count} projects\n`);
          console.log('✨ Local database restored from Supabase!\n');
          db.close();
        });
      }
    });
  });
});
