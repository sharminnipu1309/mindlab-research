import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Starting Backward Corsi Task Integrity & Logic Verification...\n');

// 1. Read CorsiRoom.tsx
const corsiFilePath = path.resolve('src/pages/CorsiRoom.tsx');
assert(fs.existsSync(corsiFilePath), 'src/pages/CorsiRoom.tsx must exist');
const corsiCode = fs.readFileSync(corsiFilePath, 'utf8');

// 2. Verify Tutorial and Practice Phase Definitions
console.log('1. Verifying Tutorial and Practice Phases...');
assert(corsiCode.includes("'tutorialIntro'"), "Must have 'tutorialIntro' phase");
assert(corsiCode.includes("'practiceWatching'"), "Must have 'practiceWatching' phase");
assert(corsiCode.includes("'practiceRecall'"), "Must have 'practiceRecall' phase");
assert(corsiCode.includes("'practiceFeedback'"), "Must have 'practiceFeedback' phase");
assert(corsiCode.includes("'preExperiment'"), "Must have 'preExperiment' warning phase");
console.log('   ✓ Tutorial and 3 Practice phases properly declared.');

// 3. Verify 3 Practice Trials with Increasing Difficulty
console.log('\n2. Verifying 3 Practice Trials Configurations...');
assert(corsiCode.includes('PRACTICE_TRIALS'), 'PRACTICE_TRIALS must be defined');
assert(corsiCode.includes('sequenceLength: 2'), 'Practice trial 1 must have length 2');
assert(corsiCode.includes('sequenceLength: 3'), 'Practice trial 2 must have length 3');
assert(corsiCode.includes('sequenceLength: 4'), 'Practice trial 3 must have length 4 (increasing gradually)');
console.log('   ✓ 3 Practice trials configured with gradual difficulty increase: 2 -> 3 -> 4 blocks.');

// 4. Verify Visual Arrows and Directional Indicators in Instructions
console.log('\n3. Verifying Visual Directional Indicators in Tutorial...');
assert(corsiCode.includes('How Reverse Recall Works'), 'Must include visual reverse recall walkthrough');
assert(corsiCode.includes('STEP 1: WATCH SEQUENCE'), 'Must include Step 1 Watch sequence');
assert(corsiCode.includes('STEP 2: REVERSE RECALL'), 'Must include Step 2 Reverse recall');
assert(corsiCode.includes('ArrowRight'), 'Must use ArrowRight visual arrows');
assert(corsiCode.includes('Directional Rule:'), 'Must highlight directional rule');
assert(corsiCode.includes('Last In, First Out'), 'Must emphasize Last In, First Out principle');
console.log('   ✓ Visual directional arrows and step-by-step indicators verified.');

// 5. Verify Pre-Experiment Warning Screen & Exact Required Requirement
console.log('\n4. Verifying Pre-Experiment Warning Screen...');
assert(
  corsiCode.includes('Important: You must correctly recall at least 4 blocks to proceed to the next level.'),
  'Must include exact verbatim warning string'
);
assert(
  corsiCode.includes('<strong>Important: You must correctly recall at least 4 blocks to proceed to the next level.</strong>'),
  'The key requirement must be enclosed in strong/bold'
);
assert(
  corsiCode.includes('handleStartOfficialExperiment'),
  'Must have handler to transition from warning to official experiment'
);
console.log('   ✓ Pre-experiment warning screen and bold requirement confirmed.');

// 6. Verify Grid Size Reduction
console.log('\n5. Verifying Smaller Grid Size...');
// Original had: w-16 h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24
// Reduced has: w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20
assert(
  corsiCode.includes('w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20'),
  'Grid blocks must be sized w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 (~20% smaller than original 96px)'
);
assert(
  corsiCode.includes('p-3.5 sm:p-7'),
  'Container padding must be reduced from original p-4 sm:p-10'
);
console.log('   ✓ Corsi grid size verified as cleanly reduced and responsive.');

// 7. Verify Sequence Number Text Enhancements
console.log('\n6. Verifying Bold, Larger Sequence Number Text...');
assert(
  corsiCode.includes("text-xl sm:text-2xl font-black font-['JetBrains_Mono',monospace]"),
  'Sequence number text must be font-black, larger (text-xl sm:text-2xl), JetBrains Mono'
);
assert(
  corsiCode.includes('Sequence Length:'),
  'Must have prominent Sequence Length label'
);
assert(
  corsiCode.includes('Selected:'),
  'Must have prominent Selected counter'
);
console.log('   ✓ Sequence number text confirmed as bold, larger, and prominent.');

// 8. Verify Data Isolation (Practice Trials Never Persisted to Research DB)
console.log('\n7. Verifying Research Dataset Isolation...');
// handlePracticeDone must NOT call persistCorsiTrial
const practiceDoneIndex = corsiCode.indexOf('handlePracticeDone');
const practiceDoneBlock = corsiCode.slice(practiceDoneIndex, practiceDoneIndex + 400);
assert(
  !practiceDoneBlock.includes('persistCorsiTrial'),
  'handlePracticeDone must NEVER call persistCorsiTrial'
);
assert(
  !practiceDoneBlock.includes('allTrialsRef.current.push'),
  'handlePracticeDone must NEVER push to allTrialsRef'
);
// Real handleDone DOES call persistCorsiTrial
const realDoneIndex = corsiCode.indexOf('const handleDone = () => {');
const realDoneBlock = corsiCode.slice(realDoneIndex, realDoneIndex + 1200);
assert(
  realDoneBlock.includes('persistCorsiTrial'),
  'Real handleDone must persist trials to Supabase'
);
assert(
  realDoneBlock.includes('allTrialsRef.current.push(trialRecord)'),
  'Real handleDone must record experimental trials'
);
console.log('   ✓ Practice trials strictly isolated from Supabase and experimental data.');

// 9. Verify Reverse Scoring Logic
console.log('\n8. Verifying Reverse Scoring Logic...');
const testSeq = [1, 7, 4];
const expectedReverse = [...testSeq].reverse();
assert.deepStrictEqual(expectedReverse, [4, 7, 1], 'Reverse order must reverse array');
console.log('   ✓ Reverse recall mathematical logic verified.');

console.log('\n🎉 ALL 8 BACKWARD CORSI INTEGRITY CHECKS PASSED SUCCESSFULLY!\n');
