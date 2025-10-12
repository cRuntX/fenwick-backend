// Analyze monthly activity distribution in the timeline
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./local-data.json', 'utf8'));

console.log('📊 TIMELINE ACTIVITY ANALYSIS\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Count activity per month
const monthActivity = {};

data.projects.forEach(project => {
  Object.entries(project.stages).forEach(([stage, dates]) => {
    if (dates.start) {
      const month = dates.start; // Format: YYYY-MM
      monthActivity[month] = (monthActivity[month] || 0) + 1;
    }
  });
});

// Sort by month
const sortedMonths = Object.keys(monthActivity).sort();

// Calculate statistics
const activityValues = Object.values(monthActivity);
const totalMonths = sortedMonths.length;
const totalActivity = activityValues.reduce((a, b) => a + b, 0);
const avgActivity = totalActivity / totalMonths;
const maxActivity = Math.max(...activityValues);
const minActivity = Math.min(...activityValues);

console.log('📈 OVERALL STATISTICS:');
console.log(`   Total projects: ${data.projects.length}`);
console.log(`   Total stage entries: ${totalActivity}`);
console.log(`   Months with activity: ${totalMonths}`);
console.log(`   Average entries per month: ${avgActivity.toFixed(2)}`);
console.log(`   Max entries in a month: ${maxActivity}`);
console.log(`   Min entries in a month: ${minActivity}\n`);

// Distribution analysis
const distribution = {
  empty: 0,      // 0 entries
  veryLow: 0,    // 1 entry
  low: 0,        // 2-3 entries
  medium: 0,     // 4-6 entries
  high: 0,       // 7-10 entries
  veryHigh: 0    // 11+ entries
};

// Generate all months from 2011 to 2026
const allMonths = [];
for (let year = 2011; year <= 2026; year++) {
  for (let month = 1; month <= 12; month++) {
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    allMonths.push(monthStr);
    const count = monthActivity[monthStr] || 0;

    if (count === 0) distribution.empty++;
    else if (count === 1) distribution.veryLow++;
    else if (count <= 3) distribution.low++;
    else if (count <= 6) distribution.medium++;
    else if (count <= 10) distribution.high++;
    else distribution.veryHigh++;
  }
}

const totalAllMonths = allMonths.length;

console.log('📊 DISTRIBUTION (all months from 2011-2026):');
console.log(`   Empty (0):        ${distribution.empty} months (${(distribution.empty/totalAllMonths*100).toFixed(1)}%)`);
console.log(`   Very Low (1):     ${distribution.veryLow} months (${(distribution.veryLow/totalAllMonths*100).toFixed(1)}%)`);
console.log(`   Low (2-3):        ${distribution.low} months (${(distribution.low/totalAllMonths*100).toFixed(1)}%)`);
console.log(`   Medium (4-6):     ${distribution.medium} months (${(distribution.medium/totalAllMonths*100).toFixed(1)}%)`);
console.log(`   High (7-10):      ${distribution.high} months (${(distribution.high/totalAllMonths*100).toFixed(1)}%)`);
console.log(`   Very High (11+):  ${distribution.veryHigh} months (${(distribution.veryHigh/totalAllMonths*100).toFixed(1)}%)\n`);

// Show busiest periods
console.log('🔥 TOP 20 BUSIEST MONTHS:');
const sorted = sortedMonths
  .map(month => ({ month, count: monthActivity[month] }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 20);

sorted.forEach((item, i) => {
  const bar = '█'.repeat(Math.ceil(item.count / 2));
  console.log(`   ${(i + 1).toString().padStart(2, ' ')}. ${item.month}: ${item.count.toString().padStart(2, ' ')} ${bar}`);
});

console.log('\n🌙 QUIETEST PERIODS (months with activity):');
const quietest = sortedMonths
  .map(month => ({ month, count: monthActivity[month] }))
  .sort((a, b) => a.count - b.count)
  .slice(0, 10);

quietest.forEach((item, i) => {
  console.log(`   ${(i + 1).toString().padStart(2, ' ')}. ${item.month}: ${item.count} entries`);
});

// Analyze consecutive empty months
console.log('\n📅 CONSECUTIVE EMPTY MONTHS:');
let consecutiveEmpty = [];
let currentStreak = [];

allMonths.forEach(month => {
  const count = monthActivity[month] || 0;
  if (count === 0) {
    currentStreak.push(month);
  } else {
    if (currentStreak.length > 0) {
      consecutiveEmpty.push([...currentStreak]);
      currentStreak = [];
    }
  }
});
if (currentStreak.length > 0) {
  consecutiveEmpty.push(currentStreak);
}

// Show longest gaps
const longestGaps = consecutiveEmpty
  .sort((a, b) => b.length - a.length)
  .slice(0, 5);

longestGaps.forEach((gap, i) => {
  console.log(`   ${i + 1}. ${gap[0]} to ${gap[gap.length - 1]} (${gap.length} months)`);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Recommendations
console.log('💡 RECOMMENDATIONS FOR DYNAMIC COLUMN WIDTHS:\n');

const densityRatio = totalActivity / totalAllMonths;
console.log(`   Density ratio: ${densityRatio.toFixed(2)} entries per month overall`);
console.log(`   Empty months: ${((distribution.empty/totalAllMonths)*100).toFixed(1)}%\n`);

if (distribution.empty > totalAllMonths * 0.7) {
  console.log('   ✅ HIGH SPARSITY - Dynamic width would be very beneficial!');
  console.log(`      Suggested: Min 8px, Max 40px, Scale: logarithmic`);
} else if (distribution.empty > totalAllMonths * 0.4) {
  console.log('   ✅ MODERATE SPARSITY - Dynamic width would help compression');
  console.log(`      Suggested: Min 12px, Max 35px, Scale: linear`);
} else {
  console.log('   ⚠️  LOW SPARSITY - Current fixed width may be fine');
  console.log(`      Dynamic width would provide minimal benefit`);
  console.log(`      Suggested: Keep current 20px or use: Min 15px, Max 25px`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
