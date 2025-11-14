/**
 * AGGRESSIVE SUPABASE IMAGE OPTIMIZER
 * Targets ~600 KB total API size
 */

import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

// More aggressive settings
const MAX_WIDTH = 600;          // Reduced from 800
const MAX_HEIGHT = 400;         // Reduced from 600
const QUALITY = 60;             // Reduced from 75

console.log('🚀 Aggressive Supabase Image Optimizer\n');
console.log('⚙️  Configuration:');
console.log(`   Max width: ${MAX_WIDTH}px`);
console.log(`   Max height: ${MAX_HEIGHT}px`);
console.log(`   JPEG quality: ${QUALITY}%`);
console.log(`   Target: ~40 KB per image\n`);

let sharp;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
  console.log('✅ Sharp library loaded\n');
} catch (error) {
  console.error('❌ Sharp library not found!');
  console.log('\n📋 Please install sharp: npm install sharp\n');
  process.exit(1);
}

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
    const result = await db.query(
      "SELECT id, number, name, thumbnail FROM projects WHERE thumbnail IS NOT NULL AND thumbnail != '' ORDER BY number"
    );

    const projects = result.rows;
    console.log(`Found ${projects.length} projects with images\n`);
    console.log('━'.repeat(80));

    let totalSizeBefore = 0;
    let totalSizeAfter = 0;
    let processedCount = 0;

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const num = `[${i + 1}/${projects.length}]`;

      try {
        let base64Data = project.thumbnail;
        const matches = base64Data.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);

        if (!matches) {
          console.log(`⚠️  ${num} Skipping invalid image`);
          continue;
        }

        base64Data = matches[2];
        const originalBuffer = Buffer.from(base64Data, 'base64');
        const originalSizeKB = (originalBuffer.length / 1024);
        totalSizeBefore += originalSizeKB;

        // Aggressive optimization
        const optimizedBuffer = await sharp(originalBuffer)
          .resize(MAX_WIDTH, MAX_HEIGHT, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({
            quality: QUALITY,
            mozjpeg: true  // Use mozjpeg for better compression
          })
          .toBuffer();

        const optimizedSizeKB = (optimizedBuffer.length / 1024);
        totalSizeAfter += optimizedSizeKB;
        const reduction = ((originalSizeKB - optimizedSizeKB) / originalSizeKB * 100);

        // Update Supabase
        const optimizedBase64 = `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
        await db.query(
          'UPDATE projects SET thumbnail = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [optimizedBase64, project.id]
        );

        console.log(`✅ ${num} ${project.name.substring(0, 35).padEnd(35)} ${originalSizeKB.toFixed(1).padStart(6)} KB → ${optimizedSizeKB.toFixed(1).padStart(6)} KB (${reduction.toFixed(1)}%)`);
        processedCount++;

      } catch (error) {
        console.error(`❌ ${num} Error: ${error.message}`);
      }
    }

    console.log('━'.repeat(80));
    console.log('\n📊 Final Summary:');
    console.log(`   ✅ Optimized: ${processedCount} images`);
    console.log(`   💾 Before: ${(totalSizeBefore / 1024).toFixed(2)} MB`);
    console.log(`   💾 After: ${(totalSizeAfter / 1024).toFixed(2)} MB`);
    console.log(`   📉 Reduction: ${((totalSizeBefore - totalSizeAfter) / totalSizeBefore * 100).toFixed(1)}%`);
    console.log(`   💰 Saved: ${((totalSizeBefore - totalSizeAfter) / 1024).toFixed(2)} MB`);
    console.log(`\n   🎯 Expected API size: ~${((totalSizeAfter / 1024) + 0.02).toFixed(2)} MB`);
    console.log(`   📈 Load time improvement: ~${(((1.3 - (totalSizeAfter / 1024)) / 1.3) * 100).toFixed(0)}% faster\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await db.end();
  }
}

optimizeImages()
  .then(() => {
    console.log('✅ Optimization complete!');
    console.log('\n📋 Recommendations:');
    console.log('   • Consider moving images to Supabase Storage');
    console.log('   • Return image URLs instead of base64');
    console.log('   • Enable lazy loading for better performance\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
