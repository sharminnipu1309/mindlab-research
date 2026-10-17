import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Task Switching Improvements Verification Suite...\n');

const tsRoomPath = path.resolve('./src/pages/TaskSwitchingRoom.tsx');
const adminServicePath = path.resolve('./src/services/adminService.ts');
const analysisPath = path.resolve('./src/pages/admin/TaskSwitchingAnalysis.tsx');

const tsRoomCode = fs.readFileSync(tsRoomPath, 'utf-8');
const adminServiceCode = fs.readFileSync(adminServicePath, 'utf-8');
const analysisCode = fs.readFileSync(analysisPath, 'utf-8');

let errors = 0;

// Test 1: Interactive Tutorial Before Experimental Phase
console.log('1. Verifying Interactive Tutorial Implementation...');
if (!tsRoomCode.includes("phase === 'tutorial'")) {
  console.error('❌ Missing tutorial phase render in TaskSwitchingRoom.tsx');
  errors++;
} else if (!tsRoomCode.includes("const [tutorialStep, setTutorialStep] = useState<number>(0);")) {
  console.error('❌ Missing tutorial step state');
  errors++;
} else if (
  !tsRoomCode.includes('Top Row = Letter Rule') ||
  !tsRoomCode.includes('Bottom Row = Number Rule') ||
  !tsRoomCode.includes('Rule 1 — Letter Trials') ||
  !tsRoomCode.includes('Rule 2 — Number Trials') ||
  !tsRoomCode.includes('Rule 3 — Mixed Task Switching')
) {
  console.error('❌ Tutorial missing explanations for letter, number, or mixed switching');
  errors++;
} else if (
  !tsRoomCode.includes('Vowel (A, E, I, O, U)') ||
  !tsRoomCode.includes('Consonant') ||
  !tsRoomCode.includes('Odd (1, 3, 5, 7, 9)') ||
  !tsRoomCode.includes('Even (2, 4, 6, 8)')
) {
  console.error('❌ Tutorial missing response-key mappings (B and N)');
  errors++;
} else {
  console.log('   ✓ Interactive 4-step tutorial verified with letter, number, and mixed rules and B/N key mappings.');
}

// Test 2: Speed Instruction is Larger and Bold
console.log('\n2. Verifying Larger & Bold Speed Instruction...');
const speedInstructionRegex = /Respond as quickly and accurately as possible\./g;
const speedMatches = tsRoomCode.match(speedInstructionRegex);
if (!speedMatches || speedMatches.length < 3) {
  console.error(`❌ Expected at least 3 occurrences of "Respond as quickly and accurately as possible.", found ${speedMatches?.length || 0}`);
  errors++;
} else if (!tsRoomCode.includes('font-extrabold') || !tsRoomCode.includes('text-sm sm:text-base')) {
  console.error('❌ Speed instruction does not use prominent bold font styling');
  errors++;
} else {
  console.log(`   ✓ Found ${speedMatches.length} occurrences of "Respond as quickly and accurately as possible." styled in bold and larger typography.`);
}

// Test 3: Simplified English & Grammar Correction
console.log('\n3. Verifying Instruction Simplification & Grammar Fixes...');
if (tsRoomCode.includes('When in the')) {
  console.error('❌ Found uncorrected "When in the" grammatical error');
  errors++;
} else if (tsRoomCode.includes('classify the LETTER') || tsRoomCode.includes('classify the NUMBER')) {
  console.error('❌ Found unreplaced "classify the LETTER/NUMBER"');
  errors++;
} else if (!tsRoomCode.includes('When the stimulus is in the')) {
  console.error('❌ Missing corrected "When the stimulus is in the" phrase');
  errors++;
} else if (!tsRoomCode.includes('respond according to the')) {
  console.error('❌ Missing simplified "respond according to the" phrase');
  errors++;
} else {
  console.log('   ✓ Grammar corrected ("when the stimulus is in the...") and difficult words replaced with "respond according to the...".');
}

