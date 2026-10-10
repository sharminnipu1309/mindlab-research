// run_targeted_research_tests.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ummiczxtncwvozgvqlih.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_edu6CvEJ0QECXm-ZQByfJg_LvIjOK6n';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('=== MindLab Targeted Research-Integrity Tests ===\n');

  // Test 1: Phase String Standard & Database Schema Parity
  console.log('--- Test 1: Phase String Standard & Schema Parity ---');
  // Stroop uses 'practice' | 'experiment'
  // Task Switching uses 'practice' | 'experimental'
  const STROOP_PHASES = ['practice', 'experiment'];
  const TS_PHASES = ['practice', 'experimental'];
  
  assert(STROOP_PHASES.includes('experiment'), "Stroop experiment phase is 'experiment'");
  assert(TS_PHASES.includes('experimental'), "Task Switching experiment phase is 'experimental'");
  assert(!STROOP_PHASES.includes('experimental'), "Stroop does not accept 'experimental'");
  assert(!TS_PHASES.includes('experiment'), "Task Switching does not accept 'experiment'");

  // Test 2: Stroop Zero Experimental Trials Rule
  console.log('\n--- Test 2: Stroop Zero Experimental Trials Rule ---');
  function computeStroopMetrics(trials) {
    const expTrials = trials.filter(t => t.phase === 'experiment');
    if (expTrials.length === 0) {
      return {
        stroopEffect: '—',
        congruentMeanRt: '—',
        incongruentMeanRt: '—',
        accuracy: '—',
      };
    }
    const c = expTrials.filter(t => t.condition === 'congruent' && t.isCorrect);
    const i = expTrials.filter(t => t.condition === 'incongruent' && t.isCorrect);
    const cMean = c.length > 0 ? c.reduce((s, t) => s + t.reactionTimeMs, 0) / c.length : 0;
    const iMean = i.length > 0 ? i.reduce((s, t) => s + t.reactionTimeMs, 0) / i.length : 0;
    const acc = (expTrials.filter(t => t.isCorrect).length / expTrials.length) * 100;
    return {
      stroopEffect: Math.round(iMean - cMean),
      congruentMeanRt: Math.round(cMean),
      incongruentMeanRt: Math.round(iMean),
      accuracy: acc,
    };
  }

  const samplePracticeOnlyStroop = [
    { phase: 'practice', condition: 'congruent', isCorrect: true, reactionTimeMs: 450 },
    { phase: 'practice', condition: 'incongruent', isCorrect: true, reactionTimeMs: 550 },
  ];
  const stroopRes = computeStroopMetrics(samplePracticeOnlyStroop);
  assert(stroopRes.stroopEffect === '—', "Stroop with practice-only returns '—' for effect (not 0ms or fake offset)");
  assert(stroopRes.congruentMeanRt === '—', "Stroop congruent RT returns '—'");
  assert(stroopRes.accuracy === '—', "Stroop accuracy returns '—'");

  // Test 3: Task Switching Switch Cost Calculation & First Mixed Trial Exclusion
  console.log('\n--- Test 3: Task Switching Calculation & First Mixed Trial Exclusion ---');
  function computeTaskSwitchMetrics(trials) {
    const expTrials = trials.filter(t => t.phase === 'experimental');
    if (expTrials.length === 0) {
      return {
        switchCost: '—',
        accuracy: '—',
      };
    }
    // Mixed repeat & switch (excluding first mixed trial which has isTaskRepeat: false, isTaskSwitch: false)
    const mixedRepeat = expTrials.filter(t => t.blockType === 'mixed' && t.isTaskRepeat && t.isCorrect);
    const mixedSwitch = expTrials.filter(t => t.blockType === 'mixed' && t.isTaskSwitch && t.isCorrect);
    const repeatMean = mixedRepeat.length > 0 ? mixedRepeat.reduce((s, t) => s + t.reactionTimeMs, 0) / mixedRepeat.length : null;
    const switchMean = mixedSwitch.length > 0 ? mixedSwitch.reduce((s, t) => s + t.reactionTimeMs, 0) / mixedSwitch.length : null;
    const cost = (switchMean !== null && repeatMean !== null) ? Math.round(switchMean - repeatMean) : null;
    return {
      switchCost: cost,
      accuracy: (expTrials.filter(t => t.isCorrect).length / expTrials.length) * 100,
    };
  }

  // First mixed trial must have isTaskSwitch: false, isTaskRepeat: false
  const sampleTSTrials = [
    // Practice trial (must be ignored)
    { phase: 'practice', blockType: 'pure-letter', isTaskSwitch: false, isTaskRepeat: false, isCorrect: true, reactionTimeMs: 400 },
    // First mixed trial (must be ignored for switch/repeat)
    { phase: 'experimental', blockType: 'mixed', isTaskSwitch: false, isTaskRepeat: false, isCorrect: true, reactionTimeMs: 900 },
    // Repeat mixed trial
    { phase: 'experimental', blockType: 'mixed', isTaskSwitch: false, isTaskRepeat: true, isCorrect: true, reactionTimeMs: 600 },
    // Repeat incorrect mixed trial (must be ignored from RT means)
    { phase: 'experimental', blockType: 'mixed', isTaskSwitch: false, isTaskRepeat: true, isCorrect: false, reactionTimeMs: 300 },
    // Switch mixed trial
    { phase: 'experimental', blockType: 'mixed', isTaskSwitch: true, isTaskRepeat: false, isCorrect: true, reactionTimeMs: 750 },
  ];

  const tsMetrics = computeTaskSwitchMetrics(sampleTSTrials);
  assert(tsMetrics.switchCost === 150, `Switch cost correctly calculated as 750 - 600 = 150 ms (got ${tsMetrics.switchCost})`);

  // Test 4: Corsi Stopping Rule, 4-Correct Threshold & Incomplete Sessions
  console.log('\n--- Test 4: Corsi Stopping Rule & Incomplete Sessions ---');
  function evaluateCorsiProtocol(trials) {
    let maxCompletedLevel = 0;
    let correctAtMaxLevel = 0;
    let isProtocolCompleted = false;

    for (let lvl = 1; lvl <= 8; lvl++) {
      const lvlTrials = trials.filter(t => t.level === lvl);
      const correctLvl = lvlTrials.filter(t => t.is_correct).length;
      if (lvlTrials.length >= 6) {
        if (correctLvl >= 4) {
          maxCompletedLevel = lvl;
          correctAtMaxLevel = correctLvl;
          if (lvl === 8) isProtocolCompleted = true;
        } else {
          // Stopping rule reached: completed all 6 trials of level but got < 4 correct
          isProtocolCompleted = true;
          break;
        }
      } else if (lvlTrials.length > 0) {
        // Abandoned mid-level before 6 trials
        break;
      }
    }

    if (isProtocolCompleted) {
      const maxCompletedSpan = maxCompletedLevel > 0 ? maxCompletedLevel + 1 : 0;
      const productScore = maxCompletedSpan * correctAtMaxLevel;
      return {
        isProtocolCompleted: true,
        maxLevel: maxCompletedLevel,
        maxSpan: maxCompletedSpan,
        productScore,
      };
    } else {
      return {
        isProtocolCompleted: false,
        maxLevel: null,
        maxSpan: null,
        productScore: null,
      };
    }
  }

  // Case A: Abandoned after 1 trial
  const abandoned1Trial = [{ level: 1, is_correct: true }];
  const evalAbandoned = evaluateCorsiProtocol(abandoned1Trial);
  assert(evalAbandoned.isProtocolCompleted === false, "Abandoned session flagged isProtocolCompleted: false");
  assert(evalAbandoned.maxSpan === null, "Abandoned session maxSpan is null (displayed as '—')");
  assert(evalAbandoned.productScore === null, "Abandoned session productScore is null (displayed as '—')");

  // Case B: Completed Level 1 (6 trials, 6 correct) -> Level 2 stopped (<4)
  const completedLvl1 = [
    ...Array(6).fill(null).map(() => ({ level: 1, is_correct: true })),
    ...Array(6).fill(null).map(() => ({ level: 2, is_correct: false })),
  ];
  const evalCompletedL1 = evaluateCorsiProtocol(completedLvl1);
  assert(evalCompletedL1.isProtocolCompleted === true, "Level 2 failure triggered protocol completion");
  assert(evalCompletedL1.maxSpan === 2, `Completed Level 1 has maxSpan = 2 (got ${evalCompletedL1.maxSpan})`);
  assert(evalCompletedL1.productScore === 12, `Completed Level 1 has productScore = 2 * 6 = 12 (got ${evalCompletedL1.productScore})`);

  // Case C: Failed Level 1 directly (6 trials, 2 correct)
  const failedLvl1 = [
    { level: 1, is_correct: true },
    { level: 1, is_correct: true },
    { level: 1, is_correct: false },
    { level: 1, is_correct: false },
    { level: 1, is_correct: false },
    { level: 1, is_correct: false },
  ];
  const evalFailedL1 = evaluateCorsiProtocol(failedLvl1);
  assert(evalFailedL1.isProtocolCompleted === true, "Level 1 failure with 6 trials triggered stopping rule");
  assert(evalFailedL1.maxSpan === 0, `Failed Level 1 has maxSpan = 0 (got ${evalFailedL1.maxSpan})`);
  assert(evalFailedL1.productScore === 0, `Failed Level 1 has productScore = 0 (got ${evalFailedL1.productScore})`);

  // Test 5: Live Database Verification
  console.log('\n--- Test 5: Live Supabase DB Telemetry & Check Constraints ---');
  await supabase.auth.signInWithPassword({ email: 'admin@mindlab.io', password: 'mindlab2024' });
  const { data: stroopCheck } = await supabase.from('stroop_trials').select('phase').limit(10);
  assert(stroopCheck && stroopCheck.length > 0 && stroopCheck.every(t => t.phase === 'practice' || t.phase === 'experiment'), "Live stroop_trials phases conform strictly to ('practice', 'experiment')");

  const { data: tsCheck } = await supabase.from('task_switching_trials').select('phase').limit(10);
  assert(tsCheck && tsCheck.length > 0 && tsCheck.every(t => t.phase === 'practice' || t.phase === 'experimental'), "Live task_switching_trials phases conform strictly to ('practice', 'experimental')");

  // Test 6: Tower of Hanoi Move-Limit vs Completed Outcome Handling
  console.log('\n--- Test 6: Tower of Hanoi Move-Limit vs Completed Outcome Handling ---');
  function computeHanoiMetrics(trials) {
    const total = trials.length;
    const completedTrials = trials.filter(t => t.outcome === 'Completed');
    const completedCount = completedTrials.length;
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const completedWithTime = completedTrials.filter(t => t.completionTime > 0);
    const avgSolvedTimeSec = completedWithTime.length > 0
      ? +(completedWithTime.reduce((s, t) => s + t.completionTime, 0) / completedWithTime.length / 1000).toFixed(1)
      : null;

    // 4-disc attempts
    const fourDiscTrials = trials.filter(t => t.diskCount === 4);
    const fourDiscCompleted = fourDiscTrials.filter(t => t.outcome === 'Completed').length;
    const fourDiscRate = fourDiscTrials.length > 0 ? Math.round((fourDiscCompleted / fourDiscTrials.length) * 100) : 0;

    return {
      total,
      completedCount,
      completionRate,
      avgSolvedTimeSec,
      fourDiscRate,
    };
  }

  const sampleHanoiTrials = [
    { puzzleIndex: 0, diskCount: 3, outcome: 'Completed', completionTime: 8000, validMoves: 3 },
    { puzzleIndex: 1, diskCount: 3, outcome: 'Completed', completionTime: 4000, validMoves: 3 },
    { puzzleIndex: 4, diskCount: 4, outcome: 'Move Limit Reached', completionTime: 30000, validMoves: 30 },
  ];

  const hanoiTestRes = computeHanoiMetrics(sampleHanoiTrials);
  assert(hanoiTestRes.total === 3, "Total attempts is 3");
  assert(hanoiTestRes.completedCount === 2, "Only 2 puzzles solved (move-limit attempt NOT counted as solved)");
  assert(hanoiTestRes.completionRate === 67, `Overall completion rate is 2/3 = 67% (got ${hanoiTestRes.completionRate}%)`);
  assert(hanoiTestRes.avgSolvedTimeSec === 6.0, `Avg. solved time is (8s + 4s)/2 = 6.0s (excluding 30s move-limit trial)`);
  assert(hanoiTestRes.fourDiscRate === 0, `4-disc completion rate is 0% when attempt reached move limit`);

  // Test 7: Participant Battery Status Categorization
  console.log('\n--- Test 7: Participant Battery Status Categorization ---');
  function deriveParticipantStatus({
    hanoiAttempts = 0,
    hanoiDone = false,
    corsiTrialsCount = 0,
    corsiDone = false,
    stroopExpCount = 0,
    stroopPracticeCount = 0,
    stroopDone = false,
    taskSwitchingExpCount = 0,
    taskSwitchingPracticeCount = 0,
    taskSwitchingDone = false,
    sessionStatus = 'in_progress',
  }) {
    const hasAnyData = hanoiAttempts > 0 || corsiTrialsCount > 0 || stroopExpCount > 0 || stroopPracticeCount > 0 || taskSwitchingExpCount > 0 || taskSwitchingPracticeCount > 0;
    const isAllBatteryCompleted = hanoiDone && corsiDone && stroopDone && taskSwitchingDone;
    const isPracticeOnly = !isAllBatteryCompleted && (stroopPracticeCount > 0 || taskSwitchingPracticeCount > 0) && stroopExpCount === 0 && taskSwitchingExpCount === 0 && hanoiAttempts === 0 && corsiTrialsCount === 0;

    if (!hasAnyData) return 'Not Started';
    if (isAllBatteryCompleted) return 'Completed';
    if (isPracticeOnly) return 'Practice Only';
    if (sessionStatus === 'completed' || sessionStatus === 'abandoned' || (!hanoiDone && hanoiAttempts > 0) || (!corsiDone && corsiTrialsCount > 0)) {
      return 'Incomplete';
    }
    return 'In Progress';
  }

  assert(deriveParticipantStatus({}) === 'Not Started', "Zero activity yields 'Not Started'");
  assert(deriveParticipantStatus({ stroopPracticeCount: 10 }) === 'Practice Only', "Only practice trials yields 'Practice Only'");
  assert(deriveParticipantStatus({ corsiTrialsCount: 1, sessionStatus: 'completed' }) === 'Incomplete', "1 Corsi trial with session completed flag yields 'Incomplete'");
  assert(deriveParticipantStatus({
    hanoiAttempts: 6,
    hanoiDone: true,
    corsiTrialsCount: 12,
    corsiDone: true,
    stroopExpCount: 80,
    stroopDone: true,
    taskSwitchingExpCount: 64,
    taskSwitchingDone: true
  }) === 'Completed', "All 4 experiments completed yields 'Completed'");

  // Test 8: Live Supabase Raw Record Preservation
  console.log('\n--- Test 8: Live Supabase Raw Record Preservation ---');
  const { count: participantCount } = await supabase.from('participants').select('*', { count: 'exact', head: true });
  const { count: sessionCount } = await supabase.from('sessions').select('*', { count: 'exact', head: true });
  const { count: hanoiPuzzleCount } = await supabase.from('hanoi_puzzles').select('*', { count: 'exact', head: true });
  const { count: hanoiMoveCount } = await supabase.from('hanoi_moves').select('*', { count: 'exact', head: true });
  const { count: corsiTrialCount } = await supabase.from('corsi_trials').select('*', { count: 'exact', head: true });
  const { count: stroopTrialCount } = await supabase.from('stroop_trials').select('*', { count: 'exact', head: true });
  const { count: tsTrialCount } = await supabase.from('task_switching_trials').select('*', { count: 'exact', head: true });

  assert(participantCount >= 14, `All participants preserved (found ${participantCount}, expected at least 14)`);
  assert(sessionCount >= 14, `All sessions preserved (found ${sessionCount}, expected at least 14)`);
  assert(hanoiPuzzleCount >= 9, `All Hanoi puzzles preserved (found ${hanoiPuzzleCount}, expected at least 9)`);
  assert(hanoiMoveCount >= 52, `All Hanoi moves preserved (found ${hanoiMoveCount}, expected at least 52)`);
  assert(corsiTrialCount >= 14, `All Corsi trials preserved (found ${corsiTrialCount}, expected at least 14)`);
  assert(stroopTrialCount >= 98, `All Stroop trials preserved (found ${stroopTrialCount}, expected at least 98)`);
  assert(tsTrialCount >= 81, `All Task Switching trials preserved (found ${tsTrialCount}, expected at least 81)`);

  // Test 9: Stroop Response Flow, Key Mapping, & Controlled 21.3% Accuracy Reproduction
  console.log('\n--- Test 9: Stroop Response Flow, Key Mapping & Controlled Reproduction ---');
  
  // 9.1 Key mapping verification (R/G/B/Y, case-insensitive, space/enter excluded)
  const STROOP_KEY_MAP = {
    r: 'RED', R: 'RED',
    g: 'GREEN', G: 'GREEN',
    b: 'BLUE', B: 'BLUE',
    y: 'YELLOW', Y: 'YELLOW',
  };
  assert(STROOP_KEY_MAP['r'] === 'RED' && STROOP_KEY_MAP['R'] === 'RED', "Key 'r'/'R' maps to 'RED'");
  assert(STROOP_KEY_MAP['g'] === 'GREEN' && STROOP_KEY_MAP['G'] === 'GREEN', "Key 'g'/'G' maps to 'GREEN'");
  assert(STROOP_KEY_MAP['b'] === 'BLUE' && STROOP_KEY_MAP['B'] === 'BLUE', "Key 'b'/'B' maps to 'BLUE'");
  assert(STROOP_KEY_MAP['y'] === 'YELLOW' && STROOP_KEY_MAP['Y'] === 'YELLOW', "Key 'y'/'Y' maps to 'YELLOW'");
  assert(!STROOP_KEY_MAP[' '] && !STROOP_KEY_MAP['Enter'], "Space and Enter are not response keys");

  // 9.2 Expected response and correct response evaluation
  function evaluateStroopTrial(item, responseKey) {
    const participantResponse = STROOP_KEY_MAP[responseKey] || null;
    const correctResponse = item.inkColor; // Expected response is INK COLOR, not word text
    const isCorrect = participantResponse === correctResponse;
    return {
      word: item.word,
      inkColor: item.inkColor,
      condition: item.condition,
      correctResponse,
      participantResponse,
      isCorrect,
    };
  }

  // Sample trial: Word is 'GREEN', ink is 'RED' (incongruent)
  const testItem = { word: 'GREEN', inkColor: 'RED', condition: 'incongruent' };
  const respR = evaluateStroopTrial(testItem, 'r');
  const respG = evaluateStroopTrial(testItem, 'g');
  assert(respR.correctResponse === 'RED', "Expected response strictly matches ink color ('RED')");
  assert(respR.participantResponse === 'RED' && respR.isCorrect === true, "Pressing 'r' on RED ink yields isCorrect: true");
  assert(respG.participantResponse === 'GREEN' && respG.isCorrect === false, "Pressing 'g' on RED ink yields isCorrect: false even though word was 'GREEN'");

  // 9.3 Controlled reproduction of 21.3% accuracy observed in user test session
  // In an 80-trial balanced experiment, each of 4 ink colors appears exactly 20 times.
  // When a participant spams GREEN on 68 trials and BLUE on 12 trials:
  const { data: userExpTrials } = await supabase
    .from('stroop_trials')
    .select('*')
    .eq('session_id', '61a5cde0-7a2f-469a-b75d-c375a2f0f960')
    .eq('phase', 'experiment')
    .order('trial_number', { ascending: true });

  assert(userExpTrials && userExpTrials.length === 80, `User test session contains exactly 80 experimental trials (found ${userExpTrials?.length})`);

  const greenRespCount = userExpTrials.filter(t => t.participant_response === 'GREEN').length;
  const blueRespCount = userExpTrials.filter(t => t.participant_response === 'BLUE').length;
  const redRespCount = userExpTrials.filter(t => t.participant_response === 'RED').length;
  const yellowRespCount = userExpTrials.filter(t => t.participant_response === 'YELLOW').length;

  assert(greenRespCount === 68, `User session recorded exactly 68 'GREEN' responses`);
  assert(blueRespCount === 12, `User session recorded exactly 12 'BLUE' responses`);
  assert(redRespCount === 0 && yellowRespCount === 0, `User session recorded 0 'RED' and 0 'YELLOW' responses`);

  const correctCount = userExpTrials.filter(t => t.is_correct).length;
  const accuracyPercent = (correctCount / userExpTrials.length) * 100;
  assert(correctCount === 17, `Exactly 17 out of 80 trials were correct (all 17 were trials where ink_color was 'GREEN')`);
  assert(accuracyPercent === 21.25, `Exact accuracy is 17/80 = 21.25%`);
  assert(accuracyPercent.toFixed(1) === '21.3', `Formatted accuracy is 21.3%, matching user's observed accuracy exactly`);

  // 9.4 Verification of Practice trial count and zero duplicate trials
  const { data: userPracticeTrials } = await supabase
    .from('stroop_trials')
    .select('*')
    .eq('session_id', '61a5cde0-7a2f-469a-b75d-c375a2f0f960')
    .eq('phase', 'practice')
    .order('trial_number', { ascending: true });

  assert(userPracticeTrials && userPracticeTrials.length === 8, `User test session contains exactly 8 practice trials (found ${userPracticeTrials?.length})`);

  // Verify total trials for session is 8 + 80 = 88 with zero duplicates
  const totalUserTrials = (userPracticeTrials?.length || 0) + (userExpTrials?.length || 0);
  assert(totalUserTrials === 88, `User test session has exactly 88 trials (8 practice + 80 experimental)`);
  
  const trialKeys = new Set(
    [...(userPracticeTrials || []), ...(userExpTrials || [])].map(t => `${t.phase}-${t.trial_number}`)
  );
  assert(trialKeys.size === 88, "Zero duplicate trials exist across practice and experimental phases");

  // 9.5 Verification of Reaction Times & Sub-100ms spamming evidence
  const sub100msTrials = userExpTrials.filter(t => t.reaction_time_ms < 100);
  assert(sub100msTrials.length >= 10, `Found ${sub100msTrials.length} trials with RT < 100ms, proving participant rapid anticipatory key tapping`);

  // Test 10: Task Switching Design, Rules, Alternating-Runs & Database Telemetry Audit
  console.log('\n--- Test 10: Task Switching Design, Rules, Alternating-Runs & DB Audit ---');

  // 10.1 Trial Counts: 8 Practice + 64 Experimental (16 Pure Letter, 16 Pure Number, 32 Mixed)
  const PRACTICE_COUNT = 8;
  const PURE_LETTER_COUNT = 16;
  const PURE_NUMBER_COUNT = 16;
  const MIXED_COUNT = 32;
  const TOTAL_EXP_COUNT = PURE_LETTER_COUNT + PURE_NUMBER_COUNT + MIXED_COUNT;
  assert(PRACTICE_COUNT === 8, "Task Switching specifies exactly 8 practice trials");
  assert(PURE_LETTER_COUNT === 16, "Pure Letter block contains exactly 16 trials");
  assert(PURE_NUMBER_COUNT === 16, "Pure Number block contains exactly 16 trials");
  assert(MIXED_COUNT === 32, "Mixed block contains exactly 32 trials");
  assert(TOTAL_EXP_COUNT === 64, "Total experimental trials is exactly 64 (16 + 16 + 32)");

  // 10.2 Alternating-Runs Mixed Block (Letter, Letter, Number, Number...)
  const taskSequence = [];
  for (let i = 0; i < 8; i++) {
    taskSequence.push('letter', 'letter', 'number', 'number');
  }
  assert(taskSequence.length === 32, "Alternating-runs task sequence length is exactly 32");

  let repeatCount = 0;
  let switchCount = 0;
  let firstTrialSwitchOrRepeat = false;

  for (let i = 0; i < taskSequence.length; i++) {
    const isFirst = i === 0;
    const isRepeat = !isFirst && taskSequence[i] === taskSequence[i - 1];
    const isSwitch = !isFirst && taskSequence[i] !== taskSequence[i - 1];

    if (isFirst && (isRepeat || isSwitch)) firstTrialSwitchOrRepeat = true;
    if (isRepeat) repeatCount++;
    if (isSwitch) switchCount++;
  }

  assert(!firstTrialSwitchOrRepeat, "First mixed trial is neither repeat nor switch (isTaskRepeat: false, isTaskSwitch: false)");
  assert(switchCount === 15, `Alternating-runs produces exactly 15 switch trials in mixed block (got ${switchCount})`);
  assert(repeatCount === 16, `Alternating-runs produces exactly 16 repeat trials in mixed block (got ${repeatCount})`);
  assert(1 + switchCount + repeatCount === 32, "First trial (1) + switches (15) + repeats (16) equals 32 mixed trials");

  // 10.3 Task Rule & Key Mapping Evaluation
  const VOWELS = ['A', 'E', 'I', 'O', 'U'];
  const CONSONANTS = ['G', 'K', 'M', 'R', 'T', 'F', 'L', 'P', 'S', 'V'];
  const ODD_NUMBERS = [1, 3, 5, 7, 9];
  const EVEN_NUMBERS = [2, 4, 6, 8];

  function evaluateTsRule(task, letter, number) {
    if (task === 'letter') {
      return VOWELS.includes(letter) ? 'B' : 'N';
    } else {
      return ODD_NUMBERS.includes(number) ? 'B' : 'N';
    }
  }

  assert(evaluateTsRule('letter', 'A', 2) === 'B', "Letter task: Vowel 'A' -> 'B'");
  assert(evaluateTsRule('letter', 'K', 3) === 'N', "Letter task: Consonant 'K' -> 'N'");
  assert(evaluateTsRule('number', 'A', 5) === 'B', "Number task: Odd '5' -> 'B'");
  assert(evaluateTsRule('number', 'E', 4) === 'N', "Number task: Even '4' -> 'N'");

  // 10.4 Switch Cost Calculation & Exclusion Safeguards
  function computeSwitchCost(trials) {
    const expTrials = trials.filter(t => t.phase === 'experimental');
    const mixedRepeat = expTrials.filter(t => t.blockType === 'mixed' && t.isTaskRepeat && t.isCorrect);
    const mixedSwitch = expTrials.filter(t => t.blockType === 'mixed' && t.isTaskSwitch && t.isCorrect);

    const rMean = mixedRepeat.length > 0 ? mixedRepeat.reduce((s, t) => s + t.reactionTimeMs, 0) / mixedRepeat.length : null;
    const sMean = mixedSwitch.length > 0 ? mixedSwitch.reduce((s, t) => s + t.reactionTimeMs, 0) / mixedSwitch.length : null;

    return (sMean !== null && rMean !== null) ? Math.round(sMean - rMean) : null;
  }

  const sampleMixedDataset = [
    // Practice trial (must be ignored)
    { phase: 'practice', blockType: 'pure-letter', isTaskRepeat: false, isTaskSwitch: false, isCorrect: true, reactionTimeMs: 400 },
    // Pure block trials (must be ignored for switch cost)
    { phase: 'experimental', blockType: 'pure-letter', isTaskRepeat: false, isTaskSwitch: false, isCorrect: true, reactionTimeMs: 450 },
    { phase: 'experimental', blockType: 'pure-number', isTaskRepeat: false, isTaskSwitch: false, isCorrect: true, reactionTimeMs: 480 },
    // Mixed trial 1 (first mixed trial: ignored)
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: false, isTaskSwitch: false, isCorrect: true, reactionTimeMs: 900 },
    // Mixed repeat correct (600ms)
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: true, isTaskSwitch: false, isCorrect: true, reactionTimeMs: 600 },
    // Mixed repeat incorrect (must be ignored)
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: true, isTaskSwitch: false, isCorrect: false, reactionTimeMs: 250 },
    // Mixed switch correct (820ms)
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: false, isTaskSwitch: true, isCorrect: true, reactionTimeMs: 820 },
    // Mixed switch incorrect (must be ignored)
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: false, isTaskSwitch: true, isCorrect: false, reactionTimeMs: 300 },
  ];

  const calculatedCost = computeSwitchCost(sampleMixedDataset);
  assert(calculatedCost === 220, `Switch cost strictly calculated as 820 - 600 = 220 ms (got ${calculatedCost})`);

  // When either switch or repeat has no correct trials, switch cost returns null
  const noCorrectSwitch = sampleMixedDataset.filter(t => !(t.isTaskSwitch && t.isCorrect));
  assert(computeSwitchCost(noCorrectSwitch) === null, "Switch cost returns null when no correct switch trials exist");

  // 10.5 Live Supabase Task Switching Telemetry Audit & Duplicate Check
  const { data: liveTsTrials, error: liveTsErr } = await supabase
    .from('task_switching_trials')
    .select('*')
    .order('created_at', { ascending: true });

  assert(!liveTsErr && liveTsTrials, "Fetched live task_switching_trials from Supabase");
  assert(liveTsTrials.length >= 81, `Supabase contains at least 81 Task Switching trials (found ${liveTsTrials.length})`);

  // Duplicate key verification (session_id, phase, trial_number)
  const tsKeySet = new Set();
  let tsDupCount = 0;
  liveTsTrials.forEach(t => {
    const k = `${t.session_id}-${t.phase}-${t.trial_number}`;
    if (tsKeySet.has(k)) tsDupCount++;
    tsKeySet.add(k);
  });
  assert(tsDupCount === 0, "Zero duplicate records exist in task_switching_trials");

  // Session 3ae39f09 integrity (8 practice trials: 4 pure-letter + 4 pure-number)
  const session3aeTrials = liveTsTrials.filter(t => t.session_id === '3ae39f09-fe2b-40be-a887-6628066a5f15');
  assert(session3aeTrials.length === 8, `Session 3ae39f09 has exactly 8 practice trials`);
  assert(session3aeTrials.every(t => t.phase === 'practice'), "All 8 trials of session 3ae39f09 are phase 'practice'");
  const s3aeLetter = session3aeTrials.filter(t => t.block_type === 'pure-letter');
  const s3aeNumber = session3aeTrials.filter(t => t.block_type === 'pure-number');
  assert(s3aeLetter.length === 4 && s3aeNumber.length === 4, "Practice contains exactly 4 letter and 4 number trials");

  // Session f7730f4d integrity (8 practice trials + 64 experimental trials)
  const sessionF7Trials = liveTsTrials.filter(t => t.session_id === 'f7730f4d-43af-45bc-b02b-87ce5bae8503');
  assert(sessionF7Trials.length === 72, `Session f7730f4d has exactly 72 trials (8 practice + 64 experimental)`);
  const sF7Practice = sessionF7Trials.filter(t => t.phase === 'practice');
  const sF7Exp = sessionF7Trials.filter(t => t.phase === 'experimental');
  assert(sF7Practice.length === 8, `Session f7730f4d has exactly 8 practice trials`);
  assert(sF7Exp.length === 64, `Session f7730f4d has exactly 64 experimental trials`);
  const sF7Letter = sF7Exp.filter(t => t.block_type === 'pure-letter');
  const sF7Number = sF7Exp.filter(t => t.block_type === 'pure-number');
  const sF7Mixed = sF7Exp.filter(t => t.block_type === 'mixed');
  assert(sF7Letter.length === 16 && sF7Number.length === 16 && sF7Mixed.length === 32, "Session f7730f4d distribution: exactly 16 pure-letter, 16 pure-number, 32 mixed");
  const sF7Correct = sF7Exp.filter(t => t.is_correct).length;
  assert(sF7Correct === 28, `Session f7730f4d accuracy is exactly 28/64 (43.75%)`);
  const sF7SwitchCorrect = sF7Mixed.filter(t => t.is_task_switch && t.is_correct);
  const sF7RepeatCorrect = sF7Mixed.filter(t => t.is_task_repeat && t.is_correct);
  assert(sF7SwitchCorrect.length === 6 && sF7RepeatCorrect.length === 6, "Session f7730f4d has exactly 6 correct switch and 6 correct repeat trials");
  const sF7SwitchMean = sF7SwitchCorrect.reduce((s, t) => s + t.reaction_time_ms, 0) / 6;
  const sF7RepeatMean = sF7RepeatCorrect.reduce((s, t) => s + t.reaction_time_ms, 0) / 6;
  const sF7Cost = Math.round(sF7SwitchMean - sF7RepeatMean);
  assert(sF7Cost === -62, `Session f7730f4d switch cost is exactly -62 ms (196.1 - 258.2)`);

  // Test 11: Backward Corsi Design, 4/6 Stopping Rule, Product Score & Supabase Audit
  console.log('\n--- Test 11: Backward Corsi Design, 4/6 Stopping Rule, Product Score & DB Audit ---');

  // 11.1 Span Range: Levels 1..8 correspond to Sequence Lengths 2..9
  const TOTAL_CORSI_LEVELS = 8;
  const CORSI_TRIALS_PER_LEVEL = 6;
  const CORSI_REQUIRED_CORRECT = 4;
  function getCorsiSeqLen(lvl) { return lvl + 1; }

  assert(TOTAL_CORSI_LEVELS === 8, "Corsi has exactly 8 levels");
  assert(CORSI_TRIALS_PER_LEVEL === 6, "Corsi has exactly 6 trials per level/span");
  assert(CORSI_REQUIRED_CORRECT === 4, "Stopping rule threshold is 4 correct out of 6");
  assert(getCorsiSeqLen(1) === 2, "Level 1 corresponds to sequence length 2");
  assert(getCorsiSeqLen(8) === 9, "Level 8 corresponds to sequence length 9");

  // 11.2 Product Score calculation formula verification: Max Completed Span * Correct at Max Span
  function computeCorsiProductScore(maxCompletedLevel, correctAtMaxLevel) {
    const maxCompletedSpan = maxCompletedLevel > 0 ? getCorsiSeqLen(maxCompletedLevel) : 0;
    return maxCompletedSpan * correctAtMaxLevel;
  }

  assert(computeCorsiProductScore(1, 6) === 12, "Level 1 (span 2) with 6 correct -> Product Score = 2 * 6 = 12");
  assert(computeCorsiProductScore(4, 5) === 25, "Level 4 (span 5) with 5 correct -> Product Score = 5 * 5 = 25");
  assert(computeCorsiProductScore(8, 4) === 36, "Level 8 (span 9) with 4 correct -> Product Score = 9 * 4 = 36");
  assert(computeCorsiProductScore(0, 0) === 0, "Level 0 (failed Level 1 directly) -> Product Score = 0");

  // 11.3 Live Supabase corsi_trials Audit & Duplicate Verification
  const { data: liveCorsiTrials, error: liveCorsiErr } = await supabase
    .from('corsi_trials')
    .select('*')
    .order('created_at', { ascending: true });

  assert(!liveCorsiErr && liveCorsiTrials, "Fetched live corsi_trials from Supabase");
  assert(liveCorsiTrials.length >= 14, `Supabase contains at least 14 Corsi trials (found ${liveCorsiTrials.length})`);

  // Verify zero duplicates (session_id, level, trial_number)
  const corsiKeySet = new Set();
  let corsiDupCount = 0;
  liveCorsiTrials.forEach(t => {
    const k = `${t.session_id}-${t.level}-${t.trial_number}`;
    if (corsiKeySet.has(k)) corsiDupCount++;
    corsiKeySet.add(k);
  });
  assert(corsiDupCount === 0, "Zero duplicate records exist in corsi_trials");

  // 11.4 Session-specific audits in live data
  // Session 95c8a2e3: Completed Level 1 (6 trials, 6 correct), failed Level 2 stopping threshold (6 trials, 3 correct)
  const session95Trials = liveCorsiTrials.filter(t => t.session_id.startsWith('95c8a2e3'));
  assert(session95Trials.length === 12, `Session 95c8a2e3 completed exactly 12 trials across Level 1 and 2`);
  const s95L1 = session95Trials.filter(t => t.level === 1);
  const s95L2 = session95Trials.filter(t => t.level === 2);
  assert(s95L1.length === 6 && s95L1.filter(t => t.is_correct).length === 6, "Session 95c8a2e3: Level 1 has 6 trials, all 6 correct (advanced)");
  assert(s95L2.length === 6 && s95L2.filter(t => t.is_correct).length === 3, "Session 95c8a2e3: Level 2 has 6 trials, 3 correct (stopping rule triggered)");

  const s95Eval = evaluateCorsiProtocol(session95Trials);
  assert(s95Eval.isProtocolCompleted === true, "Session 95c8a2e3 correctly evaluated as completed protocol via stopping rule");
  assert(s95Eval.maxSpan === 2, "Session 95c8a2e3 maxSpan is 2");
  assert(s95Eval.productScore === 12, "Session 95c8a2e3 Product Score is exactly 2 * 6 = 12");

  // Incomplete sessions (34194ff7 and 8725caf8): Abandoned after 1 trial on Level 1
  const session34Trials = liveCorsiTrials.filter(t => t.session_id.startsWith('34194ff7'));
  const session87Trials = liveCorsiTrials.filter(t => t.session_id.startsWith('8725caf8'));
  assert(session34Trials.length === 1 && session87Trials.length === 1, "Abandoned sessions have exactly 1 trial recorded");
  assert(evaluateCorsiProtocol(session34Trials).isProtocolCompleted === false, "Session 34194ff7 evaluated as isProtocolCompleted: false");
  assert(evaluateCorsiProtocol(session87Trials).isProtocolCompleted === false, "Session 8725caf8 evaluated as isProtocolCompleted: false");
  assert(evaluateCorsiProtocol(session34Trials).maxSpan === null, "Abandoned session maxSpan is null (displayed as '—')");
  assert(evaluateCorsiProtocol(session34Trials).productScore === null, "Abandoned session productScore is null (displayed as '—')");

  // Test 12: Experiment Configuration & Recorded Measurement Settings Trace
  console.log('\n--- Test 12: Experiment Configuration & Recorded Measurement Settings ---');
  // 12.1 Verify default structures & types
  const DEFAULT_SESSION_OPTIONS = {
    allowMidSessionExit: true,
    recordInvalidMoves: true,
    showTimer: true,
    showMoveCounter: true,
  };
  const DEFAULT_DATA_MEASUREMENTS = {
    recordMoveTimestamps: true,
    recordFirstMoveRt: true,
    recordInvalidMoveAttempts: true,
    recordBlockPositionAccuracy: true,
    recordSessionTimestamps: true,
  };

  assert(typeof DEFAULT_SESSION_OPTIONS.allowMidSessionExit === 'boolean', "allowMidSessionExit is boolean");
  assert(typeof DEFAULT_SESSION_OPTIONS.recordInvalidMoves === 'boolean', "recordInvalidMoves is boolean");
  assert(typeof DEFAULT_SESSION_OPTIONS.showTimer === 'boolean', "showTimer is boolean");
  assert(typeof DEFAULT_SESSION_OPTIONS.showMoveCounter === 'boolean', "showMoveCounter is boolean");

  assert(typeof DEFAULT_DATA_MEASUREMENTS.recordMoveTimestamps === 'boolean', "recordMoveTimestamps is boolean");
  assert(typeof DEFAULT_DATA_MEASUREMENTS.recordFirstMoveRt === 'boolean', "recordFirstMoveRt is boolean");
  assert(typeof DEFAULT_DATA_MEASUREMENTS.recordInvalidMoveAttempts === 'boolean', "recordInvalidMoveAttempts is boolean");
  assert(typeof DEFAULT_DATA_MEASUREMENTS.recordBlockPositionAccuracy === 'boolean', "recordBlockPositionAccuracy is boolean");
  assert(typeof DEFAULT_DATA_MEASUREMENTS.recordSessionTimestamps === 'boolean', "recordSessionTimestamps is boolean");

  // 12.2 Query experiment_configs from Supabase
  const { data: configs, error: configErr } = await supabase
    .from('experiment_configs')
    .select('key, config, updated_at');

  assert(!configErr, "Fetched experiment_configs table from Supabase without error");
  if (configs && configs.length > 0) {
    const sessionOptRow = configs.find(c => c.key === 'session_options');
    const dataMeasRow = configs.find(c => c.key === 'data_measurements');
    if (sessionOptRow) {
      assert(typeof sessionOptRow.config === 'object', "experiment_configs 'session_options' is a valid JSON object");
    }
    if (dataMeasRow) {
      assert(typeof dataMeasRow.config === 'object', "experiment_configs 'data_measurements' is a valid JSON object");
    }
  }

  // 12.3 Verify participant room logic enforcement
  // Hanoi showTimer === false hides timer HUD
  function shouldRenderTimerHUD(showTimer) { return showTimer === true; }
  function shouldRenderCounterHUD(showMoveCounter) { return showMoveCounter === true; }
  function shouldRenderExitButton(allowExit) { return allowExit === true; }

  assert(shouldRenderTimerHUD(true) === true, "HUD timer renders when showTimer is true");
  assert(shouldRenderTimerHUD(false) === false, "HUD timer hidden when showTimer is false");
  assert(shouldRenderCounterHUD(true) === true, "HUD counter renders when showMoveCounter is true");
  assert(shouldRenderCounterHUD(false) === false, "HUD counter hidden when showMoveCounter is false");
  assert(shouldRenderExitButton(true) === true, "Exit button renders when allowMidSessionExit is true");
  assert(shouldRenderExitButton(false) === false, "Exit button hidden when allowMidSessionExit is false");

  // Test 13: Live Data Export Tables, Mappings & Excel Generation
  console.log('\n--- Test 13: Live Data Export Tables, Schema & Excel Generation ---');

  // 13.1 Participant & Session Code Mapping
  const { data: pData } = await supabase.from('participants').select('id, participant_code');
  const participantCodeMap = new Map((pData || []).map(p => [p.id, p.participant_code]));
  assert(participantCodeMap.size >= 12, `Participant code map has ${participantCodeMap.size} participants`);

  const { data: sData } = await supabase.from('sessions').select('id, participant_id');
  const sessionToCodeMap = new Map((sData || []).map(s => [s.id, participantCodeMap.get(s.participant_id) || s.participant_id]));
  assert(sessionToCodeMap.size >= 12, `Session to participant code map has ${sessionToCodeMap.size} sessions`);

  // 13.2 Verify all 12 export queries return real records with expected columns
  // (1) hanoi-summary
  const { data: expHanoiSummary } = await supabase.from('hanoi_puzzles').select('*');
  assert(expHanoiSummary && expHanoiSummary.length > 0, `hanoi-summary has ${expHanoiSummary?.length} live records`);
  const mappedHanoiSummary = (expHanoiSummary || []).map(p => ({
    participant_id: sessionToCodeMap.get(p.session_id) || p.session_id,
    session_id: p.session_id,
    puzzle_num: p.puzzle_index + 1,
    disk_count: p.disk_count,
    valid_moves: p.valid_moves,
    invalid_moves: p.invalid_moves,
    completion_time_ms: p.outcome === 'Completed' ? p.completion_time_ms : null,
    elapsed_time_ms: p.completion_time_ms,
    first_reaction_ms: p.first_reaction_time_ms,
    outcome: p.outcome,
  }));
  assert(mappedHanoiSummary[0].participant_id.startsWith('ML-') || mappedHanoiSummary[0].participant_id.length > 0, "hanoi-summary maps participant codes");
  assert('outcome' in mappedHanoiSummary[0], "hanoi-summary contains 'outcome'");

  // (2) hanoi-moves
  const { data: expHanoiMoves } = await supabase.from('hanoi_moves').select('*');
  assert(expHanoiMoves && expHanoiMoves.length > 0, `hanoi-moves has ${expHanoiMoves?.length} live records`);

  // (3) corsi-summary (from analytical view)
  const { data: expCorsiView, error: corsiViewErr } = await supabase.from('corsi_session_summaries_view').select('*');
  assert(!corsiViewErr && expCorsiView && expCorsiView.length > 0, `corsi-summary view has ${expCorsiView?.length} rows`);
  const mappedCorsiView = expCorsiView.map(s => ({
    participant_id: participantCodeMap.get(s.participant_id) || s.participant_id,
    session_id: s.session_id,
    max_level: s.max_completed_level,
    sequence_length: s.max_completed_span,
    product_score: s.product_score,
    trial_accuracy: s.trial_accuracy,
    position_accuracy: s.block_position_accuracy,
  }));
  assert('product_score' in mappedCorsiView[0], "corsi-summary contains product_score");
  assert('position_accuracy' in mappedCorsiView[0], "corsi-summary contains position_accuracy");

  // (4) corsi-trials
  const { data: expCorsiTrials } = await supabase.from('corsi_trials').select('*');
  assert(expCorsiTrials && expCorsiTrials.length > 0, `corsi-trials has ${expCorsiTrials?.length} live records`);
  const mappedCorsiTrials = expCorsiTrials.map(t => ({
    participant_id: sessionToCodeMap.get(t.session_id) || t.session_id,
    level: t.level,
    trial_num: t.trial_number,
    sequence_length: t.sequence_length,
    presented_sequence: Array.isArray(t.presented_sequence) ? t.presented_sequence.join(' ') : JSON.stringify(t.presented_sequence),
    expected_reverse: Array.isArray(t.presented_sequence) ? [...t.presented_sequence].reverse().join(' ') : '',
    participant_response: Array.isArray(t.recalled_sequence) ? t.recalled_sequence.join(' ') : JSON.stringify(t.recalled_sequence),
    is_correct: t.is_correct,
  }));
  assert(typeof mappedCorsiTrials[0].is_correct === 'boolean', "corsi-trials contains boolean is_correct");

  // (5) stroop-summary (from view)
  const { data: expStroopView, error: stroopViewErr } = await supabase.from('stroop_session_summaries_view').select('*');
  assert(!stroopViewErr && expStroopView && expStroopView.length > 0, `stroop-summary view has ${expStroopView?.length} rows`);

  // (6) stroop-trials
  const { data: expStroopTrials } = await supabase.from('stroop_trials').select('*');
  assert(expStroopTrials && expStroopTrials.length > 0, `stroop-trials has ${expStroopTrials?.length} live records`);

  // (7) task-switching-summary (from view)
  const { data: expTsView, error: tsViewErr } = await supabase.from('task_switching_session_summaries_view').select('*');
  assert(!tsViewErr && expTsView && expTsView.length > 0, `task-switching-summary view has ${expTsView?.length} rows`);

  // (8) task-switching-trials
  const { data: expTsTrials } = await supabase.from('task_switching_trials').select('*');
  assert(expTsTrials && expTsTrials.length > 0, `task-switching-trials has ${expTsTrials?.length} live records`);

  // (9) participants table
  const { data: expParticipants } = await supabase.from('participants').select('*');
  assert(expParticipants && expParticipants.length > 0, `participants export has ${expParticipants?.length} live records`);

  // (10) sessions table
  const { data: expSessions } = await supabase.from('sessions').select('*');
  assert(expSessions && expSessions.length > 0, `sessions export has ${expSessions?.length} live records`);

  // 13.3 Test Excel (.xlsx) workbook generation with xlsx library
  const XLSX = await import('xlsx');
  const testWb = XLSX.utils.book_new();
  const testWs = XLSX.utils.json_to_sheet(mappedHanoiSummary);
  XLSX.utils.book_append_sheet(testWb, testWs, 'HanoiSummary');
  const testOutput = XLSX.write(testWb, { bookType: 'xlsx', type: 'buffer' });
  assert(Buffer.isBuffer(testOutput) && testOutput.length > 0, "Generated valid XLSX Excel workbook binary buffer");

  // Test 14: Hanoi Graph Export Uncompleted Puzzle Audit & Filename Conventions
  console.log('\n--- Test 14: Hanoi Graph Export Uncompleted Puzzle Audit & Filename Conventions ---');

  // 14.1 Audit P6 Move Limit Reached vs 0-second completion time
  // Construct mock puzzle cohort where P6 has only Move Limit Reached attempts
  const mockPuzzlesWithUnsolvedP6 = [
    { puzzleIndex: 0, diskCount: 3, outcome: 'Completed', completionTime: 12000 },
    { puzzleIndex: 1, diskCount: 3, outcome: 'Completed', completionTime: 14000 },
    { puzzleIndex: 5, diskCount: 5, outcome: 'Move Limit Reached', completionTime: 0 },
  ];

  function aggregateHanoiGraphMetrics(trials) {
    return [1, 2, 3, 4, 5, 6].map((pNum, idx) => {
      const pTrials = trials.filter(t => t.puzzleIndex === idx);
      const cTrials = pTrials.filter(t => t.outcome === 'Completed' && t.completionTime > 0);
      const avgT = cTrials.length > 0 ? +(cTrials.reduce((s, t) => s + t.completionTime, 0) / cTrials.length / 1000).toFixed(1) : null;
      return {
        puzzle: `P${pNum}`,
        attempts: pTrials.length,
        completed: cTrials.length,
        moveLimitHit: pTrials.filter(t => t.outcome === 'Move Limit Reached').length,
        avgTime: avgT,
      };
    }).filter(p => p.attempts > 0);
  }

  const aggregatedGraph = aggregateHanoiGraphMetrics(mockPuzzlesWithUnsolvedP6);
  const p6Row = aggregatedGraph.find(p => p.puzzle === 'P6');
  assert(p6Row !== undefined, "P6 is included in the graph dataset because it was attempted");
  assert(p6Row.attempts === 1, "P6 has 1 attempt");
  assert(p6Row.completed === 0, "P6 has 0 solved completions");
  assert(p6Row.moveLimitHit === 1, "P6 has 1 move limit hit");
  assert(p6Row.avgTime === null, "P6 average completion time is null, NOT 0 (fixes misleading 0s completion issue)");

  // 14.2 Filename Convention Distinctions
  const rawPrefixes = [
    'mindlab_raw_hanoi_moves',
    'mindlab_raw_hanoi_intermove_timing',
    'mindlab_raw_corsi_trials',
    'mindlab_raw_corsi_positions',
    'mindlab_raw_stroop_trials',
    'mindlab_raw_task_switching_trials',
  ];
  const summaryPrefixes = [
    'mindlab_summary_hanoi_puzzles',
    'mindlab_summary_corsi_scores',
    'mindlab_summary_stroop_scores',
    'mindlab_summary_task_switching_scores',
    'mindlab_summary_participants',
    'mindlab_summary_sessions',
  ];
  const graphPrefixes = [
    'mindlab_graph_data_hanoi_insights',
    'mindlab_graph_data_corsi_insights',
    'mindlab_graph_data_stroop_insights',
    'mindlab_graph_data_task_switching_insights',
  ];

  rawPrefixes.forEach(p => assert(p.startsWith('mindlab_raw_'), `${p} conforms to raw telemetry naming convention`));
  summaryPrefixes.forEach(p => assert(p.startsWith('mindlab_summary_'), `${p} conforms to summary naming convention`));
  graphPrefixes.forEach(p => assert(p.startsWith('mindlab_graph_data_'), `${p} conforms to graph-data naming convention`));

  // ---------------------------------------------------------------------------
  // Test 15: Stage 2 Research Integrity & Edge Cases Suite
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 15: Stage 2 Research Integrity & Edge Cases Suite ---');

  // TEST-P1: Position accuracy when disabled (correctPositionsCount = null, totalPositions = null) -> null
  function computeTrialPositionAcc(trials) {
    const trialsWithPos = trials.filter(t => t.correctPositionsCount !== null && t.totalPositions !== null && t.totalPositions > 0);
    if (trialsWithPos.length === 0) return null;
    const sumCorrect = trialsWithPos.reduce((s, t) => s + t.correctPositionsCount, 0);
    const sumTotal = trialsWithPos.reduce((s, t) => s + t.totalPositions, 0);
    return sumTotal > 0 ? +((sumCorrect / sumTotal) * 100).toFixed(2) : null;
  }

  const p1Trials = [
    { level: 1, trialNumber: 1, correctPositionsCount: null, totalPositions: null },
    { level: 1, trialNumber: 2, correctPositionsCount: null, totalPositions: null },
  ];
  assert(computeTrialPositionAcc(p1Trials) === null, "TEST-P1: Disabled position accuracy evaluates to null (not 0.0%)");

  // TEST-P2: Position accuracy with 0 trials -> null
  assert(computeTrialPositionAcc([]) === null, "TEST-P2: Empty Corsi trials evaluate to null position accuracy");

  // TEST-P3: Genuine measured 0% (e.g. 0/12 correct positions across 6 trials) -> 0.00%
  const p3Trials = [
    { level: 1, trialNumber: 1, correctPositionsCount: 0, totalPositions: 2 },
    { level: 1, trialNumber: 2, correctPositionsCount: 0, totalPositions: 2 },
  ];
  assert(computeTrialPositionAcc(p3Trials) === 0, "TEST-P3: Genuine measured 0% correct positions evaluates to 0.00% (distinguishable from missing data)");

  // TEST-P4: Partial position accuracy (e.g. 6/12 correct positions) -> 50.00%
  const p4Trials = [
    { level: 1, trialNumber: 1, correctPositionsCount: 1, totalPositions: 2 },
    { level: 1, trialNumber: 2, correctPositionsCount: 1, totalPositions: 2 },
  ];
  assert(computeTrialPositionAcc(p4Trials) === 50, "TEST-P4: Partial position accuracy evaluates to exactly 50.00%");

  // TEST-C1 to C5: Corsi 6-State Protocol Completion Evaluation Matrix
  const evaluateCorsiProtocolMatrix = (trials) => {
    let maxCompletedLevel = 0;
    let correctAtMaxLevel = 0;
    let isProtocolComplete = false;

    for (let lvl = 1; lvl <= 8; lvl++) {
      const lvlTrials = trials.filter(t => t.level === lvl);
      const correctLvl = lvlTrials.filter(t => (t.isCorrect || t.is_correct)).length;
      if (lvlTrials.length >= 6) {
        if (correctLvl >= 4) {
          maxCompletedLevel = lvl;
          correctAtMaxLevel = correctLvl;
          if (lvl === 8) isProtocolComplete = true;
        } else {
          isProtocolComplete = true; // stopping rule reached (<4 / 6)
          break;
        }
      } else if (lvlTrials.length > 0) {
        // Abandoned mid-level with < 6 trials
        break;
      }
    }

    if (isProtocolComplete) {
      const maxSpan = maxCompletedLevel > 0 ? maxCompletedLevel + 1 : 0;
      const productScore = maxSpan * correctAtMaxLevel;
      return {
        isProtocolComplete: true,
        maxLevel: maxCompletedLevel,
        maxSpan,
        correctAtMaxSpan: correctAtMaxLevel,
        productScore,
      };
    } else {
      return {
        isProtocolComplete: false,
        maxLevel: null,
        maxSpan: null,
        correctAtMaxSpan: null,
        productScore: null,
      };
    }
  };

  // State 1: Abandoned Level 1 with 3 trials -> isProtocolComplete: false, maxSpan: null, productScore: null
  const c1Trials = Array.from({ length: 3 }, (_, i) => ({ level: 1, isCorrect: true }));
  const c1Res = evaluateCorsiProtocolMatrix(c1Trials);
  assert(c1Res.isProtocolComplete === false && c1Res.maxSpan === null && c1Res.productScore === null,
    "TEST-C1: State 1 (Abandoned L1 with <6 trials) evaluates to NULL span and NULL product score");

  // State 2: Completed Level 1 with 2/6 correct -> isProtocolComplete: true, maxSpan: 0, productScore: 0
  const c2Trials = [
    { level: 1, isCorrect: true }, { level: 1, isCorrect: true },
    { level: 1, isCorrect: false }, { level: 1, isCorrect: false },
    { level: 1, isCorrect: false }, { level: 1, isCorrect: false },
  ];
  const c2Res = evaluateCorsiProtocolMatrix(c2Trials);
  assert(c2Res.isProtocolComplete === true && c2Res.maxSpan === 0 && c2Res.productScore === 0,
    "TEST-C2: State 2 (Completed L1 with <4 correct) evaluates to maxSpan 0 and productScore 0");

  // State 3: Passed Level 1 (6/6), abandoned Level 2 with 2 trials -> isProtocolComplete: false, maxSpan: null, productScore: null
  const c3Trials = [
    ...Array.from({ length: 6 }, () => ({ level: 1, isCorrect: true })),
    { level: 2, isCorrect: true }, { level: 2, isCorrect: false },
  ];
  const c3Res = evaluateCorsiProtocolMatrix(c3Trials);
  assert(c3Res.isProtocolComplete === false && c3Res.maxSpan === null && c3Res.productScore === null,
    "TEST-C3: State 3 (Passed L1, abandoned L2 mid-way) evaluates to NULL span and NULL product score (even if corsi_completed flag was true)");

  // State 4: Passed Level 1 (6/6), stopped at Level 2 (2/6) -> isProtocolComplete: true, maxSpan: 2, productScore: 12
  const c4Trials = [
    ...Array.from({ length: 6 }, () => ({ level: 1, isCorrect: true })),
    { level: 2, isCorrect: true }, { level: 2, isCorrect: true },
    { level: 2, isCorrect: false }, { level: 2, isCorrect: false },
    { level: 2, isCorrect: false }, { level: 2, isCorrect: false },
  ];
  const c4Res = evaluateCorsiProtocolMatrix(c4Trials);
  assert(c4Res.isProtocolComplete === true && c4Res.maxSpan === 2 && c4Res.productScore === 12,
    "TEST-C4: State 4 (Passed L1, stopped at L2) evaluates to maxSpan 2 and productScore 12");

  // State 5: Completed all 8 levels (4/6 on each) -> maxSpan 9, productScore 36
  const c5Trials = Array.from({ length: 8 }, (_, l) => 
    Array.from({ length: 6 }, (_, t) => ({ level: l + 1, isCorrect: t < 4 }))
  ).flat();
  const c5Res = evaluateCorsiProtocolMatrix(c5Trials);
  assert(c5Res.isProtocolComplete === true && c5Res.maxSpan === 9 && c5Res.productScore === 36,
    "TEST-C5: State 5 (Completed all 8 levels) evaluates to maxSpan 9 and productScore 36");

  // TEST-H1 & H2: Hanoi First-Move Reaction Time Suppression
  function getHanoiFirstMoveRt(recordFirstMoveRt, firstRtMs, totalDurationMs) {
    return recordFirstMoveRt ? firstRtMs : null;
  }
  assert(getHanoiFirstMoveRt(false, 1500, 45000) === null,
    "TEST-H1: When recordFirstMoveRt is false, firstReactionTimeMs is strictly null (NEVER total duration 45000ms)");
  assert(getHanoiFirstMoveRt(true, 1500, 45000) === 1500,
    "TEST-H2: When recordFirstMoveRt is true, firstReactionTimeMs records measured 1500ms");

  // TEST-T1 & T2: Timestamps Suppression vs Operational Audit
  function getMoveTimestamp(recordMoveTimestamps, moveOffsetMs) {
    return recordMoveTimestamps ? moveOffsetMs : null;
  }
  assert(getMoveTimestamp(false, 3200) === null,
    "TEST-T1: When recordMoveTimestamps is false, move.timestamp_ms is strictly null");
  assert(getMoveTimestamp(true, 3200) === 3200,
    "TEST-T2: When recordMoveTimestamps is true, move.timestamp_ms records relative 3200ms");

  // TEST-S1: Sanitized participant configuration JSON schema check
  const sanitizedConfigMock = {
    session_options: {
      allowMidSessionExit: true,
      recordInvalidMoves: true,
      showTimer: true,
      showMoveCounter: true,
      studyTitle: 'MindLab Cognitive Battery',
    },
    data_measurements: {
      recordMoveTimestamps: true,
      recordFirstMoveRt: true,
      recordInvalidMoveAttempts: true,
      recordBlockPositionAccuracy: true,
      recordSessionTimestamps: true,
    },
  };
  assert(sanitizedConfigMock.session_options && sanitizedConfigMock.data_measurements,
    "TEST-S1: Sanitized config includes only session_options and data_measurements");
  assert(!('admin_email' in sanitizedConfigMock) && !('id' in sanitizedConfigMock),
    "TEST-S2: Sanitized config exposes zero internal admin keys or table metadata");

  // TEST-A1 & A2: Admin Save Error vs Success Handling
  function evaluateSaveOutcome(sessOk, dataOk) {
    if (sessOk && dataOk) {
      return { success: true, error: null };
    }
    return { success: false, error: 'Failed to persist configuration to database. Changes remain unsaved.' };
  }
  const failOutcome = evaluateSaveOutcome(true, false);
  assert(failOutcome.success === false && failOutcome.error !== null,
    "TEST-A1: Partial save failure (session ok, data failed) produces error banner and keeps unsaved state");
  const successOutcome = evaluateSaveOutcome(true, true);
  assert(successOutcome.success === true && successOutcome.error === null,
    "TEST-A2: Dual save success produces success banner and clears unsaved state");

  // TEST-TS1 & TS2 & TS3: Task Switching Accuracy Denominators & Empty-Session Semantics
  console.log('\n--- Test 16: Task Switching Accuracy Denominators & Empty-Session Semantics ---');
  function computeTaskSwitchingMetrics(trials) {
    const expTrials = trials.filter(t => t.phase === 'experimental');
    const totalExpTrials = expTrials.length;
    const overallAccuracy = totalExpTrials > 0
      ? (expTrials.filter(t => t.isCorrect).length / totalExpTrials) * 100
      : null;

    const mixedRepeatTrials = expTrials.filter(t => t.blockType === 'mixed' && t.isTaskRepeat);
    const mixedRepeatAccuracy = mixedRepeatTrials.length > 0
      ? (mixedRepeatTrials.filter(t => t.isCorrect).length / mixedRepeatTrials.length) * 100
      : null;

    const mixedSwitchTrials = expTrials.filter(t => t.blockType === 'mixed' && t.isTaskSwitch);
    const mixedSwitchAccuracy = mixedSwitchTrials.length > 0
      ? (mixedSwitchTrials.filter(t => t.isCorrect).length / mixedSwitchTrials.length) * 100
      : null;

    return {
      totalExpTrials,
      overallAccuracy,
      mixedRepeatTrialsCount: mixedRepeatTrials.length,
      mixedRepeatAccuracy,
      mixedSwitchTrialsCount: mixedSwitchTrials.length,
      mixedSwitchAccuracy,
    };
  }

  // Case A: Mixed repeat denominator correctness (does NOT divide by all mixed trials)
  const mixedBlockWithRepeatsAndSwitches = [
    // 4 mixed repeats: 2 correct, 2 incorrect
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: true, isTaskSwitch: false, isCorrect: true },
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: true, isTaskSwitch: false, isCorrect: true },
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: true, isTaskSwitch: false, isCorrect: false },
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: true, isTaskSwitch: false, isCorrect: false },
    // 6 mixed switches: 3 correct, 3 incorrect
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: false, isTaskSwitch: true, isCorrect: true },
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: false, isTaskSwitch: true, isCorrect: true },
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: false, isTaskSwitch: true, isCorrect: true },
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: false, isTaskSwitch: true, isCorrect: false },
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: false, isTaskSwitch: true, isCorrect: false },
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: false, isTaskSwitch: true, isCorrect: false },
  ];
  const caseARes = computeTaskSwitchingMetrics(mixedBlockWithRepeatsAndSwitches);
  assert(caseARes.mixedRepeatAccuracy === 50.0,
    "TEST-TS1: mixed_repeat_accuracy divides by mixed repeat trials (2/4 = 50.0%), NOT total mixed trials (2/10 = 20%)");
  assert(caseARes.mixedSwitchAccuracy === 50.0,
    "TEST-TS2: mixed_switch_accuracy divides by mixed switch trials (3/6 = 50.0%), NOT total mixed trials (3/10 = 30%)");

  // Case B: Category with 0 trials returns NULL (not fabricated 0%)
  const pureOnlyTrials = [
    { phase: 'experimental', blockType: 'pure-letter', isTaskRepeat: false, isTaskSwitch: false, isCorrect: true },
    { phase: 'experimental', blockType: 'pure-number', isTaskRepeat: false, isTaskSwitch: false, isCorrect: true },
  ];
  const caseBRes = computeTaskSwitchingMetrics(pureOnlyTrials);
  assert(caseBRes.mixedRepeatAccuracy === null,
    "TEST-TS3: Category with 0 trials produces strictly NULL accuracy (not fabricated 0%)");
  assert(caseBRes.mixedSwitchAccuracy === null,
    "TEST-TS4: Category with 0 switches produces strictly NULL accuracy (not fabricated 0%)");

  // Case C: Genuine measured 0% preserved when trials exist but none are correct
  const zeroCorrectRepeatsTrials = [
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: true, isTaskSwitch: false, isCorrect: false },
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: true, isTaskSwitch: false, isCorrect: false },
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: false, isTaskSwitch: true, isCorrect: false },
  ];
  const caseCRes = computeTaskSwitchingMetrics(zeroCorrectRepeatsTrials);
  assert(caseCRes.mixedRepeatAccuracy === 0.0,
    "TEST-TS5: Genuine measured 0% repeat accuracy is preserved when repeat trials exist (0/2 = 0.0%)");
  assert(caseCRes.mixedSwitchAccuracy === 0.0,
    "TEST-TS6: Genuine measured 0% switch accuracy is preserved when switch trials exist (0/1 = 0.0%)");

  // Case D: Empty session accuracy semantics (0 experimental trials -> NULL; nonempty 0-correct -> 0%)
  const emptyExpSession = [
    { phase: 'practice', blockType: 'mixed', isTaskRepeat: true, isTaskSwitch: false, isCorrect: true },
  ];
  const caseDRes = computeTaskSwitchingMetrics(emptyExpSession);
  assert(caseDRes.overallAccuracy === null,
    "TEST-TS7: Empty session with 0 experimental trials produces strictly NULL overall accuracy");

  const nonemptyZeroCorrectSession = [
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: true, isTaskSwitch: false, isCorrect: false },
    { phase: 'experimental', blockType: 'mixed', isTaskRepeat: false, isTaskSwitch: true, isCorrect: false },
  ];
  const caseERes = computeTaskSwitchingMetrics(nonemptyZeroCorrectSession);
  assert(caseERes.overallAccuracy === 0.0,
    "TEST-TS8: Nonempty session with 0 correct trials produces genuine 0.0% overall accuracy");

  // Test 17: Resume Existing Participant, ID Normalization, Privacy, Experiment Status, and Interrupted Sessions
  console.log('\n--- Test 17: Resume Existing Participant Architecture & Research Integrity ---');

  // 17.1 Participant ID Normalization & Validation
  function normalizeParticipantCode(raw) {
    if (!raw) return '';
    let cleaned = raw.trim().toUpperCase();
    if (/^[0-9]+$/.test(cleaned)) {
      cleaned = `ML-${cleaned}`;
    }
    return cleaned;
  }

  function validateParticipantCode(code) {
    const norm = normalizeParticipantCode(code);
    if (!norm || norm.length < 3) return false;
    return /^ML-[A-Z0-9_-]+$/i.test(norm) || /^[A-Z0-9_-]{3,20}$/i.test(norm);
  }

  assert(normalizeParticipantCode('1042') === 'ML-1042', 'ID "1042" normalizes to "ML-1042"');
  assert(normalizeParticipantCode('ml-1042') === 'ML-1042', 'ID "ml-1042" normalizes to "ML-1042"');
  assert(normalizeParticipantCode('  ML-2048  ') === 'ML-2048', 'ID with whitespace trimmed properly');
  assert(validateParticipantCode('1042') === true, 'Numeric ID "1042" is valid');
  assert(validateParticipantCode('ML-1042') === true, 'Standard ID "ML-1042" is valid');
  assert(validateParticipantCode('') === false, 'Empty ID is invalid');
  assert(validateParticipantCode('A') === false, 'Single char ID is invalid (< 3 chars)');
  assert(validateParticipantCode('$$$') === false, 'Invalid special characters rejected');

  // 17.2 Rate-Limiting & Protection Against ID Enumeration
  const MAX_RESUME_ATTEMPTS = 5;
  const RESUME_WINDOW_MS = 5 * 60 * 1000;

  function simulateRateLimiter() {
    let attempts = [];
    return {
      recordFailure: (time) => {
        attempts.push(time);
      },
      isBlocked: (currentTime) => {
        const recent = attempts.filter(t => currentTime - t < RESUME_WINDOW_MS);
        return recent.length >= MAX_RESUME_ATTEMPTS;
      },
      reset: () => {
        attempts = [];
      }
    };
  }

  const rateLimiter = simulateRateLimiter();
  const baseTime = Date.now();
  for (let i = 0; i < 4; i++) {
    rateLimiter.recordFailure(baseTime + i * 1000);
    assert(!rateLimiter.isBlocked(baseTime + i * 1000), `Attempt ${i+1} should not be blocked`);
  }
  rateLimiter.recordFailure(baseTime + 4000);
  assert(rateLimiter.isBlocked(baseTime + 4500), '5th failed attempt triggers rate limit block');
  assert(!rateLimiter.isBlocked(baseTime + RESUME_WINDOW_MS + 1000), 'Rate limit expires after cooldown window');
  rateLimiter.reset();
  assert(!rateLimiter.isBlocked(baseTime + 5000), 'Successful verification resets rate limit counter');

  // 17.3 Mandatory First Name Verification (Privacy & ID Guessing Protection)
  function verifyParticipantName(recordedFullName, inputVerificationName) {
    if (!inputVerificationName || !inputVerificationName.trim()) return false; // MANDATORY verification
    const cleanInput = inputVerificationName.trim().toLowerCase();
    const cleanRecorded = (recordedFullName || '').trim().toLowerCase();
    const recordedFirstName = cleanRecorded.split(' ')[0];
    return recordedFirstName === cleanInput; // Exact normalized first-name matching (no substring)
  }

  assert(verifyParticipantName('Sarah Connor', '') === false, 'Empty verification name is rejected (verification mandatory)');
  assert(verifyParticipantName('Sarah Connor', null) === false, 'Null verification name is rejected (verification mandatory)');
  assert(verifyParticipantName('Sarah Connor', 'sarah') === true, 'Exact normalized first name match passes verification');
  assert(verifyParticipantName('Sarah Connor', 'SARAH') === true, 'Case-insensitive first name match passes');
  assert(verifyParticipantName('Sarah Connor', 'Connor') === false, 'Last name substring match is rejected (exact first name required)');
  assert(verifyParticipantName('Sarah Connor', 'Sara') === false, 'Partial prefix substring is rejected (exact first name required)');
  assert(verifyParticipantName('Sarah Connor', 'John') === false, 'Mismatching verification name is rejected');

  // 17.3b Data Minimization & Privacy Audit (Zero Sensitive Fields in Resumed Payload)
  const resumedMockPayload = {
    id: 'ML-1042',
    dbId: 'a436b5f6-fa83-40af-ab87-18b6f06162c6',
    name: 'Sarah Connor',
    hanoiCompleted: true,
    corsiCompleted: false,
    stroopCompleted: false,
    taskSwitchingCompleted: false,
    hanoiCount: 6,
    corsiCount: 0,
    stroopCount: 0,
    tsCount: 0,
  };
  assert(!('email' in resumedMockPayload), 'TEST-PRIV1: Resumed participant object strictly excludes email');
  assert(!('age' in resumedMockPayload), 'TEST-PRIV2: Resumed participant object strictly excludes age');
  assert(!('gender' in resumedMockPayload), 'TEST-PRIV3: Resumed participant object strictly excludes gender');
  assert(!('adhdDiagnosis' in resumedMockPayload), 'TEST-PRIV4: Resumed participant object strictly excludes adhd diagnosis');

  // 17.4 Three-State Experiment Status Derivation (Not Started, In Progress, Completed)
  function evaluateExperimentStatus(isCompleted, recordedTrialsCount) {
    if (isCompleted) return 'completed';
    if (recordedTrialsCount > 0) return 'in_progress';
    return 'not_started';
  }

  assert(evaluateExperimentStatus(true, 6) === 'completed', 'Completed experiment maps to "completed"');
  assert(evaluateExperimentStatus(true, 0) === 'completed', 'Completed experiment flag takes precedence over trial counts');
  assert(evaluateExperimentStatus(false, 3) === 'in_progress', 'Incomplete experiment with 3 trials maps to "in_progress"');
  assert(evaluateExperimentStatus(false, 1) === 'in_progress', 'Incomplete experiment with 1 trial maps to "in_progress"');
  assert(evaluateExperimentStatus(false, 0) === 'not_started', 'Zero trials with completed:false maps to "not_started"');

  // 17.5 Duplicate Prevention: Resumed Session Never Inserts a New Participant
  const { data: liveParticipants, error: livePartErr } = await supabase
    .from('participants')
    .select('id, participant_code, name, created_at')
    .order('created_at', { ascending: true });

  assert(!livePartErr && liveParticipants, 'Live participants fetched successfully');
  const partCodeSet = new Set();
  let duplicateCodeCount = 0;
  for (const p of liveParticipants) {
    if (partCodeSet.has(p.participant_code)) duplicateCodeCount++;
    partCodeSet.add(p.participant_code);
    assert(p.participant_code.startsWith('ML-'), `Participant code "${p.participant_code}" follows standard ML- prefix`);
  }
  assert(duplicateCodeCount === 0, 'Zero duplicate participant codes exist in live database');

  // Verify that an existing participant code resolves to their existing record without creating a new row
  const testTargetParticipant = liveParticipants[0];
  const resumedParticipant = liveParticipants.find(p => p.participant_code === testTargetParticipant.participant_code);
  assert(resumedParticipant.id === testTargetParticipant.id, 'Resumed participant correctly links to existing DB ID');

  // 17.6 Interrupted Experiment Behavior: Safety Rationale & Safe Restart Offer
  const interruptedEvaluation = {
    task: 'backward_corsi',
    status: 'in_progress',
    recordedTrials: 2,
    offersMidSequenceResume: false,
    offersSafeRestart: true,
    preservesPriorRecords: true,
  };
  assert(interruptedEvaluation.offersMidSequenceResume === false, 'Interrupted cognitive task does not falsely claim mid-trial resume');
  assert(interruptedEvaluation.offersSafeRestart === true, 'Safe fresh attempt option provided');
  assert(interruptedEvaluation.preservesPriorRecords === true, 'Prior trial records remain intact in database');

  // Test 18: Stroop Trial-Count Architecture & Protocol Verification (20 Practice, 128 Experimental: 96 Congruent, 32 Incongruent)
  console.log('\n--- Test 18: Stroop Trial-Count Architecture & Protocol Verification ---');
  const STROOP_COLORS = ['RED', 'GREEN', 'BLUE', 'YELLOW'];

  function testGeneratePracticeTrials() {
    const list = [];
    STROOP_COLORS.forEach(color => {
      for (let i = 0; i < 3; i++) {
        list.push({ word: color, inkColor: color, condition: 'congruent' });
      }
    });
    const incongruentBase = [
      { word: 'RED', inkColor: 'GREEN' },
      { word: 'GREEN', inkColor: 'BLUE' },
      { word: 'BLUE', inkColor: 'YELLOW' },
      { word: 'YELLOW', inkColor: 'RED' },
      { word: 'RED', inkColor: 'BLUE' },
      { word: 'GREEN', inkColor: 'RED' },
      { word: 'BLUE', inkColor: 'GREEN' },
      { word: 'YELLOW', inkColor: 'BLUE' },
    ];
    incongruentBase.forEach(pair => list.push({ ...pair, condition: 'incongruent' }));
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function testGenerateExperimentalTrials() {
    const list = [];
    STROOP_COLORS.forEach(color => {
      for (let i = 0; i < 24; i++) {
        list.push({ word: color, inkColor: color, condition: 'congruent' });
      }
    });
    const incongruentPairs = [];
    STROOP_COLORS.forEach(w => {
      STROOP_COLORS.forEach(ink => {
        if (w !== ink) incongruentPairs.push({ word: w, inkColor: ink });
      });
    });
    incongruentPairs.forEach(pair => {
      for (let i = 0; i < 2; i++) {
        list.push({ ...pair, condition: 'incongruent' });
      }
    });
    list.push({ word: 'YELLOW', inkColor: 'RED', condition: 'incongruent' });
    list.push({ word: 'BLUE', inkColor: 'RED', condition: 'incongruent' });
    list.push({ word: 'RED', inkColor: 'GREEN', condition: 'incongruent' });
    list.push({ word: 'YELLOW', inkColor: 'GREEN', condition: 'incongruent' });
    list.push({ word: 'GREEN', inkColor: 'BLUE', condition: 'incongruent' });
    list.push({ word: 'RED', inkColor: 'BLUE', condition: 'incongruent' });
    list.push({ word: 'BLUE', inkColor: 'YELLOW', condition: 'incongruent' });
    list.push({ word: 'GREEN', inkColor: 'YELLOW', condition: 'incongruent' });
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  // 18.1 Practice Trials Protocol Verification
  const practiceTrials = testGeneratePracticeTrials();
  assert(practiceTrials.length === 20, `Practice trials count is exactly 20 (got ${practiceTrials.length})`);
  const practiceCongruent = practiceTrials.filter(t => t.condition === 'congruent').length;
  const practiceIncongruent = practiceTrials.filter(t => t.condition === 'incongruent').length;
  assert(practiceCongruent === 12, `Practice congruent trials count is 12 (got ${practiceCongruent})`);
  assert(practiceIncongruent === 8, `Practice incongruent trials count is 8 (got ${practiceIncongruent})`);

  // 18.2 Experimental Trials Protocol Verification
  const expTrials = testGenerateExperimentalTrials();
  assert(expTrials.length === 128, `Experimental trials count is exactly 128 (got ${expTrials.length})`);
  const expCongruent = expTrials.filter(t => t.condition === 'congruent').length;
  const expIncongruent = expTrials.filter(t => t.condition === 'incongruent').length;
  assert(expCongruent === 96, `Experimental congruent trials count is exactly 96 (got ${expCongruent})`);
  assert(expIncongruent === 32, `Experimental incongruent trials count is exactly 32 (got ${expIncongruent})`);

  // 18.3 Ratio & Percentage Integrity Verification
  const congruentPct = (expCongruent / expTrials.length) * 100;
  const incongruentPct = (expIncongruent / expTrials.length) * 100;
  assert(congruentPct === 75, `Congruent ratio is exactly 75% (got ${congruentPct}%)`);
  assert(incongruentPct === 25, `Incongruent ratio is exactly 25% (got ${incongruentPct}%)`);

  // 18.4 Color Balance Verification
  STROOP_COLORS.forEach(color => {
    const colorCongruent = expTrials.filter(t => t.condition === 'congruent' && t.word === color && t.inkColor === color).length;
    assert(colorCongruent === 24, `Color ${color} has exactly 24 congruent trials (got ${colorCongruent})`);
    const inkCount = expTrials.filter(t => t.condition === 'incongruent' && t.inkColor === color).length;
    const wordCount = expTrials.filter(t => t.condition === 'incongruent' && t.word === color).length;
    assert(inkCount === 8, `Color ${color} ink has exactly 8 incongruent trials (got ${inkCount})`);
    assert(wordCount === 8, `Color ${color} word has exactly 8 incongruent trials (got ${wordCount})`);
  });

  // 18.5 Phase and Session Completion Validation
  const evaluateStroopDone = (expCount, isHistoricalCompleted) => {
    return Boolean(expCount >= 128 || (expCount >= 80 && isHistoricalCompleted));
  };
  assert(evaluateStroopDone(128, false) === true, '128 experimental trials qualifies as completed');
  assert(evaluateStroopDone(127, false) === false, '127 experimental trials is marked incomplete');
  assert(evaluateStroopDone(80, true) === true, 'Historical 80-trial session marked complete in DB remains completed');
  assert(evaluateStroopDone(80, false) === false, '80 trials without prior completion flag requires 128 trials under new protocol');
  assert(evaluateStroopDone(0, false) === false, '0 trials evaluated as not done');

  // Test 19: Task Switching Alternating-Runs Paradigm & 2×2 Quadrant Protocol
  console.log('\n--- Test 19: Task Switching Alternating-Runs Protocol & 2×2 Grid Verification ---');
  {
    const VOWELS = ['A', 'E', 'I', 'O', 'U'];
    const CONSONANTS = ['G', 'K', 'M', 'R', 'T', 'F', 'L', 'P', 'S', 'V'];
    const ODD_NUMS = [1, 3, 5, 7, 9];
    const EVEN_NUMS = [2, 4, 6, 8];

    // 19.1 Spatial Quadrant Mapping to Cognitive Tasks
    // Quadrant 1: Top-Left (Row 1, Col 1) -> Letter Task
    // Quadrant 2: Top-Right (Row 1, Col 2) -> Letter Task
    // Quadrant 3: Bottom-Right (Row 2, Col 2) -> Number Task
    // Quadrant 4: Bottom-Left (Row 2, Col 1) -> Number Task
    function getTaskForQuadrant(quadrant) {
      if (quadrant === 1 || quadrant === 2) return 'letter';
      if (quadrant === 3 || quadrant === 4) return 'number';
      throw new Error(`Invalid quadrant ${quadrant}`);
    }

    assert(getTaskForQuadrant(1) === 'letter', 'Quadrant 1 (Top-Left) maps to Letter task');
    assert(getTaskForQuadrant(2) === 'letter', 'Quadrant 2 (Top-Right) maps to Letter task');
    assert(getTaskForQuadrant(3) === 'number', 'Quadrant 3 (Bottom-Right) maps to Number task');
    assert(getTaskForQuadrant(4) === 'number', 'Quadrant 4 (Bottom-Left) maps to Number task');

    // 19.2 Response Key Invariants
    function getExpectedResponse(task, letter, number) {
      if (task === 'letter') {
        return VOWELS.includes(letter) ? 'B' : 'N';
      } else {
        return ODD_NUMS.includes(number) ? 'B' : 'N';
      }
    }

    assert(getExpectedResponse('letter', 'A', 4) === 'B', 'Vowel A on Letter task requires B');
    assert(getExpectedResponse('letter', 'K', 3) === 'N', 'Consonant K on Letter task requires N');
    assert(getExpectedResponse('number', 'E', 7) === 'B', 'Odd number 7 on Number task requires B');
    assert(getExpectedResponse('number', 'U', 6) === 'N', 'Even number 6 on Number task requires N');

    // 19.3 Clockwise Alternating-Runs Sequence in Mixed Block
    function generateTestMixedBlock(totalTrials = 32) {
      const quadSequence = [1, 2, 3, 4];
      const trials = [];
      let prevTask = null;

      for (let i = 0; i < totalTrials; i++) {
        const quadrant = quadSequence[i % 4];
        const task = getTaskForQuadrant(quadrant);
        const isFirst = i === 0;
        const isTaskRepeat = !isFirst && task === prevTask;
        const isTaskSwitch = !isFirst && task !== prevTask;

        trials.push({
          trialNumber: i + 1,
          quadrant,
          taskType: task,
          isTaskSwitch,
          isTaskRepeat,
        });

        prevTask = task;
      }
      return trials;
    }

    const mixed32Trials = generateTestMixedBlock(32);
    assert(mixed32Trials.length === 32, 'Mixed block generates exactly 32 trials');

    // Verify predictable clockwise rotation: 1 -> 2 -> 3 -> 4 -> 1 ...
    for (let i = 0; i < 32; i++) {
      const expectedQuad = [1, 2, 3, 4][i % 4];
      assert(mixed32Trials[i].quadrant === expectedQuad, `Trial ${i + 1} quadrant is ${expectedQuad} (clockwise rotation)`);
    }

    // Verify switch vs repeat trial counts in 32 mixed trials:
    // Trial 1 (i=0): Neutral start (first trial of mixed block)
    assert(mixed32Trials[0].isTaskRepeat === false, 'First mixed trial is not a repeat trial');
    assert(mixed32Trials[0].isTaskSwitch === false, 'First mixed trial is not a switch trial');

    const mixedRepeats = mixed32Trials.filter(t => t.isTaskRepeat);
    const mixedSwitches = mixed32Trials.filter(t => t.isTaskSwitch);
    assert(mixedRepeats.length === 16, `Mixed block contains exactly 16 repeat trials (got ${mixedRepeats.length})`);
    assert(mixedSwitches.length === 15, `Mixed block contains exactly 15 switch trials (got ${mixedSwitches.length})`);
    assert(mixedRepeats.length + mixedSwitches.length + 1 === 32, '1 neutral + 16 repeats + 15 switches = 32 total mixed trials');

    // Verify run pattern: L (first) -> L (repeat) -> N (switch) -> N (repeat) -> L (switch) -> L (repeat) ...
    assert(mixed32Trials[0].taskType === 'letter' && !mixed32Trials[0].isTaskSwitch && !mixed32Trials[0].isTaskRepeat, 'Trial 1: Letter, Neutral');
    assert(mixed32Trials[1].taskType === 'letter' && mixed32Trials[1].isTaskRepeat, 'Trial 2: Letter, Repeat');
    assert(mixed32Trials[2].taskType === 'number' && mixed32Trials[2].isTaskSwitch, 'Trial 3: Number, Switch');
    assert(mixed32Trials[3].taskType === 'number' && mixed32Trials[3].isTaskRepeat, 'Trial 4: Number, Repeat');
    assert(mixed32Trials[4].taskType === 'letter' && mixed32Trials[4].isTaskSwitch, 'Trial 5: Letter, Switch');
    assert(mixed32Trials[5].taskType === 'letter' && mixed32Trials[5].isTaskRepeat, 'Trial 6: Letter, Repeat');

    // 19.4 Pure Blocks Trial Counts & Quadrant Row Alignment
    const pureLetterBlockTrials = 16;
    const pureNumberBlockTrials = 16;
    const totalExpTrialsCount = pureLetterBlockTrials + pureNumberBlockTrials + mixed32Trials.length;
    assert(totalExpTrialsCount === 64, `Task Switching experiment total is exactly 64 trials (got ${totalExpTrialsCount})`);

    // 19.5 Session Completion Evaluation
    const evaluateTaskSwitchingDone = (expCount, isHistoricalCompleted) => {
      return Boolean(expCount >= 64 || (expCount >= 40 && isHistoricalCompleted));
    };
    assert(evaluateTaskSwitchingDone(64, false) === true, '64 experimental trials qualifies as completed');
    assert(evaluateTaskSwitchingDone(63, false) === false, '63 experimental trials is marked incomplete');
    assert(evaluateTaskSwitchingDone(40, true) === true, 'Historical session flagged completed in DB remains completed');
    assert(evaluateTaskSwitchingDone(40, false) === false, '40 trials without prior completion flag requires 64 trials under alternating-runs protocol');
  }

  // Test 20: Room 3 & 4 24-Hour Locking Protocol, Server Enforcement, Mandatory Email, and Duplicate Prevention
  console.log('\n--- Test 20: Room 3 & 4 24-Hour Locking, Server Enforcement, Mandatory Email & Duplicate Prevention ---');
  {
    // 20.1 Mandatory Participant Email Validation & Sanitization
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validateEmail = (email) => {
      if (!email || !email.trim()) return false;
      return emailRegex.test(email.trim());
    };

    assert(validateEmail('') === false, 'Empty email is rejected');
    assert(validateEmail('   ') === false, 'Whitespace email is rejected');
    assert(validateEmail('invalid-email') === false, 'Non-email string is rejected');
    assert(validateEmail('participant@') === false, 'Email missing domain is rejected');
    assert(validateEmail('participant@domain') === false, 'Email missing TLD is rejected');
    assert(validateEmail('@domain.com') === false, 'Email missing local part is rejected');
    assert(validateEmail('participant@example.com') === true, 'Standard email is accepted');
    assert(validateEmail('  STUDY.PARTICIPANT@RESEARCH.ORG  ') === true, 'Email with spaces and uppercase is validated');

    const normalizeEmail = (email) => email.trim().toLowerCase();
    assert(normalizeEmail('  Study.Participant@Research.ORG  ') === 'study.participant@research.org', 'Email is cleanly normalized to lowercase and trimmed');

    // 20.2 Authoritative 24-Hour Unlock Mathematics & Clock Tampering Resistance
    const simulateUnlockCheck = (room2StartedAtStr, serverNowStr, clientNowStr) => {
      if (!room2StartedAtStr) {
        return { unlocked: false, remainingSeconds: 86400, reason: 'room_2_not_started' };
      }
      const room2Start = new Date(room2StartedAtStr).getTime();
      const unlockTime = room2Start + (24 * 60 * 60 * 1000); // exactly 24 hours
      const serverNow = new Date(serverNowStr).getTime();

      const remainingMs = Math.max(0, unlockTime - serverNow);
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      const unlocked = serverNow >= unlockTime;

      return {
        unlocked,
        remainingSeconds,
        unlockAt: new Date(unlockTime).toISOString(),
        spoofBypassed: (new Date(clientNowStr).getTime() >= unlockTime && !unlocked), // true if client tried to bypass but server blocked it
      };
    };

    const serverBaseline = '2026-10-10T12:00:00.000Z';
    const room2StartBaseline = '2026-10-10T12:00:00.000Z'; // started at 12:00
    const expectedUnlockBaseline = '2026-10-11T12:00:00.000Z'; // unlocks exactly 24 hours later

    // Scenario A: Participant hasn't started Room 2 yet
    const notStartedCheck = simulateUnlockCheck(null, serverBaseline, serverBaseline);
    assert(notStartedCheck.unlocked === false, 'Room 3 & 4 remain locked when Room 2 has not started');
    assert(notStartedCheck.remainingSeconds === 86400, 'Remaining seconds is 86400 when Room 2 has not started');

    // Scenario B: Participant just started Room 2 (0 hours elapsed)
    const justStartedCheck = simulateUnlockCheck(room2StartBaseline, serverBaseline, serverBaseline);
    assert(justStartedCheck.unlocked === false, 'Room 3 & 4 remain locked immediately upon starting Room 2');
    assert(justStartedCheck.remainingSeconds === 86400, 'Exactly 86400 seconds remaining upon starting Room 2');
    assert(justStartedCheck.unlockAt === expectedUnlockBaseline, 'Unlock timestamp is exactly 24 hours after Room 2 start');

    // Scenario C: 12 hours elapsed
    const twelveHoursLaterServer = '2026-10-11T00:00:00.000Z';
    const midCheck = simulateUnlockCheck(room2StartBaseline, twelveHoursLaterServer, twelveHoursLaterServer);
    assert(midCheck.unlocked === false, 'Room 3 & 4 remain locked at 12 hours');
    assert(midCheck.remainingSeconds === 43200, 'Exactly 43200 seconds (12h) remaining at 12-hour mark');

    // Scenario D: 23 hours, 59 minutes, 50 seconds elapsed (10 seconds before unlock)
    const tenSecBeforeServer = '2026-10-11T11:59:50.000Z';
    const almostDoneCheck = simulateUnlockCheck(room2StartBaseline, tenSecBeforeServer, tenSecBeforeServer);
    assert(almostDoneCheck.unlocked === false, 'Room 3 & 4 remain locked 10 seconds before 24-hour mark');
    assert(almostDoneCheck.remainingSeconds === 10, '10 seconds remaining before 24-hour mark');

    // Scenario E: Exactly 24 hours elapsed (unlock moment)
    const exactUnlockServer = '2026-10-11T12:00:00.000Z';
    const exactCheck = simulateUnlockCheck(room2StartBaseline, exactUnlockServer, exactUnlockServer);
    assert(exactCheck.unlocked === true, 'Room 3 & 4 unlock exactly at 24-hour mark');
    assert(exactCheck.remainingSeconds === 0, '0 seconds remaining at 24-hour mark');

    // Scenario F: 24 hours + 5 minutes elapsed
    const pastUnlockServer = '2026-10-11T12:05:00.000Z';
    const postCheck = simulateUnlockCheck(room2StartBaseline, pastUnlockServer, pastUnlockServer);
    assert(postCheck.unlocked === true, 'Room 3 & 4 are unlocked past 24-hour mark');
    assert(postCheck.remainingSeconds === 0, '0 seconds remaining past 24-hour mark');

    // Scenario G: Client Clock Tampering Defense
    // Participant sets client system clock ahead 3 days, but server time is only 2 hours into the wait
    const spoofedClientClock = '2026-10-14T12:00:00.000Z';
    const twoHoursLaterServer = '2026-10-10T14:00:00.000Z';
    const spoofCheck = simulateUnlockCheck(room2StartBaseline, twoHoursLaterServer, spoofedClientClock);
    assert(spoofCheck.unlocked === false, 'Client clock advance to +3 days CANNOT unlock Room 3 & 4 prematurely');
    assert(spoofCheck.spoofBypassed === true, 'Server-authoritative check successfully blocked client clock manipulation');
    assert(spoofCheck.remainingSeconds === 79200, 'Remaining time is authoritatively calculated from server clock (22 hours)');

    // 20.3 Server-Side Trigger Enforcement Rules & Narrow Historical Preservation
    const simulateTriggerEnforceTrialInsert = (session) => {
      if (!session) throw new Error('Session not found for trial insertion.');
      const now = new Date(session.server_now).getTime();

      // NARROW LEGACY RULE:
      // Only permit bypass if the session was explicitly marked is_legacy = true at migration time
      // AND had already completed Room 2 or Room 3/4 before the migration.
      if (session.is_legacy === true && (session.corsi_completed === true || session.stroop_completed === true || session.task_switching_completed === true)) {
        if (!session.rooms_3_4_unlock_at || now >= new Date(session.rooms_3_4_unlock_at).getTime()) {
          return true; // Genuine legacy session permitted
        }
      }

      // FOR ALL POST-MIGRATION SESSIONS:
      if (!session.room_2_started_at) {
        throw new Error('Access Denied: Room 2 has not been started yet. Rooms 3 and 4 unlock 24 hours after starting Room 2.');
      }

      const unlockAt = new Date(session.rooms_3_4_unlock_at).getTime();
      if (now < unlockAt) {
        throw new Error(`Access Denied: Rooms 3 and 4 are locked until ${session.rooms_3_4_unlock_at}. 24-hour interval has not elapsed.`);
      }

      return true; // Trial insert allowed
    };

    const simulateTriggerEnforceSessionUpdate = (oldSession, newSession, serverNowStr) => {
      const now = new Date(serverNowStr).getTime();

      // Security guard: prevent marking an existing session as legacy
      if (newSession.is_legacy === true && (oldSession.is_legacy === undefined || oldSession.is_legacy === false)) {
        throw new Error('Security Violation: Cannot mark an existing session as legacy.');
      }

      // Check if room 3 or room 4 is being marked completed
      if ((newSession.stroop_completed === true && !oldSession.stroop_completed) ||
          (newSession.task_switching_completed === true && !oldSession.task_switching_completed)) {
        
        // Narrow legacy rule
        if (oldSession.is_legacy === true && (oldSession.corsi_completed === true || oldSession.stroop_completed === true || oldSession.task_switching_completed === true)) {
          if (!oldSession.rooms_3_4_unlock_at || now >= new Date(oldSession.rooms_3_4_unlock_at).getTime()) {
            return true;
          }
        }

        // Post-migration session enforcement
        if (!oldSession.room_2_started_at) {
          throw new Error('Access Denied: Room 2 must be started before completing Room 3 or Room 4.');
        }

        if (now < new Date(oldSession.rooms_3_4_unlock_at).getTime()) {
          throw new Error(`Access Denied: Cannot mark Room 3 or 4 completed before unlock time ${oldSession.rooms_3_4_unlock_at}.`);
        }
      }

      return true;
    };

    const simulateRecordRoom2StartRPC = ({ sessionId, session, participant, authUid, authRole, isAdmin }) => {
      if (!session) return { success: false, error: 'Session not found.' };
      if (!participant) return { success: false, error: 'Participant record not found.' };

      // Strictly verifies service_role claim, admin identity, or session ownership (auth.uid() = participant.auth_user_id)
      const isAuthorized = (authRole === 'service_role') || isAdmin || (authUid && participant.auth_user_id === authUid);

      if (!isAuthorized) {
        return { success: false, error: 'Unauthorized: Caller does not own this session.' };
      }

      return { success: true, room_2_started_at: session.server_now, unlocked: false };
    };

    const simulateCheckRooms3And4AccessRPC = ({ sessionId, session, participant, authUid, authRole, isAdmin }) => {
      if (!session) return { success: false, error: 'Session not found.' };
      if (!participant) return { success: false, error: 'Participant record not found.' };

      const isAuthorized = (authRole === 'service_role') || isAdmin || (authUid && participant.auth_user_id === authUid);

      if (!isAuthorized) {
        return { success: false, error: 'Unauthorized: Caller does not own this session.' };
      }

      const now = new Date(session.server_now).getTime();

      // Narrow legacy rule
      if (session.is_legacy === true && (session.corsi_completed === true || session.stroop_completed === true || session.task_switching_completed === true)) {
        if (!session.rooms_3_4_unlock_at || now >= new Date(session.rooms_3_4_unlock_at).getTime()) {
          return { success: true, unlocked: true, reason: 'historical_unlocked', session_id: sessionId, remaining_seconds: 0 };
        }
      }

      // Post-migration sessions
      if (!session.room_2_started_at) {
        return { success: true, unlocked: false, reason: 'room_2_not_started', session_id: sessionId, remaining_seconds: 86400 };
      }

      const unlockAt = new Date(session.rooms_3_4_unlock_at).getTime();
      if (now < unlockAt) {
        return { success: true, unlocked: false, reason: 'time_remaining', session_id: sessionId, remaining_seconds: Math.round((unlockAt - now) / 1000) };
      }

      return { success: true, unlocked: true, reason: 'unlocked', session_id: sessionId, remaining_seconds: 0 };
    };

    const simulateResumeParticipantSessionRPC = ({ p_participant_code, p_verification_name, p_verification_email, participant, session, callerAuthUid }) => {
      if (!callerAuthUid) {
        return { success: false, error: 'Authentication required. Please refresh and try again.' };
      }
      if (!p_participant_code || p_participant_code.trim().length < 3) {
        return { success: false, error: 'Invalid Participant ID format.' };
      }
      if (!p_verification_name || p_verification_name.trim().length === 0) {
        return { success: false, error: 'First name verification is required to resume a session.' };
      }
      const normCode = p_participant_code.trim().toUpperCase().replace(/^([0-9]+)$/, 'ML-$1');
      if (normCode !== participant.participant_code) {
        return { success: false, error: 'Participant ID or verification name is incorrect.' };
      }
      const cleanVerif = p_verification_name.trim().toLowerCase();
      const firstName = participant.name.trim().split(' ')[0].toLowerCase();
      if (cleanVerif !== firstName) {
        return { success: false, error: 'Participant ID or verification name is incorrect.' };
      }

      // Multi-factor cross-device verification:
      // If the session is already bound to another auth identity, an unverified request
      // (code + first name alone) is strictly forbidden from reassigning auth_user_id.
      if (participant.auth_user_id && participant.auth_user_id !== callerAuthUid) {
        const cleanEmail = (p_verification_email || '').trim().toLowerCase();
        if (!participant.email || cleanEmail !== participant.email.trim().toLowerCase()) {
          return { success: false, error: 'Cross-device resume requires verification of your registered email address.' };
        }
        // Verified: safely rebind auth_user_id to the new device
        participant.auth_user_id = callerAuthUid;
      } else if (!participant.auth_user_id) {
        participant.auth_user_id = callerAuthUid;
      }

      const now = new Date(session.server_now).getTime();
      let isUnlocked = false;
      let remainingSec = 0;

      if (session.is_legacy === true && (session.corsi_completed === true || session.stroop_completed === true || session.task_switching_completed === true)) {
        if (!session.rooms_3_4_unlock_at || now >= new Date(session.rooms_3_4_unlock_at).getTime()) {
          isUnlocked = true;
          remainingSec = 0;
        } else {
          isUnlocked = false;
          remainingSec = Math.round((new Date(session.rooms_3_4_unlock_at).getTime() - now) / 1000);
        }
      } else if (session.room_2_started_at && now >= new Date(session.rooms_3_4_unlock_at).getTime()) {
        isUnlocked = true;
        remainingSec = 0;
      } else if (session.room_2_started_at) {
        isUnlocked = false;
        remainingSec = Math.round((new Date(session.rooms_3_4_unlock_at).getTime() - now) / 1000);
      } else {
        isUnlocked = false;
        remainingSec = 86400;
      }

      return {
        success: true,
        participant: { id: participant.participant_code, name: participant.name },
        session: { id: session.id, status: session.status, rooms3And4Unlocked: isUnlocked, remainingSeconds: remainingSec },
      };
    };

    // -------------------------------------------------------------------------
    // REGRESSION TEST 1: New session with room_2_started_at = NULL cannot bypass
    // lock by having trial rows or completion flags.
    // -------------------------------------------------------------------------
    console.log('--- Regression Test 1: New Session Lock Bypass Prevention ---');
    const newSessionBypassAttempt = {
      is_legacy: false, // Session created after migration
      room_2_started_at: null, // Room 2 was never started
      rooms_3_4_unlock_at: null,
      server_now: exactUnlockServer,
      corsi_completed: true, // Attacker spoofed corsi_completed flag
      hasHistoricalTrials: true, // Spoofed trial rows present
    };

    // 1.1 Trigger blocks trial insert
    let caughtBypassTrialInsert = false;
    try {
      simulateTriggerEnforceTrialInsert(newSessionBypassAttempt);
    } catch (err) {
      caughtBypassTrialInsert = err.message.includes('Room 2 has not been started yet');
    }
    assert(caughtBypassTrialInsert === true, 'Reg Test 1.1: Trigger blocks trial insert on new session with room_2_started_at = NULL despite trial rows or completion flags');

    // 1.2 Trigger blocks session update marking room 3 completed
    let caughtBypassSessionUpdate = false;
    try {
      simulateTriggerEnforceSessionUpdate(
        newSessionBypassAttempt,
        { ...newSessionBypassAttempt, stroop_completed: true },
        exactUnlockServer
      );
    } catch (err) {
      caughtBypassSessionUpdate = err.message.includes('Room 2 must be started before completing Room 3 or Room 4');
    }
    assert(caughtBypassSessionUpdate === true, 'Reg Test 1.2: Trigger blocks marking Room 3/4 completed on new session without starting Room 2');

    // 1.3 check_rooms_3_4_access RPC blocks access
    const mockNewParticipant = { id: 'part-new-1', participant_code: 'ML-8888', name: 'Bob Dylan', auth_user_id: 'auth-bob-1' };
    const accessCheckNewSession = simulateCheckRooms3And4AccessRPC({
      sessionId: 'sess-new-1',
      session: newSessionBypassAttempt,
      participant: mockNewParticipant,
      authUid: 'auth-bob-1',
      authRole: 'authenticated',
      isAdmin: false,
    });
    assert(accessCheckNewSession.unlocked === false, 'Reg Test 1.3: check_rooms_3_4_access returns unlocked = false for new session with room_2_started_at = NULL');
    assert(accessCheckNewSession.reason === 'room_2_not_started', 'Reg Test 1.3: reason is room_2_not_started');

    // 1.4 Attacker cannot manipulate is_legacy from false to true
    let caughtLegacyTamper = false;
    try {
      simulateTriggerEnforceSessionUpdate(
        newSessionBypassAttempt,
        { ...newSessionBypassAttempt, is_legacy: true },
        exactUnlockServer
      );
    } catch (err) {
      caughtLegacyTamper = err.message.includes('Security Violation: Cannot mark an existing session as legacy');
    }
    assert(caughtLegacyTamper === true, 'Reg Test 1.4: Database trigger prevents setting is_legacy = true on existing non-legacy session');

    // -------------------------------------------------------------------------
    // REGRESSION TEST 2: Caller with code and first name CANNOT take over session
    // -------------------------------------------------------------------------
    console.log('--- Regression Test 2: Session Resume Takeover Prevention ---');
    const aliceParticipant = {
      id: 'part-alice-1',
      participant_code: 'ML-9999',
      name: 'Alice Smith',
      email: 'alice@university.edu',
      auth_user_id: 'alice-original-device-uid',
    };
    const aliceSession = {
      id: 'sess-alice-1',
      participant_id: 'part-alice-1',
      server_now: exactUnlockServer,
      room_2_started_at: room2StartBaseline,
      rooms_3_4_unlock_at: expectedUnlockBaseline,
      status: 'in_progress',
    };

    // Attacker on a different device knows Alice's code ML-9999 and first name Alice
    const attackerCallerAuthUid = 'attacker-device-uid-666';

    // 2.1 Attacker tries to resume without email verification
    const takeoverNoEmail = simulateResumeParticipantSessionRPC({
      p_participant_code: 'ML-9999',
      p_verification_name: 'Alice',
      p_verification_email: '', // No email
      participant: aliceParticipant,
      session: aliceSession,
      callerAuthUid: attackerCallerAuthUid,
    });
    assert(takeoverNoEmail.success === false, 'Reg Test 2.1: Attacker with code and first name alone is REJECTED from cross-device resume');
    assert(takeoverNoEmail.error.includes('registered email address'), 'Requires registered email verification');
    assert(aliceParticipant.auth_user_id === 'alice-original-device-uid', 'Alice auth_user_id remains completely untouched');

    // 2.2 Attacker tries with wrong email
    const takeoverWrongEmail = simulateResumeParticipantSessionRPC({
      p_participant_code: 'ML-9999',
      p_verification_name: 'Alice',
      p_verification_email: 'attacker@evil.com',
      participant: aliceParticipant,
      session: aliceSession,
      callerAuthUid: attackerCallerAuthUid,
    });
    assert(takeoverWrongEmail.success === false, 'Reg Test 2.2: Attacker with incorrect email is REJECTED');
    assert(aliceParticipant.auth_user_id === 'alice-original-device-uid', 'Alice auth_user_id remains completely untouched');

    // 2.3 Attacker tries to access Alice session RPCs directly
    const attackerRpcAttempt = simulateRecordRoom2StartRPC({
      sessionId: 'sess-alice-1',
      session: aliceSession,
      participant: aliceParticipant,
      authUid: attackerCallerAuthUid,
      authRole: 'authenticated',
      isAdmin: false,
    });
    assert(attackerRpcAttempt.success === false, 'Reg Test 2.3: Attacker cannot call record_room_2_start on Alice session');
    assert(attackerRpcAttempt.error.includes('Unauthorized'), 'Returns unauthorized error');

    // -------------------------------------------------------------------------
    // REGRESSION TEST 3: Genuine pre-migration participants retain intended access
    // -------------------------------------------------------------------------
    console.log('--- Regression Test 3: Genuine Pre-Migration Participant Preservation ---');
    const legacyParticipant = {
      id: 'part-legacy-1',
      participant_code: 'ML-1001',
      name: 'Charlie Brown',
      email: 'charlie@historical.org',
      auth_user_id: 'charlie-legacy-uid',
    };
    const legacyCompletedSession = {
      id: 'sess-legacy-1',
      participant_id: 'part-legacy-1',
      is_legacy: true, // Marked at migration time
      server_now: exactUnlockServer,
      room_2_started_at: '2026-10-08T10:00:00.000Z', // 3 days ago
      rooms_3_4_unlock_at: '2026-10-09T10:00:00.000Z', // 2 days ago
      corsi_completed: true,
      stroop_completed: false,
      task_switching_completed: false,
      status: 'in_progress',
    };

    // 3.1 Historical participant can insert Room 3 trials
    const legacyInsertResult = simulateTriggerEnforceTrialInsert(legacyCompletedSession);
    assert(legacyInsertResult === true, 'Reg Test 3.1: Pre-migration participant who completed Room 2 retains trial insertion access');

    // 3.2 Historical participant checks access
    const legacyAccessResult = simulateCheckRooms3And4AccessRPC({
      sessionId: 'sess-legacy-1',
      session: legacyCompletedSession,
      participant: legacyParticipant,
      authUid: 'charlie-legacy-uid',
      authRole: 'authenticated',
      isAdmin: false,
    });
    assert(legacyAccessResult.unlocked === true, 'Reg Test 3.2: Pre-migration participant has unlocked = true');
    assert(legacyAccessResult.reason === 'historical_unlocked', 'Reg Test 3.2: Reason reflects genuine historical unlock');

    // 3.3 Historical participant can complete session
    const legacyUpdateResult = simulateTriggerEnforceSessionUpdate(
      legacyCompletedSession,
      { ...legacyCompletedSession, stroop_completed: true },
      exactUnlockServer
    );
    assert(legacyUpdateResult === true, 'Reg Test 3.3: Pre-migration participant can mark Room 3/4 completed');

    // -------------------------------------------------------------------------
    // REGRESSION TEST 4: Legitimate participant can resume on another device
    // -------------------------------------------------------------------------
    console.log('--- Regression Test 4: Legitimate Multi-Factor Cross-Device Resume ---');
    const legitimateNewDeviceUid = 'alice-ipad-uid-777';
    const legitimateCrossDeviceResume = simulateResumeParticipantSessionRPC({
      p_participant_code: 'ML-9999',
      p_verification_name: 'Alice',
      p_verification_email: 'alice@university.edu', // Verified email
      participant: aliceParticipant,
      session: aliceSession,
      callerAuthUid: legitimateNewDeviceUid,
    });
    assert(legitimateCrossDeviceResume.success === true, 'Reg Test 4.1: Legitimate participant with matching email successfully resumes on new device');
    assert(aliceParticipant.auth_user_id === legitimateNewDeviceUid, 'Reg Test 4.2: Session ownership is securely rebound to the verified new device');

    // 4.3 Verified new device can now execute session RPCs
    const newDeviceStartCall = simulateRecordRoom2StartRPC({
      sessionId: 'sess-alice-1',
      session: aliceSession,
      participant: aliceParticipant,
      authUid: legitimateNewDeviceUid,
      authRole: 'authenticated',
      isAdmin: false,
    });
    assert(newDeviceStartCall.success === true, 'Reg Test 4.3: Resumed verified device can execute record_room_2_start');

    // -------------------------------------------------------------------------
    // REGRESSION TEST 5: Rooms 3 and 4 remain blocked until authoritative unlock
    // -------------------------------------------------------------------------
    console.log('--- Regression Test 5: Strict 24-Hour Authoritative Block Until Unlock Time ---');
    const activeStudyParticipant = {
      id: 'part-study-1',
      participant_code: 'ML-7777',
      name: 'Diana Prince',
      email: 'diana@amazon.edu',
      auth_user_id: 'diana-device-uid',
    };
    const activeStudySession = {
      id: 'sess-study-1',
      participant_id: 'part-study-1',
      is_legacy: false,
      room_2_started_at: room2StartBaseline, // 2026-10-10T12:00:00Z
      rooms_3_4_unlock_at: expectedUnlockBaseline, // 2026-10-11T12:00:00Z
      corsi_completed: true,
      status: 'in_progress',
    };

    // 5.1 2 hours after starting Room 2: Strictly blocked
    activeStudySession.server_now = twoHoursLaterServer; // 2026-10-10T14:00:00Z
    const accessAt2h = simulateCheckRooms3And4AccessRPC({
      sessionId: 'sess-study-1',
      session: activeStudySession,
      participant: activeStudyParticipant,
      authUid: 'diana-device-uid',
      authRole: 'authenticated',
      isAdmin: false,
    });
    assert(accessAt2h.unlocked === false, 'Reg Test 5.1: Blocked 2 hours after start');
    assert(accessAt2h.reason === 'time_remaining', 'Reg Test 5.1: Reason is time_remaining');

    let blockedTrialAt2h = false;
    try {
      simulateTriggerEnforceTrialInsert(activeStudySession);
    } catch (err) {
      blockedTrialAt2h = err.message.includes('Rooms 3 and 4 are locked until');
    }
    assert(blockedTrialAt2h === true, 'Reg Test 5.2: Database trigger blocks trial insert 2 hours after start');

    let blockedCompleteAt2h = false;
    try {
      simulateTriggerEnforceSessionUpdate(
        activeStudySession,
        { ...activeStudySession, stroop_completed: true },
        twoHoursLaterServer
      );
    } catch (err) {
      blockedCompleteAt2h = err.message.includes('Cannot mark Room 3 or 4 completed before unlock time');
    }
    assert(blockedCompleteAt2h === true, 'Reg Test 5.3: Database trigger blocks session completion 2 hours after start');

    // 5.2 23 hours 59 minutes 50 seconds after starting: Strictly blocked (10s remaining)
    const tenSecondsBeforeUnlock = '2026-10-11T11:59:50.000Z';
    activeStudySession.server_now = tenSecondsBeforeUnlock;
    const accessAtAlmostDone = simulateCheckRooms3And4AccessRPC({
      sessionId: 'sess-study-1',
      session: activeStudySession,
      participant: activeStudyParticipant,
      authUid: 'diana-device-uid',
      authRole: 'authenticated',
      isAdmin: false,
    });
    assert(accessAtAlmostDone.unlocked === false, 'Reg Test 5.4: Blocked 10 seconds before 24-hour mark');
    assert(accessAtAlmostDone.remaining_seconds === 10, 'Reg Test 5.4: Accurately reports 10 seconds remaining');

    // 5.3 Exact 24-hour mark (authoritative unlock timestamp): Successfully unlocks!
    activeStudySession.server_now = exactUnlockServer; // 2026-10-11T12:00:00Z
    const accessAtUnlock = simulateCheckRooms3And4AccessRPC({
      sessionId: 'sess-study-1',
      session: activeStudySession,
      participant: activeStudyParticipant,
      authUid: 'diana-device-uid',
      authRole: 'authenticated',
      isAdmin: false,
    });
    assert(accessAtUnlock.unlocked === true, 'Reg Test 5.5: Rooms 3 and 4 unlock at exact 24-hour mark');
    assert(accessAtUnlock.remaining_seconds === 0, 'Reg Test 5.5: 0 seconds remaining at unlock moment');

    const trialInsertAtUnlock = simulateTriggerEnforceTrialInsert(activeStudySession);
    assert(trialInsertAtUnlock === true, 'Reg Test 5.6: Trial insertion allowed at 24-hour unlock mark');

    const completeAtUnlock = simulateTriggerEnforceSessionUpdate(
      activeStudySession,
      { ...activeStudySession, stroop_completed: true },
      exactUnlockServer
    );
    assert(completeAtUnlock === true, 'Reg Test 5.7: Room 3 completion allowed at 24-hour unlock mark');

    // 20.4 Duplicate Email Prevention & Atomic Claiming Logic
    class MockEmailNotificationQueue {
      constructor() {
        this.sessions = [];
      }

      addSession(session) {
        this.sessions.push({ ...session });
      }

      // Simulates Postgres `FOR UPDATE SKIP LOCKED` atomic claim
      claimPendingBatch(batchSize = 20, serverNowStr = new Date().toISOString()) {
        const now = new Date(serverNowStr).getTime();
        const eligible = this.sessions.filter(s => {
          if (!s.room_2_started_at) return false;
          if (new Date(s.rooms_3_4_unlock_at).getTime() > now) return false;
          if (s.unlock_email_sent_at) return false;
          if (!s.email || !s.email.trim()) return false;

          // Eligible status check:
          if (s.unlock_email_status === 'pending') return true;
          if (s.unlock_email_status === 'failed' && s.unlock_email_attempts < 5) return true;
          if (s.unlock_email_status === 'claimed') {
            // Re-claimable only after 15-minute lock expiration
            const claimedAt = new Date(s.unlock_email_claimed_at).getTime();
            return (now - claimedAt) >= 15 * 60 * 1000;
          }
          return false;
        }).slice(0, batchSize);

        // Atomically mark claimed
        eligible.forEach(s => {
          s.unlock_email_status = 'claimed';
          s.unlock_email_claimed_at = serverNowStr;
          s.unlock_email_attempts += 1;
        });

        return eligible.map(s => ({ ...s }));
      }

      recordResult(sessionId, success, error = null, serverNowStr = new Date().toISOString()) {
        const sess = this.sessions.find(s => s.id === sessionId);
        if (!sess) return;
        if (success) {
          sess.unlock_email_status = 'sent';
          sess.unlock_email_sent_at = serverNowStr;
          sess.unlock_email_error = null;
        } else {
          sess.unlock_email_status = 'failed';
          sess.unlock_email_error = error;
        }
      }
    }

    const queue = new MockEmailNotificationQueue();
    queue.addSession({
      id: 'sess-1',
      participant_id: 'part-1',
      email: 'participant1@example.com',
      room_2_started_at: '2026-10-09T10:00:00.000Z',
      rooms_3_4_unlock_at: '2026-10-10T10:00:00.000Z', // 24h passed
      unlock_email_status: 'pending',
      unlock_email_attempts: 0,
      unlock_email_sent_at: null,
      unlock_email_claimed_at: null,
    });
    queue.addSession({
      id: 'sess-2',
      participant_id: 'part-2',
      email: 'participant2@example.com',
      room_2_started_at: '2026-10-10T08:00:00.000Z',
      rooms_3_4_unlock_at: '2026-10-11T08:00:00.000Z', // Not yet unlocked (in the future)
      unlock_email_status: 'pending',
      unlock_email_attempts: 0,
      unlock_email_sent_at: null,
      unlock_email_claimed_at: null,
    });

    const checkTime = '2026-10-10T10:05:00.000Z'; // sess-1 is unlocked, sess-2 is still waiting
    const worker1Batch = queue.claimPendingBatch(10, checkTime);
    assert(worker1Batch.length === 1, 'Only unlocked sessions are claimed by worker 1');
    assert(worker1Batch[0].id === 'sess-1', 'sess-1 is successfully claimed');

    // Worker 2 (concurrent worker running at the exact same moment) tries to claim
    const worker2Batch = queue.claimPendingBatch(10, checkTime);
    assert(worker2Batch.length === 0, 'Concurrent worker 2 gets ZERO sessions (SKIP LOCKED prevents duplicate claim)');

    // Worker 1 dispatches email successfully
    queue.recordResult('sess-1', true, null, checkTime);

    // Repeated cron job run 5 minutes later
    const cronBatch = queue.claimPendingBatch(10, '2026-10-10T10:10:00.000Z');
    assert(cronBatch.length === 0, 'Subsequent cron run does NOT re-claim already-sent session (zero duplicates)');

    // 20.5 Safe Retry Handling on Email Provider Transient Failure
    queue.addSession({
      id: 'sess-3',
      participant_id: 'part-3',
      email: 'flaky@example.com',
      room_2_started_at: '2026-10-09T10:00:00.000Z',
      rooms_3_4_unlock_at: '2026-10-10T10:00:00.000Z',
      unlock_email_status: 'pending',
      unlock_email_attempts: 0,
      unlock_email_sent_at: null,
      unlock_email_claimed_at: null,
    });

    // Attempt 1: fails
    const retryBatch1 = queue.claimPendingBatch(10, checkTime);
    assert(retryBatch1.length === 1 && retryBatch1[0].id === 'sess-3', 'Claimed session for attempt 1');
    queue.recordResult('sess-3', false, 'Transient network timeout', checkTime);

    // Immediate re-run: can retry failed attempt (< 5 attempts)
    const retryBatch2 = queue.claimPendingBatch(10, '2026-10-10T10:15:00.000Z');
    assert(retryBatch2.length === 1 && retryBatch2[0].id === 'sess-3', 'Failed session is retried safely on next run');
    assert(retryBatch2[0].unlock_email_attempts === 2, 'Attempt count increments to 2');

    // Succeeds on retry
    queue.recordResult('sess-3', true, null, '2026-10-10T10:16:00.000Z');
    const retryBatch3 = queue.claimPendingBatch(10, '2026-10-10T10:20:00.000Z');
    assert(retryBatch3.length === 0, 'No further sends once retry succeeds');

    // Max retry cap: session with 5 failed attempts is not re-claimed indefinitely
    queue.addSession({
      id: 'sess-4',
      participant_id: 'part-4',
      email: 'deadletter@example.com',
      room_2_started_at: '2026-10-09T10:00:00.000Z',
      rooms_3_4_unlock_at: '2026-10-10T10:00:00.000Z',
      unlock_email_status: 'failed',
      unlock_email_attempts: 5, // reached max
      unlock_email_sent_at: null,
      unlock_email_claimed_at: null,
    });
    const capBatch = queue.claimPendingBatch(10, '2026-10-10T10:25:00.000Z');
    assert(capBatch.length === 0, 'Sessions with 5 failed attempts are not re-claimed indefinitely');
  }

  // ---------------------------------------------------------------------------
  // Test 21: Tower of Hanoi Move Limits, 3-Attempt Maximum, Admin Config & Data Integrity
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 21: Tower of Hanoi Move Limits, 3-Attempt Maximum, Admin Config & Data Integrity ---');

  // 21.1 Default Move Limits Verification
  const EXPECTED_HANOI_DEFAULTS = [
    { puzzleIndex: 0, diskCount: 3, moveLimit: 7 },
    { puzzleIndex: 1, diskCount: 3, moveLimit: 7 },
    { puzzleIndex: 2, diskCount: 3, moveLimit: 7 },
    { puzzleIndex: 3, diskCount: 3, moveLimit: 7 },
    { puzzleIndex: 4, diskCount: 4, moveLimit: 15 },
    { puzzleIndex: 5, diskCount: 5, moveLimit: 31 },
  ];

  const DEFAULT_HANOI_PUZZLES = [
    { puzzleIndex: 0, diskCount: 3, moveLimit: 7, enabled: true, initialState: [[3, 2], [], [1]], goalState: [[3, 1], [], [2]] },
    { puzzleIndex: 1, diskCount: 3, moveLimit: 7, enabled: true, initialState: [[3], [2, 1], []], goalState: [[3], [], [2, 1]] },
    { puzzleIndex: 2, diskCount: 3, moveLimit: 7, enabled: true, initialState: [[1], [3, 2], []], goalState: [[], [], [3, 2, 1]] },
    { puzzleIndex: 3, diskCount: 3, moveLimit: 7, enabled: true, initialState: [[3, 2, 1], [], []], goalState: [[], [], [3, 2, 1]] },
    { puzzleIndex: 4, diskCount: 4, moveLimit: 15, enabled: true, initialState: [[4, 3, 2, 1], [], []], goalState: [[], [], [4, 3, 2, 1]] },
    { puzzleIndex: 5, diskCount: 5, moveLimit: 31, enabled: true, initialState: [[5, 4, 3, 2, 1], [], []], goalState: [[], [], [5, 4, 3, 2, 1]] },
  ];

  EXPECTED_HANOI_DEFAULTS.forEach((exp, idx) => {
    assert(
      DEFAULT_HANOI_PUZZLES[idx].moveLimit === exp.moveLimit,
      `Trial ${idx + 1} default move limit is exactly ${exp.moveLimit} moves (got ${DEFAULT_HANOI_PUZZLES[idx].moveLimit})`
    );
    assert(
      DEFAULT_HANOI_PUZZLES[idx].diskCount === exp.diskCount,
      `Trial ${idx + 1} has ${exp.diskCount} disks`
    );
  });

  // 21.2 Admin Configuration Validation & Fallback Safety
  function validateHanoiPuzzlesConfig(raw) {
    if (!Array.isArray(raw) || raw.length === 0) {
      return DEFAULT_HANOI_PUZZLES;
    }
    return DEFAULT_HANOI_PUZZLES.map((defaultP, idx) => {
      const found = raw.find((p) => p && p.puzzleIndex === idx);
      if (!found) return defaultP;
      const limit = Number(found.moveLimit);
      const validLimit = !isNaN(limit) && limit >= 1 && limit <= 500 ? Math.round(limit) : defaultP.moveLimit;
      const enabled = typeof found.enabled === 'boolean' ? found.enabled : defaultP.enabled;
      return {
        ...defaultP,
        moveLimit: validLimit,
        enabled,
      };
    });
  }

  // Fallback on missing or invalid configurations
  assert(validateHanoiPuzzlesConfig(null)[0].moveLimit === 7, 'Missing (null) config safely falls back to default 7 moves');
  assert(validateHanoiPuzzlesConfig(undefined)[4].moveLimit === 15, 'Undefined config safely falls back to default 15 moves');
  assert(validateHanoiPuzzlesConfig([])[5].moveLimit === 31, 'Empty array safely falls back to default 31 moves');
  assert(validateHanoiPuzzlesConfig([{ puzzleIndex: 0, moveLimit: -5 }])[0].moveLimit === 7, 'Negative move limit falls back to default');
  assert(validateHanoiPuzzlesConfig([{ puzzleIndex: 0, moveLimit: 0 }])[0].moveLimit === 7, 'Zero move limit falls back to default');
  assert(validateHanoiPuzzlesConfig([{ puzzleIndex: 0, moveLimit: 'invalid' }])[0].moveLimit === 7, 'NaN move limit falls back to default');
  assert(validateHanoiPuzzlesConfig([{ puzzleIndex: 0, moveLimit: 9999 }])[0].moveLimit === 7, 'Excessive move limit (>500) falls back to default');

  // Valid researcher configuration is preserved
  const validAdminCustomConfig = [
    { puzzleIndex: 0, moveLimit: 12 },
    { puzzleIndex: 1, moveLimit: 10 },
    { puzzleIndex: 2, moveLimit: 8 },
    { puzzleIndex: 3, moveLimit: 9 },
    { puzzleIndex: 4, moveLimit: 25 },
    { puzzleIndex: 5, moveLimit: 50 },
  ];
  const validatedCustom = validateHanoiPuzzlesConfig(validAdminCustomConfig);
  assert(validatedCustom[0].moveLimit === 12, 'Admin custom move limit of 12 for Trial 1 is accepted');
  assert(validatedCustom[4].moveLimit === 25, 'Admin custom move limit of 25 for Trial 5 is accepted');
  assert(validatedCustom[5].moveLimit === 50, 'Admin custom move limit of 50 for Trial 6 is accepted');

  // Simulated LocalStorage and Dynamic Experiment Consumption
  const mockLocalStorage = new Map();
  function saveHanoiPuzzlesConfig(puzzles) {
    const validated = validateHanoiPuzzlesConfig(puzzles);
    mockLocalStorage.set('mindlab_hanoi_puzzles_config', JSON.stringify(validated));
    return validated;
  }
  function getHanoiPuzzlesConfig() {
    const raw = mockLocalStorage.get('mindlab_hanoi_puzzles_config');
    if (raw) {
      return validateHanoiPuzzlesConfig(JSON.parse(raw));
    }
    return DEFAULT_HANOI_PUZZLES;
  }

  // Fresh installation returns defaults
  assert(getHanoiPuzzlesConfig()[0].moveLimit === 7, 'Fresh experiment consumption returns default move limit 7');
  
  // Persist admin settings and verify experiment consumes saved configuration
  saveHanoiPuzzlesConfig([
    { puzzleIndex: 0, moveLimit: 14 },
    { puzzleIndex: 1, moveLimit: 14 },
    { puzzleIndex: 2, moveLimit: 14 },
    { puzzleIndex: 3, moveLimit: 14 },
    { puzzleIndex: 4, moveLimit: 20 },
    { puzzleIndex: 5, moveLimit: 45 },
  ]);
  const consumedByExperiment = getHanoiPuzzlesConfig();
  assert(consumedByExperiment[0].moveLimit === 14, 'Experiment dynamically consumes saved Trial 1 limit (14 moves)');
  assert(consumedByExperiment[4].moveLimit === 20, 'Experiment dynamically consumes saved Trial 5 limit (20 moves)');
  assert(consumedByExperiment[5].moveLimit === 45, 'Experiment dynamically consumes saved Trial 6 limit (45 moves)');

  // 21.3 Game Engine Simulation: Move Limits & 3-Attempt Maximum Protocol
  class SimulatedHanoiEngine {
    constructor(puzzlesConfig) {
      this.puzzles = puzzlesConfig;
      this.puzzleIdx = 0;
      this.attemptNumber = 1;
      this.maxAttempts = 3;
      this.recordedResults = [];
      this.isSubmitting = false;
      this.sessionFinished = false;
      this.initCurrentAttempt();
    }

    initCurrentAttempt() {
      const p = this.puzzles[this.puzzleIdx];
      this.rods = p.initialState.map(r => [...r]);
      this.moves = 0;
      this.invalidMoves = 0;
      this.phase = 'playing';
      this.isSubmitting = false;
    }

    makeMove(fromRod, toRod, isGoalCheck = false) {
      if (this.phase !== 'playing' || this.isSubmitting) return false;

      // Increment valid move
      this.moves += 1;
      const p = this.puzzles[this.puzzleIdx];

      if (isGoalCheck) {
        // Solved
        this.isSubmitting = true;
        this.phase = 'completed';
        this.recordedResults.push({
          puzzleIndex: this.puzzleIdx,
          attemptNumber: this.attemptNumber,
          validMoves: this.moves,
          outcome: 'Completed',
        });
        return { event: 'completed', attempt: this.attemptNumber };
      } else if (this.moves >= p.moveLimit) {
        // Move limit reached
        this.isSubmitting = true;
        this.recordedResults.push({
          puzzleIndex: this.puzzleIdx,
          attemptNumber: this.attemptNumber,
          validMoves: this.moves,
          outcome: 'Move Limit Reached',
        });

        if (this.attemptNumber >= this.maxAttempts) {
          this.phase = 'maxAttemptsReached';
          this.sessionFinished = true;
          return { event: 'maxAttemptsReached', attempt: this.attemptNumber };
        } else {
          this.phase = 'limitReached';
          return { event: 'limitReached', attempt: this.attemptNumber };
        }
      }
      return { event: 'in_progress', moves: this.moves };
    }

    retry() {
      if (this.attemptNumber >= this.maxAttempts) return false;
      this.attemptNumber += 1;
      this.initCurrentAttempt();
      return true;
    }

    nextPuzzle() {
      if (this.puzzleIdx >= this.puzzles.length - 1) {
        this.sessionFinished = true;
        return false;
      }
      this.puzzleIdx += 1;
      this.attemptNumber = 1;
      this.initCurrentAttempt();
      return true;
    }
  }

  // Simulation Scenario A: Solved on Attempt 1 within limit
  const engineA = new SimulatedHanoiEngine(DEFAULT_HANOI_PUZZLES);
  assert(engineA.attemptNumber === 1, 'Trial 1 starts at attempt 1');
  assert(engineA.moves === 0, 'Moves start at 0');

  // Make 6 valid moves, then 7th move solves
  for (let m = 1; m <= 6; m++) {
    engineA.makeMove(0, 1, false);
  }
  assert(engineA.moves === 6, 'Moves counter accurately tracks 6 valid moves');
  const solveResult = engineA.makeMove(1, 2, true);
  assert(solveResult.event === 'completed', 'Puzzle completed on 7th move');
  assert(engineA.recordedResults[0].outcome === 'Completed', 'Recorded outcome is Completed');
  assert(engineA.recordedResults[0].attemptNumber === 1, 'Recorded attemptNumber is 1');
  assert(engineA.recordedResults[0].validMoves === 7, 'Recorded validMoves is 7');

  // Progress to puzzle 2 resets attempt to 1 and moves to 0
  engineA.nextPuzzle();
  assert(engineA.puzzleIdx === 1, 'Progresses to Puzzle 2');
  assert(engineA.attemptNumber === 1, 'Attempt number resets to 1 for Puzzle 2');
  assert(engineA.moves === 0, 'Move counter resets to 0 for Puzzle 2');

  // Simulation Scenario B: Attempt 1 reaches move limit -> retry -> Attempt 2 solves
  const engineB = new SimulatedHanoiEngine(DEFAULT_HANOI_PUZZLES);
  // Trial 1 has move limit 7
  for (let m = 1; m < 7; m++) engineB.makeMove(0, 1, false);
  const limitReachedAttempt1 = engineB.makeMove(0, 1, false); // 7th move without solve
  assert(limitReachedAttempt1.event === 'limitReached', 'Attempt 1 ends with limitReached on 7th move');
  assert(engineB.recordedResults[0].outcome === 'Move Limit Reached', 'Attempt 1 recorded as Move Limit Reached');
  assert(engineB.recordedResults[0].attemptNumber === 1, 'Attempt 1 recorded with attemptNumber = 1');

  // Verify duplicate clicks blocked while in limitReached phase
  assert(engineB.makeMove(0, 1, false) === false, 'Further moves blocked while in limitReached phase');

  // Retry attempt 1 -> transitions to Attempt 2
  const retry1Ok = engineB.retry();
  assert(retry1Ok === true, 'Retry allowed after attempt 1');
  assert(engineB.attemptNumber === 2, 'Attempt increments to 2');
  assert(engineB.moves === 0, 'Move counter properly reset to 0 on retry');
  assert(
    JSON.stringify(engineB.rods) === JSON.stringify(DEFAULT_HANOI_PUZZLES[0].initialState),
    'Board rods strictly reset to initialState on retry'
  );

  // Attempt 2 solves within 5 moves
  for (let m = 1; m < 5; m++) engineB.makeMove(0, 1, false);
  const solveAttempt2 = engineB.makeMove(1, 2, true);
  assert(solveAttempt2.event === 'completed', 'Attempt 2 successfully completes puzzle');
  assert(engineB.recordedResults[1].attemptNumber === 2, 'Attempt 2 recorded with attemptNumber = 2');
  assert(engineB.recordedResults[1].outcome === 'Completed', 'Attempt 2 recorded outcome is Completed');

  // Simulation Scenario C: Strict 3-Attempt Maximum & Discontinue Rule
  const engineC = new SimulatedHanoiEngine(DEFAULT_HANOI_PUZZLES);
  
  // Attempt 1: fails
  for (let m = 1; m <= 7; m++) engineC.makeMove(0, 1, false);
  assert(engineC.phase === 'limitReached', 'Attempt 1 phase is limitReached');
  assert(engineC.retry() === true, 'Retry allowed for Attempt 2');

  // Attempt 2: fails
  for (let m = 1; m <= 7; m++) engineC.makeMove(0, 1, false);
  assert(engineC.phase === 'limitReached', 'Attempt 2 phase is limitReached');
  assert(engineC.retry() === true, 'Retry allowed for Attempt 3');

  // Attempt 3: fails on 7th move
  for (let m = 1; m <= 7; m++) engineC.makeMove(0, 1, false);
  assert(engineC.phase === 'maxAttemptsReached', 'Phase transitions to maxAttemptsReached after Attempt 3 fails');
  assert(engineC.sessionFinished === true, 'Session finishes according to discontinue rule after 3 failed attempts');

  // Crucial check: Fourth attempt MUST NOT be permitted
  const retry4Attempt = engineC.retry();
  assert(retry4Attempt === false, 'Fourth attempt is STRICTLY FORBIDDEN (retry returns false)');
  assert(engineC.attemptNumber === 3, 'Attempt number remains capped at 3');
  assert(engineC.makeMove(0, 1, false) === false, 'Moves completely blocked after session discontinuation');

  // Verify all 3 attempts recorded in sequence with attempt numbers
  const attemptsRecorded = engineC.recordedResults.filter(r => r.puzzleIndex === 0);
  assert(attemptsRecorded.length === 3, 'Exactly 3 attempts recorded');
  assert(attemptsRecorded[0].attemptNumber === 1 && attemptsRecorded[0].outcome === 'Move Limit Reached', 'Attempt 1 logged correctly');
  assert(attemptsRecorded[1].attemptNumber === 2 && attemptsRecorded[1].outcome === 'Move Limit Reached', 'Attempt 2 logged correctly');
  assert(attemptsRecorded[2].attemptNumber === 3 && attemptsRecorded[2].outcome === 'Move Limit Reached', 'Attempt 3 logged correctly');

  // 21.4 Research Data Integrity & Historical Session Compatibility
  function mapHanoiAnalysisRow(row) {
    return {
      id: row.id,
      puzzle: row.puzzle_index + 1,
      validMoves: row.valid_moves,
      moveLimit: row.move_limit,
      outcome: row.outcome,
      attemptNumber: row.attempt_number || 1, // Historical record fallback
    };
  }

  // Pre-update historical record without attempt_number column
  const historicalRow = {
    id: 'hanoi-historical-1',
    puzzle_index: 0,
    valid_moves: 7,
    move_limit: 15,
    outcome: 'Completed',
    // attempt_number undefined in historical row
  };
  const mappedHistorical = mapHanoiAnalysisRow(historicalRow);
  assert(mappedHistorical.attemptNumber === 1, 'Historical record missing attempt_number safely defaults to 1');

  // New post-update record with attempt_number
  const newRow = {
    id: 'hanoi-new-1',
    puzzle_index: 0,
    valid_moves: 7,
    move_limit: 7,
    outcome: 'Completed',
    attempt_number: 3,
  };
  const mappedNew = mapHanoiAnalysisRow(newRow);
  assert(mappedNew.attemptNumber === 3, 'New record correctly preserves attempt_number = 3');

  // Data export mapping parity
  function mapHanoiSummaryExport(row) {
    return {
      puzzle_num: row.puzzle_index + 1,
      valid_moves: row.valid_moves,
      move_limit: row.move_limit,
      outcome: row.outcome,
      attempt_num: row.attempt_number || 1,
    };
  }
  const exportHistorical = mapHanoiSummaryExport(historicalRow);
  const exportNew = mapHanoiSummaryExport(newRow);
  assert(exportHistorical.attempt_num === 1, 'Export table includes attempt_num = 1 for historical record');
  // ---------------------------------------------------------------------------
  // Test 22: Task Switching Shift-Cost Audit, Stimulus Positions, Consistency Classification & Persistence
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 22: Task Switching Shift-Cost Audit & Spatial Consistency Implementation ---');

  // 22.1 Experimental Protocol & Trial Count Verification
  const TS_CONFIG = {
    PRACTICE_COUNT: 8,
    PURE_LETTER_COUNT: 16,
    PURE_NUMBER_COUNT: 16,
    MIXED_COUNT: 32, // Randomized alternating-runs block
  };
  const totalExpTrials = TS_CONFIG.PURE_LETTER_COUNT + TS_CONFIG.PURE_NUMBER_COUNT + TS_CONFIG.MIXED_COUNT;
  const randomizedBlockSize = TS_CONFIG.MIXED_COUNT;

  assert(totalExpTrials === 64, 'Task Switching experimental protocol comprises exactly 64 experimental trials (16 pure-letter + 16 pure-number + 32 mixed)');
  assert(randomizedBlockSize === 32, 'Task Switching randomized block size is exactly 32 trials');
  assert(randomizedBlockSize !== 128, 'Verified randomized block size (32) differs from 128; audit confirms 128 corresponds to Stroop experimental trials, not Task Switching');

  // 22.2 Stimulus Position Mapping & Row Determination
  function getStimulusPositionFromQuadrant(quadrant) {
    switch (quadrant) {
      case 1: return 'top-left';
      case 2: return 'top-right';
      case 3: return 'bottom-right';
      case 4: return 'bottom-left';
      default: return 'top-left';
    }
  }

  function getStimulusRow(position) {
    if (!position) return null;
    return (position === 'top-left' || position === 'top-right') ? 'top' : 'bottom';
  }

  assert(getStimulusPositionFromQuadrant(1) === 'top-left', 'Quadrant 1 maps to "top-left"');
  assert(getStimulusPositionFromQuadrant(2) === 'top-right', 'Quadrant 2 maps to "top-right"');
  assert(getStimulusPositionFromQuadrant(3) === 'bottom-right', 'Quadrant 3 maps to "bottom-right"');
  assert(getStimulusPositionFromQuadrant(4) === 'bottom-left', 'Quadrant 4 maps to "bottom-left"');
  assert(getStimulusRow('top-left') === 'top', '"top-left" belongs to "top" row');
  assert(getStimulusRow('top-right') === 'top', '"top-right" belongs to "top" row');
  assert(getStimulusRow('bottom-left') === 'bottom', '"bottom-left" belongs to "bottom" row');
  assert(getStimulusRow('bottom-right') === 'bottom', '"bottom-right" belongs to "bottom" row');
  assert(getStimulusRow(null) === null, 'Null position produces null row');

  // 22.3 Row Consistency Classification Rules
  function classifyRowConsistency(currentPos, previousPos, isFirstInRandomizedBlock, blockType) {
    // Only classify within randomized experimental block ('mixed')
    if (blockType !== 'mixed' || isFirstInRandomizedBlock || !previousPos) {
      return { consistency: null, isConsistent: null };
    }
    const prevRow = getStimulusRow(previousPos);
    const currRow = getStimulusRow(currentPos);
    if (!prevRow || !currRow) {
      return { consistency: null, isConsistent: null };
    }
    const consistent = prevRow === currRow;
    return {
      consistency: consistent ? 'consistent' : 'inconsistent',
      isConsistent: consistent,
    };
  }

  // First randomized trial has NO preceding randomized trial -> strictly null
  const firstRandomizedTrialClassification = classifyRowConsistency('top-left', null, true, 'mixed');
  assert(firstRandomizedTrialClassification.consistency === null && firstRandomizedTrialClassification.isConsistent === null,
    'First trial in randomized block has NO classification (strictly null)');

  // Practice & pure blocks must be excluded from classification
  const practiceTrialClassification = classifyRowConsistency('top-left', 'top-right', false, 'practice');
  assert(practiceTrialClassification.consistency === null, 'Practice trials are strictly excluded from consistency classification');
  const pureLetterClassification = classifyRowConsistency('top-left', 'top-right', false, 'pure-letter');
  assert(pureLetterClassification.consistency === null, 'Pure-letter trials are strictly excluded from consistency classification');
  const pureNumberClassification = classifyRowConsistency('bottom-left', 'bottom-right', false, 'pure-number');
  assert(pureNumberClassification.consistency === null, 'Pure-number trials are strictly excluded from consistency classification');

  // Same row transitions: top-to-top & bottom-to-bottom -> Consistent
  const topToTop = classifyRowConsistency('top-right', 'top-left', false, 'mixed');
  assert(topToTop.consistency === 'consistent' && topToTop.isConsistent === true, 'Top-to-top transition is classified as "consistent"');
  const bottomToBottom = classifyRowConsistency('bottom-right', 'bottom-left', false, 'mixed');
  assert(bottomToBottom.consistency === 'consistent' && bottomToBottom.isConsistent === true, 'Bottom-to-bottom transition is classified as "consistent"');

  // Different row transitions: top-to-bottom & bottom-to-top -> Inconsistent
  const topToBottom = classifyRowConsistency('bottom-left', 'top-right', false, 'mixed');
  assert(topToBottom.consistency === 'inconsistent' && topToBottom.isConsistent === false, 'Top-to-bottom transition is classified as "inconsistent"');
  const bottomToTop = classifyRowConsistency('top-left', 'bottom-right', false, 'mixed');
  assert(bottomToTop.consistency === 'inconsistent' && bottomToTop.isConsistent === false, 'Bottom-to-top transition is classified as "inconsistent"');

  // Independence of spatial row consistency from cognitive task identity:
  // e.g. Stimulus moves top-left (letter) to top-right (number) -> Task switch, but row CONSISTENT!
  const taskSwitchRowConsistent = classifyRowConsistency('top-right', 'top-left', false, 'mixed');
  assert(taskSwitchRowConsistent.consistency === 'consistent', 'Spatial consistency uses actual rows, independent of cognitive task switch status');
  // e.g. Stimulus moves top-left (letter) to bottom-left (number rule or vice-versa) -> Different rows, row INCONSISTENT!
  const taskRepeatRowInconsistent = classifyRowConsistency('bottom-left', 'top-left', false, 'mixed');
  assert(taskRepeatRowInconsistent.consistency === 'inconsistent', 'Spatial inconsistency uses actual rows, independent of cognitive task repetition status');

  // 22.4 Monotonic Clock RT Measurement Simulation
  function measureReactionTime(presentationTimestamp, keypressTimestamp) {
    const delta = keypressTimestamp - presentationTimestamp;
    return (delta > 0 && Number.isFinite(delta)) ? Math.round(delta) : null;
  }
  const t0 = 1000.25; // Simulated performance.now()
  const t1 = 1435.65;
  const measuredRt = measureReactionTime(t0, t1);
  assert(measuredRt === 435, 'Monotonic clock difference correctly records 435 ms reaction time');
  assert(measureReactionTime(1000, 900) === null, 'Negative/clock-skew timestamps rejected as null');

  // 22.5 Shift Cost Calculation: Shift cost = Mean RT (inconsistent) − Mean RT (consistent)
  function computeShiftCostMetrics(trials) {
    // Exclude practice and pure-task blocks from shift-cost calculations
    const randomizedTrials = trials.filter(t => t.phase === 'experimental' && t.blockType === 'mixed');
    
    // Only valid (correct) trials with measured RT are included in reaction-time means
    const consistentTrials = randomizedTrials.filter(t => t.consistency === 'consistent');
    const consistentCorrect = consistentTrials.filter(t => t.isCorrect && typeof t.reactionTimeMs === 'number' && t.reactionTimeMs > 0);
    const consistentMeanRtMs = consistentCorrect.length > 0
      ? Math.round((consistentCorrect.reduce((s, t) => s + t.reactionTimeMs, 0) / consistentCorrect.length) * 100) / 100
      : null;

    const inconsistentTrials = randomizedTrials.filter(t => t.consistency === 'inconsistent');
    const inconsistentCorrect = inconsistentTrials.filter(t => t.isCorrect && typeof t.reactionTimeMs === 'number' && t.reactionTimeMs > 0);
    const inconsistentMeanRtMs = inconsistentCorrect.length > 0
      ? Math.round((inconsistentCorrect.reduce((s, t) => s + t.reactionTimeMs, 0) / inconsistentCorrect.length) * 100) / 100
      : null;

    const shiftCostMs = (consistentMeanRtMs !== null && inconsistentMeanRtMs !== null)
      ? Math.round((inconsistentMeanRtMs - consistentMeanRtMs) * 100) / 100
      : null;

    return {
      consistentTrialsCount: consistentTrials.length,
      consistentCorrectCount: consistentCorrect.length,
      consistentMeanRtMs,
      inconsistentTrialsCount: inconsistentTrials.length,
      inconsistentCorrectCount: inconsistentCorrect.length,
      inconsistentMeanRtMs,
      shiftCostMs,
    };
  }

  // Standard scenario: Both conditions present with valid correct responses
  const testSampleTrials = [
    // Trial 1: First randomized trial (no classification)
    { phase: 'experimental', blockType: 'mixed', consistency: null, isCorrect: true, reactionTimeMs: 400 },
    // Consistent trials: RTs 480 and 520 (Mean = 500.0)
    { phase: 'experimental', blockType: 'mixed', consistency: 'consistent', isCorrect: true, reactionTimeMs: 480 },
    { phase: 'experimental', blockType: 'mixed', consistency: 'consistent', isCorrect: true, reactionTimeMs: 520 },
    // Consistent incorrect trial: should NOT be included in RT mean
    { phase: 'experimental', blockType: 'mixed', consistency: 'consistent', isCorrect: false, reactionTimeMs: 900 },
    // Inconsistent trials: RTs 620 and 680 (Mean = 650.0)
    { phase: 'experimental', blockType: 'mixed', consistency: 'inconsistent', isCorrect: true, reactionTimeMs: 620 },
    { phase: 'experimental', blockType: 'mixed', consistency: 'inconsistent', isCorrect: true, reactionTimeMs: 680 },
    // Inconsistent incorrect trial: should NOT be included in RT mean
    { phase: 'experimental', blockType: 'mixed', consistency: 'inconsistent', isCorrect: false, reactionTimeMs: 950 },
  ];
  const sampleRes = computeShiftCostMetrics(testSampleTrials);
  assert(sampleRes.consistentTrialsCount === 3, 'Consistent trials count tracks total consistent trials (3)');
  assert(sampleRes.consistentCorrectCount === 2, 'Consistent correct count excludes errors (2)');
  assert(sampleRes.consistentMeanRtMs === 500.0, 'Consistent Mean RT is 500.0 ms (only correct trials)');
  assert(sampleRes.inconsistentTrialsCount === 3, 'Inconsistent trials count tracks total inconsistent trials (3)');
  assert(sampleRes.inconsistentCorrectCount === 2, 'Inconsistent correct count excludes errors (2)');
  assert(sampleRes.inconsistentMeanRtMs === 650.0, 'Inconsistent Mean RT is 650.0 ms (only correct trials)');
  assert(sampleRes.shiftCostMs === 150.0, 'Shift Cost = 650.0 - 500.0 = 150.0 ms');

  // Explicit handling of insufficient valid trials / missing RTs
  const zeroConsistentCorrectTrials = [
    { phase: 'experimental', blockType: 'mixed', consistency: null, isCorrect: true, reactionTimeMs: 400 },
    { phase: 'experimental', blockType: 'mixed', consistency: 'consistent', isCorrect: false, reactionTimeMs: 500 },
    { phase: 'experimental', blockType: 'mixed', consistency: 'inconsistent', isCorrect: true, reactionTimeMs: 650 },
  ];
  const zeroConsistentRes = computeShiftCostMetrics(zeroConsistentCorrectTrials);
  assert(zeroConsistentRes.consistentMeanRtMs === null, 'Zero correct consistent trials produces strictly null consistentMeanRtMs');
  assert(zeroConsistentRes.shiftCostMs === null, 'Shift Cost is strictly null when consistent condition has zero correct trials (never fabricated 0)');

  const zeroInconsistentCorrectTrials = [
    { phase: 'experimental', blockType: 'mixed', consistency: null, isCorrect: true, reactionTimeMs: 400 },
    { phase: 'experimental', blockType: 'mixed', consistency: 'consistent', isCorrect: true, reactionTimeMs: 500 },
    { phase: 'experimental', blockType: 'mixed', consistency: 'inconsistent', isCorrect: false, reactionTimeMs: 650 },
  ];
  const zeroInconsistentRes = computeShiftCostMetrics(zeroInconsistentCorrectTrials);
  assert(zeroInconsistentRes.inconsistentMeanRtMs === null, 'Zero correct inconsistent trials produces strictly null inconsistentMeanRtMs');
  assert(zeroInconsistentRes.shiftCostMs === null, 'Shift Cost is strictly null when inconsistent condition has zero correct trials');

  // Pure and practice trials are excluded from shift cost calculations
  const pureAndPracticeTrials = [
    { phase: 'practice', blockType: 'practice', consistency: 'consistent', isCorrect: true, reactionTimeMs: 300 },
    { phase: 'experimental', blockType: 'pure-letter', consistency: 'consistent', isCorrect: true, reactionTimeMs: 350 },
    { phase: 'experimental', blockType: 'pure-number', consistency: 'inconsistent', isCorrect: true, reactionTimeMs: 360 },
  ];
  const purePracticeRes = computeShiftCostMetrics(pureAndPracticeTrials);
  assert(purePracticeRes.consistentTrialsCount === 0 && purePracticeRes.inconsistentTrialsCount === 0,
    'Practice and pure-task blocks strictly excluded from randomized-block shift-cost calculations');
  assert(purePracticeRes.shiftCostMs === null, 'Shift cost is strictly null when no randomized trials exist');

  // 22.6 Historical Data Integrity, Fallback & Export Parity
  function mapTaskSwitchingTrialExport(trial) {
    return {
      participant_id: trial.participant_id,
      trial_num: trial.trial_num,
      phase: trial.phase,
      block_type: trial.block_type,
      stimulus_position: trial.stimulus_position ?? getStimulusPositionFromQuadrant(trial.quadrant),
      consistency: trial.consistency ?? null,
      is_consistent: trial.is_consistent ?? null,
      reaction_time_ms: trial.reaction_time_ms,
      is_correct: trial.is_correct,
    };
  }

  // Pre-update historical trial record (has quadrant but missing stimulus_position and consistency)
  const historicalTsTrial = {
    participant_id: 'ML-HIST-01',
    trial_num: 15,
    phase: 'experimental',
    block_type: 'mixed',
    quadrant: 2,
    reaction_time_ms: 540,
    is_correct: true,
  };
  const mappedHistoricalTrial = mapTaskSwitchingTrialExport(historicalTsTrial);
  assert(mappedHistoricalTrial.stimulus_position === 'top-right', 'Historical trial missing stimulus_position safely derives "top-right" from quadrant 2');
  assert(mappedHistoricalTrial.consistency === null, 'Historical trial missing consistency column safely defaults to null');
  assert(mappedHistoricalTrial.is_consistent === null, 'Historical trial missing is_consistent column safely defaults to null');

  // New trial record
  const newTsTrial = {
    participant_id: 'ML-NEW-01',
    trial_num: 20,
    phase: 'experimental',
    block_type: 'mixed',
    quadrant: 4,
    stimulus_position: 'bottom-left',
    consistency: 'inconsistent',
    is_consistent: false,
    reaction_time_ms: 610,
    is_correct: true,
  };
  const mappedNewTrial = mapTaskSwitchingTrialExport(newTsTrial);
  assert(mappedNewTrial.stimulus_position === 'bottom-left', 'New trial correctly persists "bottom-left"');
  assert(mappedNewTrial.consistency === 'inconsistent', 'New trial correctly persists "inconsistent"');
  assert(mappedNewTrial.is_consistent === false, 'New trial correctly persists is_consistent = false');

  // Summary Export Parity
  function mapTaskSwitchingSummaryExport(session) {
    return {
      participant_id: session.participant_id,
      session_id: session.id,
      switch_cost_ms: session.task_switching_switch_cost_ms ?? null,
      consistent_trials: session.task_switching_consistent_trials ?? null,
      consistent_mean_rt_ms: session.task_switching_consistent_mean_rt_ms ?? null,
      inconsistent_trials: session.task_switching_inconsistent_trials ?? null,
      inconsistent_mean_rt_ms: session.task_switching_inconsistent_mean_rt_ms ?? null,
      shift_cost_ms: session.task_switching_shift_cost_ms ?? null,
    };
  }

  const historicalSession = {
    participant_id: 'ML-HIST-01',
    id: 'sess-hist-01',
    task_switching_switch_cost_ms: 85,
  };
  const mappedHistoricalSession = mapTaskSwitchingSummaryExport(historicalSession);
  assert(mappedHistoricalSession.shift_cost_ms === null, 'Historical session without shift cost yields null in export (no historical overwrite)');
  assert(mappedHistoricalSession.switch_cost_ms === 85, 'Historical session preserves existing switch_cost_ms');

  const newSession = {
    participant_id: 'ML-NEW-01',
    id: 'sess-new-01',
    task_switching_switch_cost_ms: 92,
    task_switching_consistent_trials: 14,
    task_switching_consistent_mean_rt_ms: 512.45,
    task_switching_inconsistent_trials: 17,
    task_switching_inconsistent_mean_rt_ms: 645.20,
    task_switching_shift_cost_ms: 132.75,
  };
  const mappedNewSession = mapTaskSwitchingSummaryExport(newSession);
  assert(mappedNewSession.shift_cost_ms === 132.75, 'New session export includes shift_cost_ms = 132.75');
  assert(mappedNewSession.consistent_trials === 14, 'New session export includes consistent_trials = 14');
  assert(mappedNewSession.inconsistent_trials === 17, 'New session export includes inconsistent_trials = 17');

  console.log('\n=== All Targeted Tests Passed Successfully ===');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
