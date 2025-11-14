/**
 * SAFE SYNC TO PRODUCTION
 *
 * This script performs safety checks before syncing local data to Supabase
 *
 * Usage: node safe-sync.js
 */

import 'dotenv/config';
import sqlite3 from 'sqlite3';
import pg from 'pg';
import fs from 'fs';
import readline from 'readline';
const { Pool } = pg;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

console.log('🔒 SAFE SYNC TO PRODUCTION\n');
console.log('This script will:');
console.log('  1. Check local data completeness');
console.log('  2. Backup Supabase data');
console.log('  3. Export local data');
console.log('  4. Ask for confirmation');
console.log('  5. Sync to production\n');
console.log('━'.repeat(80) + '\n');

async function checkLocalData() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database('./fenwick.db', sqlite3.OPEN_READONLY);

    db.all(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN practice_name IS NOT NULL AND practice_name != '' THEN 1 ELSE 0 END) as with_practice,
        SUM(CASE WHEN brief_description IS NOT NULL AND brief_description != '' THEN 1 ELSE 0 END) as with_desc,
        SUM(CASE WHEN thumbnail IS NOT NULL AND thumbnail != '' THEN 1 ELSE 0 END) as with_images
      FROM projects
    `, (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows[0]);
    });
  });
}

async function checkSupabaseData() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const result = await db.query(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN practice_name IS NOT NULL AND practice_name != '' THEN 1 END) as with_practice,
      COUNT(CASE WHEN brief_description IS NOT NULL AND brief_description != '' THEN 1 END) as with_desc,
      COUNT(CASE WHEN thumbnail IS NOT NULL AND thumbnail != '' THEN 1 END) as with_images
    FROM projects
  `);

  await db.end();
  return result.rows[0];
}

async function backupSupabase() {
  console.log('📦 Creating Supabase backup...');
  const { execSync } = await import('child_process');
  execSync('node export-from-supabase.js', { stdio: 'inherit' });
  console.log('');
}

async function exportLocal() {
  console.log('📦 Exporting local data...');
  const { execSync } = await import('child_process');
  execSync('node export-local-data.js', { stdio: 'inherit' });
  console.log('');
}

async function performSync() {
  console.log('🚀 Syncing to production...\n');
  const { execSync } = await import('child_process');
  execSync('node sync-to-supabase.js', { stdio: 'inherit' });
}

async function main() {
  try {
    // Step 1: Check local data
    console.log('STEP 1: Checking local database...\n');
    const localStats = await checkLocalData();

    console.log('📊 Local Database:');
    console.log(`   Projects: ${localStats.total}`);
    console.log(`   With practice_name: ${localStats.with_practice}/${localStats.total}`);
    console.log(`   With description: ${localStats.with_desc}/${localStats.total}`);
    console.log(`   With images: ${localStats.with_images}/${localStats.total}`);

    // Safety check
    if (localStats.total === 0) {
      console.log('\n❌ ERROR: Local database is empty!');
      console.log('   This would delete all production data.\n');
      rl.close();
      process.exit(1);
    }

    if (localStats.with_practice === 0 && localStats.total > 0) {
      console.log('\n⚠️  WARNING: No projects have practice_name!');
      console.log('   This looks like corrupted data.\n');
      const answer = await question('Continue anyway? (yes/no): ');
      if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Sync cancelled.\n');
        rl.close();
        process.exit(0);
      }
    }

    console.log('\n✅ Local data looks good!\n');
    console.log('━'.repeat(80) + '\n');

    // Step 2: Check Supabase
    console.log('STEP 2: Checking production database...\n');
    const supabaseStats = await checkSupabaseData();

    console.log('📊 Production Database (Supabase):');
    console.log(`   Projects: ${supabaseStats.total}`);
    console.log(`   With practice_name: ${supabaseStats.with_practice}/${supabaseStats.total}`);
    console.log(`   With description: ${supabaseStats.with_desc}/${supabaseStats.total}`);
    console.log(`   With images: ${supabaseStats.with_images}/${supabaseStats.total}\n`);
    console.log('━'.repeat(80) + '\n');

    // Step 3: Backup Supabase
    console.log('STEP 3: Backing up production database...\n');
    await backupSupabase();
    console.log('✅ Backup saved to: supabase-export.json\n');
    console.log('━'.repeat(80) + '\n');

    // Step 4: Export local
    console.log('STEP 4: Exporting local data...\n');
    await exportLocal();
    console.log('✅ Export saved to: local-data.json\n');
    console.log('━'.repeat(80) + '\n');

    // Step 5: Confirmation
    console.log('STEP 5: Final confirmation\n');
    console.log('📋 Summary:');
    console.log(`   Local: ${localStats.total} projects → Production: ${supabaseStats.total} projects`);
    console.log(`   Backup: supabase-export.json (${supabaseStats.total} projects)\n`);

    if (localStats.total < supabaseStats.total) {
      console.log(`⚠️  WARNING: You have FEWER projects locally (${localStats.total}) than in production (${supabaseStats.total})`);
      console.log('   This will DELETE projects from production!\n');
    }

    const answer = await question('⚠️  Proceed with sync to production? (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Sync cancelled. No changes made to production.\n');
      rl.close();
      process.exit(0);
    }

    console.log('\n━'.repeat(80) + '\n');

    // Step 6: Sync
    await performSync();

    console.log('\n━'.repeat(80));
    console.log('\n✅ SYNC COMPLETE!\n');
    console.log('💡 If something went wrong, restore from backup:');
    console.log('   node import-to-local.js (uses supabase-export.json)\n');

    rl.close();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();