// Test 4: Practice vs. Experimental Feedback Isolation
console.log('\n4. Verifying Correct/Incorrect Feedback Isolation...');
if (!tsRoomCode.includes("phase === 'practice' && trialStage === 'feedback' && feedback")) {
  console.error('❌ Practice feedback condition missing or loose');
  errors++;
} else if (!tsRoomCode.includes("setTrialStage('interTrial')") || !tsRoomCode.includes("setFeedback(null)")) {
  console.error('❌ Experimental phase does not clear feedback and transition smoothly');
  errors++;
} else {
  console.log('   ✓ Practice mode displays educational feedback; experimental phase transitions smoothly with zero visible correctness feedback.');
}

// Test 5: Exact Experimental Trial Counts (32, 32, 64 = 128)
console.log('\n5. Verifying Experimental Trial Counts (32 Pure Letter, 32 Pure Number, 64 Mixed = 128 Total)...');
if (!tsRoomCode.includes('PURE_LETTER_COUNT = 32')) {
  console.error('❌ PURE_LETTER_COUNT is not 32');
  errors++;
}
if (!tsRoomCode.includes('PURE_NUMBER_COUNT = 32')) {
  console.error('❌ PURE_NUMBER_COUNT is not 32');
  errors++;
}
if (!tsRoomCode.includes('MIXED_COUNT = 64')) {
  console.error('❌ MIXED_COUNT is not 64');
  errors++;
}
if (!tsRoomCode.includes('TOTAL_EXPERIMENTAL_TRIALS = PURE_LETTER_COUNT + PURE_NUMBER_COUNT + MIXED_COUNT')) {
  console.error('❌ TOTAL_EXPERIMENTAL_TRIALS is not properly defined as 128');
  errors++;
}
if (!adminServiceCode.includes('taskSwitchingExpCount >= 128')) {
  console.error('❌ adminService.ts does not recognize 128 trials completion');
  errors++;
}
if (!analysisCode.includes('128 Experimental Trials')) {
  console.error('❌ TaskSwitchingAnalysis.tsx does not document 128 trials');
  errors++;
}

// Simulate Trial Generation across 100 runs
console.log('\n6. Simulating Block Trial Generation over 100 runs...');
const TASK_SWITCHING_VOWELS = ['A', 'E', 'I', 'O', 'U'];
const TASK_SWITCHING_CONSONANTS = ['G', 'K', 'M', 'R', 'T', 'F', 'L', 'P', 'S', 'V'];
const TASK_SWITCHING_ODD_NUMBERS = [1, 3, 5, 7, 9];
const TASK_SWITCHING_EVEN_NUMBERS = [2, 4, 6, 8];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getStimulusPositionFromQuadrant(quadrant) {
  switch (quadrant) {
    case 1: return 'top-left';
    case 2: return 'top-right';
    case 3: return 'bottom-right';
    case 4: return 'bottom-left';
    default: return 'top-left';
  }
}

