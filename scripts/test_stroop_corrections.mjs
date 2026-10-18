import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Starting Stroop Task UI & Experiment Corrections Verification...\n');

// 1. Read StroopRoom.tsx
const stroopFilePath = path.resolve('src/pages/StroopRoom.tsx');
assert(fs.existsSync(stroopFilePath), 'src/pages/StroopRoom.tsx must exist');
const stroopCode = fs.readFileSync(stroopFilePath, 'utf8');

// 2. Read types.ts
const typesFilePath = path.resolve('src/types.ts');
assert(fs.existsSync(typesFilePath), 'src/types.ts must exist');
const typesCode = fs.readFileSync(typesFilePath, 'utf8');

// 3. Verify 3 Stimulus Types (Neutral, Congruent, Incongruent)
console.log('1. Verifying 3 Stimulus Conditions (Neutral, Congruent, Incongruent)...');
assert(typesCode.includes("'congruent' | 'incongruent' | 'neutral'"), 'types.ts must include neutral condition');
assert(stroopCode.includes('NEUTRAL_WORDS'), 'StroopRoom must define NEUTRAL_WORDS list');
assert(stroopCode.includes("'EGG'"), 'NEUTRAL_WORDS must include EGG');
assert(stroopCode.includes("'BED'"), 'NEUTRAL_WORDS must include BED');
assert(stroopCode.includes('1. Neutral'), 'Intro UI must explain Neutral condition');
assert(stroopCode.includes('2. Congruent'), 'Intro UI must explain Congruent condition');
assert(stroopCode.includes('3. Incongruent'), 'Intro UI must explain Incongruent condition');
console.log('   ✓ 3 Stimulus conditions verified in types and UI.');

// 4. Verify Correct Response is always the ink/font color
console.log('\n2. Verifying Correct Response Logic...');
assert(
  stroopCode.includes('const isCorrect = responseColor === currentItem.inkColor;'),
  'Correct response must always match the inkColor of the item'
);
assert(
  stroopCode.includes('ignoring what the word means'),
  'Instructions must instruct participants to ignore what the word means and respond to color'
);
console.log('   ✓ Correct response is strictly the printed ink color (ignoring what the word means).');

// 5. Verify Audio Feedback (Jingle & Buzzer)
console.log('\n3. Verifying Audio Feedback Synthesizers...');
assert(stroopCode.includes('function playJingleSound()'), 'Must contain playJingleSound implementation');
assert(stroopCode.includes('function playBuzzerSound()'), 'Must contain playBuzzerSound implementation');
assert(stroopCode.includes('playJingleSound();'), 'Must call playJingleSound on correct response');
assert(stroopCode.includes('playBuzzerSound();'), 'Must call playBuzzerSound on incorrect or timeout response');
console.log('   ✓ Web Audio API jingle and buzzer synthesizers verified.');

// 6. Verify Visual Text Feedback
console.log('\n4. Verifying Visual Text Feedback for Silent Environments...');
assert(stroopCode.includes('Correct!'), 'Must include visible Correct! text');
assert(stroopCode.includes('Incorrect'), 'Must include visible Incorrect text');
assert(stroopCode.includes('Time Out'), 'Must include visible Time Out text');
console.log('   ✓ On-screen text feedback verified for correct, incorrect, and timeout.');

// 7. Verify Response Timeout Handling
console.log('\n5. Verifying Response Timeout Handling...');
assert(stroopCode.includes('RESPONSE_TIMEOUT_MS = 1500;'), 'RESPONSE_TIMEOUT_MS must be defined');
assert(stroopCode.includes('handleTimeout'), 'Must have handleTimeout callback');
assert(stroopCode.includes("'TIMEOUT'"), 'Participant response for timeout must be TIMEOUT');
console.log('   ✓ Response timeout window and handler verified.');

// 8. Verify Reaction Time Calculation in Milliseconds
console.log('\n6. Verifying Millisecond Reaction Time Calculation...');
assert(
  stroopCode.includes('performance.now() - stimulusStartTimeRef.current'),
  'Must compute high precision RT using performance.now()'
);
assert(stroopCode.includes('reactionTimeMs'), 'Must record reactionTimeMs in trial records');
console.log('   ✓ Millisecond reaction time calculation verified.');

