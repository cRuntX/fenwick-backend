// Smart sync: Compare local and production, apply only changes
// Usage: node sync-to-production.js [--confirm]

import fs from 'fs';
import fetch from 'node-fetch';
import readline from 'readline';

const API_URL = 'https://fenwick-backend.onrender.com/api';
const LOCAL_DATA_FILE = 'local-data.json';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function deepEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

async function fetchProductionData() {
  console.log('🔍 Fetching production data...\n');
  const response = await fetch(`${API_URL}/data`);
  if (!response.ok) {
    throw new Error(`Failed to fetch production data: ${response.status}`);
  }
  return await response.json();
}

async function syncData() {
  try {
    console.log('🐛 DEBUG: Starting sync process...');

    // Check if local data file exists
    if (!fs.existsSync(LOCAL_DATA_FILE)) {
      console.error(`❌ ${LOCAL_DATA_FILE} not found!`);
      console.log('💡 Run "node export-local-data.js" first to export your local database');
      process.exit(1);
    }

    console.log('🐛 DEBUG: Local data file found');

    // Load local data
    const localData = JSON.parse(fs.readFileSync(LOCAL_DATA_FILE, 'utf8'));
    console.log(`📦 Local data loaded: ${localData.projects.length} projects`);
    console.log(`🐛 DEBUG: First project name: ${localData.projects[0]?.name}\n`);

    // Fetch production data
    const prodData = await fetchProductionData();
    console.log(`🌐 Production data loaded: ${prodData.projects.length} projects\n`);

    // Build maps for comparison
    const localMap = new Map(localData.projects.map(p => [p.id, p]));
    const prodMap = new Map(prodData.projects.map(p => [p.id, p]));

    // Analyze differences
    const toCreate = [];
    const toUpdate = [];
    const toDelete = [];

    // Find creates and updates
    for (const [id, localProj] of localMap) {
      const prodProj = prodMap.get(id);
      if (!prodProj) {
        toCreate.push(localProj);
      } else if (!deepEqual(localProj, prodProj)) {
        toUpdate.push({ local: localProj, prod: prodProj });
      }
    }

    // Find deletes
    for (const [id, prodProj] of prodMap) {
      if (!localMap.has(id)) {
        toDelete.push(prodProj);
      }
    }

    // Check settings differences
    const settingsChanged = !deepEqual(localData.settings, prodData.settings);

    // Show summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SYNC SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (toCreate.length === 0 && toUpdate.length === 0 && toDelete.length === 0 && !settingsChanged) {
      console.log('✅ Already in sync! No changes needed.\n');
      rl.close();
      return;
    }

    if (toCreate.length > 0) {
      console.log(`✨ CREATE (${toCreate.length} projects):`);
      toCreate.forEach(p => console.log(`   + ${p.name}`));
      console.log();
    }

    if (toUpdate.length > 0) {
      console.log(`🔄 UPDATE (${toUpdate.length} projects):`);
      toUpdate.forEach(({ local, prod }) => {
        console.log(`   ~ ${local.name}`);
        // Show what changed
        const changes = [];
        if (local.number !== prod.number) changes.push('number');
        if (local.name !== prod.name) changes.push('name');
        if (local.client !== prod.client) changes.push('client');
        if (!deepEqual(local.stages, prod.stages)) changes.push('stages');
        if (!deepEqual(local.projectTypes, prod.projectTypes)) changes.push('projectTypes');
        if (changes.length > 0) {
          console.log(`     (${changes.join(', ')})`);
        }
      });
      console.log();
    }

    if (toDelete.length > 0) {
      console.log(`🗑️  DELETE (${toDelete.length} projects):`);
      toDelete.forEach(p => console.log(`   - ${p.name}`));
      console.log();
    }

    if (settingsChanged) {
      console.log('⚙️  SETTINGS will be updated:');
      if (localData.settings.startYear !== prodData.settings.startYear) {
        console.log(`   Year range: ${prodData.settings.startYear}-${prodData.settings.endYear} → ${localData.settings.startYear}-${localData.settings.endYear}`);
      }
      if (!deepEqual(localData.settings.colorMap, prodData.settings.colorMap)) {
        console.log(`   Color map: ${Object.keys(prodData.settings.colorMap).length} → ${Object.keys(localData.settings.colorMap).length} colors`);
      }
      if (!deepEqual(localData.settings.projectTypeColors, prodData.settings.projectTypeColors)) {
        console.log(`   Project type colors: ${Object.keys(prodData.settings.projectTypeColors || {}).length} → ${Object.keys(localData.settings.projectTypeColors || {}).length} colors`);
      }
      console.log();
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🐛 DEBUG: About to ask for confirmation...');

    // Check if --confirm flag is present
    const autoConfirm = process.argv.includes('--confirm');
    console.log(`🐛 DEBUG: Auto-confirm: ${autoConfirm}`);

    if (!autoConfirm) {
      console.log('🐛 DEBUG: Waiting for user input...');
      const answer = await askQuestion('⚠️  Proceed with sync? (yes/no): ');
      console.log(`🐛 DEBUG: User answered: "${answer}"`);

      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log('❌ Sync cancelled by user');
        rl.close();
        return;
      }
    }

    console.log('🐛 DEBUG: Confirmation passed!');
    console.log('\n🚀 Starting sync...\n');

    let successCount = 0;
    let failCount = 0;

    // Create new projects
    for (const project of toCreate) {
      try {
        const response = await fetch(`${API_URL}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project)
        });

        if (response.ok) {
          console.log(`✅ Created: ${project.name}`);
          successCount++;
        } else {
          const error = await response.json();
          console.log(`❌ Failed to create ${project.name}: ${error.error}`);
          failCount++;
        }
      } catch (err) {
        console.log(`❌ Error creating ${project.name}: ${err.message}`);
        failCount++;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update existing projects
    for (const { local } of toUpdate) {
      try {
        const response = await fetch(`${API_URL}/projects/${local.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(local)
        });

        if (response.ok) {
          console.log(`✅ Updated: ${local.name}`);
          successCount++;
        } else {
          const error = await response.json();
          console.log(`❌ Failed to update ${local.name}: ${error.error}`);
          failCount++;
        }
      } catch (err) {
        console.log(`❌ Error updating ${local.name}: ${err.message}`);
        failCount++;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Delete removed projects
    for (const project of toDelete) {
      try {
        const response = await fetch(`${API_URL}/projects/${project.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          console.log(`✅ Deleted: ${project.name}`);
          successCount++;
        } else {
          const error = await response.json();
          console.log(`❌ Failed to delete ${project.name}: ${error.error}`);
          failCount++;
        }
      } catch (err) {
        console.log(`❌ Error deleting ${project.name}: ${err.message}`);
        failCount++;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update settings (if changed)
    if (settingsChanged) {
      console.log('\n⚙️  Updating settings...');
      // Note: You'll need to add a PUT /api/settings endpoint to your server
      console.log('⚠️  Settings sync not yet implemented - requires API endpoint');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Sync complete!');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('\n🌐 Check your live app: https://fenwick-frontend.vercel.app/');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.error('🐛 DEBUG: Full error:', error);
    console.error('🐛 DEBUG: Error stack:', error.stack);
    process.exit(1);
  } finally {
    console.log('🐛 DEBUG: Closing readline interface...');
    rl.close();
  }
}

syncData();
