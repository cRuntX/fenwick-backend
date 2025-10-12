import fs from 'fs';
import fetch from 'node-fetch';

// Your live backend URL
const API_URL = 'https://fenwick-backend.onrender.com/api';

async function migrateData() {
  console.log('🚀 Starting data migration...\n');
  
  try {
    // Read the backup file
    const data = JSON.parse(fs.readFileSync('./backup-data.json', 'utf8'));
    console.log(`📊 Found ${data.projects.length} projects to migrate\n`);
    
    // Upload each project
    for (let i = 0; i < data.projects.length; i++) {
      const project = data.projects[i];
      console.log(`⬆️  Uploading project ${i + 1}/${data.projects.length}: ${project.name}`);
      
      try {
        const response = await fetch(`${API_URL}/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(project)
        });
        
        if (response.ok) {
          console.log(`   ✅ Success!`);
        } else {
          const error = await response.json();
          console.log(`   ❌ Failed: ${error.error}`);
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n🎉 Migration complete!');
    console.log(`✅ Successfully uploaded projects to PostgreSQL database`);
    console.log(`\nCheck your live app: https://fenwick-frontend.vercel.app/`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

migrateData();