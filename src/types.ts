export type Page =
  | 'landing'
  | 'research-info'
  | 'consent'
  | 'participant-dashboard'
  | 'hanoi-room'
  | 'corsi-room'
  | 'stroop-room'
  | 'task-switching-room'
  | 'task-completion'
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-participants'
  | 'admin-experiments'
  | 'admin-hanoi-analysis'
  | 'admin-corsi-analysis'
  | 'admin-stroop-analysis'
  | 'admin-task-switching-analysis'
  | 'admin-graphs'
  | 'admin-exports'
  | 'admin-settings';

export interface HanoiMoveRecord {
  moveNumber: number;
  sourceRod: number;
  destRod: number;
  diskSize: number;
  timestampMs: number | null;
  isValid: boolean;
}

export interface HanoiPuzzleResult {
  puzzleIndex: number;
  diskCount: number;
  moveLimit: number;
  validMoves: number;
  invalidMoves: number;
  completionTimeMs: number;
  firstReactionTimeMs: number | null;
  outcome: 'Completed' | 'Move Limit Reached' | 'Time Limit Reached' | 'Skipped';
  moveLog: HanoiMoveRecord[];
  initialState?: number[][];
  goalState?: number[][];
  attemptNumber?: number;
}

export interface HanoiSessionResult {
  puzzlesCompleted: number;
  totalPuzzles: number;
  totalTimeMs: number;
  totalValidMoves: number;
  totalInvalidMoves: number;
  puzzles: HanoiPuzzleResult[];
}

export interface CorsiTrialRecord {
  level: number;
  sequenceLength: number;
  trialNumber: number;
  presentedSequence: number[];
  recalledSequence: number[];
  isCorrect: boolean;
  correctPositionsCount: number | null;
  totalPositions: number | null;
  reactionTimeMs?: number;
  timestampMs: number | null;
}

export interface CorsiSessionResult {
  maxCompletedLevel: number;
  maxCompletedSpan: number;
  correctTrialsAtMaxSpan: number;
  productScore: number;
  trialAccuracy: number;
  blockPositionAccuracy: number | null;
  totalTrials: number;
  totalCorrectTrials: number;
  totalScoredPositions: number;
  totalCorrectPositions: number;
  trials: CorsiTrialRecord[];
}

export type StroopColor = 'RED' | 'GREEN' | 'BLUE' | 'YELLOW';
export type StroopCondition = 'congruent' | 'incongruent' | 'neutral';

export interface StroopTrialRecord {
  trialNumber: number;
  phase: 'practice' | 'experiment';
  word: string;
  inkColor: StroopColor;
  condition: StroopCondition;
  correctResponse: StroopColor;
  participantResponse: StroopColor | 'TIMEOUT';
  isCorrect: boolean;
  reactionTimeMs: number;
  timestampMs: number;
}

export interface StroopSessionResult {
  totalTrials: number;
  totalCorrectTrials: number;
  overallAccuracy: number;
  congruentTrials: number;
  congruentCorrect: number;
  congruentAccuracy: number;
  incongruentTrials: number;
  incongruentCorrect: number;
  incongruentAccuracy: number;
  neutralTrials?: number;
  neutralCorrect?: number;
  neutralAccuracy?: number;
  congruentMeanRtMs: number;
  incongruentMeanRtMs: number;
  neutralMeanRtMs?: number;
  stroopEffectMs: number;
  trials: StroopTrialRecord[];
  practiceTrials: StroopTrialRecord[];
}

export const STROOP_COLORS: StroopColor[] = ['RED', 'GREEN', 'BLUE', 'YELLOW'];

export const STROOP_KEY_MAP: Record<string, StroopColor> = {
  r: 'RED',
  R: 'RED',
  g: 'GREEN',
  G: 'GREEN',
  b: 'BLUE',
  B: 'BLUE',
  y: 'YELLOW',
  Y: 'YELLOW',
};

export const STROOP_COLOR_HEX: Record<StroopColor, string> = {
  RED: '#DC2626',
  GREEN: '#16A34A',
  BLUE: '#2563EB',
  YELLOW: '#FACC15',
};

