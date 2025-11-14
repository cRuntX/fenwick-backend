// Export data FROM Supabase database to JSON file
// Usage: node export-from-supabase.js

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
const { Pool } = pg;

const OUTPUT_FILE = 'supabase-export.json';

console.log('🔄 Exporting FROM Supabase database...\n');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function exportFromSupabase() {
  try {
    // Test connection
    await db.query('SELECT NOW()');
    console.log('✅ Connected to Supabase\n');

    // Get all projects
    const result = await db.query(`
      SELECT * FROM projects ORDER BY number
    `);

    const projects = result.rows;
    console.log(`📊 Found ${projects.length} projects\n`);

    // Convert to format compatible with local SQLite
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
      projectTypes: typeof p.project_types === 'string' ? JSON.parse(p.project_types) : p.project_types,
      typeColor: p.type_color,
      thumbnail: p.thumbnail,
      notes: p.notes,
      stages: typeof p.stages === 'string' ? JSON.parse(p.stages) : p.stages,
      pauses: typeof p.pauses === 'string' ? JSON.parse(p.pauses || '[]') : (p.pauses || []),
      responsibilities: typeof p.responsibilities === 'string' ? JSON.parse(p.responsibilities || '[]') : (p.responsibilities || []),
      completed: p.completed || false,
      confidential: p.confidential || false,
      nameLink: p.name_link,
      practiceNameLink: p.practice_name_link
    }));

    // Build export data
    const exportData = {
      projects: processedProjects,
      settings: {
        startYear: 2011,
        endYear: 2026,
        colorMap: {},
        projectTypeColors: {}
      },
      exportedAt: new Date().toISOString(),
      source: 'Supabase Production Database'
    };

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(exportData, null, 2));

    // Show summary
    const fileSize = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2);

    console.log('✅ Export completed successfully!');
    console.log(`📊 Projects exported: ${processedProjects.length}`);
    console.log(`📁 File: ${OUTPUT_FILE}`);
    console.log(`💾 Size: ${fileSize} KB\n`);

    // Show data completeness
    const withPracticeName = processedProjects.filter(p => p.practiceName).length;
    const withDescription = processedProjects.filter(p => p.briefDescription).length;
    const withImages = processedProjects.filter(p => p.thumbnail).length;
    const withPauses = processedProjects.filter(p => p.pauses && p.pauses.length > 0).length;

    console.log('📋 Data Completeness:');
    console.log(`   practice_name: ${withPracticeName}/${processedProjects.length}`);
    console.log(`   brief_description: ${withDescription}/${processedProjects.length}`);
    console.log(`   thumbnail: ${withImages}/${processedProjects.length}`);
    console.log(`   pauses: ${withPauses}/${processedProjects.length}`);
    console.log('\n✨ Ready to import to local SQLite');

    await db.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📝 Details:', error);
    process.exit(1);
  }
}

exportFromSupabase();
