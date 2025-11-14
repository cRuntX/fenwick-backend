// Export local SQLite data to JSON file
// Usage: node export-local-data.js

import sqlite3 from 'sqlite3';
import fs from 'fs';

const DB_FILE = './fenwick.db';
const OUTPUT_FILE = 'local-data.json';

console.log('🔄 Exporting local SQLite database...');
console.log(`📁 Source: ${DB_FILE}`);

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  }
});

// Get settings
db.get("SELECT * FROM settings LIMIT 1", (err, settings) => {
  if (err) {
    console.error('❌ Failed to get settings:', err.message);
    db.close();
    process.exit(1);
  }

  // Get all projects
  db.all("SELECT * FROM projects ORDER BY number", (err, projects) => {
    if (err) {
      console.error('❌ Failed to get projects:', err.message);
      db.close();
      process.exit(1);
    }

    // Process projects to match API format
    const processedProjects = projects.map(p => ({
      id: p.id,
      number: p.number,
      name: p.name,
      practiceName: p.practice_name,
      briefDescription: p.brief_description,
      client: p.client,
      value: p.value,
      area: p.area,
      location: p.location,
      projectTypes: JSON.parse(p.project_types || '[]'),
      typeColor: p.type_color,
      thumbnail: p.thumbnail,
      notes: p.notes,
      stages: JSON.parse(p.stages || '{}'),
      pauses: JSON.parse(p.pauses || '[]'),
      responsibilities: JSON.parse(p.responsibilities || '[]'),
      completed: p.completed || false,
      confidential: p.confidential || false,
      nameLink: p.name_link,
      practiceNameLink: p.practice_name_link
    }));

    // Build export data
    const exportData = {
      projects: processedProjects,
      settings: {
        startYear: settings?.start_year || 2011,
        endYear: settings?.end_year || 2026,
        colorMap: JSON.parse(settings?.color_map || '{}'),
        projectTypeColors: JSON.parse(settings?.project_type_colors || '{}')
      }
    };

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(exportData, null, 2));

    // Show summary
    const fileSize = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2);

    console.log('\n✅ Export completed successfully!');
    console.log(`📊 Projects exported: ${processedProjects.length}`);
    console.log(`📁 File: ${OUTPUT_FILE}`);
    console.log(`💾 Size: ${fileSize} KB`);
    console.log(`📅 Settings: ${exportData.settings.startYear} - ${exportData.settings.endYear}`);

    if (exportData.settings.colorMap) {
      const colorCount = Object.keys(exportData.settings.colorMap).length;
      console.log(`🎨 Color mappings: ${colorCount}`);
    }

    if (exportData.settings.projectTypeColors) {
      const typeColorCount = Object.keys(exportData.settings.projectTypeColors).length;
      console.log(`🏷️  Project type colors: ${typeColorCount}`);
    }

    console.log('\n✨ Ready to sync to production');

    db.close();
  });
});
