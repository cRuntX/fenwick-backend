const fs = require('fs');

const backup = JSON.parse(fs.readFileSync('backup-before-image-clear-2025-11-06.json'));
const current = JSON.parse(fs.readFileSync('local-data.json'));

console.log('='.repeat(80));
console.log('CORRECTED DETAILED COMPARISON');
console.log('='.repeat(80));
console.log('');

// Show detailed examples
[1, 2, 4].forEach(num => {
  const b = backup.projects.find(p => p.number === num);
  const c = current.projects.find(p => p.number === num);

  console.log('-'.repeat(80));
  console.log('PROJECT #' + num + ': ' + b.name);
  console.log('-'.repeat(80));
  console.log('');
  
  console.log('PRACTICE_NAME:');
  console.log('  Backup:  "' + (b.practice_name || '[EMPTY]') + '"');
  console.log('  Current: "' + (c.practice_name || '[EMPTY]') + '"');
  const pnStatus = (b.practice_name && !c.practice_name) ? 'X LOST' : 'OK';
  console.log('  Status:  ' + pnStatus);
  console.log('');

  console.log('BRIEF_DESCRIPTION:');
  console.log('  Backup:  "' + (b.brief_description || '[EMPTY]').substring(0, 70) + '..."');
  console.log('  Current: "' + (c.brief_description || '[EMPTY]') + '"');
  const bdStatus = (b.brief_description && !c.brief_description) ? 'X LOST (' + b.brief_description.length + ' chars)' : 'OK';
  console.log('  Status:  ' + bdStatus);
  console.log('');

  console.log('RESPONSIBILITIES:');
  let bResp, cResp;
  try {
    bResp = typeof b.responsibilities === 'string' ? JSON.parse(b.responsibilities) : b.responsibilities;
  } catch(e) {
    bResp = [];
  }
  cResp = Array.isArray(c.responsibilities) ? c.responsibilities : [];
  
  console.log('  Backup:  ' + (Array.isArray(bResp) ? bResp.length : 0) + ' items');
  if (bResp && bResp.length > 0) {
    console.log('    Example: "' + bResp[0].substring(0, 55) + '..."');
  }
  console.log('  Current: ' + cResp.length + ' items');
  if (cResp.length > 0) {
    console.log('    Example: "' + cResp[0].substring(0, 55) + '..."');
  }
  const respStatus = (bResp.length > 0 && cResp.length === 0) ? 'X LOST (' + bResp.length + ' items)' : (bResp.length === cResp.length ? 'OK' : 'PARTIAL (' + cResp.length + '/' + bResp.length + ')');
  console.log('  Status:  ' + respStatus);
  console.log('');

  console.log('');
});
