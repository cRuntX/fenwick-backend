/**
 * RESTORE ORIGINAL IMAGES
 * Extract from backup and apply minimal optimization
 */

import 'dotenv/config';
import sqlite3 from 'sqlite3';
import pg from 'pg';
const { Pool } = pg;

// MINIMAL optimization - preserve quality
const QUALITY = 85;              // High quality
const MAX_WIDTH = 1200;          // Keep larger dimensions
const MAX_HEIGHT = 900;          // Keep larger dimensions

console.log('🔄 Restoring Original Images\n');
console.log('📦 Source: fenwick_backup_1762456707465.db');
console.log('⚙️  Minimal optimization settings:');
console.log(`   Max width: ${MAX_WIDTH}px`);
console.log(`   Max height: ${MAX_HEIGHT}px`);
console.log(`   JPEG quality: ${QUALITY}%`);
console.log('   Goal: Best quality with reasonable file size\n');

let sharp;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
  console.log('✅ Sharp loaded\n');
} catch (error) {
  console.error('❌ Sharp not found!');
  process.exit(1);
}

// Open backup database
function openBackup() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database('./fenwick_backup_1762456707465.db', sqlite3.OPEN_READONLY, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function queryBackup(db, query) {
  return new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

const supabase = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function restoreOriginals() {
  try {
    console.log('📂 Opening backup database...');
    const backup = await openBackup();
    console.log('✅ Backup opened\n');

    console.log('🔌 Connecting to Supabase...');
    await supabase.query('SELECT NOW()');
    console.log('✅ Connected\n');

    // Get original images from backup
    console.log('📊 Fetching original images from backup...');
    const originalProjects = await queryBackup(backup,
      "SELECT id, number, name, thumbnail FROM projects WHERE thumbnail IS NOT NULL AND thumbnail != '' ORDER BY number"
    );

    console.log(`Found ${originalProjects.length} original images\n`);
    console.log('━'.repeat(80));

    let totalSizeBefore = 0;
    let totalSizeAfter = 0;
    let processedCount = 0;

    for (let i = 0; i < originalProjects.length; i++) {
      const project = originalProjects[i];
      const num = `[${i + 1}/${originalProjects.length}]`;

      try {
        let base64Data = project.thumbnail;
        const matches = base64Data.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);

        if (!matches) {
          console.log(`⚠️  ${num} Invalid image format, skipping`);
          continue;
        }

        base64Data = matches[2];
        const originalBuffer = Buffer.from(base64Data, 'base64');
        const originalSizeKB = (originalBuffer.length / 1024);
        totalSizeBefore += originalSizeKB;

        // MINIMAL optimization - preserve quality
        const optimizedBuffer = await sharp(originalBuffer)
          .resize(MAX_WIDTH, MAX_HEIGHT, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({
            quality: QUALITY,
            chromaSubsampling: '4:4:4'  // Best chroma subsampling for quality
          })
          .toBuffer();

        const optimizedSizeKB = (optimizedBuffer.length / 1024);
        totalSizeAfter += optimizedSizeKB;
        const reduction = ((originalSizeKB - optimizedSizeKB) / originalSizeKB * 100);

        // Update Supabase with restored image
        const optimizedBase64 = `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
        await supabase.query(
          'UPDATE projects SET thumbnail = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [optimizedBase64, project.id]
        );

        console.log(`✅ ${num} ${project.name.substring(0, 35).padEnd(35)} ${originalSizeKB.toFixed(1).padStart(7)} KB → ${optimizedSizeKB.toFixed(1).padStart(7)} KB (${reduction.toFixed(1)}%)`);
        processedCount++;

      } catch (error) {
        console.error(`❌ ${num} Error: ${error.message}`);
      }
    }

    console.log('━'.repeat(80));
    console.log('\n📊 Final Summary:');
    console.log(`   ✅ Restored: ${processedCount} images`);
    console.log(`   💾 Original: ${(totalSizeBefore / 1024).toFixed(2)} MB`);
    console.log(`   💾 Optimized: ${(totalSizeAfter / 1024).toFixed(2)} MB`);
    console.log(`   📉 Reduction: ${((totalSizeBefore - totalSizeAfter) / totalSizeBefore * 100).toFixed(1)}%`);
    console.log(`   💰 Saved: ${((totalSizeBefore - totalSizeAfter) / 1024).toFixed(2)} MB`);
    console.log(`\n   🎯 New API size: ~${((totalSizeAfter / 1024) + 0.02).toFixed(2)} MB`);
    console.log(`   ✨ High quality images restored!\n`);

    backup.close();

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await supabase.end();
  }
}

restoreOriginals()
  .then(() => {
    console.log('✅ Original images restored with minimal optimization!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
