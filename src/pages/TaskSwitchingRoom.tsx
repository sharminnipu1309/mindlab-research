import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Page,
  ParticipantSession,
  TaskType,
  TaskSwitchingBlockType,
  TaskSwitchingKey,
  TaskSwitchingTrialRecord,
  TaskSwitchingSessionResult,
  StimulusPosition,
  RowConsistency,
  getStimulusPositionFromQuadrant,
  getStimulusRow,
  TASK_SWITCHING_VOWELS,
  TASK_SWITCHING_CONSONANTS,
  TASK_SWITCHING_ODD_NUMBERS,
  TASK_SWITCHING_EVEN_NUMBERS,
} from '../types';
import ParticipantNav, { ConfirmExitModal } from '../components/ParticipantNav';
import { CheckCircle, X, ArrowRight, ArrowLeft, RefreshCw, Zap, Layers, Lock, HelpCircle, BookOpen, ArrowUp, ArrowDown, LogOut } from 'lucide-react';
import {
  persistTaskSwitchingTrial,
  persistTaskSwitchingResults,
  getStoredSessionContext,
  getExperimentSessionOptions,
} from '../services/participantService';

interface Props {
  navigate: (page: Page) => void;
  participant: ParticipantSession;
  sessionId?: string;
  onComplete: (result: TaskSwitchingSessionResult) => void;
}

type Phase = 'tutorial' | 'intro' | 'practice' | 'practiceComplete' | 'blockIntro' | 'experiment' | 'taskComplete';
type TrialStage = 'fixation' | 'stimulus' | 'feedback' | 'interTrial';

const PRACTICE_COUNT = 8;
const PURE_LETTER_COUNT = 32;
const PURE_NUMBER_COUNT = 32;
const MIXED_COUNT = 64;
const TOTAL_EXPERIMENTAL_TRIALS = PURE_LETTER_COUNT + PURE_NUMBER_COUNT + MIXED_COUNT; // 128

const FIXATION_DURATION = 400; // ms
const PRACTICE_FEEDBACK_DURATION = 900; // ms (gives participant time to read educational feedback)
const EXPERIMENT_FEEDBACK_DURATION = 600; // ms (visible feedback for both practice and experimental phases)
const EXPERIMENT_INTER_TRIAL_DURATION = 150; // ms

interface TrialItem {
  blockType: TaskSwitchingBlockType;
  taskType: TaskType;
  letter: string;
  number: number;
  correctResponse: TaskSwitchingKey;
  isTaskSwitch: boolean;
  isTaskRepeat: boolean;
  quadrant: number; // 1: Top-Left, 2: Top-Right, 3: Bottom-Right, 4: Bottom-Left
  stimulusPosition: StimulusPosition;
  consistency?: RowConsistency | null;
  isConsistent?: boolean | null;
}

// Helpers to generate balanced stimuli
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Educational explanation helper for practice phase
function getPracticeFeedbackMessage(item: TrialItem, isCorrect: boolean): { title: string; explanation: string } {
  if (item.taskType === 'letter') {
    const isVowel = TASK_SWITCHING_VOWELS.includes(item.letter);
    const category = isVowel ? 'vowel' : 'consonant';
    const correctKey = item.correctResponse; // 'B' for vowel, 'N' for consonant

    if (isCorrect) {
      return {
        title: 'Correct!',
        explanation: `Top row is Letter Task: ${item.letter} is a ${category} (${correctKey}).`,
      };
    } else {
      return {
        title: 'Incorrect',
        explanation: `Top row is Letter Task: ${item.letter} is a ${category}, press ${correctKey}.`,
      };
    }
  } else {
    const isOdd = TASK_SWITCHING_ODD_NUMBERS.includes(item.number);
    const category = isOdd ? 'odd' : 'even';
    const correctKey = item.correctResponse; // 'B' for odd, 'N' for even

    if (isCorrect) {
      return {
        title: 'Correct!',
        explanation: `Bottom row is Number Task: ${item.number} is ${category} (${correctKey}).`,
      };
    } else {
      return {
        title: 'Incorrect',
        explanation: `Bottom row is Number Task: ${item.number} is ${category}, press ${correctKey}.`,
      };
    }
  }
}

function generatePracticeTrials(): TrialItem[] {
  const list: TrialItem[] = [];

  // Trials 1-2: Top Row (Quadrants 1 & 2) -> Pure Letter Practice
  list.push({
    blockType: 'pure-letter',
    taskType: 'letter',
    letter: pickRandom(TASK_SWITCHING_VOWELS),
    number: pickRandom(TASK_SWITCHING_ODD_NUMBERS),
    correctResponse: 'B',
    isTaskSwitch: false,
    isTaskRepeat: false,
    quadrant: 1, // Top-Left
    stimulusPosition: 'top-left',
  });
  list.push({
    blockType: 'pure-letter',
    taskType: 'letter',
    letter: pickRandom(TASK_SWITCHING_CONSONANTS),
    number: pickRandom(TASK_SWITCHING_EVEN_NUMBERS),
    correctResponse: 'N',
    isTaskSwitch: false,
    isTaskRepeat: false,
    quadrant: 2, // Top-Right
    stimulusPosition: 'top-right',
  });

  // Trials 3-4: Bottom Row (Quadrants 4 & 3) -> Pure Number Practice
  list.push({
    blockType: 'pure-number',
    taskType: 'number',
    letter: pickRandom(TASK_SWITCHING_VOWELS),
    number: pickRandom(TASK_SWITCHING_ODD_NUMBERS),
    correctResponse: 'B',
    isTaskSwitch: false,
    isTaskRepeat: false,
    quadrant: 4, // Bottom-Left
    stimulusPosition: 'bottom-left',
  });
  list.push({
    blockType: 'pure-number',
    taskType: 'number',
    letter: pickRandom(TASK_SWITCHING_CONSONANTS),
    number: pickRandom(TASK_SWITCHING_EVEN_NUMBERS),
    correctResponse: 'N',
    isTaskSwitch: false,
    isTaskRepeat: false,
    quadrant: 3, // Bottom-Right
    stimulusPosition: 'bottom-right',
  });

  // Trials 5-8: Clockwise Alternating Runs Practice (Quadrants 1 -> 2 -> 3 -> 4)
  // Q1: Top-Left (Letter Task)
  list.push({
    blockType: 'mixed',
    taskType: 'letter',
    letter: pickRandom(TASK_SWITCHING_VOWELS),
    number: pickRandom(TASK_SWITCHING_EVEN_NUMBERS),
    correctResponse: 'B',
    isTaskSwitch: false,
    isTaskRepeat: false,
    quadrant: 1,
    stimulusPosition: 'top-left',
  });
  // Q2: Top-Right (Letter Task -> Repeat)
  list.push({
    blockType: 'mixed',
    taskType: 'letter',
    letter: pickRandom(TASK_SWITCHING_CONSONANTS),
    number: pickRandom(TASK_SWITCHING_ODD_NUMBERS),
    correctResponse: 'N',
    isTaskSwitch: false,
    isTaskRepeat: true,
    quadrant: 2,
    stimulusPosition: 'top-right',
  });
  // Q3: Bottom-Right (Number Task -> Switch)
  list.push({
    blockType: 'mixed',
    taskType: 'number',
    letter: pickRandom(TASK_SWITCHING_VOWELS),
    number: pickRandom(TASK_SWITCHING_ODD_NUMBERS),
    correctResponse: 'B',
    isTaskSwitch: true,
    isTaskRepeat: false,
    quadrant: 3,
    stimulusPosition: 'bottom-right',
  });
  // Q4: Bottom-Left (Number Task -> Repeat)
  list.push({
    blockType: 'mixed',
    taskType: 'number',
    letter: pickRandom(TASK_SWITCHING_CONSONANTS),
    number: pickRandom(TASK_SWITCHING_EVEN_NUMBERS),
    correctResponse: 'N',
    isTaskSwitch: false,
    isTaskRepeat: true,
    quadrant: 4,
    stimulusPosition: 'bottom-left',
  });

  return list;
}

