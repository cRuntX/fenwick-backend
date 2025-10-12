import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new sqlite3.Database('./fenwick.db');

// Create output directory
const outputDir = path.join(__dirname, 'extracted-images');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🚀 Starting image extraction...\n');

// Get all projects with thumbnails
db.all("SELECT id, number, name, thumbnail FROM projects WHERE thumbnail IS NOT NULL AND thumbnail != ''", (err, projects) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }

  console.log(`📊 Found ${projects.length} projects with images\n`);

  let totalSize = 0;
  const imageData = [];

  projects.forEach((project, index) => {
    try {
      // Extract base64 data (remove data:image/jpeg;base64, prefix if present)
      let base64Data = project.thumbnail;
      const matches = base64Data.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);

      let imageFormat = 'jpg';
      if (matches) {
        imageFormat = matches[1];
        base64Data = matches[2];
      }

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const sizeKB = (imageBuffer.length / 1024).toFixed(2);
      totalSize += imageBuffer.length;

      // Create safe filename
      const safeProjectName = project.name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      const filename = `${project.number}_${safeProjectName}_${project.id}.${imageFormat}`;
      const filepath = path.join(outputDir, filename);

      // Save to file
      fs.writeFileSync(filepath, imageBuffer);

      imageData.push({
        id: project.id,
        number: project.number,
        name: project.name,
        filename: filename,
        originalSize: sizeKB + ' KB',
        format: imageFormat
      });

      console.log(`✅ [${index + 1}/${projects.length}] ${project.name} - ${sizeKB} KB`);
    } catch (error) {
      console.error(`❌ Error extracting image for project ${project.name}:`, error.message);
    }
  });

  // Save metadata
  const metadataPath = path.join(outputDir, '_image_metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(imageData, null, 2));

  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  console.log(`\n📊 Summary:`);
  console.log(`   Total images: ${projects.length}`);
  console.log(`   Total size: ${totalSizeMB} MB`);
  console.log(`   Average size: ${(totalSize / projects.length / 1024).toFixed(2)} KB per image`);
  console.log(`\n💾 Images saved to: ${outputDir}`);
  console.log(`📄 Metadata saved to: ${metadataPath}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Use image editing software or online tools to resize images`);
  console.log(`   2. Recommended: Max width 800px, quality 70-80%`);
  console.log(`   3. Run optimize-and-reupload-images.js to update the database`);

  db.close();
});
