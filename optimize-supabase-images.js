/**
 * SUPABASE IMAGE OPTIMIZER
 *
 * This script will:
 * 1. Fetch all images from Supabase database
 * 2. Optimize them using Sharp
 * 3. Update Supabase with optimized images
 *
 * USAGE:
 * node optimize-supabase-images.js
 */

import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

// Configuration
const MAX_WIDTH = 720;          // Maximum image width
const MAX_HEIGHT = 540;         // Maximum image height
const QUALITY = 75;             // JPEG quality (0-100)

console.log('🚀 Supabase Image Optimizer\n');
console.log('⚙️  Configuration:');
console.log(`   Max width: ${MAX_WIDTH}px`);
console.log(`   Max height: ${MAX_HEIGHT}px`);
console.log(`   JPEG quality: ${QUALITY}%\n`);

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
  process.exit(1);
}

// Connect to Supabase
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('🔌 Connecting to Supabase...\n');

try {
  await db.query('SELECT NOW()');
  console.log('✅ Connected to Supabase\n');
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
}

console.log('📊 Fetching projects with images...\n');

async function optimizeImages() {
  try {
    // Get all projects with thumbnails
    const result = await db.query(
      "SELECT id, number, name, thumbnail FROM projects WHERE thumbnail IS NOT NULL AND thumbnail != '' ORDER BY number"
    );

    const projects = result.rows;
    console.log(`Found ${projects.length} projects with images\n`);
    console.log('━'.repeat(80));

    let totalSizeBefore = 0;
    let totalSizeAfter = 0;
    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const num = `[${i + 1}/${projects.length}]`;

      try {
        // Extract base64 data
        let base64Data = project.thumbnail;
        const matches = base64Data.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);

        if (!matches) {
          console.log(`⚠️  ${num} ${project.name}: Not a valid base64 image, skipping`);
          skippedCount++;
          continue;
        }

        base64Data = matches[2];

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
        const reduction = ((originalSizeKB - optimizedSizeKB) / originalSizeKB * 100);

        // Convert back to base64
        const optimizedBase64 = `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;

        // Update Supabase
        await db.query(
          'UPDATE projects SET thumbnail = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [optimizedBase64, project.id]
        );

        console.log(`✅ ${num} ${project.name.substring(0, 40)}`);
        console.log(`   ${originalSizeKB.toFixed(1)} KB → ${optimizedSizeKB.toFixed(1)} KB (${reduction.toFixed(1)}% reduction)`);

        processedCount++;

      } catch (error) {
        console.error(`❌ ${num} Error processing ${project.name}:`);
        console.error(`   ${error.message}`);
        errorCount++;
      }
    }

    console.log('━'.repeat(80));
    console.log('\n📊 Final Summary:');
    console.log(`   ✅ Successfully optimized: ${processedCount}`);
    console.log(`   ⏭️  Skipped (already optimized): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   💾 Total size before: ${(totalSizeBefore / 1024).toFixed(2)} MB`);
    console.log(`   💾 Total size after: ${(totalSizeAfter / 1024).toFixed(2)} MB`);

    if (processedCount > 0) {
      const totalReduction = ((totalSizeBefore - totalSizeAfter) / totalSizeBefore * 100);
      console.log(`   📉 Total reduction: ${totalReduction.toFixed(1)}%`);
      console.log(`   💰 Space saved: ${((totalSizeBefore - totalSizeAfter) / 1024).toFixed(2)} MB`);
    }

    console.log('\n✅ Optimization complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test API: curl http://localhost:3001/api/data | wc -c');
    console.log('   2. Expected new size: ~1-2 MB (down from 5.2 MB)');
    console.log('   3. Verify images display correctly in frontend\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await db.end();
  }
}

// Run the optimization
optimizeImages()
  .then(() => {
    console.log('✅ Database connection closed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  });
