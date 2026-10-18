// scripts/test_screenshot_fixes.mjs
import fs from 'fs';

let failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== Verifying 3 Screenshot Updates (Stroop, Task Switching, Interrupted Notice Modal) ===\n');

// 1. Verify Image 1 (StroopRoom.tsx)
console.log('1. Checking Image 1 fixes (StroopRoom.tsx):');
const stroopContent = fs.readFileSync('src/pages/StroopRoom.tsx', 'utf-8');
assert(!stroopContent.includes('ignoring what the word says'), 'StroopRoom does not contain "ignoring what the word says"');
assert(stroopContent.includes('ignoring what the word means'), 'StroopRoom contains "ignoring what the word means"');

// 2. Verify Image 2 (TaskSwitchingRoom.tsx)
console.log('\n2. Checking Image 2 fixes (TaskSwitchingRoom.tsx):');
const tsContent = fs.readFileSync('src/pages/TaskSwitchingRoom.tsx', 'utf-8');
const oldTsIntro = 'The location in the grid determines which task you perform';
const newTsIntro = 'You will see a letter and a number pair (e.g., 6M) presented inside a <strong>2×2 grid</strong>. Where it appears on the grid determines which task to do:';
assert(!tsContent.includes(oldTsIntro), 'TaskSwitchingRoom does not contain old grid prompt');
assert(tsContent.includes(newTsIntro), 'TaskSwitchingRoom contains new 6M pair grid prompt');

// Check dark and bigger styling
assert(tsContent.includes('text-sm sm:text-base font-semibold text-[#11152F]'), 'Intro grid prompt is styled bigger (text-sm sm:text-base), font-semibold, and dark (#11152F)');

// Check Top-Left / Top-Right letter prompt
const oldLetterPrompt = 'When in the Top-Left or Top-Right, classify the letter';
const newLetterPrompt = 'When the number-letter pair (6M) is in the <strong>Top-Left or Top-Right</strong>, select the <strong>LETTER</strong>:';
assert(!tsContent.includes(oldLetterPrompt), 'TaskSwitchingRoom does not contain old letter prompt');
assert(tsContent.includes(newLetterPrompt), 'TaskSwitchingRoom contains new letter prompt with 6M and select the LETTER');

// Check Bottom-Left / Bottom-Right number prompt
const newNumberPrompt = 'When the number-letter pair (6M) is in the <strong>Bottom-Left or Bottom-Right</strong>, select the <strong>NUMBER</strong>:';
assert(tsContent.includes(newNumberPrompt), 'TaskSwitchingRoom contains matching number prompt with 6M and select the NUMBER');

// 3. Verify Image 3 (ParticipantDashboard.tsx & TowerOfHanoiRoom.tsx)
console.log('\n3. Checking Image 3 fixes (ParticipantDashboard.tsx & TowerOfHanoiRoom.tsx):');
const dashboardContent = fs.readFileSync('src/pages/ParticipantDashboard.tsx', 'utf-8');
const oldProtocol = 'Empirical cognitive metrics (working memory span, sequence recall, and task-switching reaction times) require continuous focus in an unbroken sitting. Resuming mid-sequence would compromise metric reliability.';
const newProtocol = 'These tests need you to focus without stopping. The tests measure how well you remember, recall, and switch tasks. Resuming an old session would make the results less accurate.';
const hanoiDependentMeasure = 'The dependent measure for Tower of Hanoi was the total number of moves taken to complete the last five trials, including the wrong moves.';

assert(!dashboardContent.includes(oldProtocol), 'ParticipantDashboard does not contain old empirical metric paragraph');
assert(dashboardContent.includes(newProtocol), 'ParticipantDashboard contains new continuous focus protocol text');
assert(dashboardContent.includes(hanoiDependentMeasure), 'ParticipantDashboard modal contains Hanoi dependent measure');
assert(dashboardContent.includes('Your previous trial records remain preserved in research logs.'), 'ParticipantDashboard modal contains research logs preservation message');
assert(dashboardContent.includes('Interrupted Session Notice'), 'ParticipantDashboard contains Interrupted Session Notice header');

const hanoiContent = fs.readFileSync('src/pages/TowerOfHanoiRoom.tsx', 'utf-8');
assert(hanoiContent.includes(hanoiDependentMeasure), 'TowerOfHanoiRoom contains Hanoi dependent measure banner');

console.log(`\n==================================================`);
if (failed === 0) {
  console.log('>>> ALL SCREENSHOT FIXES VERIFIED SUCCESSFULLY! <<<');
  process.exit(0);
} else {
  console.error(`>>> ${failed} VERIFICATION CHECKS FAILED! <<<`);
  process.exit(1);
}
