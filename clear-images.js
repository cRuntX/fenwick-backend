import sqlite3 from 'sqlite3';
import readline from 'readline';
import fs from 'fs';

const { Database } = sqlite3.verbose();

console.log('🗑️  Clearing all images from database...\n');

const db = new Database('./fenwick.db', (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  }
});

// First, check how many projects have images
db.get("SELECT COUNT(*) as count FROM projects WHERE thumbnail IS NOT NULL AND thumbnail != ''", (err, row) => {
  if (err) {
    console.error('❌ Error counting images:', err);
    db.close();
    process.exit(1);
  }

  const imageCount = row.count;
  console.log(`📊 Found ${imageCount} project(s) with images\n`);

  if (imageCount === 0) {
    console.log('✅ No images to clear!');
    db.close();
    return;
  }

  // Ask for confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`⚠️  Are you sure you want to clear ${imageCount} image(s)? This cannot be undone!\nType 'YES' to confirm: `, (answer) => {
    rl.close();

    if (answer !== 'YES') {
      console.log('\n❌ Operation cancelled.');
      db.close();
      return;
    }

    // Create backup before clearing
    console.log('\n📦 Creating backup first...');
    const backupDate = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

    db.all("SELECT * FROM projects", (err, projects) => {
      if (err) {
        console.error('❌ Error backing up:', err);
        db.close();
        process.exit(1);
      }

      const backupFile = `backup-before-image-clear-${backupDate}.json`;
      fs.writeFileSync(backupFile, JSON.stringify({ projects }, null, 2));
      console.log(`✅ Backup saved to: ${backupFile}\n`);

      // Now clear the images
      console.log('🗑️  Clearing images...');
      db.run("UPDATE projects SET thumbnail = ''", function(err) {
        if (err) {
          console.error('❌ Error clearing images:', err);
          db.close();
          process.exit(1);
        }

        console.log(`✅ Cleared images from ${this.changes} project(s)`);

        // Vacuum the database to reclaim space
        console.log('\n🔧 Optimizing database...');
        db.run('VACUUM', (err) => {
          if (err) {
            console.error('❌ Error optimizing:', err);
          } else {
            console.log('✅ Database optimized!');
          }

          // Show final stats
          db.get("SELECT COUNT(*) as total FROM projects", (err, row) => {
            console.log(`\n📊 Final Status:`);
            console.log(`   Total projects: ${row.total}`);
            console.log(`   Projects with images: 0`);
            console.log(`\n✅ All images cleared successfully!`);
            console.log(`📦 Backup available at: ${backupFile}`);

            db.close();
          });
        });
      });
    });
  });
});
