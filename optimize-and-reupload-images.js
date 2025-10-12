import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new sqlite3.Database('./fenwick.db');

// Configuration
const OPTIMIZED_IMAGES_DIR = path.join(__dirname, 'optimized-images'); // Put your optimized images here
const MAX_SIZE_KB = 200; // Warn if image is larger than this

console.log('🚀 Starting image optimization and re-upload...\n');

// Check if optimized images directory exists
if (!fs.existsSync(OPTIMIZED_IMAGES_DIR)) {
  console.error(`❌ Directory not found: ${OPTIMIZED_IMAGES_DIR}`);
  console.log('\n📋 Please create the "optimized-images" folder and put your optimized images there.');
  console.log('   Images should have the same filenames as extracted images.');
  process.exit(1);
}

// Read metadata
const metadataPath = path.join(__dirname, 'extracted-images', '_image_metadata.json');
if (!fs.existsSync(metadataPath)) {
  console.error(`❌ Metadata file not found: ${metadataPath}`);
  console.log('\n📋 Please run extract-and-optimize-images.js first!');
  process.exit(1);
}

const imageMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

console.log(`📊 Found metadata for ${imageMetadata.length} images\n`);

let updatedCount = 0;
let skippedCount = 0;
let totalSizeBefore = 0;
let totalSizeAfter = 0;
let errors = [];

// Process each image
const updatePromises = imageMetadata.map((meta, index) => {
  return new Promise((resolve) => {
    const optimizedPath = path.join(OPTIMIZED_IMAGES_DIR, meta.filename);

    // Check if optimized image exists
    if (!fs.existsSync(optimizedPath)) {
      console.log(`⏭️  [${index + 1}/${imageMetadata.length}] Skipping ${meta.name} - optimized image not found`);
      skippedCount++;
      resolve();
      return;
    }

    try {
      // Read optimized image
      const imageBuffer = fs.readFileSync(optimizedPath);
      const sizeKB = (imageBuffer.length / 1024).toFixed(2);

      // Convert to base64
      const base64Image = imageBuffer.toString('base64');
      const mimeType = meta.format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      // Calculate size reduction
      const originalSizeKB = parseFloat(meta.originalSize);
      const reduction = ((originalSizeKB - sizeKB) / originalSizeKB * 100).toFixed(1);

      totalSizeBefore += originalSizeKB;
      totalSizeAfter += parseFloat(sizeKB);

      // Update database
      db.run(
        'UPDATE projects SET thumbnail = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [dataUrl, meta.id],
        (err) => {
          if (err) {
            console.error(`❌ [${index + 1}/${imageMetadata.length}] Error updating ${meta.name}:`, err.message);
            errors.push({ project: meta.name, error: err.message });
          } else {
            const sizeWarning = sizeKB > MAX_SIZE_KB ? ` ⚠️  Still large!` : '';
            console.log(`✅ [${index + 1}/${imageMetadata.length}] ${meta.name} - ${originalSizeKB} KB → ${sizeKB} KB (${reduction}% reduction)${sizeWarning}`);
            updatedCount++;
          }
          resolve();
        }
      );
    } catch (error) {
      console.error(`❌ [${index + 1}/${imageMetadata.length}] Error processing ${meta.name}:`, error.message);
      errors.push({ project: meta.name, error: error.message });
      resolve();
    }
  });
});

// Wait for all updates to complete
Promise.all(updatePromises).then(() => {
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Updated: ${updatedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   ❌ Errors: ${errors.length}`);
  console.log(`   💾 Total size before: ${totalSizeBefore.toFixed(2)} KB (${(totalSizeBefore / 1024).toFixed(2)} MB)`);
  console.log(`   💾 Total size after: ${totalSizeAfter.toFixed(2)} KB (${(totalSizeAfter / 1024).toFixed(2)} MB)`);
  console.log(`   📉 Total reduction: ${((totalSizeBefore - totalSizeAfter) / totalSizeBefore * 100).toFixed(1)}%`);
  console.log(`   📉 Space saved: ${((totalSizeBefore - totalSizeAfter) / 1024).toFixed(2)} MB`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors encountered:`);
    errors.forEach(e => console.log(`   - ${e.project}: ${e.error}`));
  }

  db.close(() => {
    console.log('\n✅ Database updated successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test the app to make sure images still display correctly');
    console.log('   2. Run: npm start');
    console.log('   3. If everything looks good, commit and push to GitHub');
  });
});
