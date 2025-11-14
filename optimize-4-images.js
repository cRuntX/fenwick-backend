/**
 * AGGRESSIVE OPTIMIZATION - 4 SPECIFIC IMAGES ONLY
 */

import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

// Aggressive settings
const MAX_WIDTH = 600;
const MAX_HEIGHT = 400;
const QUALITY = 60;

// Only these 4 images
const TARGET_IMAGES = [
  'Pathway Over the Mountain',
  'Marunouchi',
  'Monsieur George',
  'Hilton Hotel'
];

console.log('🎯 Aggressive Optimization - 4 Images Only\n');
console.log('⚙️  Settings:');
console.log(`   Max width: ${MAX_WIDTH}px`);
console.log(`   Max height: ${MAX_HEIGHT}px`);
console.log(`   JPEG quality: ${QUALITY}%\n`);
console.log('📋 Target images:');
TARGET_IMAGES.forEach((name, i) => console.log(`   ${i + 1}. ${name}`));
console.log('');

let sharp;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
  console.log('✅ Sharp loaded\n');
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

async function optimizeFour() {
  try {
    const result = await db.query(
      "SELECT id, number, name, thumbnail FROM projects WHERE thumbnail IS NOT NULL AND thumbnail != '' ORDER BY number"
    );

    const allProjects = result.rows;

    // Filter to only the 4 target images
    const targetProjects = allProjects.filter(project => {
      return TARGET_IMAGES.some(targetName =>
        project.name.toLowerCase().includes(targetName.toLowerCase())
      );
    });

    console.log(`Found ${allProjects.length} total projects`);
    console.log(`Targeting ${targetProjects.length} projects\n`);

    if (targetProjects.length !== 4) {
      console.log('⚠️  Warning: Expected 4 projects but found ' + targetProjects.length);
    }

    console.log('Projects found:');
    targetProjects.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name}`);
    });
    console.log('\n' + '━'.repeat(80));

    let totalSizeBefore = 0;
    let totalSizeAfter = 0;

    for (let i = 0; i < targetProjects.length; i++) {
      const project = targetProjects[i];
      const num = `[${i + 1}/${targetProjects.length}]`;

      try {
        let base64Data = project.thumbnail;
        const matches = base64Data.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);

        if (!matches) {
          console.log(`⚠️  ${num} Invalid format, skipping`);
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
            mozjpeg: true
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

        console.log(`✅ ${num} ${project.name.substring(0, 45).padEnd(45)} ${originalSizeKB.toFixed(1).padStart(7)} KB → ${optimizedSizeKB.toFixed(1).padStart(6)} KB (${reduction.toFixed(1)}%)`);

      } catch (error) {
        console.error(`❌ ${num} Error: ${error.message}`);
      }
    }

    console.log('━'.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   ✅ Optimized: ${targetProjects.length} images`);
    console.log(`   💾 Before: ${(totalSizeBefore / 1024).toFixed(2)} MB`);
    console.log(`   💾 After: ${(totalSizeAfter / 1024).toFixed(2)} MB`);
    console.log(`   📉 Reduction: ${((totalSizeBefore - totalSizeAfter) / totalSizeBefore * 100).toFixed(1)}%`);
    console.log(`   💰 Saved: ${((totalSizeBefore - totalSizeAfter) / 1024).toFixed(2)} MB\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await db.end();
  }
}

optimizeFour()
  .then(() => {
    console.log('✅ 4 images optimized!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
