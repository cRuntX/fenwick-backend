/**
 * AUTO IMAGE OPTIMIZER
 *
 * This script will:
 * 1. Extract all images from the database
 * 2. Automatically optimize them (requires 'sharp' package)
 * 3. Re-upload optimized images back to the database
 *
 * INSTALLATION:
 * npm install sharp
 *
 * USAGE:
 * node auto-optimize-images.js
 */

import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MAX_WIDTH = 800;          // Maximum image width
const MAX_HEIGHT = 600;         // Maximum image height
const QUALITY = 75;             // JPEG quality (0-100)
const BACKUP_DB = true;         // Create database backup before updating

console.log('🚀 Auto Image Optimizer\n');
console.log('⚙️  Configuration:');
console.log(`   Max width: ${MAX_WIDTH}px`);
console.log(`   Max height: ${MAX_HEIGHT}px`);
console.log(`   JPEG quality: ${QUALITY}%`);
console.log(`   Backup database: ${BACKUP_DB ? 'Yes' : 'No'}\n`);

// Check if sharp is installed
let sharp;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
  console.log('✅ Sharp library loaded\n');
} catch (error) {
  console.error('❌ Sharp library not found!');
  console.log('\n📋 Please install sharp first:');
  console.log('   npm install sharp\n');
  console.log('Or use the manual process:');
  console.log('   1. node extract-and-optimize-images.js');
  console.log('   2. Manually optimize images in extracted-images/');
  console.log('   3. node optimize-and-reupload-images.js\n');
  process.exit(1);
}

// Backup database BEFORE opening it
if (BACKUP_DB) {
  const backupPath = `./fenwick_backup_${Date.now()}.db`;
  fs.copyFileSync('./fenwick.db', backupPath);
  console.log(`💾 Database backed up to: ${backupPath}\n`);
}

// Open database and wait for it to be ready
let db;
await new Promise((resolve, reject) => {
  db = new sqlite3.Database('./fenwick.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err.message);
      reject(err);
    } else {
      console.log('✅ Database opened in READWRITE mode\n');
      resolve();
    }
  });
});

console.log('📊 Fetching projects with images...\n');

// Main processing function
async function processImages() {
  // Get all projects first
  const projects = await new Promise((resolve, reject) => {
    db.all("SELECT id, number, name, thumbnail FROM projects WHERE thumbnail IS NOT NULL AND thumbnail != ''", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.log(`Found ${projects.length} projects with images\n`);
  console.log('━'.repeat(80));

  let totalSizeBefore = 0;
  let totalSizeAfter = 0;
  let processedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const num = `[${i + 1}/${projects.length}]`;

    try {
      // Extract base64 data
      let base64Data = project.thumbnail;
      const matches = base64Data.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);

      if (matches) {
        base64Data = matches[2];
      }

      // Convert to buffer
      const originalBuffer = Buffer.from(base64Data, 'base64');
      const originalSizeKB = (originalBuffer.length / 1024);
      totalSizeBefore += originalSizeKB;

      // Optimize image using sharp
      const optimizedBuffer = await sharp(originalBuffer)
        .resize(MAX_WIDTH, MAX_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: QUALITY })
        .toBuffer();

      const optimizedSizeKB = (optimizedBuffer.length / 1024);
      totalSizeAfter += optimizedSizeKB;

      // Convert back to base64
      const optimizedBase64 = `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;

      // Update database
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE projects SET thumbnail = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [optimizedBase64, project.id],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });

      const reduction = ((originalSizeKB - optimizedSizeKB) / originalSizeKB * 100);
      const projectName = project.name.substring(0, 50);

      console.log(`✅ ${num} ${projectName}`);
      console.log(`   ${originalSizeKB.toFixed(1)} KB → ${optimizedSizeKB.toFixed(1)} KB (${reduction.toFixed(1)}% reduction)`);

      processedCount++;

    } catch (error) {
      console.error(`❌ ${num} Error processing ${project.name}:`);
      console.error(`   ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      errorCount++;
    }
  }

  console.log('━'.repeat(80));
  console.log('\n📊 Final Summary:');
  console.log(`   ✅ Successfully optimized: ${processedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   💾 Total size before: ${(totalSizeBefore / 1024).toFixed(2)} MB`);
  console.log(`   💾 Total size after: ${(totalSizeAfter / 1024).toFixed(2)} MB`);
  console.log(`   📉 Total reduction: ${((totalSizeBefore - totalSizeAfter) / totalSizeBefore * 100).toFixed(1)}%`);
  console.log(`   💰 Space saved: ${((totalSizeBefore - totalSizeAfter) / 1024).toFixed(2)} MB`);

  // Check final database size
  const dbStats = fs.statSync('./fenwick.db');
  const dbSizeMB = (dbStats.size / (1024 * 1024)).toFixed(2);
  console.log(`   📁 Current database size: ${dbSizeMB} MB`);

  return { processedCount, errorCount };
}

// Run the processing
processImages()
  .then(() => {
    db.close(() => {
      console.log('\n✅ All done! Database updated successfully.');
      console.log('\n📋 Next steps:');
      console.log('   1. Test the app: npm start');
      console.log('   2. Verify images display correctly');
      console.log('   3. Run VACUUM to compact database (optional):');
      console.log('      sqlite3 fenwick.db "VACUUM;"');
    });
  })
  .catch((err) => {
    console.error('❌ Fatal error:', err);
    db.close();
    process.exit(1);
  });
