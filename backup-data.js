// Backup script to fetch production data
// Usage: node backup-data.js

import fs from 'fs';

const PRODUCTION_URL = 'https://fenwick-backend.onrender.com/api/data';
const BACKUP_FILE = 'backup-data.json';

console.log('🔄 Fetching production data...');
console.log(`📡 Source: ${PRODUCTION_URL}`);

try {
  const response = await fetch(PRODUCTION_URL);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  // Write to file with pretty formatting
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2));

  // Show summary
  const projectCount = data.projects?.length || 0;
  const fileSize = (fs.statSync(BACKUP_FILE).size / 1024).toFixed(2);

  console.log('\n✅ Backup completed successfully!');
  console.log(`📊 Projects backed up: ${projectCount}`);
  console.log(`📁 File: ${BACKUP_FILE}`);
  console.log(`💾 Size: ${fileSize} KB`);
  console.log(`📅 Settings: ${data.settings?.startYear || 'N/A'} - ${data.settings?.endYear || 'N/A'}`);

  if (data.settings?.colorMap) {
    const colorCount = Object.keys(data.settings.colorMap).length;
    console.log(`🎨 Color mappings: ${colorCount}`);
  }

  if (data.settings?.projectTypeColors) {
    const typeColorCount = Object.keys(data.settings.projectTypeColors).length;
    console.log(`🏷️  Project type colors: ${typeColorCount}`);
  }

  console.log('\n✨ Ready to use with migrate-data-smart.js');

} catch (error) {
  console.error('\n❌ Backup failed:', error.message);

  if (error.message.includes('fetch')) {
    console.error('💡 Make sure the production server is running and accessible');
  }

  process.exit(1);
}