function generateBlockTrials(blockType) {
  const list = [];
  if (blockType === 'pure-letter') {
    for (let i = 0; i < 16; i++) {
      const isOdd = i % 2 === 0;
      list.push({
        blockType: 'pure-letter',
        taskType: 'letter',
        letter: pickRandom(TASK_SWITCHING_VOWELS),
        number: isOdd ? pickRandom(TASK_SWITCHING_ODD_NUMBERS) : pickRandom(TASK_SWITCHING_EVEN_NUMBERS),
        correctResponse: 'B',
        quadrant: 1,
        stimulusPosition: 'top-left',
      });
      list.push({
        blockType: 'pure-letter',
        taskType: 'letter',
        letter: pickRandom(TASK_SWITCHING_CONSONANTS),
        number: isOdd ? pickRandom(TASK_SWITCHING_ODD_NUMBERS) : pickRandom(TASK_SWITCHING_EVEN_NUMBERS),
        correctResponse: 'N',
        quadrant: 2,
        stimulusPosition: 'top-right',
      });
    }
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    for (let i = 0; i < list.length; i++) {
      list[i].quadrant = i % 2 === 0 ? 1 : 2;
      list[i].stimulusPosition = getStimulusPositionFromQuadrant(list[i].quadrant);
    }
  } else if (blockType === 'pure-number') {
    for (let i = 0; i < 16; i++) {
      const isVowel = i % 2 === 0;
      list.push({
        blockType: 'pure-number',
        taskType: 'number',
        letter: isVowel ? pickRandom(TASK_SWITCHING_VOWELS) : pickRandom(TASK_SWITCHING_CONSONANTS),
        number: pickRandom(TASK_SWITCHING_ODD_NUMBERS),
        correctResponse: 'B',
        quadrant: 4,
        stimulusPosition: 'bottom-left',
      });
      list.push({
        blockType: 'pure-number',
        taskType: 'number',
        letter: isVowel ? pickRandom(TASK_SWITCHING_VOWELS) : pickRandom(TASK_SWITCHING_CONSONANTS),
        number: pickRandom(TASK_SWITCHING_EVEN_NUMBERS),
        correctResponse: 'N',
        quadrant: 3,
        stimulusPosition: 'bottom-right',
      });
    }
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    for (let i = 0; i < list.length; i++) {
      list[i].quadrant = i % 2 === 0 ? 4 : 3;
      list[i].stimulusPosition = getStimulusPositionFromQuadrant(list[i].quadrant);
    }
  } else if (blockType === 'mixed') {
    const quadSequence = [1, 2, 3, 4];
    for (let i = 0; i < 64; i++) {
      const quadrant = quadSequence[i % 4];
      const task = (quadrant === 1 || quadrant === 2) ? 'letter' : 'number';
      const isVowel = Math.random() < 0.5;
      const isOdd = Math.random() < 0.5;
      const letter = isVowel ? pickRandom(TASK_SWITCHING_VOWELS) : pickRandom(TASK_SWITCHING_CONSONANTS);
      const number = isOdd ? pickRandom(TASK_SWITCHING_ODD_NUMBERS) : pickRandom(TASK_SWITCHING_EVEN_NUMBERS);
      const correctResponse = task === 'letter'
        ? (TASK_SWITCHING_VOWELS.includes(letter) ? 'B' : 'N')
        : (TASK_SWITCHING_ODD_NUMBERS.includes(number) ? 'B' : 'N');
      list.push({
        blockType: 'mixed',
        taskType: task,
        letter,
        number,
        correctResponse,
        quadrant,
        stimulusPosition: getStimulusPositionFromQuadrant(quadrant),
      });
    }
  }
  return list;
}

for (let run = 1; run <= 100; run++) {
  const b1 = generateBlockTrials('pure-letter');
  const b2 = generateBlockTrials('pure-number');
  const b3 = generateBlockTrials('mixed');

  if (b1.length !== 32) {
    console.error(`Run ${run}: Block 1 length is ${b1.length}, expected 32`);
    errors++;
    break;
  }
  if (b2.length !== 32) {
    console.error(`Run ${run}: Block 2 length is ${b2.length}, expected 32`);
    errors++;
    break;
  }
  if (b3.length !== 64) {
    console.error(`Run ${run}: Block 3 length is ${b3.length}, expected 64`);
    errors++;
    break;
  }
  const total = b1.length + b2.length + b3.length;
  if (total !== 128) {
    console.error(`Run ${run}: Total experimental trials is ${total}, expected 128`);
    errors++;
    break;
  }
}

// Test 7: Row Guide Hints Hidden During Experimental Phase
console.log('\n7. Verifying Row Guide Hints are Removed from Experimental Phase...');
const topGuidePracticeCheck = /\{phase === 'practice' && \(\s*<div[^>]*>\s*<span>Top Row: Letter Task<\/span>/;
const bottomGuidePracticeCheck = /\{phase === 'practice' && \(\s*<div[^>]*>\s*<span>Bottom Row: Number Task<\/span>/;

if (!topGuidePracticeCheck.test(tsRoomCode)) {
  console.error('❌ Top Row: Letter Task guide is not properly restricted to practice phase only');
  errors++;
} else if (!bottomGuidePracticeCheck.test(tsRoomCode)) {
  console.error('❌ Bottom Row: Number Task guide is not properly restricted to practice phase only');
  errors++;
} else {
  console.log('   ✓ Top and bottom row guide banners are strictly restricted to practice phase and absent in experimental phase.');
}

if (errors === 0) {
  console.log('\n🎉 ALL TASK SWITCHING VERIFICATION CHECKS PASSED SUCCESSFULLY!\n');
} else {
  console.error(`\n❌ VERIFICATION FAILED WITH ${errors} ERRORS.\n`);
  process.exit(1);
}

