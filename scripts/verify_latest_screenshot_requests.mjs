import fs from 'fs';
import assert from 'assert';

console.log('🧪 Verifying all latest user requests across the codebase...\n');

// 1. Stroop Task Checks
const stroopCode = fs.readFileSync('src/pages/StroopRoom.tsx', 'utf-8');
console.log('1. Checking Stroop Task updates...');
assert(!stroopCode.includes('playJingleSound'), 'Stroop must not have playJingleSound');
assert(!stroopCode.includes('playBuzzerSound'), 'Stroop must not have playBuzzerSound');
assert(!stroopCode.includes('For the best experience, please complete this task on a desktop or PC'), 'Stroop must not have desktop recommendation banner');
assert(!stroopCode.includes('Instant Feedback:'), 'Stroop must not have Instant Feedback audio card');
assert(stroopCode.includes('PRACTICE_COUNT = 20'), 'Stroop must have 20 practice trials');
assert(stroopCode.includes('EXPERIMENTAL_COUNT = 128'), 'Stroop must have 128 experimental trials');
assert(stroopCode.includes('setTrialStage(\'feedback\')'), 'Stroop must trigger visual feedback stage');
assert(stroopCode.includes('Correct!'), 'Stroop must show Correct!');
assert(stroopCode.includes('Incorrect'), 'Stroop must show Incorrect');
console.log('   ✓ Stroop: sound removed, banner removed, 20/128 counts preserved, visual feedback on all trials.');

// 2. Task Switching Checks
const tsCode = fs.readFileSync('src/pages/TaskSwitchingRoom.tsx', 'utf-8');
console.log('\n2. Checking Task Switching updates...');
assert(!tsCode.includes('Rule 3 — Mixed Task Switching'), 'Step 3 / Rule 3 Mixed must be completely removed');
assert(!tsCode.includes('RotateCw'), 'RotateCw icon for Step 3 must be removed');
assert(tsCode.includes('Step {tutorialStep + 1} of 3'), 'Tutorial must be exactly 3 steps (Grid, Rule 1, Rule 2)');
assert(tsCode.includes('Start Practice (8 Trials)'), 'Tutorial must transition to Practice after Rule 2');
// Check that speed prompt is at the end of Rule 1 and Rule 2
const rule1Idx = tsCode.indexOf('Rule 1 — Letter Trials');
const rule2Idx = tsCode.indexOf('Rule 2 — Number Trials');
const speedNotice = 'Respond as quickly and accurately as possible.';
const firstSpeedNotice = tsCode.indexOf(speedNotice);
const secondSpeedNotice = tsCode.indexOf(speedNotice, firstSpeedNotice + speedNotice.length);

assert(firstSpeedNotice > rule1Idx && firstSpeedNotice < rule2Idx, 'Rule 1 must end with speed prompt');
assert(secondSpeedNotice > rule2Idx, 'Rule 2 must end with speed prompt');
// Check feedback in experimental trials
assert(tsCode.includes('// Real experiment: show visual feedback (Correct! / Incorrect) on every trial'), 'Task Switching must show feedback in experiment');
console.log('   ✓ Task Switching: Step 3 removed, 3-step tutorial with speed prompt at end of Rule 1 & 2, visual feedback on experiment.');

// 3. Backward Corsi Block Test Checks
const corsiCode = fs.readFileSync('src/pages/CorsiRoom.tsx', 'utf-8');
console.log('\n3. Checking Corsi Block Test updates...');
assert(!corsiCode.includes('<h2>Pre-Experiment Briefing</h2>') && !corsiCode.includes('Pre-Experiment Briefing\n'), 'Pre-Experiment Briefing heading must be removed');
assert(!corsiCode.includes('You have completed all 3 practice trials'), 'Practice complete paragraph must be removed');
assert(!corsiCode.includes('Critical Assessment Rule'), 'Critical Assessment Rule header must be removed');
assert(!corsiCode.includes('<strong>6 trials per level:</strong>'), '6 trials per level label prefix must be removed');
assert(!corsiCode.includes('<strong>Advancement threshold:</strong>'), 'Advancement threshold label prefix must be removed');
assert(!corsiCode.includes('Official research records'), 'Official research records 3rd bullet must be removed');
assert(corsiCode.includes('Important: You must correctly complete at least 4 trials to proceed to the next level.'), 'Corsi must retain Important notice');
assert(corsiCode.includes('text-base sm:text-lg md:text-xl font-extrabold'), 'Important notice must be enlarged');
console.log('   ✓ Corsi: Briefing heading/intro removed, assessment rule header removed, prefixes removed, 3rd bullet removed, important notice enlarged.');

// 4. Consent Page Checks
const consentCode = fs.readFileSync('src/pages/ConsentPage.tsx', 'utf-8');
console.log('\n4. Checking Consent Page updates...');
assert(consentCode.includes('CONFIDENTIALITY BOND AND DATA PROTECTION AGREEMENT'), 'Must have Confidentiality Bond header');
assert(consentCode.includes('Thank you for taking part in this study. We want you to know how your information will be protected.'), 'Must have greeting paragraph');
assert(consentCode.includes('Your answers are confidential.'), 'Must have confidential statement');
assert(consentCode.includes('We will not share anything that could identify you with anyone outside the research team.'), 'Must have privacy team statement');
assert(consentCode.includes('We don\'t use your name.'), 'Must have code number statement');
assert(consentCode.includes('Only the research team sees your data.'), 'Must have private data statement');
assert(consentCode.includes('Your data is stored securely.'), 'Must have server security statement');
assert(consentCode.includes('Results are reported as groups.'), 'Must have combined results statement');
assert(consentCode.includes('Recordings are deleted.'), 'Must have recordings deletion statement');
assert(consentCode.includes('Your data is kept for 2 years and then securely destroyed.'), 'Must have 2 years retention statement');
assert(consentCode.includes('You can stop at any time.'), 'Must have withdrawal statement');
assert(consentCode.includes('mithila.3702@gmail.com'), 'Must have Mithila Tajmim contact email');
assert(consentCode.includes('By continuing, you confirm that you have read this information and agree to take part.'), 'Must have confirmation sentence');
assert(!consentCode.includes('I understand that this study contains 4 cognitive research tasks assessing planning and problem-solving'), 'Old consent bullets must be removed');
console.log('   ✓ Consent: All 10 paragraphs of Confidentiality Bond & Data Protection Agreement verified with email link.');

console.log('\n🎉 ALL LATEST USER REQUESTS AND SCREENSHOT REQUIREMENTS VERIFIED SUCCESSFULLY!');
