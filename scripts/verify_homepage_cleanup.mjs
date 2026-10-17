// scripts/verify_homepage_cleanup.mjs
// Automated verification script for MindLab Homepage Cleanup & Room Access Changes

import fs from 'fs';
import path from 'path';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

console.log('\n=== RUNNING MINDLAB HOMEPAGE CLEANUP & ACCESS VERIFICATION ===\n');

// 1. ParticipantDashboard.tsx checks
console.log('1. Checking ParticipantDashboard.tsx:');
const dashboardPath = path.resolve('src/pages/ParticipantDashboard.tsx');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

assert(!dashboardContent.includes('Returning Participant Session Restored'), 'No old "Returning Participant Session Restored" heading');
assert(!dashboardContent.includes('Your previous progress has been safely loaded'), 'No old "Your previous progress has been safely loaded" paragraph');
assert(dashboardContent.includes('Welcome back!'), 'Simple "Welcome back!" header present for returning participants');
assert(!dashboardContent.includes('Study Protocol Update'), 'No "Study Protocol Update" banner');
assert(!dashboardContent.includes('Rooms 3 & 4 Unlocked!'), 'No "Rooms 3 & 4 Unlocked!" notification');
assert(!dashboardContent.includes('The 24-hour interval has elapsed'), 'No 24-hour interval waiting message');
assert(!dashboardContent.includes('unlockStatus'), 'No unlockStatus state dependency');
assert(!dashboardContent.includes('showUnlockAlertModal'), 'No unlock alert popup modal');
assert(dashboardContent.includes('Back to Home'), '"Back to Home" button present in header');
assert(!dashboardContent.includes('hidden md:block') || !dashboardContent.includes('hidden md:block">\n              Tasks can be completed in any order'), '"Tasks can be completed in any order" not hidden on mobile');
assert(dashboardContent.includes('stroopStatus === \'completed\''), 'Room 3 Stroop card checks completed status directly');
assert(dashboardContent.includes('taskSwitchingStatus === \'completed\''), 'Room 4 Task Switching card checks completed status directly');

// 2. StroopRoom.tsx checks
console.log('\n2. Checking StroopRoom.tsx:');
const stroopPath = path.resolve('src/pages/StroopRoom.tsx');
const stroopContent = fs.readFileSync(stroopPath, 'utf8');

assert(!stroopContent.includes('isLocked'), 'No isLocked state in StroopRoom');
assert(!stroopContent.includes('accessChecking'), 'No accessChecking spinner state in StroopRoom');
assert(!stroopContent.includes('Room 03 is Currently Locked'), 'No locked screen in StroopRoom');
assert(!stroopContent.includes('Time Remaining Until Unlock'), 'No countdown timer in StroopRoom');
assert(!stroopContent.includes('checkRooms3And4Access'), 'No checkRooms3And4Access call in StroopRoom');

// 3. TaskSwitchingRoom.tsx checks
console.log('\n3. Checking TaskSwitchingRoom.tsx:');
const tsPath = path.resolve('src/pages/TaskSwitchingRoom.tsx');
const tsContent = fs.readFileSync(tsPath, 'utf8');

assert(!tsContent.includes('isLocked'), 'No isLocked state in TaskSwitchingRoom');
assert(!tsContent.includes('accessChecking'), 'No accessChecking spinner state in TaskSwitchingRoom');
assert(!tsContent.includes('Room 04 is Currently Locked'), 'No locked screen in TaskSwitchingRoom');
assert(!tsContent.includes('Time Remaining Until Unlock'), 'No countdown timer in TaskSwitchingRoom');
assert(!tsContent.includes('checkRooms3And4Access'), 'No checkRooms3And4Access call in TaskSwitchingRoom');

// 4. ConsentPage.tsx & Registration email removal checks
console.log('\n4. Checking ConsentPage.tsx:');
const consentPath = path.resolve('src/pages/ConsentPage.tsx');
const consentContent = fs.readFileSync(consentPath, 'utf8');

assert(!consentContent.includes('email: string'), 'No email in form state type in ConsentPage');
assert(!consentContent.includes('type="email"'), 'No email input element in ConsentPage');
assert(!consentContent.includes('Email address is required'), 'No email required validation error in ConsentPage');
assert(!consentContent.includes('We will email you exactly when Rooms 3'), 'No unlock email notification text in ConsentPage');

// 5. ResearchInfoPage.tsx checks
console.log('\n5. Checking ResearchInfoPage.tsx:');
const researchInfoPath = path.resolve('src/pages/ResearchInfoPage.tsx');
const researchInfoContent = fs.readFileSync(researchInfoPath, 'utf8');

assert(!researchInfoContent.includes('Your email address is required to receive notification'), 'No email requirement bullet in ResearchInfoPage');

// 6. ResumeSessionModal.tsx checks
console.log('\n6. Checking ResumeSessionModal.tsx:');
const resumeModalPath = path.resolve('src/components/ResumeSessionModal.tsx');
const resumeModalContent = fs.readFileSync(resumeModalPath, 'utf8');

assert(!resumeModalContent.includes('type="email"'), 'No email input in ResumeSessionModal');
assert(!resumeModalContent.includes('Registered Email Address'), 'No registered email label in ResumeSessionModal');
assert(resumeModalContent.includes('Participant ID or Full Name'), 'ResumeSessionModal asks for Participant ID or Full Name');

// 7. ParticipantNav.tsx checks
console.log('\n7. Checking ParticipantNav.tsx:');
const navPath = path.resolve('src/components/ParticipantNav.tsx');
const navContent = fs.readFileSync(navPath, 'utf8');

assert(navContent.includes('Back to Home'), 'ParticipantNav includes "Back to Home" button');
assert(navContent.includes("navigate('landing')"), 'ParticipantNav navigates to "landing" on Back to Home');

// 8. Cron & Scheduled Jobs checks
console.log('\n8. Checking Cron & Scheduled Jobs:');
const cronWorkflowPath = path.resolve('.github/workflows/room-unlock-email-cron.yml');
assert(!fs.existsSync(cronWorkflowPath), 'Scheduled room-unlock-email-cron.yml workflow is removed');

// Summary
console.log(`\n=== RESULTS: ${passCount} PASSED, ${failCount} FAILED ===\n`);
if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!\n');
}
