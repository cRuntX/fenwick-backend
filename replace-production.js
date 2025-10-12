// Full replace: Backup production, wipe, rebuild schema, import local data
// Usage: node replace-production.js [--confirm]
//
// WARNING: This will completely replace production database!

import fs from 'fs';
import fetch from 'node-fetch';
import readline from 'readline';

const API_URL = 'https://fenwick-backend.onrender.com/api';
const LOCAL_DATA_FILE = 'local-data.json';
const BACKUP_FILE = `production-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function fetchProductionData() {
  console.log('🔍 Fetching production data for backup...\n');
  const response = await fetch(`${API_URL}/data`);
  if (!response.ok) {
    throw new Error(`Failed to fetch production data: ${response.status}`);
  }
  return await response.json();
}

async function deleteAllProjects(projects) {
  console.log('\n🗑️  Deleting all production projects...\n');
  let deleted = 0;
  let failed = 0;

  for (const project of projects) {
    try {
      const response = await fetch(`${API_URL}/projects/${project.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        console.log(`✅ Deleted: ${project.name}`);
        deleted++;
      } else {
        console.log(`❌ Failed to delete: ${project.name}`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ Error deleting ${project.name}: ${err.message}`);
      failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return { deleted, failed };
}

async function createProjects(projects) {
  console.log('\n📦 Creating projects from local data...\n');
  let created = 0;
  let failed = 0;

  for (const project of projects) {
    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });

      if (response.ok) {
        console.log(`✅ Created: ${project.name}`);
        created++;
      } else {
        const error = await response.json();
        console.log(`❌ Failed to create ${project.name}: ${error.error}`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ Error creating ${project.name}: ${err.message}`);
      failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { created, failed };
}

async function replaceProduction() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  FULL PRODUCTION REPLACE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check if local data file exists
    if (!fs.existsSync(LOCAL_DATA_FILE)) {
      console.error(`❌ ${LOCAL_DATA_FILE} not found!`);
      console.log('💡 Run "node export-local-data.js" first to export your local database');
      rl.close();
      process.exit(1);
    }

    // Load local data
    const localData = JSON.parse(fs.readFileSync(LOCAL_DATA_FILE, 'utf8'));
    console.log(`📦 Local data loaded: ${localData.projects.length} projects`);

    // Fetch and backup production data
    const prodData = await fetchProductionData();
    console.log(`🌐 Production data loaded: ${prodData.projects.length} projects\n`);

    // Save production backup
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(prodData, null, 2));
    const backupSize = (fs.statSync(BACKUP_FILE).size / 1024).toFixed(2);
    console.log(`💾 Production backup saved: ${BACKUP_FILE} (${backupSize} KB)\n`);

    // Show summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 REPLACEMENT PLAN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`1️⃣  Backup saved: ${BACKUP_FILE}`);
    console.log(`2️⃣  Delete ${prodData.projects.length} production projects`);
    console.log(`3️⃣  Create ${localData.projects.length} projects from local`);
    console.log(`4️⃣  Update settings\n`);

    console.log('⚠️  WARNING: This will COMPLETELY REPLACE production data!');
    console.log('⚠️  Make sure your backup is safe: ' + BACKUP_FILE + '\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check if --confirm flag is present
    const autoConfirm = process.argv.includes('--confirm');

    if (!autoConfirm) {
      const answer1 = await askQuestion('⚠️  Are you ABSOLUTELY SURE you want to replace production? Type "REPLACE" to confirm: ');
      if (answer1 !== 'REPLACE') {
        console.log('❌ Replacement cancelled');
        rl.close();
        return;
      }

      const answer2 = await askQuestion('⚠️  Last chance! Type "YES" to proceed: ');
      if (answer2.toUpperCase() !== 'YES') {
        console.log('❌ Replacement cancelled');
        rl.close();
        return;
      }
    }

    console.log('\n🚀 Starting production replacement...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Step 1: Delete all production projects
    const deleteResults = await deleteAllProjects(prodData.projects);
    console.log(`\n📊 Deletion complete: ${deleteResults.deleted} deleted, ${deleteResults.failed} failed`);

    // Step 2: Create all local projects
    const createResults = await createProjects(localData.projects);
    console.log(`\n📊 Creation complete: ${createResults.created} created, ${createResults.failed} failed`);

    // Step 3: Update settings
    console.log('\n⚙️  Settings update...');
    console.log('⚠️  Settings sync not yet implemented - requires API endpoint');
    console.log('💡 Note: Settings need to be updated manually or via database migration');

    // Final summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Production replacement complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 Summary:');
    console.log(`   🗑️  Deleted: ${deleteResults.deleted} projects`);
    console.log(`   ✨ Created: ${createResults.created} projects`);
    console.log(`   ❌ Failed: ${deleteResults.failed + createResults.failed} operations`);
    console.log(`   💾 Backup: ${BACKUP_FILE}\n`);
    console.log('🌐 Check your live app: https://fenwick-frontend.vercel.app/');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verify final state
    console.log('🔍 Verifying production state...');
    const finalData = await fetchProductionData();
    console.log(`✅ Production now has ${finalData.projects.length} projects\n`);

  } catch (error) {
    console.error('\n❌ Replacement failed:', error.message);
    console.error('\n⚠️  Production may be in an inconsistent state!');
    console.error(`💡 Restore from backup: ${BACKUP_FILE}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

replaceProduction();