export const STROOP_COLOR_LABELS: Record<StroopColor, { key: string; label: string }> = {
  RED: { key: 'R', label: 'Red' },
  GREEN: { key: 'G', label: 'Green' },
  BLUE: { key: 'B', label: 'Blue' },
  YELLOW: { key: 'Y', label: 'Yellow' },
};

export type TaskType = 'letter' | 'number';
export type TaskSwitchingBlockType = 'pure-letter' | 'pure-number' | 'mixed';
export type TaskSwitchingKey = 'B' | 'N';

export type StimulusPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type RowConsistency = 'consistent' | 'inconsistent';

export function getStimulusPositionFromQuadrant(quadrant: number): StimulusPosition {
  switch (quadrant) {
    case 1:
      return 'top-left';
    case 2:
      return 'top-right';
    case 3:
      return 'bottom-right';
    case 4:
      return 'bottom-left';
    default:
      return 'top-left';
  }
}

export function getStimulusRow(pos: StimulusPosition): 'top' | 'bottom' {
  return (pos === 'top-left' || pos === 'top-right') ? 'top' : 'bottom';
}

export interface TaskSwitchingTrialRecord {
  trialNumber: number;
  phase: 'practice' | 'experimental';
  blockType: TaskSwitchingBlockType;
  taskType: TaskType;
  letter: string;
  number: number;
  correctResponse: TaskSwitchingKey;
  participantResponse: TaskSwitchingKey;
  isCorrect: boolean;
  status: 'correct' | 'incorrect';
  reactionTimeMs: number;
  timestampMs: number;
  isTaskSwitch: boolean;
  isTaskRepeat: boolean;
  quadrant?: number;
  stimulusPosition?: StimulusPosition;
  consistency?: RowConsistency | null;
  isConsistent?: boolean | null;
}

export interface TaskSwitchingSessionResult {
  totalTrials: number;
  totalCorrectTrials: number;
  overallAccuracy: number;

  pureLetterTrials: number;
  pureLetterCorrect: number;
  pureLetterAccuracy: number;
  pureLetterMeanRtMs: number;

  pureNumberTrials: number;
  pureNumberCorrect: number;
  pureNumberAccuracy: number;
  pureNumberMeanRtMs: number;

  mixedTrials: number;
  mixedCorrect: number;
  mixedAccuracy: number;

  mixedRepeatTrials: number;
  mixedRepeatCorrect: number;
  mixedRepeatAccuracy: number;
  mixedRepeatMeanRtMs: number;

  mixedSwitchTrials: number;
  mixedSwitchCorrect: number;
  mixedSwitchAccuracy: number;
  mixedSwitchMeanRtMs: number;

  switchCostMs: number; // mixedSwitchMeanRtMs - mixedRepeatMeanRtMs

  // Spatial Shift Cost (Row Consistency in Randomized Mixed Block)
  consistentTrials: number;
  consistentCorrect: number;
  consistentMeanRtMs: number | null;
  inconsistentTrials: number;
  inconsistentCorrect: number;
  inconsistentMeanRtMs: number | null;
  shiftCostMs: number | null; // inconsistentMeanRtMs - consistentMeanRtMs

  trials: TaskSwitchingTrialRecord[];
  practiceTrials: TaskSwitchingTrialRecord[];
}

export const TASK_SWITCHING_VOWELS = ['A', 'E', 'I', 'O', 'U'];
export const TASK_SWITCHING_CONSONANTS = ['G', 'K', 'M', 'R', 'T', 'F', 'L', 'P', 'S', 'V'];
export const TASK_SWITCHING_ODD_NUMBERS = [1, 3, 5, 7, 9];
export const TASK_SWITCHING_EVEN_NUMBERS = [2, 4, 6, 8];

export type ADHDDiagnosisOption = 'yes' | 'no' | 'prefer_not_to_say';

export type ExperimentStatus = 'not_started' | 'in_progress' | 'completed';