function generateBlockTrials(blockType: TaskSwitchingBlockType): TrialItem[] {
  const list: TrialItem[] = [];

  if (blockType === 'pure-letter') {
    // 32 trials in Top Row (Quadrants 1 & 2): 16 vowels (B), 16 consonants (N)
    for (let i = 0; i < 16; i++) {
      const isOdd = i % 2 === 0;
      list.push({
        blockType: 'pure-letter',
        taskType: 'letter',
        letter: pickRandom(TASK_SWITCHING_VOWELS),
        number: isOdd ? pickRandom(TASK_SWITCHING_ODD_NUMBERS) : pickRandom(TASK_SWITCHING_EVEN_NUMBERS),
        correctResponse: 'B',
        isTaskSwitch: false,
        isTaskRepeat: false,
        quadrant: 1,
        stimulusPosition: 'top-left',
      });
      list.push({
        blockType: 'pure-letter',
        taskType: 'letter',
        letter: pickRandom(TASK_SWITCHING_CONSONANTS),
        number: isOdd ? pickRandom(TASK_SWITCHING_ODD_NUMBERS) : pickRandom(TASK_SWITCHING_EVEN_NUMBERS),
        correctResponse: 'N',
        isTaskSwitch: false,
        isTaskRepeat: false,
        quadrant: 2,
        stimulusPosition: 'top-right',
      });
    }
    // Shuffle pure block
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    // Alternate top quadrants (1, 2, 1, 2...)
    for (let i = 0; i < list.length; i++) {
      list[i].quadrant = i % 2 === 0 ? 1 : 2;
      list[i].stimulusPosition = getStimulusPositionFromQuadrant(list[i].quadrant);
    }
  } else if (blockType === 'pure-number') {
    // 32 trials in Bottom Row (Quadrants 4 & 3): 16 odd (B), 16 even (N)
    for (let i = 0; i < 16; i++) {
      const isVowel = i % 2 === 0;
      list.push({
        blockType: 'pure-number',
        taskType: 'number',
        letter: isVowel ? pickRandom(TASK_SWITCHING_VOWELS) : pickRandom(TASK_SWITCHING_CONSONANTS),
        number: pickRandom(TASK_SWITCHING_ODD_NUMBERS),
        correctResponse: 'B',
        isTaskSwitch: false,
        isTaskRepeat: false,
        quadrant: 4,
        stimulusPosition: 'bottom-left',
      });
      list.push({
        blockType: 'pure-number',
        taskType: 'number',
        letter: isVowel ? pickRandom(TASK_SWITCHING_VOWELS) : pickRandom(TASK_SWITCHING_CONSONANTS),
        number: pickRandom(TASK_SWITCHING_EVEN_NUMBERS),
        correctResponse: 'N',
        isTaskSwitch: false,
        isTaskRepeat: false,
        quadrant: 3,
        stimulusPosition: 'bottom-right',
      });
    }
    // Shuffle pure block
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    // Alternate bottom quadrants (4, 3, 4, 3...)
    for (let i = 0; i < list.length; i++) {
      list[i].quadrant = i % 2 === 0 ? 4 : 3;
      list[i].stimulusPosition = getStimulusPositionFromQuadrant(list[i].quadrant);
    }
  } else if (blockType === 'mixed') {
    // 64 trials: Alternating-runs clockwise sequence through 4 quadrants (16 full cycles)
    // Sequence: 1 (Top-Left, Letter) -> 2 (Top-Right, Letter) -> 3 (Bottom-Right, Number) -> 4 (Bottom-Left, Number)
    const quadSequence = [1, 2, 3, 4];
    let prevTask: TaskType | null = null;
    let prevPosition: StimulusPosition | null = null;

    for (let i = 0; i < 64; i++) {
      const quadrant = quadSequence[i % 4];
      const stimulusPosition = getStimulusPositionFromQuadrant(quadrant);
      const task: TaskType = (quadrant === 1 || quadrant === 2) ? 'letter' : 'number';
      const isFirst = i === 0;
      const isTaskRepeat = !isFirst && task === prevTask;
      const isTaskSwitch = !isFirst && task !== prevTask;

      let consistency: RowConsistency | null = null;
      let isConsistent: boolean | null = null;

      if (!isFirst && prevPosition) {
        const prevRow = getStimulusRow(prevPosition);
        const currRow = getStimulusRow(stimulusPosition);
        const matchesRow = prevRow === currRow;
        consistency = matchesRow ? 'consistent' : 'inconsistent';
        isConsistent = matchesRow;
      }

      const isVowel = Math.random() < 0.5;
      const isOdd = Math.random() < 0.5;
      const letter = isVowel ? pickRandom(TASK_SWITCHING_VOWELS) : pickRandom(TASK_SWITCHING_CONSONANTS);
      const number = isOdd ? pickRandom(TASK_SWITCHING_ODD_NUMBERS) : pickRandom(TASK_SWITCHING_EVEN_NUMBERS);

      const correctResponse: TaskSwitchingKey = task === 'letter'
        ? (TASK_SWITCHING_VOWELS.includes(letter) ? 'B' : 'N')
        : (TASK_SWITCHING_ODD_NUMBERS.includes(number) ? 'B' : 'N');

      list.push({
        blockType: 'mixed',
        taskType: task,
        letter,
        number,
        correctResponse,
        isTaskSwitch,
        isTaskRepeat,
        quadrant,
        stimulusPosition,
        consistency,
        isConsistent,
      });

      prevTask = task;
      prevPosition = stimulusPosition;
    }
  }

  return list;
}


