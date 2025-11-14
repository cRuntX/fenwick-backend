/**
 * CHECK DATA COMPLETENESS
 *
 * Quick utility to check local database data completeness
 * Usage: node check-data.js
 */

import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./fenwick.db', sqlite3.OPEN_READONLY);

console.log('📊 Local Database Status\n');
console.log('━'.repeat(80) + '\n');

db.all(`
  SELECT
    id, number, name, practice_name, brief_description,
    thumbnail, pauses, responsibilities
  FROM projects
  ORDER BY number
`, (err, projects) => {
  if (err) {
    console.error('❌ Error:', err.message);
    db.close();
    process.exit(1);
  }

  console.log(`Total Projects: ${projects.length}\n`);

  let stats = {
    total: projects.length,
    withPracticeName: 0,
    withDescription: 0,
    withImages: 0,
    withPauses: 0,
    withResponsibilities: 0
  };

  projects.forEach((p, i) => {
    const hasPractice = p.practice_name && p.practice_name !== '';
    const hasDesc = p.brief_description && p.brief_description !== '';
    const hasImage = p.thumbnail && p.thumbnail !== '';
    const hasPauses = p.pauses && p.pauses !== '[]';
    const hasResp = p.responsibilities && p.responsibilities !== '[]';

    if (hasPractice) stats.withPracticeName++;
    if (hasDesc) stats.withDescription++;
    if (hasImage) stats.withImages++;
    if (hasPauses) stats.withPauses++;
    if (hasResp) stats.withResponsibilities++;

    const status = [
      hasPractice ? '✅' : '❌',
      hasDesc ? '✅' : '❌',
      hasImage ? '✅' : '❌'
    ].join(' ');

    console.log(`${String(i + 1).padStart(2)}. ${p.name.substring(0, 40).padEnd(42)} ${status}`);
  });

  console.log('\n' + '━'.repeat(80));
  console.log('\n📈 Completeness Summary:\n');

  const percent = (count, total) => ((count / total) * 100).toFixed(0);

  console.log(`   practice_name:     ${stats.withPracticeName.toString().padStart(2)}/${stats.total} (${percent(stats.withPracticeName, stats.total)}%)`);
  console.log(`   brief_description: ${stats.withDescription.toString().padStart(2)}/${stats.total} (${percent(stats.withDescription, stats.total)}%)`);
  console.log(`   thumbnail:         ${stats.withImages.toString().padStart(2)}/${stats.total} (${percent(stats.withImages, stats.total)}%)`);
  console.log(`   pauses:            ${stats.withPauses.toString().padStart(2)}/${stats.total} (${percent(stats.withPauses, stats.total)}%)`);
  console.log(`   responsibilities:  ${stats.withResponsibilities.toString().padStart(2)}/${stats.total} (${percent(stats.withResponsibilities, stats.total)}%)`);

  console.log('');

  // Data health check
  if (stats.total === 0) {
    console.log('❌ DATABASE IS EMPTY!');
  } else if (stats.withPracticeName === 0) {
    console.log('⚠️  WARNING: No practice names found - data may be corrupted!');
  } else if (stats.withDescription === 0) {
    console.log('⚠️  WARNING: No descriptions found - data may be corrupted!');
  } else if (stats.withPracticeName < stats.total * 0.5) {
    console.log('⚠️  WARNING: Less than 50% of projects have practice names');
  } else {
    console.log('✅ Data looks healthy!');
  }

  console.log('');

  db.close();
});
