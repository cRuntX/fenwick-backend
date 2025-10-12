// Analyze year-level activity
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./local-data.json', 'utf8'));

console.log('📅 YEAR-LEVEL ACTIVITY ANALYSIS\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Count activity per year
const yearActivity = {};
for (let year = 2011; year <= 2026; year++) {
  yearActivity[year] = 0;
}

data.projects.forEach(project => {
  Object.entries(project.stages).forEach(([stage, dates]) => {
    if (dates.start) {
      const year = parseInt(dates.start.split('-')[0]);
      if (yearActivity[year] !== undefined) {
        yearActivity[year]++;
      }
    }
  });
});

console.log('YEAR | ACTIVITY | STATUS');
console.log('-----|----------|--------');

for (let year = 2011; year <= 2026; year++) {
  const count = yearActivity[year];
  const status = count === 0 ? '❌ EMPTY (collapse)' : `✅ Active (${count} entries)`;
  console.log(`${year} | ${count.toString().padStart(8, ' ')} | ${status}`);
}

const emptyYears = Object.entries(yearActivity)
  .filter(([_, count]) => count === 0)
  .map(([year, _]) => year);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`📊 SUMMARY:`);
console.log(`   Total years: ${Object.keys(yearActivity).length}`);
console.log(`   Empty years: ${emptyYears.length}`);
console.log(`   Active years: ${Object.keys(yearActivity).length - emptyYears.length}`);
console.log(`\n   Empty years to collapse: ${emptyYears.join(', ')}`);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
