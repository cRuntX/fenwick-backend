// Export data from SQLite database with all fields including responsibilities and links
import sqlite3 from 'sqlite3';
import fs from 'fs';

const SQLITE_DB = './fenwick.db';
const OUTPUT_FILE = 'local-data.json';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(SQLITE_DB, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function queryDatabase(db, query) {
  return new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function exportData() {
  console.log('📂 Opening SQLite database...');

  try {
    const db = await openDatabase();
    console.log('✅ Database connected\n');

    // Get all projects with ALL fields
    console.log('📊 Fetching all projects...');
    const projects = await queryDatabase(db, `
      SELECT * FROM projects ORDER BY number
    `);

    console.log(`✅ Found ${projects.length} projects\n`);

    // Show sample of what we're exporting
    if (projects.length > 0) {
      const sample = projects[0];
      console.log('📋 Sample project fields:');
      console.log('  - id:', sample.id);
      console.log('  - name:', sample.name);
      console.log('  - responsibilities:', sample.responsibilities ? 'YES' : 'NO');
      console.log('  - name_link:', sample.name_link ? 'YES' : 'NO');
      console.log('  - practice_name_link:', sample.practice_name_link ? 'YES' : 'NO');
      console.log('');
    }

    // Transform to camelCase format for frontend
    const transformedProjects = projects.map(p => ({
      id: p.id,
      number: p.number,
      name: p.name,
      practiceName: p.practice_name,
      briefDescription: p.brief_description,
      client: p.client,
      value: p.value,
      area: p.area,
      location: p.location,
      projectTypes: p.project_types ? JSON.parse(p.project_types) : [],
      typeColor: p.type_color,
      thumbnail: p.thumbnail,
      notes: p.notes,
      stages: p.stages ? JSON.parse(p.stages) : [],
      pauses: p.pauses ? JSON.parse(p.pauses) : [],
      responsibilities: p.responsibilities ? JSON.parse(p.responsibilities) : [],
      completed: p.completed === 1,
      nameLink: p.name_link,
      practiceNameLink: p.practice_name_link
    }));

    // Create export data
    const exportData = {
      projects: transformedProjects,
      settings: {
        startYear: 2011,
        endYear: 2026,
        colorMap: {
          "Commercial": "#C97373",
          "Residential": "#C79A6B",
          "Education": "#6A8FDB",
          "Healthcare": "#8CC9A3",
          "Cultural": "#B68CC9",
          "Industrial": "#9AA5B1",
          "Refurbishment": "#E0B762",
          "Student Housing": "#7FB0C9",
          "Interiors": "#A1C96D",
          "Hospitality": "#E38FB3",
          "Case Study": "#666666",
          "Others": "#A0A0A0"
        }
      }
    };

    // Write to file
    console.log(`💾 Writing to ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(exportData, null, 2));
    console.log('✅ Export complete!\n');

    // Statistics
    const withResp = transformedProjects.filter(p => p.responsibilities && p.responsibilities.length > 0).length;
    const withNameLink = transformedProjects.filter(p => p.nameLink).length;
    const withPracticeLink = transformedProjects.filter(p => p.practiceNameLink).length;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 EXPORT STATISTICS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total projects: ${transformedProjects.length}`);
    console.log(`With responsibilities: ${withResp}`);
    console.log(`With name links: ${withNameLink}`);
    console.log(`With practice links: ${withPracticeLink}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    db.close();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

exportData();
