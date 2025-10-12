import fs from 'fs';
import fetch from 'node-fetch';

// Your live backend URL
const API_URL = 'https://fenwick-backend.onrender.com/api';

async function checkProductionSchema() {
  console.log('🔍 Checking production database schema...\n');

  try {
    const response = await fetch(`${API_URL}/data`);
    const data = await response.json();

    console.log(`📊 Production database contains:`);
    console.log(`   - ${data.projects.length} projects`);
    console.log(`   - Settings configured: ${data.settings ? '✅' : '❌'}`);

    // Check if projects have new schema (project_types array)
    const hasNewSchema = data.projects.some(p => Array.isArray(p.projectTypes));
    console.log(`   - New schema (project_types): ${hasNewSchema ? '✅' : '❌'}`);

    return {
      projects: data.projects,
      settings: data.settings,
      hasNewSchema
    };
  } catch (error) {
    console.error('❌ Failed to check production schema:', error.message);
    return null;
  }
}

async function migrateData() {
  console.log('🚀 Starting smart data migration...\n');

  try {
    // First, check production state
    const prodState = await checkProductionSchema();
    if (!prodState) {
      console.error('❌ Cannot proceed without checking production first');
      return;
    }

    console.log('\n---\n');

    // Read the backup file
    const backup = JSON.parse(fs.readFileSync('./backup-data.json', 'utf8'));
    console.log(`📦 Backup file contains ${backup.projects.length} projects\n`);

    // Build a map of existing projects by ID
    const existingProjectsMap = new Map(
      prodState.projects.map(p => [p.id, p])
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    // Process each project in backup
    for (let i = 0; i < backup.projects.length; i++) {
      const project = backup.projects[i];
      const existing = existingProjectsMap.get(project.id);

      console.log(`[${i + 1}/${backup.projects.length}] ${project.name}`);

      try {
        if (existing) {
          // Project exists - UPDATE it
          const response = await fetch(`${API_URL}/projects/${project.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
          });

          if (response.ok) {
            console.log(`   ✅ Updated`);
            updated++;
          } else {
            const error = await response.json();
            console.log(`   ❌ Failed to update: ${error.error}`);
            failed++;
          }
        } else {
          // Project doesn't exist - CREATE it
          const response = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
          });

          if (response.ok) {
            console.log(`   ✅ Created`);
            created++;
          } else {
            const error = await response.json();
            console.log(`   ❌ Failed to create: ${error.error}`);
            failed++;
          }
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        failed++;
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n---\n');
    console.log('🎉 Migration complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`\n🌐 Check your live app: https://fenwick-frontend.vercel.app/`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

migrateData();
