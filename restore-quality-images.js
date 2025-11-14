/**
 * RESTORE QUALITY - Force Re-optimization
 * Better balance: 800x600 @ 75% quality
 */

import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

// Better quality settings
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;
const QUALITY = 75;

console.log('🔄 Restoring Image Quality\n');
console.log('⚙️  Configuration:');
console.log(`   Max width: ${MAX_WIDTH}px`);
console.log(`   Max height: ${MAX_HEIGHT}px`);
console.log(`   JPEG quality: ${QUALITY}%\n`);

let sharp;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
  console.log('✅ Sharp library loaded\n');
} catch (error) {
  console.error('❌ Sharp not found!');
  process.exit(1);
}

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  await db.query('SELECT NOW()');
  console.log('✅ Connected to Supabase\n');
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
}

async function restoreQuality() {
  try {
    const result = await db.query(
      "SELECT id, number, name, thumbnail FROM projects WHERE thumbnail IS NOT NULL AND thumbnail != '' ORDER BY number"
    );

    const projects = result.rows;
    console.log(`Found ${projects.length} projects\n`);
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

        if (!matches) continue;

        base64Data = matches[2];
        const originalBuffer = Buffer.from(base64Data, 'base64');
        const originalSizeKB = (originalBuffer.length / 1024);
        totalSizeBefore += originalSizeKB;

        // Better quality optimization
        const optimizedBuffer = await sharp(originalBuffer)
          .resize(MAX_WIDTH, MAX_HEIGHT, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: QUALITY })
          .toBuffer();

        const optimizedSizeKB = (optimizedBuffer.length / 1024);
        totalSizeAfter += optimizedSizeKB;
        const change = optimizedSizeKB - originalSizeKB;
        const changePercent = (change / originalSizeKB * 100);

        // Update Supabase (force update)
        const optimizedBase64 = `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
        await db.query(
          'UPDATE projects SET thumbnail = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [optimizedBase64, project.id]
        );

        const indicator = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
        console.log(`${indicator} ${num} ${project.name.substring(0, 35).padEnd(35)} ${originalSizeKB.toFixed(1).padStart(6)} KB → ${optimizedSizeKB.toFixed(1).padStart(6)} KB (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`);

        processedCount++;

      } catch (error) {
        console.error(`❌ ${num} Error: ${error.message}`);
      }
    }

    console.log('━'.repeat(80));
    console.log('\n📊 Final Summary:');
    console.log(`   ✅ Re-optimized: ${processedCount} images`);
    console.log(`   💾 Before: ${(totalSizeBefore / 1024).toFixed(2)} MB`);
    console.log(`   💾 After: ${(totalSizeAfter / 1024).toFixed(2)} MB`);

    const change = totalSizeAfter - totalSizeBefore;
    const changePercent = (change / totalSizeBefore * 100);
    console.log(`   📊 Change: ${change > 0 ? '+' : ''}${(change / 1024).toFixed(2)} MB (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`);
    console.log(`\n   🎯 New API size: ~${((totalSizeAfter / 1024) + 0.02).toFixed(2)} MB`);
    console.log(`   ✨ Better quality with reasonable file sizes\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await db.end();
  }
}

restoreQuality()
  .then(() => {
    console.log('✅ Quality restored!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