// 9. Programmatic Verification of No-Consecutive-Ink-Color Algorithm across 100 runs
console.log('\n7. Programmatically Verifying Experimental Trial Generator (100 Runs)...');
const STROOP_COLORS = ['RED', 'GREEN', 'BLUE', 'YELLOW'];
const NEUTRAL_WORDS = ['EGG', 'BED', 'SHIP', 'FORK', 'DESK', 'LAMP', 'DOOR', 'BOOK', 'PEN', 'CAT'];
const EXPERIMENTAL_COUNT = 84;

function simulateGenerateExperimentalTrials() {
  const pool = [];
  STROOP_COLORS.forEach(color => {
    for (let i = 0; i < 7; i++) {
      pool.push({ word: color, inkColor: color, condition: 'congruent' });
    }
  });

  const incPairs = [];
  STROOP_COLORS.forEach(w => {
    STROOP_COLORS.forEach(ink => {
      if (w !== ink) incPairs.push({ word: w, inkColor: ink });
    });
  });
  incPairs.forEach(pair => {
    for (let i = 0; i < 2; i++) {
      pool.push({ ...pair, condition: 'incongruent' });
    }
  });
  pool.push({ word: 'YELLOW', inkColor: 'RED', condition: 'incongruent' });
  pool.push({ word: 'BLUE', inkColor: 'GREEN', condition: 'incongruent' });
  pool.push({ word: 'RED', inkColor: 'BLUE', condition: 'incongruent' });
  pool.push({ word: 'GREEN', inkColor: 'YELLOW', condition: 'incongruent' });

  STROOP_COLORS.forEach((ink, inkIdx) => {
    for (let i = 0; i < 7; i++) {
      const neutralWord = NEUTRAL_WORDS[(i + inkIdx * 2) % NEUTRAL_WORDS.length];
      pool.push({ word: neutralWord, inkColor: ink, condition: 'neutral' });
    }
  });

  for (let attempt = 0; attempt < 500; attempt++) {
    const remaining = [...pool];
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    const sequence = [];
    let possible = true;

    while (remaining.length > 0) {
      const prevInk = sequence.length > 0 ? sequence[sequence.length - 1].inkColor : null;
      const candidates = remaining.filter(item => item.inkColor !== prevInk);
      if (candidates.length === 0) {
        possible = false;
        break;
      }

      const countsByColor = {};
      candidates.forEach(c => {
        countsByColor[c.inkColor] = (countsByColor[c.inkColor] || 0) + 1;
      });
      const maxCount = Math.max(...Object.values(countsByColor));
      const bestCandidates = candidates.filter(c => countsByColor[c.inkColor] === maxCount);

      const pick = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
      const idx = remaining.indexOf(pick);
      remaining.splice(idx, 1);
      sequence.push(pick);
    }

    if (possible && sequence.length === EXPERIMENTAL_COUNT) {
      let valid = true;
      for (let i = 1; i < sequence.length; i++) {
        if (sequence[i].inkColor === sequence[i - 1].inkColor) {
          valid = false;
          break;
        }
      }
      if (valid) return sequence;
    }
  }
  return pool;
}

for (let r = 0; r < 100; r++) {
  const seq = simulateGenerateExperimentalTrials();
  assert.strictEqual(seq.length, 84, `Run ${r}: Must contain exactly 84 trials`);
  const congruentCount = seq.filter(t => t.condition === 'congruent').length;
  const incongruentCount = seq.filter(t => t.condition === 'incongruent').length;
  const neutralCount = seq.filter(t => t.condition === 'neutral').length;
  assert.strictEqual(congruentCount, 28, `Run ${r}: Must contain exactly 28 congruent`);
  assert.strictEqual(incongruentCount, 28, `Run ${r}: Must contain exactly 28 incongruent`);
  assert.strictEqual(neutralCount, 28, `Run ${r}: Must contain exactly 28 neutral`);

  for (let i = 1; i < seq.length; i++) {
    assert.notStrictEqual(
      seq[i].inkColor,
      seq[i - 1].inkColor,
      `Run ${r}: Consecutive trials ${i - 1} and ${i} have the same ink color: ${seq[i].inkColor}`
    );
  }
}
console.log('   ✓ 100 runs verified: 84 trials, 28 congruent/28 incongruent/28 neutral, 0 consecutive ink color repetitions.');

console.log('\n🎉 ALL STROOP TASK CORRECTION CHECKS PASSED SUCCESSFULLY!\n');
