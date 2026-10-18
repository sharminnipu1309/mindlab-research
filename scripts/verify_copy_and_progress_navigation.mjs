// scripts/verify_copy_and_progress_navigation.mjs
import fs from 'fs';
import path from 'path';

let failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== MindLab Homepage Copy & In-Progress Card Navigation Verification ===\n');

// 1. Check LandingPage.tsx Copy Replacements
console.log('1. Verifying LandingPage.tsx copy replacements:');
const landingPageContent = fs.readFileSync('src/pages/LandingPage.tsx', 'utf-8');

// Copy 1: Hero Section Description
const oldHero = 'Take part in four interactive research challenges designed to explore planning, memory, attention, and cognitive flexibility.';
const newHero = 'Try four brain games that show how well you plan, remember, pay attention, and switch between ideas.';
assert(!landingPageContent.includes(oldHero), 'Old hero description removed');
assert(landingPageContent.includes(newHero), 'New hero description present exactly');

// Copy 2: Cognitive Domains Section Description
const oldDomains = 'Each challenge isolates a specific cognitive process through structured research paradigms adapted for web interaction.';
const newDomains = 'Each challenge focuses on one brain skill at a time, using research-style games made for the web.';
assert(!landingPageContent.includes(oldDomains), 'Old cognitive domains description removed');
assert(landingPageContent.includes(newDomains), 'New cognitive domains description present exactly');

// Copy 3: Study Information Description
const oldStudy = 'MindLab provides calibrated behavioral paradigms in psychology and cognitive neuroscience. Every interaction is recorded with millisecond timestamping to evaluate accuracy, reaction time distributions, and switch costs.';
const newStudy = 'MindLab has brain tests built to measure how the mind works. Every click and answer is timed to the millisecond. The tests check how often you get things right, how fast you respond, and how long it takes to switch from one task to another.';
assert(!landingPageContent.includes(oldStudy), 'Old study information description removed');
assert(landingPageContent.includes(newStudy), 'New study information description present exactly');

// Copy 4: Research Data Statement
const oldData = 'Participation is voluntary, anonymous, and strictly non-diagnostic. Results are aggregated for empirical behavioral research.';
const newData = 'Participation is voluntary, anonymous, and strictly non-diagnostic. Results are recorded for empirical behavioral research.';
assert(!landingPageContent.includes(oldData), 'Old research data statement removed');
assert(landingPageContent.includes(newData), 'New research data statement present exactly');

// 2. Check ParticipantDashboard.tsx In-Progress Card Clickability & Navigation
console.log('\n2. Verifying ParticipantDashboard.tsx in-progress progress cards:');
const dashboardContent = fs.readFileSync('src/pages/ParticipantDashboard.tsx', 'utf-8');

// Challenge stages include roomPage routes
assert(dashboardContent.includes("roomPage: 'hanoi-room'"), "Hanoi stage includes roomPage: 'hanoi-room'");
assert(dashboardContent.includes("roomPage: 'corsi-room'"), "Corsi stage includes roomPage: 'corsi-room'");
assert(dashboardContent.includes("roomPage: 'stroop-room'"), "Stroop stage includes roomPage: 'stroop-room'");
assert(dashboardContent.includes("roomPage: 'task-switching-room'"), "Task Switching stage includes roomPage: 'task-switching-room'");

// Clickable stage cards
assert(dashboardContent.includes('onClick={() => {') && dashboardContent.includes('navigate(stage.roomPage);'), 'Progress cards have onClick navigating to stage.roomPage');
assert(dashboardContent.includes('onKeyDown='), 'Progress cards have onKeyDown keyboard handler');
assert(dashboardContent.includes("e.key === 'Enter'") && dashboardContent.includes("e.key === ' '"), 'Keyboard handler activates on Enter or Space');
assert(dashboardContent.includes('role={isInProgress ? \'button\' : undefined}'), 'role="button" present when in progress');
assert(dashboardContent.includes('tabIndex={isInProgress ? 0 : undefined}'), 'tabIndex={0} present when in progress');
assert(dashboardContent.includes('cursor-pointer'), 'cursor-pointer class present for in-progress cards');
assert(dashboardContent.includes('cursor-default'), 'cursor-default class present for completed cards');
assert(dashboardContent.includes('hover:border-[#D97706]'), 'Amber border hover effect present');
assert(dashboardContent.includes('hover:bg-[#FEF3C7]/40'), 'Amber bg hover effect present');
assert(dashboardContent.includes('hover:shadow-md'), 'Elevation shadow hover effect present');
assert(dashboardContent.includes('hover:-translate-y-0.5'), 'Micro-interaction translate hover effect present');
assert(dashboardContent.includes('active:scale-[0.98]'), 'Active tap/pressed scale state present for mobile');

// Direct room navigation on continue buttons
assert(dashboardContent.includes("onClick={() => navigate('hanoi-room')}"), "Hanoi Continue button navigates directly to hanoi-room");
assert(dashboardContent.includes("onClick={() => navigate('corsi-room')}"), "Corsi Continue button navigates directly to corsi-room");
assert(dashboardContent.includes("onClick={() => navigate('stroop-room')}"), "Stroop Continue button navigates directly to stroop-room");
assert(dashboardContent.includes("onClick={() => navigate('task-switching-room')}"), "Task Switching Continue button navigates directly to task-switching-room");

// 3. Check Session & Progress Resume logic
console.log('\n3. Verifying progress restoration in tasks:');
const hanoiContent = fs.readFileSync('src/pages/TowerOfHanoiRoom.tsx', 'utf-8');
assert(hanoiContent.includes('participant?.hanoiProgressCount || 0'), 'Tower of Hanoi restores puzzle index from hanoiProgressCount');

const corsiContent = fs.readFileSync('src/pages/CorsiRoom.tsx', 'utf-8');
assert(corsiContent.includes('participant?.corsiProgressCount') && corsiContent.includes("'preExperiment'"), 'CorsiRoom skips tutorial and starts at preExperiment when resuming');
assert(corsiContent.includes('TRIALS_PER_LEVEL'), 'CorsiRoom calculates resumed level from TRIALS_PER_LEVEL');

const tsContent = fs.readFileSync('src/pages/TaskSwitchingRoom.tsx', 'utf-8');
assert(tsContent.includes('participant?.taskSwitchingProgressCount') && tsContent.includes("'blockIntro'"), 'TaskSwitchingRoom restores block index and skips tutorial when resuming');

const stroopContent = fs.readFileSync('src/pages/StroopRoom.tsx', 'utf-8');
assert(stroopContent.includes('participant?.stroopProgressCount') && stroopContent.includes("'practiceComplete'"), 'StroopRoom skips tutorial/practice and starts at practiceComplete when resuming');

console.log('\n' + (failed === 0 ? '>>> ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<' : `>>> FAILED ${failed} CHECKS <<<`));
process.exit(failed === 0 ? 0 : 1);