export interface ParticipantSession {
  id: string;
  participantCode?: string;
  dbId?: string;
  sessionId?: string;
  name: string;
  age: number;
  gender: string;
  adhdDiagnosis?: ADHDDiagnosisOption;
  email?: string;
  hanoiCompleted: boolean;
  corsiCompleted: boolean;
  stroopCompleted: boolean;
  taskSwitchingCompleted: boolean;
  hanoiStatus?: ExperimentStatus;
  corsiStatus?: ExperimentStatus;
  stroopStatus?: ExperimentStatus;
  taskSwitchingStatus?: ExperimentStatus;
  hanoiProgressCount?: number;
  corsiProgressCount?: number;
  stroopProgressCount?: number;
  taskSwitchingProgressCount?: number;
  room2StartedAt?: string | null;
  rooms3And4UnlockAt?: string | null;
  rooms3And4Unlocked?: boolean;
  hanoiResult?: HanoiSessionResult;
  corsiResult?: CorsiSessionResult;
  stroopResult?: StroopSessionResult;
  taskSwitchingResult?: TaskSwitchingSessionResult;
}

export interface RoomUnlockStatus {
  unlocked: boolean;
  room2Started: boolean;
  room2StartedAt: string | null;
  unlockAt: string | null;
  serverNow: string;
  remainingSeconds: number;
}

export interface HanoiPuzzleConfig {
  puzzleIndex: number;
  diskCount: number;
  moveLimit: number;
  enabled: boolean;
  initialState: number[][];
  goalState: number[][];
}

export const MAX_HANOI_ATTEMPTS = 3;

export const DEFAULT_HANOI_PUZZLES: HanoiPuzzleConfig[] = [
  {
    puzzleIndex: 0,
    diskCount: 3,
    moveLimit: 7,
    enabled: true,
    initialState: [[3, 2], [], [1]],
    goalState: [[3, 1], [], [2]],
  },
  {
    puzzleIndex: 1,
    diskCount: 3,
    moveLimit: 7,
    enabled: true,
    initialState: [[3], [2, 1], []],
    goalState: [[3], [], [2, 1]],
  },
  {
    puzzleIndex: 2,
    diskCount: 3,
    moveLimit: 7,
    enabled: true,
    initialState: [[1], [3, 2], []],
    goalState: [[], [], [3, 2, 1]],
  },
  {
    puzzleIndex: 3,
    diskCount: 3,
    moveLimit: 7,
    enabled: true,
    initialState: [[3, 2, 1], [], []],
    goalState: [[], [], [3, 2, 1]],
  },
  {
    puzzleIndex: 4,
    diskCount: 4,
    moveLimit: 15,
    enabled: true,
    initialState: [[4, 3, 2, 1], [], []],
    goalState: [[], [], [4, 3, 2, 1]],
  },
  {
    puzzleIndex: 5,
    diskCount: 5,
    moveLimit: 31,
    enabled: true,
    initialState: [[5, 4, 3, 2, 1], [], []],
    goalState: [[], [], [5, 4, 3, 2, 1]],
  },
];

export const DISK_COLORS: Record<number, string> = {
  1: '#A9A2E8',
  2: '#6567C9',
  3: '#69AFA8',
  4: '#4A7C9B',
  5: '#252640',
};

export const DISK_LABEL_COLORS: Record<number, string> = {
  1: '#252640',
  2: '#FFFFFF',
  3: '#FFFFFF',
  4: '#FFFFFF',
  5: '#FFFFFF',
};

export interface ExperimentSessionOptions {
  allowMidSessionExit: boolean;
  recordInvalidMoves: boolean;
  showTimer: boolean;
  showMoveCounter: boolean;
  studyTitle?: string;
  researcherName?: string;
  ethicsReference?: string;
}

export interface DataMeasurementsConfig {
  recordMoveTimestamps: boolean;
  recordFirstMoveRt: boolean;
  recordInvalidMoveAttempts: boolean;
  recordBlockPositionAccuracy: boolean;
  recordSessionTimestamps: boolean;
}

export const DEFAULT_SESSION_OPTIONS: ExperimentSessionOptions = {
  allowMidSessionExit: true,
  recordInvalidMoves: true,
  showTimer: false,
  showMoveCounter: false,
  studyTitle: 'Cognitive Performance Study 2024',
  researcherName: 'Dr. Research Participant',
  ethicsReference: 'ETH-2024-COG-001',
};

export const DEFAULT_DATA_MEASUREMENTS: DataMeasurementsConfig = {
  recordMoveTimestamps: true,
  recordFirstMoveRt: true,
  recordInvalidMoveAttempts: true,
  recordBlockPositionAccuracy: true,
  recordSessionTimestamps: true,
};