export default function TaskSwitchingRoom({ navigate, participant, sessionId, onComplete }: Props) {
  const isResuming = (participant?.taskSwitchingProgressCount || 0) > 0 || participant?.taskSwitchingStatus === 'in_progress';
  const startBlockIdx = (() => {
    const count = participant?.taskSwitchingProgressCount || 0;
    if (count >= 64) return 2;
    if (count >= 32) return 1;
    return 0;
  })();

  const [phase, setPhase] = useState<Phase>(() => {
    if (!isResuming) return 'tutorial';
    return startBlockIdx > 0 ? 'blockIntro' : 'practiceComplete';
  });
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [tutorialFeedback, setTutorialFeedback] = useState<{
    step: number;
    userKey: TaskSwitchingKey;
    isCorrect: boolean;
    explanation: string;
  } | null>(null);

  const goToTutorialStep = (step: number) => {
    setTutorialStep(step);
    setTutorialFeedback(null);
  };

  const handleTutorialResponse = (step: number, key: TaskSwitchingKey) => {
    let isCorrect = false;
    let explanation = '';

    if (step === 1) {
      // Step 1: Letter Rule (Top-Left: E 4)
      isCorrect = key === 'B';
      explanation = isCorrect
        ? "Correct! The stimulus is in the top row, so you respond according to the letter. 'E' is a vowel (A, E, I, O, U), which maps to B. The number '4' is ignored."
        : "Try again! The stimulus is in the top row, so choose your response based on the letter. 'E' is a vowel, so the correct key is B.";
    } else if (step === 2) {
      // Step 2: Number Rule (Bottom-Right: M 7)
      isCorrect = key === 'B';
      explanation = isCorrect
        ? "Correct! The stimulus is in the bottom row, so you respond according to the number. '7' is an odd number (1, 3, 5, 7, 9), which maps to B. The letter 'M' is ignored."
        : "Try again! The stimulus is in the bottom row, so choose your response based on the number. '7' is an odd number, so the correct key is B.";
    }

    setTutorialFeedback({
      step,
      userKey: key,
      isCorrect,
      explanation,
    });
  };

  const [currentBlockIndex, setCurrentBlockIndex] = useState<number>(startBlockIdx);
  const [trialIndexInBlock, setTrialIndexInBlock] = useState<number>(0);
  const [trialStage, setTrialStage] = useState<TrialStage>('fixation');
  const [showExit, setShowExit] = useState<boolean>(false);
  const sessionOptionsRef = useRef(getExperimentSessionOptions());
  const sessionOptions = sessionOptionsRef.current;

  // Response feedback state (used exclusively for practice educational guidance)
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    title: string;
    explanation: string;
  } | null>(null);

  // Stable trial lists
  const practiceTrialsRef = useRef<TrialItem[]>([]);
  const blocksRef = useRef<TrialItem[][]>([]);

  // Trial records
  const practiceRecordsRef = useRef<TaskSwitchingTrialRecord[]>([]);
  const experimentalRecordsRef = useRef<TaskSwitchingTrialRecord[]>([]);

  // Timing refs
  const stimulusStartTimeRef = useRef<number>(0);
  const isAcceptingResponseRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize trial lists once on mount
  useEffect(() => {
    practiceTrialsRef.current = generatePracticeTrials();
    blocksRef.current = [
      generateBlockTrials('pure-letter'),
      generateBlockTrials('pure-number'),
      generateBlockTrials('mixed'),
    ];
  }, []);

  const clearActiveTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearActiveTimer();
  }, []);

  // Compute final session metrics
  const computeTaskSwitchingResult = (): TaskSwitchingSessionResult => {
    const trials = experimentalRecordsRef.current;
    const totalTrials = trials.length;
    const totalCorrectTrials = trials.filter(t => t.isCorrect).length;
    const overallAccuracy = totalTrials > 0 ? (totalCorrectTrials / totalTrials) * 100 : 0;

    // Pure Letter
    const pureLetterList = trials.filter(t => t.blockType === 'pure-letter');
    const pureLetterTrials = pureLetterList.length;
    const pureLetterCorrect = pureLetterList.filter(t => t.isCorrect).length;
    const pureLetterAccuracy = pureLetterTrials > 0 ? (pureLetterCorrect / pureLetterTrials) * 100 : 0;
    const correctPureLetter = pureLetterList.filter(t => t.isCorrect);
    const pureLetterMeanRtMs = correctPureLetter.length > 0
      ? correctPureLetter.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctPureLetter.length
      : 0;

    // Pure Number
    const pureNumberList = trials.filter(t => t.blockType === 'pure-number');
    const pureNumberTrials = pureNumberList.length;
    const pureNumberCorrect = pureNumberList.filter(t => t.isCorrect).length;
    const pureNumberAccuracy = pureNumberTrials > 0 ? (pureNumberCorrect / pureNumberTrials) * 100 : 0;
    const correctPureNumber = pureNumberList.filter(t => t.isCorrect);
    const pureNumberMeanRtMs = correctPureNumber.length > 0
      ? correctPureNumber.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctPureNumber.length
      : 0;

    // Mixed
    const mixedList = trials.filter(t => t.blockType === 'mixed');
    const mixedTrials = mixedList.length;
    const mixedCorrect = mixedList.filter(t => t.isCorrect).length;
    const mixedAccuracy = mixedTrials > 0 ? (mixedCorrect / mixedTrials) * 100 : 0;

    // Mixed Repeat
    const mixedRepeatList = mixedList.filter(t => t.isTaskRepeat);
    const mixedRepeatTrials = mixedRepeatList.length;
    const mixedRepeatCorrect = mixedRepeatList.filter(t => t.isCorrect).length;
    const mixedRepeatAccuracy = mixedRepeatTrials > 0 ? (mixedRepeatCorrect / mixedRepeatTrials) * 100 : 0;
    const correctMixedRepeat = mixedRepeatList.filter(t => t.isCorrect && typeof t.reactionTimeMs === 'number' && t.reactionTimeMs > 0);
    const mixedRepeatMeanRtMs = correctMixedRepeat.length > 0
      ? Math.round((correctMixedRepeat.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctMixedRepeat.length) * 10) / 10
      : 0;

    // Mixed Switch
    const mixedSwitchList = mixedList.filter(t => t.isTaskSwitch);
    const mixedSwitchTrials = mixedSwitchList.length;
    const mixedSwitchCorrect = mixedSwitchList.filter(t => t.isCorrect).length;
    const mixedSwitchAccuracy = mixedSwitchTrials > 0 ? (mixedSwitchCorrect / mixedSwitchTrials) * 100 : 0;
    const correctMixedSwitch = mixedSwitchList.filter(t => t.isCorrect && typeof t.reactionTimeMs === 'number' && t.reactionTimeMs > 0);
    const mixedSwitchMeanRtMs = correctMixedSwitch.length > 0
      ? Math.round((correctMixedSwitch.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctMixedSwitch.length) * 10) / 10
      : 0;

    // Switch Cost = Mean correct Switch RT - Mean correct Repeat RT
    const switchCostMs = (correctMixedSwitch.length > 0 && correctMixedRepeat.length > 0)
      ? Math.round((mixedSwitchMeanRtMs - mixedRepeatMeanRtMs) * 10) / 10
      : 0;

    // Spatial Shift Cost (Row Consistency in Randomized Mixed Block)
    // Practice and pure blocks are strictly excluded; only mixedList is examined
    const mixedConsistentList = mixedList.filter(t => t.consistency === 'consistent');
    const consistentTrials = mixedConsistentList.length;
    const correctConsistent = mixedConsistentList.filter(t => t.isCorrect && typeof t.reactionTimeMs === 'number' && t.reactionTimeMs > 0);
    const consistentCorrect = correctConsistent.length;
    const consistentMeanRtMs = correctConsistent.length > 0
      ? Math.round((correctConsistent.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctConsistent.length) * 10) / 10
      : null;

    const mixedInconsistentList = mixedList.filter(t => t.consistency === 'inconsistent');
    const inconsistentTrials = mixedInconsistentList.length;
    const correctInconsistent = mixedInconsistentList.filter(t => t.isCorrect && typeof t.reactionTimeMs === 'number' && t.reactionTimeMs > 0);
    const inconsistentCorrect = correctInconsistent.length;
    const inconsistentMeanRtMs = correctInconsistent.length > 0
      ? Math.round((correctInconsistent.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctInconsistent.length) * 10) / 10
      : null;

    // Shift Cost = Mean RT (inconsistent) - Mean RT (consistent) on valid correct trials
    const shiftCostMs = (inconsistentMeanRtMs !== null && consistentMeanRtMs !== null)
      ? Math.round((inconsistentMeanRtMs - consistentMeanRtMs) * 10) / 10
      : null;

    return {
      totalTrials,
      totalCorrectTrials,
      overallAccuracy,
      pureLetterTrials,
      pureLetterCorrect,
      pureLetterAccuracy,
      pureLetterMeanRtMs,
      pureNumberTrials,
      pureNumberCorrect,
      pureNumberAccuracy,
      pureNumberMeanRtMs,
      mixedTrials,
      mixedCorrect,
      mixedAccuracy,
      mixedRepeatTrials,
      mixedRepeatCorrect,
      mixedRepeatAccuracy,
      mixedRepeatMeanRtMs,
      mixedSwitchTrials,
      mixedSwitchCorrect,
      mixedSwitchAccuracy,
      mixedSwitchMeanRtMs,
      switchCostMs,
      consistentTrials,
      consistentCorrect,
      consistentMeanRtMs,
      inconsistentTrials,
      inconsistentCorrect,
      inconsistentMeanRtMs,
      shiftCostMs,
      trials,
      practiceTrials: practiceRecordsRef.current,
    };
  };

  // Start trial stimulus flow
  const runTrialStage = useCallback((stage: TrialStage) => {
    clearActiveTimer();
    setTrialStage(stage);

    if (stage === 'fixation') {
      isAcceptingResponseRef.current = false;
      timerRef.current = setTimeout(() => {
        setTrialStage('stimulus');
        stimulusStartTimeRef.current = performance.now();
        isAcceptingResponseRef.current = true;
      }, FIXATION_DURATION);
    }
  }, []);

  // Begin practice
  const handleStartPractice = () => {
    practiceRecordsRef.current = [];
    setTrialIndexInBlock(0);
    setPhase('practice');
    runTrialStage('fixation');
  };

  // Begin a specific experimental block
  const handleStartBlock = (blockIdx: number) => {
    setCurrentBlockIndex(blockIdx);
    setTrialIndexInBlock(0);
    setPhase('experiment');
    runTrialStage('fixation');
  };

  // Response handler (invoked by B/N keyboard keys or buttons)
  const handleResponse = useCallback((responseKey: TaskSwitchingKey) => {
    if (!isAcceptingResponseRef.current) return;
    if (trialStage !== 'stimulus') return;

    // Immediately lock response window to prevent double presses
    isAcceptingResponseRef.current = false;
    const reactionTimeMs = performance.now() - stimulusStartTimeRef.current;

    const isPractice = phase === 'practice';
    const currentItem = isPractice
      ? practiceTrialsRef.current[trialIndexInBlock]
      : blocksRef.current[currentBlockIndex]?.[trialIndexInBlock];

    if (!currentItem) return;

    const isCorrect = responseKey === currentItem.correctResponse;
    const overallTrialNum = isPractice
      ? trialIndexInBlock + 1
      : experimentalRecordsRef.current.length + 1;

    // Classify spatial consistency strictly against immediately preceding randomized trial
    let consistency: RowConsistency | null = null;
    let isConsistent: boolean | null = null;

    if (!isPractice && currentItem.blockType === 'mixed') {
      const mixedRecords = experimentalRecordsRef.current.filter(r => r.blockType === 'mixed');
      if (mixedRecords.length > 0) {
        const prevTrial = mixedRecords[mixedRecords.length - 1];
        if (prevTrial.stimulusPosition && currentItem.stimulusPosition) {
          const prevRow = getStimulusRow(prevTrial.stimulusPosition);
          const currRow = getStimulusRow(currentItem.stimulusPosition);
          const matchesRow = prevRow === currRow;
          consistency = matchesRow ? 'consistent' : 'inconsistent';
          isConsistent = matchesRow;
        }
      }
    }

    const record: TaskSwitchingTrialRecord = {
      trialNumber: overallTrialNum,
      phase: isPractice ? 'practice' : 'experimental',
      blockType: currentItem.blockType,
      taskType: currentItem.taskType,
      letter: currentItem.letter,
      number: currentItem.number,
      correctResponse: currentItem.correctResponse,
      participantResponse: responseKey,
      isCorrect,
      status: isCorrect ? 'correct' : 'incorrect',
      reactionTimeMs: Math.round(reactionTimeMs * 10) / 10,
      timestampMs: Date.now(),
      isTaskSwitch: currentItem.isTaskSwitch,
      isTaskRepeat: currentItem.isTaskRepeat,
      quadrant: currentItem.quadrant,
      stimulusPosition: currentItem.stimulusPosition,
      consistency,
      isConsistent,
    };

    if (isPractice) {
      practiceRecordsRef.current.push(record);
      // Educational feedback during practice
      const feedbackMsg = getPracticeFeedbackMessage(currentItem, isCorrect);
      setFeedback({
        isCorrect,
        title: feedbackMsg.title,
        explanation: feedbackMsg.explanation,
      });
      setTrialStage('feedback');

      clearActiveTimer();
      timerRef.current = setTimeout(() => {
        setFeedback(null);
        if (trialIndexInBlock + 1 >= PRACTICE_COUNT) {
          setPhase('practiceComplete');
        } else {
          setTrialIndexInBlock(prev => prev + 1);
          runTrialStage('fixation');
        }
      }, PRACTICE_FEEDBACK_DURATION);
    } else {
      experimentalRecordsRef.current.push(record);
      // Real experiment: show visual feedback (Correct! / Incorrect) on every trial
      setFeedback({
        isCorrect,
        title: isCorrect ? 'Correct!' : 'Incorrect',
        explanation: '',
      });
      setTrialStage('feedback');

      clearActiveTimer();
      timerRef.current = setTimeout(() => {
        setFeedback(null);
        const currentBlockTrials = blocksRef.current[currentBlockIndex] || [];
        if (trialIndexInBlock + 1 < currentBlockTrials.length) {
          // Next trial in current block
          setTrialIndexInBlock(prev => prev + 1);
          runTrialStage('fixation');
        } else {
          // Current block finished
          if (currentBlockIndex + 1 < blocksRef.current.length) {
            // Transition to next block
            setCurrentBlockIndex(prev => prev + 1);
            setPhase('blockIntro');
          } else {
            // All 3 blocks finished (128 trials total)
            setPhase('taskComplete');
            // Auto-persist full results immediately on task completion
            const finalRes = computeTaskSwitchingResult();
            if (activeSid) {
              persistTaskSwitchingResults(activeSid, finalRes).catch(err => {
                console.error('[TaskSwitchingRoom] Failed to auto-persist Task Switching results on completion:', err);
              });
            }
          }
        }
      }, EXPERIMENT_FEEDBACK_DURATION);
    }

    // Immediately persist each trial to Supabase
    const activeSid = sessionId || getStoredSessionContext()?.sessionId;
    if (activeSid) {
      persistTaskSwitchingTrial(activeSid, record).catch(err => {
        console.error('[TaskSwitchingRoom] Failed to persist trial:', err);
      });
    } else {
      console.warn('[TaskSwitchingRoom] No session ID available for trial persistence');
    }
  }, [phase, currentBlockIndex, trialIndexInBlock, trialStage, runTrialStage, sessionId]);

  // Global keyboard listener for 'b' / 'B' and 'n' / 'N'
  useEffect(() => {
    if (phase !== 'practice' && phase !== 'experiment' && phase !== 'tutorial') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        return;
      }
      const key = e.key.toUpperCase();
      if (key === 'B' || key === 'N') {
        if (phase === 'tutorial') {
          if (tutorialStep >= 1 && tutorialStep <= 2) {
            handleTutorialResponse(tutorialStep, key as TaskSwitchingKey);
          }
        } else if (phase === 'practice' || phase === 'experiment') {
          handleResponse(key as TaskSwitchingKey);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [phase, tutorialStep, handleResponse]);

  const handleFinish = () => {
    const result = computeTaskSwitchingResult();
    const activeSid = sessionId || getStoredSessionContext()?.sessionId;
    if (activeSid) {
      persistTaskSwitchingResults(activeSid, result).catch(err => {
        console.error('[TaskSwitchingRoom] Error persisting Task Switching results on finish:', err);
      });
    }
    onComplete(result);
    navigate('participant-dashboard');
  };

  const currentItem = phase === 'practice'
    ? practiceTrialsRef.current[trialIndexInBlock]
    : blocksRef.current[currentBlockIndex]?.[trialIndexInBlock];

  const currentBlockTrials = blocksRef.current[currentBlockIndex] || [];

  return (
    <div className="min-h-screen bg-[#EAF4F8] dark:bg-[#131F27] flex flex-col transition-colors">
      <ParticipantNav
        navigate={navigate}
        participantId={participant.id}
        showExit={sessionOptions.allowMidSessionExit}
        onExit={() => setShowExit(true)}
      />

      {showExit && (
        <ConfirmExitModal
          onConfirm={() => navigate('participant-dashboard')}
          onCancel={() => setShowExit(false)}
        />
      )}

      {/* Header Strip */}
      <div className="bg-white dark:bg-[#1A2B36] border-b border-[#C5DCE4] dark:border-[#314E62] px-4 sm:px-8 py-3 sm:py-4 transition-colors">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-[#183B4A] dark:text-[#A2C4D6] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">
              Room 04 — Task Switching
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs sm:text-sm font-bold text-[#183B4A] dark:text-[#F1F8FB] font-['Plus_Jakarta_Sans',sans-serif]">
                {phase === 'tutorial'
                  ? `Interactive Tutorial (Step ${tutorialStep + 1} of 3)`
                  : phase === 'practice'
                  ? `Practice Phase (${trialIndexInBlock + 1} of ${PRACTICE_COUNT})`
                  : phase === 'experiment'
                  ? `Block ${currentBlockIndex + 1} of 3 (${trialIndexInBlock + 1} of ${currentBlockTrials.length})`
                  : 'Number Letter Task / Task Switching'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {phase !== 'tutorial' && phase !== 'taskComplete' && (
              <button
                onClick={() => {
                  clearActiveTimer();
                  setPhase('tutorial');
                  goToTutorialStep(0);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EAF4F8] dark:bg-[#203444] border border-[#C5DCE4] dark:border-[#314E62] text-xs font-bold text-[#183B4A] dark:text-[#F1F8FB] hover:bg-white dark:hover:bg-[#284154] transition-all cursor-pointer"
              >
                <BookOpen size={14} />
                <span className="hidden sm:inline">Tutorial</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 sm:py-10">

        {/* 1. INTERACTIVE TUTORIAL PHASE */}
        {phase === 'tutorial' && (
          <div className="max-w-2xl w-full bg-white dark:bg-[#1A2B36] rounded-3xl border border-[#C5DCE4] dark:border-[#314E62] shadow-md p-5 sm:p-8 animate-fade-in text-center my-auto transition-colors">
            {/* Step Progress Indicator */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#C5DCE4] dark:border-[#314E62]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EAF4F8] dark:bg-[#203444] text-[#245D72] dark:text-[#63B8C6] flex items-center justify-center font-bold text-xs">
                  <BookOpen size={16} />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-bold text-[#245D72] dark:text-[#63B8C6] uppercase tracking-wider">
                    Interactive Tutorial
                  </div>
                  <div className="text-xs font-semibold text-[#183B4A] dark:text-[#F1F8FB]">
                    Step {tutorialStep + 1} of 3: {
                      tutorialStep === 0 ? 'The 2×2 Grid' :
                      tutorialStep === 1 ? 'Letter Rule (Top Row)' :
                      'Number Rule (Bottom Row)'
                    }
                  </div>
                </div>
              </div>

              {/* Step indicator pills */}
              <div className="flex gap-1.5">
                {[0, 1, 2].map(step => (
                  <button
                    key={step}
                    onClick={() => goToTutorialStep(step)}
                    className={`h-2 rounded-full transition-all ${
                      tutorialStep === step
                        ? 'w-6 bg-[#245D72] dark:bg-[#63B8C6]'
                        : 'w-2 bg-[#C5DCE4] dark:bg-[#314E62] hover:bg-[#85B4C7]'
                    }`}
                    title={`Step ${step + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* STEP 0: GRID OVERVIEW */}
            {tutorialStep === 0 && (
              <div className="space-y-5 animate-fade-in text-left">
                <div className="text-center">
                  <h3 className="text-lg sm:text-xl font-bold text-[#183B4A] dark:text-[#F1F8FB] mb-1 font-['Plus_Jakarta_Sans',sans-serif]">
                    How the 2×2 Grid Works
                  </h3>
                  <p className="text-sm sm:text-base font-semibold text-[#183B4A] dark:text-[#A2C4D6] max-w-lg mx-auto">
                    You will see a letter and a number pair (e.g., 6M) presented inside a <strong>2×2 grid</strong>. Where it appears on the grid determines which task to do:
                  </p>
                </div>

                {/* Visual 2x2 Grid with Directional Highlights */}
                <div className="max-w-xs mx-auto aspect-square border-2 border-[#C5DCE4] dark:border-[#314E62] rounded-2xl grid grid-cols-2 grid-rows-2 relative overflow-hidden bg-white dark:bg-[#16242E] shadow-xs">
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-[#C5DCE4] dark:bg-[#314E62] pointer-events-none" />
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#C5DCE4] dark:bg-[#314E62] pointer-events-none" />

                  {/* Top-Left */}
                  <div className="p-3 bg-[#EAF4F8] dark:bg-[#203444]/60 flex flex-col items-center justify-center border-b border-r border-[#C5DCE4] dark:border-[#314E62]">
                    <span className="text-[10px] font-bold text-[#245D72] dark:text-[#63B8C6] uppercase">Top-Left</span>
                    <span className="text-base font-extrabold text-[#183B4A] dark:text-[#F1F8FB] mt-0.5">Letter Rule</span>
                  </div>
                  {/* Top-Right */}
                  <div className="p-3 bg-[#EAF4F8] dark:bg-[#203444]/60 flex flex-col items-center justify-center border-b border-[#C5DCE4] dark:border-[#314E62]">
                    <span className="text-[10px] font-bold text-[#245D72] dark:text-[#63B8C6] uppercase">Top-Right</span>
                    <span className="text-base font-extrabold text-[#183B4A] dark:text-[#F1F8FB] mt-0.5">Letter Rule</span>
                  </div>
                  {/* Bottom-Left */}
                  <div className="p-3 bg-[#E4F5F2] dark:bg-[#1E3B37]/60 flex flex-col items-center justify-center border-r border-[#C5DCE4] dark:border-[#314E62]">
                    <span className="text-[10px] font-bold text-[#0D9488] dark:text-[#5EEAD4] uppercase">Bottom-Left</span>
                    <span className="text-base font-extrabold text-[#183B4A] dark:text-[#F1F8FB] mt-0.5">Number Rule</span>
                  </div>
                  {/* Bottom-Right */}
                  <div className="p-3 bg-[#E4F5F2] dark:bg-[#1E3B37]/60 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-[#0D9488] dark:text-[#5EEAD4] uppercase">Bottom-Right</span>
                    <span className="text-base font-extrabold text-[#183B4A] dark:text-[#F1F8FB] mt-0.5">Number Rule</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#EAF4F8] dark:bg-[#203444] border border-[#C5DCE4] dark:border-[#314E62]">
                    <div className="font-bold text-[#245D72] dark:text-[#63B8C6] flex items-center gap-1.5 mb-1">
                      <ArrowUp size={14} />
                      Top Row = Letter Rule
                    </div>
                    <p className="text-[#335667] dark:text-[#A2C4D6]">
                      Look at the <strong>letter</strong>. Ignore the number completely.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#E4F5F2] dark:bg-[#1E3B37] border border-[#8DC4BE] dark:border-[#2D5A54]">
                    <div className="font-bold text-[#0D9488] dark:text-[#5EEAD4] flex items-center gap-1.5 mb-1">
                      <ArrowDown size={14} />
                      Bottom Row = Number Rule
                    </div>
                    <p className="text-[#335667] dark:text-[#A2C4D6]">
                      Look at the <strong>number</strong>. Ignore the letter completely.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: LETTER RULE (TOP ROW) */}
            {tutorialStep === 1 && (
              <div className="space-y-4 animate-fade-in text-left">
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAF4F8] dark:bg-[#203444] text-[#245D72] dark:text-[#63B8C6] mb-1">
                    <ArrowUp size={13} />
                    Top Row: Respond According to the Letter
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#183B4A] dark:text-[#F1F8FB] mb-1 font-['Plus_Jakarta_Sans',sans-serif]">
                    Rule 1 — Letter Trials
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-[#183B4A] dark:text-[#A2C4D6] max-w-lg mx-auto">
                    When the number-letter pair (6M) is in the <strong>Top-Left or Top-Right</strong>, select the <strong>LETTER</strong>:
                  </p>
                </div>

                {/* Key Mapping Card */}
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-xs">
                  <div className="p-3 rounded-xl bg-[#EAF4F8] dark:bg-[#203444] border border-[#C5DCE4] dark:border-[#314E62] text-center">
                    <span className="text-[#335667] dark:text-[#A2C4D6] block text-[11px] mb-1 font-semibold">Vowel (A, E, I, O, U)</span>
                    <kbd className="px-3 py-1 bg-white dark:bg-[#16242E] border border-[#C5DCE4] dark:border-[#314E62] rounded-lg text-sm font-mono font-bold text-[#183B4A] dark:text-[#F1F8FB]">B</kbd>
                  </div>
                  <div className="p-3 rounded-xl bg-[#EAF4F8] dark:bg-[#203444] border border-[#C5DCE4] dark:border-[#314E62] text-center">
                    <span className="text-[#335667] dark:text-[#A2C4D6] block text-[11px] mb-1 font-semibold">Consonant (G, K, M, etc.)</span>
                    <kbd className="px-3 py-1 bg-white dark:bg-[#16242E] border border-[#C5DCE4] dark:border-[#314E62] rounded-lg text-sm font-mono font-bold text-[#183B4A] dark:text-[#F1F8FB]">N</kbd>
                  </div>
                </div>

                {/* Interactive Practice Stimulus */}
                <div className="bg-[#F8FBFC] dark:bg-[#16242E] rounded-2xl border border-[#C5DCE4] dark:border-[#314E62] p-4 text-center">
                  <div className="text-[11px] font-bold text-[#245D72] dark:text-[#63B8C6] uppercase tracking-wider mb-2">
                    Try It: Interactive Example
                  </div>

                  {/* Mini 2x2 grid showing E 4 in Top-Left */}
                  <div className="w-44 h-44 mx-auto border-2 border-[#C5DCE4] dark:border-[#314E62] rounded-xl grid grid-cols-2 grid-rows-2 relative overflow-hidden bg-white dark:bg-[#1A2B36] mb-3">
                    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-[#C5DCE4] dark:bg-[#314E62]" />
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-[#C5DCE4] dark:bg-[#314E62]" />

                    {/* Top-Left with E 4 */}
                    <div className="p-2 bg-[#EAF4F8] dark:bg-[#203444] flex items-center justify-center font-black text-2xl text-[#183B4A] dark:text-[#F1F8FB] border-b border-r border-[#C5DCE4] dark:border-[#314E62] animate-pop-in">
                      E&nbsp;&nbsp;4
                    </div>
                    <div className="bg-transparent" />
                    <div className="bg-transparent" />
                    <div className="bg-transparent" />
                  </div>

                  <p className="text-xs text-[#183B4A] dark:text-[#F1F8FB] font-medium mb-3">
                    The stimulus is in the <strong>top row</strong>. The letter is <strong>E</strong>. What do you press?
                  </p>

                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => handleTutorialResponse(1, 'B')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        tutorialFeedback?.step === 1 && tutorialFeedback.userKey === 'B'
                          ? 'bg-[#D1EDE5] dark:bg-[#064E3B]/70 border-[#4A9B7F] text-[#0D9488] dark:text-[#34D399]'
                          : 'bg-white dark:bg-[#203444] border-[#C5DCE4] dark:border-[#314E62] text-[#183B4A] dark:text-[#F1F8FB] hover:bg-[#EAF4F8] dark:hover:bg-[#284154]'
                      }`}
                    >
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#16242E] dark:text-[#F1F8FB] rounded mr-1 font-mono">B</kbd> Vowel
                    </button>
                    <button
                      onClick={() => handleTutorialResponse(1, 'N')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        tutorialFeedback?.step === 1 && tutorialFeedback.userKey === 'N'
                          ? 'bg-[#FCE8EB] dark:bg-[#881337]/70 border-[#E11D48] text-[#DC2626] dark:text-[#FDA4AF]'
                          : 'bg-white dark:bg-[#203444] border-[#C5DCE4] dark:border-[#314E62] text-[#335667] dark:text-[#A2C4D6] hover:bg-[#EAF4F8] dark:hover:bg-[#284154]'
                      }`}
                    >
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#16242E] dark:text-[#F1F8FB] rounded mr-1 font-mono">N</kbd> Consonant
                    </button>
                  </div>

                  {tutorialFeedback?.step === 1 && (
                    <div className={`mt-3 p-2.5 rounded-xl text-xs font-medium animate-pop-in ${
                      tutorialFeedback.isCorrect ? 'bg-[#D1EDE5] dark:bg-[#064E3B]/60 text-[#0D9488] dark:text-[#34D399] border border-emerald-300 dark:border-emerald-700' : 'bg-[#FCE8EB] dark:bg-[#881337]/60 text-[#DC2626] dark:text-[#FDA4AF] border border-rose-300 dark:border-rose-700'
                    }`}>
                      {tutorialFeedback.explanation}
                    </div>
                  )}
                </div>

                {/* Speed Instruction kept at the last of Rule 1 */}
                <div className="bg-[#FFFBEB] dark:bg-[#2A2318] rounded-2xl border border-[#FDE68A] dark:border-[#78350F] p-3 text-center shadow-xs">
                  <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-[#B45309] dark:text-[#FCD34D]">
                    <Zap size={16} className="text-[#D97706] dark:text-[#F59E0B] animate-pulse flex-shrink-0" />
                    <span>Respond as quickly and accurately as possible.</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: NUMBER RULE (BOTTOM ROW) */}
            {tutorialStep === 2 && (
              <div className="space-y-4 animate-fade-in text-left">
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E4F5F2] dark:bg-[#1E3B37] text-[#0D9488] dark:text-[#5EEAD4] mb-1">
                    <ArrowDown size={13} />
                    Bottom Row: Respond According to the Number
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#183B4A] dark:text-[#F1F8FB] mb-1 font-['Plus_Jakarta_Sans',sans-serif]">
                    Rule 2 — Number Trials
                  </h3>
                  <p className="text-xs sm:text-sm text-[#335667] dark:text-[#A2C4D6] max-w-lg mx-auto">
                    When the stimulus appears in the <strong>Bottom-Left or Bottom-Right</strong>, choose your response based on the <strong>NUMBER</strong>:
                  </p>
                </div>

                {/* Key Mapping Card */}
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-xs">
                  <div className="p-3 rounded-xl bg-[#E4F5F2] dark:bg-[#1E3B37] border border-[#8DC4BE] dark:border-[#2D5A54] text-center">
                    <span className="text-[#335667] dark:text-[#A2C4D6] block text-[11px] mb-1 font-semibold">Odd (1, 3, 5, 7, 9)</span>
                    <kbd className="px-3 py-1 bg-white dark:bg-[#16242E] border border-[#8DC4BE] dark:border-[#2D5A54] rounded-lg text-sm font-mono font-bold text-[#0D9488] dark:text-[#5EEAD4]">B</kbd>
                  </div>
                  <div className="p-3 rounded-xl bg-[#E4F5F2] dark:bg-[#1E3B37] border border-[#8DC4BE] dark:border-[#2D5A54] text-center">
                    <span className="text-[#335667] dark:text-[#A2C4D6] block text-[11px] mb-1 font-semibold">Even (2, 4, 6, 8)</span>
                    <kbd className="px-3 py-1 bg-white dark:bg-[#16242E] border border-[#8DC4BE] dark:border-[#2D5A54] rounded-lg text-sm font-mono font-bold text-[#0D9488] dark:text-[#5EEAD4]">N</kbd>
                  </div>
                </div>

                {/* Interactive Practice Stimulus */}
                <div className="bg-[#F8FBFC] dark:bg-[#16242E] rounded-2xl border border-[#C5DCE4] dark:border-[#314E62] p-4 text-center">
                  <div className="text-[11px] font-bold text-[#0D9488] dark:text-[#5EEAD4] uppercase tracking-wider mb-2">
                    Try It: Interactive Example
                  </div>

                  {/* Mini 2x2 grid showing M 7 in Bottom-Right */}
                  <div className="w-44 h-44 mx-auto border-2 border-[#C5DCE4] dark:border-[#314E62] rounded-xl grid grid-cols-2 grid-rows-2 relative overflow-hidden bg-white dark:bg-[#1A2B36] mb-3">
                    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-[#C5DCE4] dark:bg-[#314E62]" />
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-[#C5DCE4] dark:bg-[#314E62]" />

                    <div className="bg-transparent" />
                    <div className="bg-transparent" />
                    <div className="bg-transparent" />
                    {/* Bottom-Right with M 7 */}
                    <div className="p-2 bg-[#E4F5F2] dark:bg-[#1E3B37] flex items-center justify-center font-black text-2xl text-[#183B4A] dark:text-[#F1F8FB] border-t border-l border-[#8DC4BE] dark:border-[#2D5A54] animate-pop-in">
                      M&nbsp;&nbsp;7
                    </div>
                  </div>

                  <p className="text-xs text-[#183B4A] dark:text-[#F1F8FB] font-medium mb-3">
                    The stimulus is in the <strong>bottom row</strong>. The number is <strong>7</strong>. What do you press?
                  </p>

                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => handleTutorialResponse(2, 'B')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        tutorialFeedback?.step === 2 && tutorialFeedback.userKey === 'B'
                          ? 'bg-[#D1EDE5] dark:bg-[#064E3B]/70 border-[#4A9B7F] text-[#0D9488] dark:text-[#34D399]'
                          : 'bg-white dark:bg-[#203444] border-[#8DC4BE] dark:border-[#2D5A54] text-[#0D9488] dark:text-[#5EEAD4] hover:bg-[#E4F5F2] dark:hover:bg-[#1E3B37]'
                      }`}
                    >
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#16242E] dark:text-[#F1F8FB] rounded mr-1 font-mono">B</kbd> Odd
                    </button>
                    <button
                      onClick={() => handleTutorialResponse(2, 'N')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        tutorialFeedback?.step === 2 && tutorialFeedback.userKey === 'N'
                          ? 'bg-[#FCE8EB] dark:bg-[#881337]/70 border-[#E11D48] text-[#DC2626] dark:text-[#FDA4AF]'
                          : 'bg-white dark:bg-[#203444] border-[#C5DCE4] dark:border-[#314E62] text-[#335667] dark:text-[#A2C4D6] hover:bg-[#EAF4F8] dark:hover:bg-[#284154]'
                      }`}
                    >
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#16242E] dark:text-[#F1F8FB] rounded mr-1 font-mono">N</kbd> Even
                    </button>
                  </div>

                  {tutorialFeedback?.step === 2 && (
                    <div className={`mt-3 p-2.5 rounded-xl text-xs font-medium animate-pop-in ${
                      tutorialFeedback.isCorrect ? 'bg-[#D1EDE5] dark:bg-[#064E3B]/60 text-[#0D9488] dark:text-[#34D399] border border-emerald-300 dark:border-emerald-700' : 'bg-[#FCE8EB] dark:bg-[#881337]/60 text-[#DC2626] dark:text-[#FDA4AF] border border-rose-300 dark:border-rose-700'
                    }`}>
                      {tutorialFeedback.explanation}
                    </div>
                  )}
                </div>

                {/* Speed Instruction kept at the last of Rule 2 */}
                <div className="bg-[#FFFBEB] dark:bg-[#2A2318] rounded-2xl border border-[#FDE68A] dark:border-[#78350F] p-3 text-center shadow-xs">
                  <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-[#B45309] dark:text-[#FCD34D]">
                    <Zap size={16} className="text-[#D97706] dark:text-[#F59E0B] animate-pulse flex-shrink-0" />
                    <span>Respond as quickly and accurately as possible.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Between Tutorial Steps */}
            <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-[#C5DCE4] dark:border-[#314E62]">
              {tutorialStep > 0 ? (
                <button
                  onClick={() => goToTutorialStep(tutorialStep - 1)}
                  className="px-4 py-2.5 rounded-xl bg-[#EAF4F8] dark:bg-[#203444] border border-[#C5DCE4] dark:border-[#314E62] text-xs font-bold text-[#183B4A] dark:text-[#F1F8FB] hover:bg-white dark:hover:bg-[#284154] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  Previous Step
                </button>
              ) : (
                <div />
              )}

              {tutorialStep < 2 ? (
                <button
                  onClick={() => goToTutorialStep(tutorialStep + 1)}
                  className="px-6 py-2.5 text-xs font-bold shadow-sm rounded-xl text-white bg-gradient-to-r from-[#245D72] to-[#4D91AD] hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  Next Step
                  <ArrowRight size={14} />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      clearActiveTimer();
                      handleStartPractice();
                    }}
                    className="px-6 py-2.5 text-xs font-bold shadow-md rounded-xl text-white bg-gradient-to-r from-[#245D72] to-[#4D91AD] hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    Start Practice (8 Trials)
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 1. INTRO PHASE — PRACTICE INSTRUCTIONS */}
        {phase === 'intro' && (
          <div className="text-center max-w-xl w-full animate-fade-in-up">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#EAF4F8] dark:bg-[#203444] rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-5 text-[#245D72] dark:text-[#63B8C6]">
              <RefreshCw size={26} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#183B4A] dark:text-[#F1F8FB] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Alternating-Runs Task Switching
            </h2>
            <p className="text-sm sm:text-base font-semibold text-[#11152F] dark:text-[#EAF4F8] leading-relaxed mb-6">
              You will see a letter and a number pair (e.g., 6M) presented inside a <strong>2×2 grid</strong>. Where it appears on the grid determines which task to do:
            </p>

            {/* Prominent, Larger, Bold Speed Instruction Banner */}
            <div className="bg-[#FFFBEB] dark:bg-[#2A2318] rounded-2xl border border-[#FDE68A] dark:border-[#78350F] p-4 sm:p-5 mb-6 text-center shadow-xs">
              <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-extrabold text-[#B45309] dark:text-[#FCD34D]">
                <Zap size={20} className="text-[#D97706] dark:text-[#F59E0B] animate-pulse flex-shrink-0" />
                <span>Respond as quickly and accurately as possible.</span>
              </div>
              <p className="text-xs text-[#92400E] dark:text-[#FDE68A] mt-1 font-medium">
                Use the <strong>B</strong> and <strong>N</strong> keys on your keyboard.
              </p>
            </div>

            {/* Task rules comparison cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 text-left">
              {/* Top Row — Letter Task */}
              <div className="bg-white dark:bg-[#1A2B36] rounded-2xl border border-[#C5DCE4] dark:border-[#314E62] p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#245D72] dark:bg-[#63B8C6]" />
                  <span className="text-xs font-extrabold text-[#245D72] dark:text-[#63B8C6] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                    TOP ROW — LETTER TASK
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#183B4A] dark:text-[#F1F8FB] mb-3">
                  When the number-letter pair (6M) is in the <strong>Top-Left or Top-Right</strong>, select the <strong>LETTER</strong>:
                </p>
                <div className="space-y-2 text-xs font-semibold">
                  <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-[#EAF4F8] dark:bg-[#203444] border border-[#C5DCE4] dark:border-[#314E62]">
                    <span className="text-[#183B4A] dark:text-[#F1F8FB]">Vowel (A, E, I, O, U)</span>
                    <kbd className="px-2 sm:px-2.5 py-1 bg-white dark:bg-[#16242E] border border-[#C5DCE4] dark:border-[#314E62] rounded-lg text-xs font-mono font-bold text-[#183B4A] dark:text-[#F1F8FB]">B</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-[#EAF4F8] dark:bg-[#203444] border border-[#C5DCE4] dark:border-[#314E62]">
                    <span className="text-[#183B4A] dark:text-[#F1F8FB]">Consonant</span>
                    <kbd className="px-2 sm:px-2.5 py-1 bg-white dark:bg-[#16242E] border border-[#C5DCE4] dark:border-[#314E62] rounded-lg text-xs font-mono font-bold text-[#183B4A] dark:text-[#F1F8FB]">N</kbd>
                  </div>
                </div>
              </div>

              {/* Bottom Row — Number Task */}
              <div className="bg-white dark:bg-[#1A2B36] rounded-2xl border border-[#8DC4BE] dark:border-[#2D5A54] p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
                  <span className="text-xs font-extrabold text-[#0D9488] dark:text-[#5EEAD4] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                    BOTTOM ROW — NUMBER TASK
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#183B4A] dark:text-[#F1F8FB] mb-3">
                  When the number-letter pair (6M) is in the <strong>Bottom-Left or Bottom-Right</strong>, select the <strong>NUMBER</strong>:
                </p>
                <div className="space-y-2 text-xs font-semibold">
                  <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-[#E4F5F2] dark:bg-[#1E3B37] border border-[#8DC4BE] dark:border-[#2D5A54]">
                    <span className="text-[#183B4A] dark:text-[#F1F8FB]">Odd (1, 3, 5, 7, 9)</span>
                    <kbd className="px-2 sm:px-2.5 py-1 bg-white dark:bg-[#16242E] border border-[#8DC4BE] dark:border-[#2D5A54] rounded-lg text-xs font-mono font-bold text-[#0D9488] dark:text-[#5EEAD4]">B</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-[#E4F5F2] dark:bg-[#1E3B37] border border-[#8DC4BE] dark:border-[#2D5A54]">
                    <span className="text-[#183B4A] dark:text-[#F1F8FB]">Even (2, 4, 6, 8)</span>
                    <kbd className="px-2 sm:px-2.5 py-1 bg-white dark:bg-[#16242E] border border-[#8DC4BE] dark:border-[#2D5A54] rounded-lg text-xs font-mono font-bold text-[#0D9488] dark:text-[#5EEAD4]">N</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Alternating runs explanation */}
            <div className="bg-white dark:bg-[#1A2B36] rounded-2xl border border-[#C5DCE4] dark:border-[#314E62] p-3.5 sm:p-4 mb-6 sm:mb-8 text-left text-xs text-[#245D72] dark:text-[#A2C4D6] space-y-2 shadow-xs">
              <div className="flex items-start gap-2.5">
                <RefreshCw size={15} className="text-[#245D72] dark:text-[#63B8C6] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Predictable Alternating Runs:</strong> In the mixed block, the stimulus rotates <strong>clockwise</strong> around the 4 quadrants on every turn (Top-Left → Top-Right → Bottom-Right → Bottom-Left). There are <strong>no written task cues</strong>—the quadrant indicates the task!
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  clearActiveTimer();
                  setPhase('tutorial');
                  goToTutorialStep(0);
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white dark:bg-[#203444] border border-[#C5DCE4] dark:border-[#314E62] text-xs sm:text-sm font-bold text-[#183B4A] dark:text-[#F1F8FB] hover:bg-[#EAF4F8] dark:hover:bg-[#284154] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <BookOpen size={16} />
                View Interactive Tutorial
              </button>
              <button
                onClick={handleStartPractice}
                className="btn-primary w-full sm:w-auto px-8 sm:px-10 py-3.5 text-xs sm:text-base shadow-md justify-center"
              >
                Begin Practice (8 Trials)
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}


        {/* 2. PRACTICE PHASE & 4. EXPERIMENTAL TRIAL PHASE */}
        {(phase === 'practice' || phase === 'experiment') && currentItem && (
          <div className="flex flex-col items-center gap-3 sm:gap-5 w-full max-w-xl animate-fade-in">
            {/* Header info badge (No task cue words in experimental phase) */}
            <div className="flex items-center gap-2 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold font-['Plus_Jakarta_Sans',sans-serif] bg-white dark:bg-[#1A2B36] border border-[#C5DCE4] dark:border-[#314E62] shadow-xs text-[#183B4A] dark:text-[#F1F8FB] text-center">
              {phase === 'practice' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#245D72] dark:bg-[#63B8C6] animate-pulse" />
                  Practice Phase ({trialIndexInBlock + 1} of {PRACTICE_COUNT})
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#245D72] dark:bg-[#63B8C6] animate-pulse" />
                  Block {currentBlockIndex + 1} of 3: {currentBlockIndex === 0 ? 'Pure Letter' : currentBlockIndex === 1 ? 'Pure Number' : 'Mixed Alternating Runs'} ({trialIndexInBlock + 1} of {currentBlockTrials.length})
                </>
              )}
            </div>

            {/* Feedback Area for Both Practice and Experimental Phase */}
            <div className="min-h-[2.5rem] flex items-center justify-center w-full px-2">
              {trialStage === 'feedback' && feedback && (
                <div
                  className={`flex items-center gap-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold animate-pop-in border shadow-xs text-center ${
                    feedback.isCorrect
                      ? 'bg-[#D1EDE5] dark:bg-[#064E3B]/70 border-[#4A9B7F]/30 text-[#0D9488] dark:text-[#34D399]'
                      : 'bg-[#FCE8EB] dark:bg-[#881337]/70 border-[#E11D48]/30 text-[#DC2626] dark:text-[#FDA4AF]'
                  }`}
                >
                  {feedback.isCorrect ? (
                    <CheckCircle size={16} className="text-[#0D9488] dark:text-[#34D399] flex-shrink-0" />
                  ) : (
                    <X size={16} className="text-[#DC2626] dark:text-[#FDA4AF] flex-shrink-0" />
                  )}
                  <span className="font-['Plus_Jakarta_Sans',sans-serif] break-words">
                    {feedback.explanation ? `${feedback.title} — ${feedback.explanation}` : feedback.title}
                  </span>
                </div>
              )}
            </div>

            {/* Prominent Speed Instruction */}
            <div className="w-full max-w-sm sm:max-w-md text-center py-2 px-4 rounded-2xl bg-white dark:bg-[#1A2B36] border border-[#C5DCE4] dark:border-[#314E62] shadow-xs mb-1">
              <span className="text-xs sm:text-sm font-extrabold text-[#183B4A] dark:text-[#F1F8FB] tracking-tight flex items-center justify-center gap-2">
                <Zap size={16} className="text-[#245D72] dark:text-[#63B8C6] flex-shrink-0 animate-pulse" />
                <span>Respond as quickly and accurately as possible.</span>
              </span>
            </div>

            {/* Alternating-Runs 2×2 Quadrant Grid */}
            <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center">
              {/* Top row guide (visible exclusively during practice phase) */}
              {phase === 'practice' && (
                <div className="w-full flex justify-between px-3 mb-1 text-[11px] font-bold tracking-wider uppercase text-[#245D72] dark:text-[#63B8C6]">
                  <span>Top Row: Letter Task</span>
                  <span className="text-[10px] text-[#335667] dark:text-[#A2C4D6] font-normal font-mono">B = Vowel · N = Consonant</span>
                </div>
              )}

              {/* 2×2 Quadrant Grid Frame */}
              <div className="w-full aspect-square max-h-[280px] sm:max-h-[320px] bg-white dark:bg-[#1A2B36] rounded-3xl border-2 border-[#C5DCE4] dark:border-[#314E62] shadow-sm relative overflow-hidden select-none grid grid-cols-2 grid-rows-2">
                {/* Central Dividing Crosshairs */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-[#C5DCE4] dark:bg-[#314E62] pointer-events-none" />
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#C5DCE4] dark:bg-[#314E62] pointer-events-none" />

                {/* Central Fixation Cross at crosshair intersection */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  {trialStage === 'fixation' ? (
                    <div className="w-7 h-7 rounded-full bg-white dark:bg-[#203444] border border-[#C5DCE4] dark:border-[#314E62] shadow-xs flex items-center justify-center text-base font-mono font-bold text-[#183B4A] dark:text-[#F1F8FB] animate-scale-in">
                      +
                    </div>
                  ) : trialStage === 'interTrial' ? (
                    <div className="w-2 h-2 rounded-full bg-[#C5DCE4] dark:bg-[#314E62]" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C5DCE4]/60 dark:bg-[#314E62]/60" />
                  )}
                </div>

                {/* Quadrant 1: Top-Left (Row 1, Col 1 -> Letter Task) */}
                <div className={`flex items-center justify-center p-3 relative transition-colors ${currentItem.quadrant === 1 ? 'bg-[#EAF4F8]/70 dark:bg-[#203444]/60' : ''}`}>
                  {(trialStage === 'stimulus' || trialStage === 'feedback') && currentItem.quadrant === 1 && (
                    <div className="text-3xl sm:text-5xl font-black font-['Plus_Jakarta_Sans',sans-serif] tracking-wider text-[#183B4A] dark:text-[#F1F8FB] animate-pop-in">
                      {currentItem.letter}&nbsp;&nbsp;{currentItem.number}
                    </div>
                  )}
                </div>

                {/* Quadrant 2: Top-Right (Row 1, Col 2 -> Letter Task) */}
                <div className={`flex items-center justify-center p-3 relative transition-colors ${currentItem.quadrant === 2 ? 'bg-[#EAF4F8]/70 dark:bg-[#203444]/60' : ''}`}>
                  {(trialStage === 'stimulus' || trialStage === 'feedback') && currentItem.quadrant === 2 && (
                    <div className="text-3xl sm:text-5xl font-black font-['Plus_Jakarta_Sans',sans-serif] tracking-wider text-[#183B4A] dark:text-[#F1F8FB] animate-pop-in">
                      {currentItem.letter}&nbsp;&nbsp;{currentItem.number}
                    </div>
                  )}
                </div>

                {/* Quadrant 4: Bottom-Left (Row 2, Col 1 -> Number Task) */}
                <div className={`flex items-center justify-center p-3 relative transition-colors ${currentItem.quadrant === 4 ? 'bg-[#EAF4F8]/70 dark:bg-[#203444]/60' : ''}`}>
                  {(trialStage === 'stimulus' || trialStage === 'feedback') && currentItem.quadrant === 4 && (
                    <div className="text-3xl sm:text-5xl font-black font-['Plus_Jakarta_Sans',sans-serif] tracking-wider text-[#183B4A] dark:text-[#F1F8FB] animate-pop-in">
                      {currentItem.letter}&nbsp;&nbsp;{currentItem.number}
                    </div>
                  )}
                </div>

                {/* Quadrant 3: Bottom-Right (Row 2, Col 2 -> Number Task) */}
                <div className={`flex items-center justify-center p-3 relative transition-colors ${currentItem.quadrant === 3 ? 'bg-[#EAF4F8]/70 dark:bg-[#203444]/60' : ''}`}>
                  {(trialStage === 'stimulus' || trialStage === 'feedback') && currentItem.quadrant === 3 && (
                    <div className="text-3xl sm:text-5xl font-black font-['Plus_Jakarta_Sans',sans-serif] tracking-wider text-[#183B4A] dark:text-[#F1F8FB] animate-pop-in">
                      {currentItem.letter}&nbsp;&nbsp;{currentItem.number}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom row guide (visible exclusively during practice phase) */}
              {phase === 'practice' && (
                <div className="w-full flex justify-between px-3 mt-1 text-[11px] font-bold tracking-wider uppercase text-[#0D9488] dark:text-[#5EEAD4]">
                  <span>Bottom Row: Number Task</span>
                  <span className="text-[10px] text-[#335667] dark:text-[#A2C4D6] font-normal font-mono">B = Odd · N = Even</span>
                </div>
              )}
            </div>

            {/* Response key buttons */}
            <div className="w-full max-w-sm">
              {phase === 'practice' ? (
                /* PRACTICE BUTTONS: Helpful guidance labels */
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {currentItem.taskType === 'letter' ? (
                    <>
                      <button
                        onClick={e => {
                          e.currentTarget.blur();
                          handleResponse('B');
                        }}
                        disabled={trialStage !== 'stimulus'}
                        className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#1A2B36] border-2 border-[#C5DCE4] dark:border-[#314E62] shadow-xs hover:border-[#245D72] dark:hover:border-[#63B8C6] hover:bg-[#EAF4F8] dark:hover:bg-[#203444] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-default cursor-pointer text-[#183B4A] dark:text-[#F1F8FB]"
                      >
                        <kbd className="px-4 sm:px-5 py-1 sm:py-1.5 bg-[#EAF4F8] dark:bg-[#203444] border border-[#C5DCE4] dark:border-[#314E62] rounded-xl text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#183B4A] dark:text-[#F1F8FB] mb-1">
                          B
                        </kbd>
                        <span className="text-xs font-bold text-[#245D72] dark:text-[#63B8C6] font-['Plus_Jakarta_Sans',sans-serif]">
                          Vowel
                        </span>
                      </button>

                      <button
                        onClick={e => {
                          e.currentTarget.blur();
                          handleResponse('N');
                        }}
                        disabled={trialStage !== 'stimulus'}
                        className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#1A2B36] border-2 border-[#C5DCE4] dark:border-[#314E62] shadow-xs hover:border-[#245D72] dark:hover:border-[#63B8C6] hover:bg-[#EAF4F8] dark:hover:bg-[#203444] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-default cursor-pointer text-[#183B4A] dark:text-[#F1F8FB]"
                      >
                        <kbd className="px-4 sm:px-5 py-1 sm:py-1.5 bg-[#EAF4F8] dark:bg-[#203444] border border-[#C5DCE4] dark:border-[#314E62] rounded-xl text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#183B4A] dark:text-[#F1F8FB] mb-1">
                          N
                        </kbd>
                        <span className="text-xs font-bold text-[#245D72] dark:text-[#63B8C6] font-['Plus_Jakarta_Sans',sans-serif]">
                          Consonant
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={e => {
                          e.currentTarget.blur();
                          handleResponse('B');
                        }}
                        disabled={trialStage !== 'stimulus'}
                        className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#1A2B36] border-2 border-[#8DC4BE] dark:border-[#2D5A54] shadow-xs hover:border-[#0D9488] dark:hover:border-[#5EEAD4] hover:bg-[#E4F5F2] dark:hover:bg-[#1E3B37] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-default cursor-pointer text-[#0D9488] dark:text-[#5EEAD4]"
                      >
                        <kbd className="px-4 sm:px-5 py-1 sm:py-1.5 bg-[#E4F5F2] dark:bg-[#1E3B37] border border-[#8DC4BE] dark:border-[#2D5A54] rounded-xl text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#0D9488] dark:text-[#5EEAD4] mb-1">
                          B
                        </kbd>
                        <span className="text-xs font-bold text-[#0D9488] dark:text-[#5EEAD4] font-['Plus_Jakarta_Sans',sans-serif]">
                          Odd
                        </span>
                      </button>

                      <button
                        onClick={e => {
                          e.currentTarget.blur();
                          handleResponse('N');
                        }}
                        disabled={trialStage !== 'stimulus'}
                        className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#1A2B36] border-2 border-[#8DC4BE] dark:border-[#2D5A54] shadow-xs hover:border-[#0D9488] dark:hover:border-[#5EEAD4] hover:bg-[#E4F5F2] dark:hover:bg-[#1E3B37] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-default cursor-pointer text-[#0D9488] dark:text-[#5EEAD4]"
                      >
                        <kbd className="px-4 sm:px-5 py-1 sm:py-1.5 bg-[#E4F5F2] dark:bg-[#1E3B37] border border-[#8DC4BE] dark:border-[#2D5A54] rounded-xl text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#0D9488] dark:text-[#5EEAD4] mb-1">
                          N
                        </kbd>
                        <span className="text-xs font-bold text-[#0D9488] dark:text-[#5EEAD4] font-['Plus_Jakarta_Sans',sans-serif]">
                          Even
                        </span>
                      </button>
                    </>
                  )}
                </div>
              ) : (
                /* REAL EXPERIMENT BUTTONS: Clean B and N without explicit verbal hints */
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <button
                    onClick={e => {
                      e.currentTarget.blur();
                      handleResponse('B');
                    }}
                    disabled={trialStage !== 'stimulus'}
                    className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1A2B36] border-2 border-[#C5DCE4] dark:border-[#314E62] shadow-xs hover:border-[#245D72] dark:hover:border-[#63B8C6] hover:bg-[#EAF4F8] dark:hover:bg-[#203444] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-default cursor-pointer text-[#183B4A] dark:text-[#F1F8FB]"
                  >
                    <kbd className="px-5 sm:px-6 py-1.5 sm:py-2 bg-[#EAF4F8] dark:bg-[#203444] border border-[#C5DCE4] dark:border-[#314E62] rounded-xl text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#183B4A] dark:text-[#F1F8FB]">
                      B
                    </kbd>
                    <span className="text-[10px] text-[#335667] dark:text-[#A2C4D6] mt-1 font-mono font-medium">Vowel / Odd</span>
                  </button>

                  <button
                    onClick={e => {
                      e.currentTarget.blur();
                      handleResponse('N');
                    }}
                    disabled={trialStage !== 'stimulus'}
                    className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1A2B36] border-2 border-[#C5DCE4] dark:border-[#314E62] shadow-xs hover:border-[#245D72] dark:hover:border-[#63B8C6] hover:bg-[#EAF4F8] dark:hover:bg-[#203444] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-default cursor-pointer text-[#183B4A] dark:text-[#F1F8FB]"
                  >
                    <kbd className="px-5 sm:px-6 py-1.5 sm:py-2 bg-[#EAF4F8] dark:bg-[#203444] border border-[#C5DCE4] dark:border-[#314E62] rounded-xl text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#183B4A] dark:text-[#F1F8FB]">
                      N
                    </kbd>
                    <span className="text-[10px] text-[#335667] dark:text-[#A2C4D6] mt-1 font-mono font-medium">Consonant / Even</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. PRACTICE COMPLETE TRANSITION */}
        {phase === 'practiceComplete' && (
          <div className="text-center max-w-md w-full bg-white dark:bg-[#1A2B36] rounded-3xl border border-[#C5DCE4] dark:border-[#314E62] shadow-md p-6 sm:p-8 animate-pop-in">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D1EDE5] dark:bg-[#064E3B]/60 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <CheckCircle size={30} className="text-[#0D9488] dark:text-[#34D399]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#183B4A] dark:text-[#F1F8FB] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Practice Complete
            </h2>
            <p className="text-xs sm:text-sm text-[#335667] dark:text-[#A2C4D6] mb-5">
              You are now ready for the actual experimental blocks.
            </p>

            {/* Prominent Speed Instruction */}
            <div className="bg-[#FFFBEB] dark:bg-[#2A2318] rounded-2xl border border-[#FDE68A] dark:border-[#78350F] p-3.5 sm:p-4 mb-5 text-center shadow-xs">
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-[#B45309] dark:text-[#FCD34D]">
                <Zap size={16} className="text-[#D97706] dark:text-[#F59E0B] animate-pulse flex-shrink-0" />
                <span>Respond as quickly and accurately as possible.</span>
              </div>
            </div>

            <div className="bg-[#F8FBFC] dark:bg-[#16242E] rounded-2xl border border-[#C5DCE4] dark:border-[#314E62] p-4 sm:p-5 mb-6 sm:mb-8 text-left text-xs sm:text-sm text-[#335667] dark:text-[#A2C4D6] space-y-2.5">
              <div className="flex gap-2.5 items-start">
                <Layers size={16} className="text-[#245D72] dark:text-[#63B8C6] flex-shrink-0 mt-0.5" />
                <span>The experiment consists of <strong>128 trials</strong> across 3 blocks:</span>
              </div>
              <div className="pl-6 space-y-1 text-xs">
                <p>• <strong>Block 1 (32 trials):</strong> Top row only — Letter task</p>
                <p>• <strong>Block 2 (32 trials):</strong> Bottom row only — Number task</p>
                <p>• <strong>Block 3 (64 trials):</strong> Mixed — Clockwise rotation across all 4 quadrants</p>
              </div>
              <div className="flex gap-2.5 items-start pt-1 font-medium text-[#183B4A] dark:text-[#F1F8FB]">
                <Zap size={16} className="text-[#245D72] dark:text-[#63B8C6] flex-shrink-0 mt-0.5" />
                <span>Use the <strong>B</strong> and <strong>N</strong> keys to respond. No correctness feedback will be shown during the experiment.</span>
              </div>
            </div>
            <button
              onClick={() => handleStartBlock(0)}
              className="btn-primary w-full justify-center py-3.5 text-sm sm:text-base shadow-md font-bold"
            >
              Begin Block 1: Pure Letter (32 Trials)
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* 4. BLOCK INTRO SCREEN (For Block 2 and Block 3) */}
        {phase === 'blockIntro' && (
          <div className="text-center max-w-md w-full bg-white dark:bg-[#1A2B36] rounded-3xl border border-[#C5DCE4] dark:border-[#314E62] shadow-md p-6 sm:p-8 animate-pop-in">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#EAF4F8] dark:bg-[#203444] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5 text-[#245D72] dark:text-[#63B8C6]">
              <RefreshCw size={28} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#183B4A] dark:text-[#F1F8FB] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              {currentBlockIndex === 1 ? 'Block 2: Pure Number (32 Trials)' : 'Block 3: Mixed Alternating Runs (64 Trials)'}
            </h2>

            {/* Prominent Speed Instruction */}
            <div className="bg-[#FFFBEB] dark:bg-[#2A2318] rounded-2xl border border-[#FDE68A] dark:border-[#78350F] p-3 sm:p-3.5 mb-4 text-center shadow-xs">
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-[#B45309] dark:text-[#FCD34D]">
                <Zap size={16} className="text-[#D97706] dark:text-[#F59E0B] animate-pulse flex-shrink-0" />
                <span>Respond as quickly and accurately as possible.</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#335667] dark:text-[#A2C4D6] mb-6">
              {currentBlockIndex === 1
                ? 'In this block, stimuli appear in the bottom row. Respond according to the number on every trial (32 trials): B = Odd, N = Even.'
                : 'In this final block, the stimulus rotates clockwise around all 4 quadrants (64 trials). When the stimulus is in the top row, respond according to the letter (B: Vowel, N: Consonant). When the stimulus is in the bottom row, respond according to the number (B: Odd, N: Even).'}
            </p>

            <button
              onClick={() => handleStartBlock(currentBlockIndex)}
              className="btn-primary w-full justify-center py-3.5 text-sm sm:text-base shadow-md font-bold"
            >
              Start {currentBlockIndex === 1 ? 'Block 2 (32 Trials)' : 'Block 3 (64 Trials)'}
              <ArrowRight size={18} />
            </button>
          </div>
        )}


        {/* 5. TASK COMPLETE SUMMARY */}
        {phase === 'taskComplete' && (
          <div className="text-center max-w-sm w-full bg-white dark:bg-[#1A2B36] rounded-3xl border border-[#C5DCE4] dark:border-[#314E62] shadow-md p-6 sm:p-8 animate-pop-in">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D1EDE5] dark:bg-[#064E3B]/60 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <CheckCircle size={30} className="text-[#0D9488] dark:text-[#34D399]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#183B4A] dark:text-[#F1F8FB] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Activity Completed
            </h2>
            <p className="text-xs sm:text-sm text-[#335667] dark:text-[#A2C4D6] mb-6 sm:mb-8">
              Thank you for completing the Task Switching experiment.
            </p>

            <button
              onClick={handleFinish}
              className="btn-primary w-full justify-center py-3.5 text-sm shadow-md"
            >
              Return to Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
