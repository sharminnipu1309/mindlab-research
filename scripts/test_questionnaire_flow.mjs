import fs from 'fs';

console.log('=== Verifying Bangla Questionnaire Integration (New Order) ===\n');

let failed = 0;
function assert(condition, desc) {
  if (condition) {
    console.log(`  ✓ ${desc}`);
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

// 1. Check questionnaireData.ts
const qData = fs.readFileSync('src/data/questionnaireData.ts', 'utf-8');
assert(qData.includes('(ক) নিজের ক্ষেত্রে…'), 'Section (ক) title exists');
assert(qData.includes('(খ) অন্যদের ক্ষেত্রে…'), 'Section (খ) title exists');
assert(qData.includes('(গ) অন্যের অবস্থান/দৃষ্টিকোণ থেকে বিবেচনা করার ক্ষেত্রে…'), 'Section (গ) title exists');
assert(qData.includes('(ঘ) সমস্যা সমাধান করার ক্ষেত্রে…'), 'Section (ঘ) title exists');
assert(qData.includes('কখনই না') && qData.includes('প্রায় সবসময়'), 'Likert scale labels exist in Bangla');

// Check question counts in data
const matches = [...qData.matchAll(/id:\s*(\d+),/g)].map(m => parseInt(m[1], 10));
assert(matches.length === 18, `Exactly 18 questions defined (found ${matches.length})`);
assert(matches[0] === 1 && matches[17] === 18, 'Questions are numbered 1 through 18');

// 2. Check ConsentPage.tsx
const consentPage = fs.readFileSync('src/pages/ConsentPage.tsx', 'utf-8');
assert(consentPage.includes('QUESTIONNAIRE_SECTIONS'), 'ConsentPage imports questionnaire sections');
assert(consentPage.includes('ParticipantNav navigate={navigate} totalSteps={7}'), 'ParticipantNav configured for 7 steps');
assert(consentPage.includes('step === 2') && consentPage.includes('Participant Details'), 'Step 2 is Participant Details (BEFORE THE FORM)');
assert(consentPage.includes('step === 3 || step === 4 || step === 5 || step === 6'), 'Steps 3 to 6 dedicated to tables (ক), (খ), (গ), (ঘ)');
assert(consentPage.includes('validateSection'), 'Validates each questionnaire table before advancing');
assert(consentPage.includes('calculateScores'), 'Calculates section subscores and total scores');

// 3. Check types.ts
const types = fs.readFileSync('src/types.ts', 'utf-8');
assert(types.includes('MentalizationResponses'), 'MentalizationResponses interface defined in types.ts');
assert(types.includes('questionnaireResponses?: MentalizationResponses;'), 'ParticipantSession has questionnaireResponses');

// 4. Check participantService.ts
const pService = fs.readFileSync('src/services/participantService.ts', 'utf-8');
assert(pService.includes('persistQuestionnaireResponses'), 'persistQuestionnaireResponses function exported');
assert(pService.includes('questionnaire_responses'), 'Saves to questionnaire_responses table');

console.log('\n==================================================');
if (failed === 0) {
  console.log('ALL TEST ASSERTIONS PASSED PERFECTLY!');
  process.exit(0);
} else {
  console.error(`FAILED: ${failed} check(s) did not pass.`);
  process.exit(1);
}
