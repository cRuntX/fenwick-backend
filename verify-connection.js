// Verification script to test Supabase connection and data retrieval
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyConnection() {
  console.log('🔍 VERIFICATION SCRIPT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Test basic connection
    console.log('1️⃣ Testing database connection...');
    const timeResult = await db.query('SELECT NOW()');
    console.log('   ✅ Connected successfully!');
    console.log(`   ⏰ Server time: ${timeResult.rows[0].now}\n`);

    // Step 2: Check if projects table exists
    console.log('2️⃣ Checking if projects table exists...');
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'projects'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('   ✅ Projects table exists\n');
    } else {
      console.log('   ❌ Projects table does NOT exist\n');
      await db.end();
      return;
    }

    // Step 3: Count projects
    console.log('3️⃣ Counting projects in database...');
    const countResult = await db.query('SELECT COUNT(*) FROM projects');
    const count = countResult.rows[0].count;
    console.log(`   📊 Total projects: ${count}\n`);

    // Step 4: Fetch all projects (simulating what the API does)
    console.log('4️⃣ Fetching all project data...');
    const projectsResult = await db.query(`
      SELECT
        id, number, name, practice_name, brief_description,
        client, value, area, location, project_types, type_color,
        thumbnail, notes, stages, pauses, responsibilities,
        completed, name_link, practice_name_link
      FROM projects
      ORDER BY number
    `);

    console.log(`   ✅ Fetched ${projectsResult.rows.length} projects\n`);

    // Step 5: Show sample data
    if (projectsResult.rows.length > 0) {
      console.log('5️⃣ Sample project data (first project):');
      const firstProject = projectsResult.rows[0];
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   ID: ${firstProject.id}`);
      console.log(`   Number: ${firstProject.number}`);
      console.log(`   Name: ${firstProject.name}`);
      console.log(`   Practice: ${firstProject.practice_name || 'N/A'}`);
      console.log(`   Location: ${firstProject.location || 'N/A'}`);
      console.log(`   Types: ${firstProject.project_types}`);
      console.log(`   Color: ${firstProject.type_color}`);
      console.log(`   Completed: ${firstProject.completed}`);
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // Step 6: Test data transformation (like server.js does)
    console.log('6️⃣ Testing data transformation...');
    const transformedProjects = projectsResult.rows.map(row => ({
      id: row.id,
      number: row.number,
      name: row.name,
      practiceName: row.practice_name,
      briefDescription: row.brief_description,
      client: row.client,
      value: row.value,
      area: row.area,
      location: row.location,
      projectTypes: JSON.parse(row.project_types || '[]'),
      typeColor: row.type_color,
      thumbnail: row.thumbnail,
      notes: row.notes,
      stages: JSON.parse(row.stages || '[]'),
      pauses: row.pauses ? JSON.parse(row.pauses) : [],
      responsibilities: row.responsibilities ? JSON.parse(row.responsibilities) : [],
      completed: row.completed,
      nameLink: row.name_link,
      practiceNameLink: row.practice_name_link
    }));

    console.log(`   ✅ Successfully transformed ${transformedProjects.length} projects\n`);

    // Step 7: Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 VERIFICATION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database connection: Working');
    console.log('✅ Projects table: Exists');
    console.log(`✅ Total projects: ${count}`);
    console.log('✅ Data retrieval: Working');
    console.log('✅ Data transformation: Working');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 Next steps:');
    console.log('   1. Update DATABASE_URL in Render dashboard');
    console.log('   2. Wait for Render to redeploy');
    console.log('   3. Test: curl https://fenwick-backend.onrender.com/api/data');
    console.log('   4. Check your frontend at https://fenwick-frontend.vercel.app/\n');

  } catch (error) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ VERIFICATION FAILED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error:', error.message);
    console.error('\nFull error details:');
    console.error(error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } finally {
    await db.end();
  }
}

verifyConnection();
