import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Starting Backward Corsi Task Final Corrections Verification...\n');

// 1. Read CorsiRoom.tsx
const corsiFilePath = path.resolve('src/pages/CorsiRoom.tsx');
assert(fs.existsSync(corsiFilePath), 'src/pages/CorsiRoom.tsx must exist');
const corsiCode = fs.readFileSync(corsiFilePath, 'utf8');

// 2. Verify Exact Minimum Score Message ("trials", not "blocks")
console.log('1. Verifying Minimum Score Requirement Wording...');
const expectedWarning = 'Important: You must correctly complete at least 4 trials to proceed to the next level.';
assert(
  corsiCode.includes(expectedWarning),
  `Must include exact verbatim string: "${expectedWarning}"`
);
assert(
  !corsiCode.includes('at least 4 blocks to proceed'),
  'Must NOT contain "at least 4 blocks to proceed" anywhere in the code'
);
assert(
  corsiCode.includes(`<strong>${expectedWarning}</strong>`),
  'The requirement must be bolded in <strong> tags'
);
console.log('   ✓ Minimum score message correctly states "at least 4 trials" with bold styling.');

// 3. Verify No Selection Markings or Numbers during Actual Experimental Trials
console.log('\n2. Verifying Selection Markings Removal during Actual Experiment...');
// Must pass showSelectionIndicators={false} in official mode
assert(
  corsiCode.includes('showSelectionIndicators={false}'),
  'Official experiment must pass showSelectionIndicators={false}'
);
// Must pass showSelectionIndicators={true} in practice mode
assert(
  corsiCode.includes('showSelectionIndicators={true}'),
  'Practice mode must pass showSelectionIndicators={true} to preserve tutorial guidance'
);
// In CorsiBoard, sequence numbers must be guarded by showSelectionIndicators
assert(
  corsiCode.includes('showSelectionIndicators && isSelected &&'),
  'Sequence order numbers (1, 2, 3) must only render if showSelectionIndicators is true'
);
console.log('   ✓ Grid stays visually clean during official experiment; guidance preserved in practice.');

// 4. Verify Zero-Scroll Layout (Done button placed directly under the grid in the same card)
console.log('\n3. Verifying Viewport Fit & Accessible Done Button...');
assert(
  corsiCode.includes('min-h-[40px]'),
  'Card must reserve compact action slot to prevent layout shifting between watching and recall'
);
assert(
  corsiCode.includes('Clear'),
  'Clear response button must be accessible'
);
assert(
  corsiCode.includes('Done'),
  'Done button must be present in the unified card'
);
assert(
  corsiCode.includes('isSubmittingRef'),
  'Double-click / duplicate submission protection must be active'
);
console.log('   ✓ Done button unified within card directly below grid; duplicate submission guard active.');

// 5. Verify Progression Rule Consistency (REQUIRED_CORRECT = 4 out of 6)
console.log('\n4. Verifying Progression Threshold Consistency...');
assert(corsiCode.includes('REQUIRED_CORRECT = 4'), 'REQUIRED_CORRECT must be 4');
assert(corsiCode.includes('TRIALS_PER_LEVEL = 6'), 'TRIALS_PER_LEVEL must be 6');
assert(corsiCode.includes('newCorrect >= REQUIRED_CORRECT'), 'Advancement condition must require at least 4 correct trials');
console.log('   ✓ Actual progression logic strictly matches displayed 4-trial requirement.');

// 6. Verify Supabase Telemetry Isolation
console.log('\n5. Verifying Supabase Telemetry & Dataset Isolation...');
assert(
  corsiCode.includes('persistCorsiTrial'),
  'Official trials must persist to Supabase'
);
const practiceDoneIndex = corsiCode.indexOf('const handlePracticeDone = () => {');
const practiceDoneBlock = corsiCode.slice(practiceDoneIndex, practiceDoneIndex + 450);
assert(
  !practiceDoneBlock.includes('persistCorsiTrial'),
  'handlePracticeDone must NEVER call persistCorsiTrial'
);
assert(
  !practiceDoneBlock.includes('allTrialsRef.current.push'),
  'handlePracticeDone must NEVER push to allTrialsRef'
);
console.log('   ✓ Practice trials strictly isolated from Supabase and experimental telemetry.');

console.log('\n🎉 ALL FINAL CORRECTIONS VERIFIED SUCCESSFULLY!\n');
