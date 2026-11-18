import fs from 'fs';

console.log('=== Verifying Research Result Option on TaskCompletionPage ===\n');

let failed = 0;
function assert(condition, desc) {
  if (condition) {
    console.log(`  ✓ ${desc}`);
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

const pageText = fs.readFileSync('src/pages/TaskCompletionPage.tsx', 'utf-8');

assert(pageText.includes('Research Result'), 'Button with label "Research Result" is present');
assert(
  pageText.includes('After finishing the research, you can have your result and interpretation. To get that, provide your email address here, and we will send it to you soon.'),
  'Exact user prompt copy is present for results & interpretation'
);
assert(pageText.includes('type="email"'), 'Email input field is present');
assert(pageText.includes('updateParticipantEmail'), 'Calls updateParticipantEmail to persist email');
assert(pageText.includes('Return to Homepage'), 'Return to Homepage button is present');

const returnHomeIndex = pageText.indexOf('Return to Homepage');
const researchResultIndex = pageText.indexOf('Research Result');
assert(researchResultIndex < returnHomeIndex, 'Research Result section is positioned in the upper portion above Return to Homepage');

const serviceText = fs.readFileSync('src/services/participantService.ts', 'utf-8');
assert(serviceText.includes('export async function updateParticipantEmail'), 'updateParticipantEmail is exported in participantService');

console.log('\n==================================================');
if (failed === 0) {
  console.log('ALL ASSERTIONS PASSED PERFECTLY!');
  process.exit(0);
} else {
  console.error(`FAILED: ${failed} assertion(s).`);
  process.exit(1);
}

