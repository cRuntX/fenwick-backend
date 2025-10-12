import fetch from 'node-fetch';

const API_URL = 'https://fenwick-backend.onrender.com/api';

async function checkProduction() {
  console.log('🔍 Checking Production Database\n');
  console.log('═══════════════════════════════════════\n');

  try {
    const response = await fetch(`${API_URL}/data`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Database Schema Check
    console.log('📊 DATABASE SCHEMA:');
    const hasNewSchema = data.projects.some(p => Array.isArray(p.projectTypes));
    console.log(`   Schema version: ${hasNewSchema ? 'NEW (project_types array)' : 'OLD (single type)'}`);

    if (hasNewSchema) {
      console.log('   ✅ Migration to project_types completed');
    } else {
      console.log('   ⚠️  Still using old schema - migration needed');
    }

    // Projects Check
    console.log(`\n📁 PROJECTS:`);
    console.log(`   Total projects: ${data.projects.length}`);

    if (data.projects.length > 0) {
      const sample = data.projects[0];
      console.log(`\n   Sample project structure:`);
      console.log(`   - Has practice_name: ${sample.practiceName !== undefined ? '✅' : '❌'}`);
      console.log(`   - Has brief_description: ${sample.briefDescription !== undefined ? '✅' : '❌'}`);
      console.log(`   - Has project_types array: ${Array.isArray(sample.projectTypes) ? '✅' : '❌'}`);

      console.log(`\n   First 5 projects:`);
      data.projects.slice(0, 5).forEach((p, i) => {
        const types = Array.isArray(p.projectTypes) ? p.projectTypes.join(', ') : p.projectTypes;
        console.log(`   ${i + 1}. ${p.name} (${types || 'No type'})`);
      });
    }

    // Settings Check
    console.log(`\n⚙️  SETTINGS:`);
    if (data.settings) {
      console.log(`   ✅ Settings configured`);
      console.log(`   - Year range: ${data.settings.startYear} - ${data.settings.endYear}`);
      console.log(`   - Color map entries: ${Object.keys(data.settings.colorMap || {}).length}`);
      console.log(`   - Project type colors: ${Object.keys(data.settings.projectTypeColors || {}).length}`);
    } else {
      console.log(`   ❌ No settings found`);
    }

    // Migration Status
    console.log(`\n🔄 MIGRATION STATUS:`);
    const allHaveNewFields = data.projects.every(p =>
      p.practiceName !== undefined &&
      p.briefDescription !== undefined &&
      Array.isArray(p.projectTypes)
    );

    if (allHaveNewFields) {
      console.log('   ✅ All projects have new schema fields');
    } else {
      const needsUpdate = data.projects.filter(p =>
        p.practiceName === undefined ||
        p.briefDescription === undefined ||
        !Array.isArray(p.projectTypes)
      ).length;
      console.log(`   ⚠️  ${needsUpdate} projects need schema update`);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('\n✅ Production check complete!');
    console.log(`\n🌐 Live app: https://fenwick-frontend.vercel.app/`);

  } catch (error) {
    console.error('\n❌ Failed to check production:', error.message);
    console.log('\nPossible reasons:');
    console.log('  - Backend is down or restarting');
    console.log('  - Network connection issue');
    console.log('  - Database connection problem');
  }
}

checkProduction();
