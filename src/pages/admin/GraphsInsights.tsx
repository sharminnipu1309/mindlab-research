import { useState, useEffect, useCallback, useMemo } from 'react';
import { Page } from '../../types';
import AdminLayout from '../../components/AdminLayout';
import {
  fetchHanoiAnalysisData,
  fetchHanoiMovesData,
  fetchCorsiAnalysisData,
  fetchStroopAnalysisData,
  fetchTaskSwitchingAnalysisData,
  fetchParticipantsList,
} from '../../services/adminService';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { Download, RefreshCw, Info, Inbox, CheckCircle, Database } from 'lucide-react';

interface Props {
  navigate: (page: Page) => void;
  onLogout: () => void;
  currentPage: Page;
}

type TabType = 'hanoi' | 'corsi' | 'stroop' | 'task-switching';

export default function GraphsInsights({ navigate, onLogout, currentPage }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('hanoi');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Raw data collections from Supabase
  const [hanoiData, setHanoiData] = useState<{ trials: any[]; moves: any[]; isLive: boolean }>({ trials: [], moves: [], isLive: false });
  const [corsiData, setCorsiData] = useState<{ trials: any[]; isLive: boolean }>({ trials: [], isLive: false });
  const [stroopData, setStroopData] = useState<{ trials: any[]; isLive: boolean }>({ trials: [], isLive: false });
  const [taskSwitchingData, setTaskSwitchingData] = useState<{ trials: any[]; isLive: boolean }>({ trials: [], isLive: false });
  const [participants, setParticipants] = useState<any[]>([]);

  // Load all research data from Supabase
  const loadAllData = useCallback(async () => {
    try {
      const [hanoiRes, movesRes, corsiRes, stroopRes, tsRes, participantsRes] = await Promise.all([
        fetchHanoiAnalysisData(),
        fetchHanoiMovesData(),
        fetchCorsiAnalysisData(),
        fetchStroopAnalysisData(),
        fetchTaskSwitchingAnalysisData(),
        fetchParticipantsList(),
      ]);

      setHanoiData({
        trials: hanoiRes.trials || [],
        moves: movesRes.moves || [],
        isLive: hanoiRes.isLive,
      });
      setCorsiData({
        trials: corsiRes.trials || [],
        isLive: corsiRes.isLive,
      });
      setStroopData({
        trials: stroopRes.trials || [],
        isLive: stroopRes.isLive,
      });
      setTaskSwitchingData({
        trials: tsRes.trials || [],
        isLive: tsRes.isLive,
      });
      setParticipants(participantsRes || []);
    } catch (err) {
      console.error('Error fetching research datasets:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. TOWER OF HANOI DATA & CHARTS
  // ─────────────────────────────────────────────────────────────────────────────
  const hanoiMetrics = useMemo(() => {
    const trials = hanoiData.trials;
    if (trials.length === 0) return null;

    const total = trials.length;
    const completedTrials = trials.filter(t => t.outcome === 'Completed');
    const completedCount = completedTrials.length;
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const completedWithTime = completedTrials.filter(t => t.completionTime > 0);
    const avgTimeSec = completedWithTime.length > 0
      ? +(completedWithTime.reduce((s, t) => s + t.completionTime, 0) / completedWithTime.length / 1000).toFixed(1)
      : '—';
    const allWithTime = trials.filter(t => t.completionTime > 0);
    const avgAllTimeSec = allWithTime.length > 0
      ? +(allWithTime.reduce((s, t) => s + t.completionTime, 0) / allWithTime.length / 1000).toFixed(1)
      : '—';
    const avgValidMoves = total > 0 ? +(trials.reduce((s, t) => s + (t.validMoves || 0), 0) / total).toFixed(1) : '—';
    const trialsWithReaction = trials.filter(t => t.firstReaction !== null && t.firstReaction !== undefined);
    const avgReactionMs = trialsWithReaction.length > 0 ? Math.round(trialsWithReaction.reduce((s, t) => s + (t.firstReaction || 0), 0) / trialsWithReaction.length) : '—';

    // Chart 1: Average Completion Time by Puzzle (P1 to P6)
    const completionByPuzzle = [1, 2, 3, 4, 5, 6].map((pNum, idx) => {
      const pTrials = trials.filter(t => t.puzzleIndex === idx || String(t.puzzle).includes(String(pNum)));
      const cTrials = pTrials.filter(t => t.outcome === 'Completed' && t.completionTime > 0);
      const avgT = cTrials.length > 0 ? +(cTrials.reduce((s, t) => s + t.completionTime, 0) / cTrials.length / 1000).toFixed(1) : null;
      const diskCount = pTrials[0]?.diskCount || (idx < 4 ? 3 : idx === 4 ? 4 : 5);
      return {
        puzzle: `P${pNum}`,
        avgTime: avgT,
        diskCount,
        attempts: pTrials.length,
        completed: pTrials.filter(t => t.outcome === 'Completed').length,
        moveLimitHit: pTrials.filter(t => t.outcome === 'Move Limit Reached').length,
      };
    }).filter(p => !hanoiData.isLive || p.attempts > 0);

    // Chart 2: Inter-move Reaction Time or First Reaction Time Across Puzzles
    let reactionTimeData: any[] = [];
    if (hanoiData.moves.length > 0) {
      // Calculate average reaction time per move number across puzzles
      const moveGroups: Record<number, number[]> = {};
      const movesByPuzzle: Record<string, any[]> = {};
      hanoiData.moves.forEach(m => {
        const key = `${m.session_id}_${m.puzzle_index}`;
        if (!movesByPuzzle[key]) movesByPuzzle[key] = [];
        movesByPuzzle[key].push(m);
      });

      Object.values(movesByPuzzle).forEach(pMoves => {
        pMoves.sort((a, b) => a.move_number - b.move_number);
        for (let i = 0; i < pMoves.length; i++) {
          const moveNum = pMoves[i].move_number;
          if (!moveGroups[moveNum]) moveGroups[moveNum] = [];
          if (i === 0) {
            // First move latency from puzzle if available or fallback
            const matchTrial = trials.find(t => t.puzzleIndex === pMoves[i].puzzle_index);
            if (matchTrial && matchTrial.firstReaction > 0) {
              moveGroups[moveNum].push(matchTrial.firstReaction);
            }
          } else {
            const dt = pMoves[i].timestamp_ms - pMoves[i - 1].timestamp_ms;
            if (dt > 0 && dt < 60000) moveGroups[moveNum].push(dt);
          }
        }
      });

      reactionTimeData = Object.entries(moveGroups)
        .map(([mNum, dts]) => ({
          move: `Move ${mNum}`,
          avgReaction: dts.length > 0 ? Math.round(dts.reduce((a, b) => a + b, 0) / dts.length) : 0,
        }))
        .slice(0, 10);
    }

    if (reactionTimeData.length === 0) {
      // Fallback to average first reaction time across puzzles
      reactionTimeData = [1, 2, 3, 4, 5, 6].map((pNum, idx) => {
        const pTrials = trials.filter(t => t.puzzleIndex === idx || String(t.puzzle).includes(String(pNum)));
        const rts = pTrials.filter(t => t.firstReaction > 0);
        const avg = rts.length > 0 ? Math.round(rts.reduce((s, t) => s + t.firstReaction, 0) / rts.length) : 0;
        return {
          move: `P${pNum}`,
          avgReaction: avg,
          attempts: pTrials.length,
        };
      }).filter(p => !hanoiData.isLive || p.attempts > 0);
    }

    // Chart 3: Valid vs. Invalid Moves by Puzzle
    const invalidMovesByPuzzle = [1, 2, 3, 4, 5, 6].map((pNum, idx) => {
      const pTrials = trials.filter(t => t.puzzleIndex === idx || String(t.puzzle).includes(String(pNum)));
      const v = pTrials.length > 0 ? +(pTrials.reduce((s, t) => s + (t.validMoves || 0), 0) / pTrials.length).toFixed(1) : 0;
      const inv = pTrials.length > 0 ? +(pTrials.reduce((s, t) => s + (t.invalidMoves || 0), 0) / pTrials.length).toFixed(1) : 0;
      return {
        puzzle: `P${pNum}`,
        valid: v,
        invalid: inv,
        attempts: pTrials.length,
      };
    }).filter(p => !hanoiData.isLive || p.attempts > 0);

    // Chart 4: Completion Rate by Disc Count
    const completionByDiscs = [3, 4, 5].map(d => {
      const dTrials = trials.filter(t => t.diskCount === d);
      const c = dTrials.filter(t => t.outcome === 'Completed').length;
      const rate = dTrials.length > 0 ? Math.round((c / dTrials.length) * 100) : 0;
      return {
        discs: `${d} Discs`,
        rate,
        totalAttempts: dTrials.length,
      };
    }).filter(d => !hanoiData.isLive || d.totalAttempts > 0);

    return {
      total,
      completedCount,
      completionRate,
      avgTimeSec,
      avgAllTimeSec,
      avgValidMoves,
      avgReactionMs,
      completionByPuzzle,
      reactionTimeData,
      invalidMovesByPuzzle,
      completionByDiscs,
    };
  }, [hanoiData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. BACKWARD CORSI DATA & CHARTS
  // ─────────────────────────────────────────────────────────────────────────────
  const corsiMetrics = useMemo(() => {
    const trials = corsiData.trials;
    if (trials.length === 0) return null;

    const totalTrials = trials.length;
    const correctTrials = trials.filter(t => t.correct).length;
    const overallAccuracy = Math.round((correctTrials / totalTrials) * 100);

    // Group by participant and apply scientific stopping rule
    const participantIds = Array.from(new Set(trials.map(t => t.participantId)));
    const computedParticipants = participantIds.map(pid => {
      const pTrials = trials.filter(t => t.participantId === pid);
      let maxCompletedLevel = 0;
      let correctAtMax = 0;
      let isProtocolCompleted = false;

      for (let lvl = 1; lvl <= 8; lvl++) {
        const lvlTrials = pTrials.filter(t => t.level === lvl);
        const correctCount = lvlTrials.filter(t => t.correct).length;
        if (lvlTrials.length >= 6) {
          if (correctCount >= 4) {
            maxCompletedLevel = lvl;
            correctAtMax = correctCount;
            if (lvl === 8) isProtocolCompleted = true;
          } else {
            // Completed all 6 trials of level and failed (<4) -> protocol stopping threshold reached
            isProtocolCompleted = true;
            break;
          }
        } else if (lvlTrials.length > 0) {
          // Abandoned / interrupted mid-level with < 6 trials
          break;
        }
      }

      if (isProtocolCompleted) {
        const maxSpan = maxCompletedLevel > 0 ? maxCompletedLevel + 1 : 0;
        const productScore = maxSpan * correctAtMax;
        return {
          id: pid,
          isProtocolCompleted: true,
          maxLevel: maxCompletedLevel,
          maxSpan,
          productScore,
        };
      } else {
        return {
          id: pid,
          isProtocolCompleted: false,
          maxLevel: null,
          maxSpan: null,
          productScore: null,
        };
      }
    });

    // Exclude incomplete / abandoned sessions from cohort averages
    const completedCohort = computedParticipants.filter(p => p.isProtocolCompleted && p.maxSpan !== null);

    const avgMaxSpan = completedCohort.length > 0
      ? +(completedCohort.reduce((s, p) => s + (p.maxSpan || 0), 0) / completedCohort.length).toFixed(1)
      : '—';
    const avgProductScore = completedCohort.length > 0
      ? +(completedCohort.reduce((s, p) => s + (p.productScore || 0), 0) / completedCohort.length).toFixed(1)
      : '—';

    // Chart 1: Accuracy by Sequence Length (Level 1..8)
    const accuracyByLevel = [1, 2, 3, 4, 5, 6, 7, 8].map(lvl => {
      const lvlTrials = trials.filter(t => t.level === lvl);
      const c = lvlTrials.filter(t => t.correct).length;
      const acc = lvlTrials.length > 0 ? Math.round((c / lvlTrials.length) * 100) : 0;
      return {
        level: `L${lvl} (${lvl + 1})`,
        accuracy: acc,
        n: lvlTrials.length,
      };
    }).filter(l => !corsiData.isLive || l.n > 0);

    // Chart 2: Mean Reaction Time by Level
    const latencyByLevel = [1, 2, 3, 4, 5, 6, 7, 8].map(lvl => {
      const lvlTrials = trials.filter(t => t.level === lvl && t.reactionTimeMs && t.reactionTimeMs > 0);
      const avgRt = lvlTrials.length > 0 ? Math.round(lvlTrials.reduce((s, t) => s + t.reactionTimeMs, 0) / lvlTrials.length) : 0;
      return {
        level: `L${lvl}`,
        avgRt,
        n: lvlTrials.length,
      };
    }).filter(l => !corsiData.isLive || l.n > 0);

    // Chart 3: Maximum Level Reached Distribution
    const maxLevelDistribution = [1, 2, 3, 4, 5, 6, 7, 8].map(lvl => {
      const count = completedCohort.filter(p => p.maxLevel === lvl).length;
      return {
        level: `L${lvl}`,
        count,
      };
    }).filter(l => !corsiData.isLive || l.count > 0);

    return {
      participantsCount: completedCohort.length,
      totalTrials,
      overallAccuracy,
      avgMaxSpan,
      avgProductScore,
      accuracyByLevel,
      latencyByLevel,
      maxLevelDistribution,
    };
  }, [corsiData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. STROOP TASK DATA & CHARTS
  // ─────────────────────────────────────────────────────────────────────────────
  const stroopMetrics = useMemo(() => {
    const trials = stroopData.trials;
    if (trials.length === 0) return null;

    const expTrials = trials.filter(t => t.phase === 'experiment');
    const totalExpTrials = expTrials.length;
    const practiceTrials = trials.filter(t => t.phase === 'practice');

    if (totalExpTrials === 0) {
      return {
        hasExperimentalData: false,
        totalExpTrials: 0,
        practiceCount: practiceTrials.length,
        participantsCount: 0,
        overallAccuracy: '—',
        congruentMeanRt: '—',
        incongruentMeanRt: '—',
        stroopEffectMs: '—',
        congruentAcc: '—',
        incongruentAcc: '—',
        rtComparison: [],
        accuracyComparison: [],
        participantCosts: [],
        quartiles: [],
      };
    }

    const correctExpTrials = expTrials.filter(t => t.isCorrect).length;
    const overallAccuracy = Math.round((correctExpTrials / totalExpTrials) * 100);

    const congruentTrials = expTrials.filter(t => t.condition === 'congruent');
    const incongruentTrials = expTrials.filter(t => t.condition === 'incongruent');

    const congruentCorrect = congruentTrials.filter(t => t.isCorrect);
    const incongruentCorrect = incongruentTrials.filter(t => t.isCorrect);

    const congruentMeanRt = congruentCorrect.length > 0
      ? Math.round(congruentCorrect.reduce((s, t) => s + t.reactionTimeMs, 0) / congruentCorrect.length)
      : null;

    const incongruentMeanRt = incongruentCorrect.length > 0
      ? Math.round(incongruentCorrect.reduce((s, t) => s + t.reactionTimeMs, 0) / incongruentCorrect.length)
      : null;

    const stroopEffectMs = (congruentMeanRt !== null && incongruentMeanRt !== null)
      ? incongruentMeanRt - congruentMeanRt
      : null;

    const congruentAcc = congruentTrials.length > 0 ? Math.round((congruentCorrect.length / congruentTrials.length) * 100) : 0;
    const incongruentAcc = incongruentTrials.length > 0 ? Math.round((incongruentCorrect.length / incongruentTrials.length) * 100) : 0;

    // Chart 1: RT Comparison
    const rtComparison = [
      { condition: 'Congruent', avgRt: congruentMeanRt || 0, fill: '#2563EB' },
      { condition: 'Incongruent', avgRt: incongruentMeanRt || 0, fill: '#DC2626' },
    ];

    // Chart 2: Accuracy Comparison
    const accuracyComparison = [
      { condition: 'Congruent', accuracy: congruentAcc, errorRate: 100 - congruentAcc },
      { condition: 'Incongruent', accuracy: incongruentAcc, errorRate: 100 - incongruentAcc },
    ];

    // Chart 3: Stroop Effect Cost by Participant
    const participantIds = Array.from(new Set(expTrials.map(t => t.participantId)));
    const participantCosts = participantIds.slice(0, 8).map(pid => {
      const pCongruent = expTrials.filter(t => t.participantId === pid && t.condition === 'congruent' && t.isCorrect);
      const pIncongruent = expTrials.filter(t => t.participantId === pid && t.condition === 'incongruent' && t.isCorrect);
      const cMean = pCongruent.length > 0 ? Math.round(pCongruent.reduce((s, t) => s + t.reactionTimeMs, 0) / pCongruent.length) : null;
      const iMean = pIncongruent.length > 0 ? Math.round(pIncongruent.reduce((s, t) => s + t.reactionTimeMs, 0) / pIncongruent.length) : null;
      return {
        participant: pid,
        stroopCost: (cMean !== null && iMean !== null) ? iMean - cMean : 0,
        congruentRt: cMean || 0,
        incongruentRt: iMean || 0,
      };
    });

    // Chart 4: Latency Dynamics Across Trial Progression (Quartiles 1..4)
    const maxTrialNum = expTrials.reduce((max, t) => Math.max(max, t.trialNumber), 0);
    const step = maxTrialNum > 80 ? 32 : 20;
    const quartiles = [
      { name: `Q1 (1–${step})`, min: 1, max: step },
      { name: `Q2 (${step + 1}–${step * 2})`, min: step + 1, max: step * 2 },
      { name: `Q3 (${step * 2 + 1}–${step * 3})`, min: step * 2 + 1, max: step * 3 },
      { name: `Q4 (${step * 3 + 1}–${step * 4})`, min: step * 3 + 1, max: step * 4 },
    ].map(q => {
      const qCongruent = expTrials.filter(t => t.trialNumber >= q.min && t.trialNumber <= q.max && t.condition === 'congruent' && t.isCorrect);
      const qIncongruent = expTrials.filter(t => t.trialNumber >= q.min && t.trialNumber <= q.max && t.condition === 'incongruent' && t.isCorrect);
      const cRt = qCongruent.length > 0 ? Math.round(qCongruent.reduce((s, t) => s + t.reactionTimeMs, 0) / qCongruent.length) : 0;
      const iRt = qIncongruent.length > 0 ? Math.round(qIncongruent.reduce((s, t) => s + t.reactionTimeMs, 0) / qIncongruent.length) : 0;
      return {
        quartile: q.name,
        congruentRt: cRt,
        incongruentRt: iRt,
      };
    });

    return {
      hasExperimentalData: true,
      practiceCount: practiceTrials.length,
      participantsCount: participantIds.length,
      totalExpTrials,
      overallAccuracy,
      congruentMeanRt,
      incongruentMeanRt,
      stroopEffectMs,
      congruentAcc,
      incongruentAcc,
      rtComparison,
      accuracyComparison,
      participantCosts,
      quartiles,
    };
  }, [stroopData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. TASK SWITCHING DATA & CHARTS
  // ─────────────────────────────────────────────────────────────────────────────
  const taskSwitchingMetrics = useMemo(() => {
    const trials = taskSwitchingData.trials;
    if (trials.length === 0) return null;

    const expTrials = trials.filter(t => t.phase === 'experimental');
    const totalExpTrials = expTrials.length;
    const practiceTrials = trials.filter(t => t.phase === 'practice');

    if (totalExpTrials === 0) {
      return {
        hasExperimentalData: false,
        totalExpTrials: 0,
        practiceCount: practiceTrials.length,
        participantsCount: 0,
        overallAccuracy: '—',
        pureMeanRt: '—',
        mixedRepeatRt: '—',
        switchCostMs: '—',
        rtAcrossConditions: [] as Array<{ condition: string; avgRt: number; fill: string }>,
        accAcrossConditions: [] as Array<{ condition: string; accuracy: number }>,
        participantSwitchCosts: [] as Array<{ participant: string; switchCost: number }>,
        taskAsymmetry: [] as Array<{ task: string; avgRt: number; accuracy: number }>,
      };
    }

    const correctExpTrials = expTrials.filter(t => t.isCorrect).length;
    const overallAccuracy = Math.round((correctExpTrials / totalExpTrials) * 100);

    const pureLetter = expTrials.filter(t => t.blockType === 'pure-letter');
    const pureNumber = expTrials.filter(t => t.blockType === 'pure-number');
    const mixedRepeat = expTrials.filter(t => t.blockType === 'mixed' && t.isTaskRepeat);
    const mixedSwitch = expTrials.filter(t => t.blockType === 'mixed' && t.isTaskSwitch);

    const calcMeanRt = (arr: any[]) => {
      const correct = arr.filter(t => t.isCorrect);
      return correct.length > 0 ? Math.round(correct.reduce((s, t) => s + t.reactionTimeMs, 0) / correct.length) : null;
    };

    const calcAcc = (arr: any[]) => {
      return arr.length > 0 ? Math.round((arr.filter(t => t.isCorrect).length / arr.length) * 100) : null;
    };

    const pureLetterRt = calcMeanRt(pureLetter);
    const pureNumberRt = calcMeanRt(pureNumber);
    const mixedRepeatRt = calcMeanRt(mixedRepeat);
    const mixedSwitchRt = calcMeanRt(mixedSwitch);

    const pureLetterAcc = calcAcc(pureLetter);
    const pureNumberAcc = calcAcc(pureNumber);
    const mixedRepeatAcc = calcAcc(mixedRepeat);
    const mixedSwitchAcc = calcAcc(mixedSwitch);

    const switchCostMs = (mixedSwitchRt !== null && mixedRepeatRt !== null) ? mixedSwitchRt - mixedRepeatRt : null;
    const pureMeanRt = (pureLetterRt !== null && pureNumberRt !== null)
      ? Math.round((pureLetterRt + pureNumberRt) / 2)
      : (pureLetterRt ?? pureNumberRt);

    // Chart 1: RT Across Conditions
    const rtAcrossConditions = [
      { condition: 'Pure Letter', avgRt: pureLetterRt || 0, fill: '#3B82F6' },
      { condition: 'Pure Number', avgRt: pureNumberRt || 0, fill: '#6366F1' },
      { condition: 'Mixed Repeat', avgRt: mixedRepeatRt || 0, fill: '#10B981' },
      { condition: 'Mixed Switch', avgRt: mixedSwitchRt || 0, fill: '#8B5CF6' },
    ];

    // Chart 2: Accuracy Across Conditions
    const accAcrossConditions = [
      { condition: 'Pure Letter', accuracy: pureLetterAcc || 0 },
      { condition: 'Pure Number', accuracy: pureNumberAcc || 0 },
      { condition: 'Mixed Repeat', accuracy: mixedRepeatAcc || 0 },
      { condition: 'Mixed Switch', accuracy: mixedSwitchAcc || 0 },
    ];

    // Chart 3: Switch Cost by Participant
    const participantIds = Array.from(new Set(expTrials.map(t => t.participantId)));
    const participantSwitchCosts = participantIds.slice(0, 8).map(pid => {
      const pRepeat = expTrials.filter(t => t.participantId === pid && t.blockType === 'mixed' && t.isTaskRepeat && t.isCorrect);
      const pSwitch = expTrials.filter(t => t.participantId === pid && t.blockType === 'mixed' && t.isTaskSwitch && t.isCorrect);
      const rRt = pRepeat.length > 0 ? Math.round(pRepeat.reduce((s, t) => s + t.reactionTimeMs, 0) / pRepeat.length) : null;
      const sRt = pSwitch.length > 0 ? Math.round(pSwitch.reduce((s, t) => s + t.reactionTimeMs, 0) / pSwitch.length) : null;
      return {
        participant: pid,
        switchCost: (sRt !== null && rRt !== null) ? sRt - rRt : 0,
        repeatRt: rRt || 0,
        switchRt: sRt || 0,
      };
    });

    // Chart 4: Task Asymmetry (Letter vs Number Task)
    const letterTrials = expTrials.filter(t => t.taskType === 'letter');
    const numberTrials = expTrials.filter(t => t.taskType === 'number');
    const taskAsymmetry = [
      {
        task: 'Letter (Vowel/Consonant)',
        avgRt: calcMeanRt(letterTrials) || 0,
        accuracy: calcAcc(letterTrials) || 0,
      },
      {
        task: 'Number (Odd/Even)',
        avgRt: calcMeanRt(numberTrials) || 0,
        accuracy: calcAcc(numberTrials) || 0,
      },
    ];

    return {
      hasExperimentalData: true,
      practiceCount: practiceTrials.length,
      participantsCount: participantIds.length,
      totalExpTrials,
      overallAccuracy,
      pureMeanRt,
      mixedRepeatRt,
      mixedSwitchRt,
      switchCostMs,
      rtAcrossConditions,
      accAcrossConditions,
      participantSwitchCosts,
      taskAsymmetry,
    };
  }, [taskSwitchingData]);

  // Export current tab chart data as CSV
  const handleExportTabCharts = () => {
    let rows: any[] = [];
    const sanitizedTab = activeTab === 'task-switching' ? 'task_switching' : activeTab;
    const filename = `memtiva_graph_data_${sanitizedTab}_insights.csv`;

    if (activeTab === 'hanoi' && hanoiMetrics) {
      rows = hanoiMetrics.completionByPuzzle.map(p => ({
        Dataset: 'Tower of Hanoi (Aggregated Graph Metrics)',
        Puzzle: p.puzzle,
        Disks: p.diskCount,
        Total_Attempts: p.attempts,
        Solved_Count: p.completed,
        Move_Limit_Hit_Count: p.moveLimitHit,
        Completion_Rate_Pct: p.attempts > 0 ? Math.round((p.completed / p.attempts) * 100) : 0,
        Avg_Solved_Time_Sec: p.completed > 0 ? p.avgTime : null,
        Grouping_Explanation: 'Mean completion time for solved attempts only; move-limit attempts tracked in Move_Limit_Hit_Count',
      }));
    } else if (activeTab === 'corsi' && corsiMetrics) {
      rows = corsiMetrics.accuracyByLevel.map(l => ({
        Dataset: 'Backward Corsi (Aggregated Graph Metrics)',
        Level: l.level,
        Trials_N: l.n,
        Accuracy_Pct: l.accuracy,
        Cohort_Mean_Span: corsiMetrics.avgMaxSpan,
        Cohort_Mean_Product_Score: corsiMetrics.avgProductScore,
        Grouping_Explanation: 'Accuracy by sequence length (2–9 blocks) across all completed protocol attempts',
      }));
    } else if (activeTab === 'stroop' && stroopMetrics) {
      rows = stroopMetrics.rtComparison.map(r => ({
        Dataset: 'Stroop Task (Aggregated Graph Metrics)',
        Condition: r.condition,
        Mean_RT_ms: r.avgRt,
        Condition_Accuracy_Pct: stroopMetrics.accuracyComparison.find(a => a.condition === r.condition)?.accuracy ?? null,
        Stroop_Effect_ms: stroopMetrics.stroopEffectMs,
        Overall_Accuracy_Pct: stroopMetrics.overallAccuracy,
        Grouping_Explanation: 'Mean reaction times for correct experimental trials by condition (congruent vs incongruent)',
      }));
    } else if (activeTab === 'task-switching' && taskSwitchingMetrics) {
      rows = taskSwitchingMetrics.rtAcrossConditions.map(c => ({
        Dataset: 'Task Switching (Aggregated Graph Metrics)',
        Condition: c.condition,
        Mean_RT_ms: c.avgRt,
        Switch_Cost_ms: taskSwitchingMetrics.switchCostMs,
        Pure_Mean_RT_ms: taskSwitchingMetrics.pureMeanRt,
        Mixed_Repeat_Mean_RT_ms: taskSwitchingMetrics.mixedRepeatRt,
        Mixed_Switch_Mean_RT_ms: taskSwitchingMetrics.mixedSwitchRt,
        Overall_Accuracy_Pct: taskSwitchingMetrics.overallAccuracy,
        Grouping_Explanation: 'Mean reaction times across pure blocks and mixed alternating-runs switch vs repeat trials',
      }));
    }

    if (rows.length === 0) {
      alert('No research data available to export for this activity.');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csvContent = headers.join(',') + '\n' +
      rows.map(row => headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '""';
        return JSON.stringify(val);
      }).join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs: Array<{ id: TabType; label: string; count: number; color: string }> = [
    { id: 'hanoi', label: 'Tower of Hanoi', count: hanoiData.trials.length, color: '#6567C9' },
    { id: 'corsi', label: 'Backward Corsi', count: corsiData.trials.length, color: '#0D9488' },
    { id: 'stroop', label: 'Stroop Task', count: stroopData.trials.filter(t => t.phase === 'experiment').length, color: '#EF4444' },
    { id: 'task-switching', label: 'Task Switching', count: taskSwitchingData.trials.filter(t => t.phase === 'experimental').length, color: '#2563EB' },
  ];

  return (
    <AdminLayout
      currentPage={currentPage}
      navigate={navigate}
      onLogout={onLogout}
      pageTitle="Graphs & Research Insights"
      breadcrumb="Graphs"
    >
      {/* ─── CONTROLS & TAB NAVIGATION ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-1.5 bg-white border border-[#E9E8F2] rounded-xl p-1.5 shadow-2xs">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold font-['Plus_Jakarta_Sans',sans-serif] transition-all flex items-center gap-2 ${
                  isActive
                    ? 'text-white shadow-xs'
                    : 'text-[#73758C] hover:text-[#252640] hover:bg-[#F8F8FC]'
                }`}
                style={{
                  background: isActive ? tab.color : 'transparent',
                }}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-['JetBrains_Mono',monospace] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-[11px] sm:text-xs text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl px-3 py-1.5 font-['Plus_Jakarta_Sans',sans-serif] font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            Live Database Data
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary text-xs py-1.5 sm:py-2 flex items-center gap-1.5"
            title="Refresh database records"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportTabCharts}
            className="btn-secondary text-xs py-1.5 sm:py-2 flex items-center gap-1.5 font-bold"
            title="Export aggregated graph metrics for the active tab as CSV"
          >
            <Download size={13} />
            <span>Export Graph Data (.csv)</span>
          </button>
        </div>
      </div>

      {/* ─── GRAPH EXPORT CONTEXT BANNER ─────────────────────────────────── */}
      <div className="mb-6 bg-[#F8F8FC] border border-[#E9E8F2] rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-start sm:items-center gap-2 text-[#73758C] leading-relaxed">
          <Info size={15} className="text-[#6567C9] flex-shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong className="text-[#252640]">Graph Data Export:</strong> The <code className="font-['JetBrains_Mono',monospace] text-[#6567C9] bg-[#EDEAF8] px-1.5 py-0.5 rounded">Export Graph Data</code> button downloads an <strong>aggregated dataset</strong> matching the charts on this tab (condition averages, sequence accuracies, and rates). For raw trial/move logs or per-participant summary scores, visit{' '}
            <button
              onClick={() => navigate('admin-exports' as Page)}
              className="text-[#6567C9] font-bold underline hover:text-[#5254A8] cursor-pointer"
            >
              Data Exports
            </button>.
          </span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E9E8F2] p-16 text-center my-6 shadow-2xs">
          <RefreshCw size={28} className="text-[#6567C9] animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">
            Loading research metrics from Supabase...
          </h3>
          <p className="text-xs text-[#9597AB] mt-1">Aggregating telemetry tables and sessions</p>
        </div>
      ) : (
        <>
          {/* ─── TAB 1: TOWER OF HANOI ──────────────────────────────────────── */}
          {activeTab === 'hanoi' && (
            <div>
              {!hanoiMetrics ? (
                <EmptyResearchState activityTitle="Tower of Hanoi (Room 01)" />
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4 mb-6">
                    <SummaryCard label="Total Attempts" value={hanoiMetrics.total} color="#252640" sub="All recorded attempts" />
                    <SummaryCard label="Solved Puzzles" value={hanoiMetrics.completedCount} color="#4A9B7F" sub="Successful outcomes" />
                    <SummaryCard label="Completion Rate" value={`${hanoiMetrics.completionRate}%`} color="#4A9B7F" sub="Solved / Attempts" />
                    <SummaryCard label="Avg. Solved Time" value={hanoiMetrics.avgTimeSec !== '—' ? `${hanoiMetrics.avgTimeSec}s` : '—'} color="#6567C9" sub="Completed puzzles only" />
                    <SummaryCard label="Avg. Time (All Attempts)" value={hanoiMetrics.avgAllTimeSec !== '—' ? `${hanoiMetrics.avgAllTimeSec}s` : '—'} color="#73758C" sub="Includes move-limit attempts" />
                    <SummaryCard label="Avg. Valid Moves" value={hanoiMetrics.avgValidMoves} color="#0D9488" sub="Moves per attempt" />
                    <SummaryCard label="Avg. 1st Reaction" value={typeof hanoiMetrics.avgReactionMs === 'number' ? `${(hanoiMetrics.avgReactionMs / 1000).toFixed(1)}s` : '—'} color="#8B5CF6" sub="Planning latency" />
                  </div>

                  {/* 4 Interactive Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6">
                    {/* Chart 1: Average Completion Time by Puzzle */}
                    <ChartCard
                      title="Average Completion Time by Puzzle"
                      subtitle="Seconds · Real participant performance across Puzzles 1–6"
                    >
                      <BarChart data={hanoiMetrics.completionByPuzzle} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="puzzle" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="s" />
                        <Tooltip
                          contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }}
                          formatter={((value: any, name: any, item: any) => {
                            const d = item?.payload;
                            if (name === 'Avg. time (s)' && d) {
                              if (d.completed === 0 && d.attempts > 0) {
                                return ['— (Move limit reached)', name];
                              }
                              return [`${value}s (${d.completed}/${d.attempts} solved)`, name];
                            }
                            return [value, name];
                          }) as any}
                        />
                        <Bar dataKey="avgTime" name="Avg. time (s)" radius={[6, 6, 0, 0]}>
                          {hanoiMetrics.completionByPuzzle.map((entry, i) => (
                            <Cell key={i} fill={entry.diskCount === 3 ? '#A9A2E8' : entry.diskCount === 4 ? '#6567C9' : '#252640'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartCard>

                    {/* Chart 2: Reaction Time Across Sequence / Puzzles */}
                    <ChartCard
                      title="Reaction Time Pattern"
                      subtitle="Latency (ms) across puzzle progression"
                    >
                      <LineChart data={hanoiMetrics.reactionTimeData} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="move" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="ms" />
                        <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                        <Line type="monotone" dataKey="avgReaction" name="Avg. latency (ms)" stroke="#6567C9" strokeWidth={2.5} dot={{ r: 4, fill: '#6567C9' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ChartCard>

                    {/* Chart 3: Valid vs. Invalid Moves by Puzzle */}
                    <ChartCard
                      title="Valid vs. Invalid Moves by Puzzle"
                      subtitle="Mean moves per attempt · Error detection across complexities"
                    >
                      <BarChart data={hanoiMetrics.invalidMovesByPuzzle} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="puzzle" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Inter', paddingTop: 8 }} />
                        <Bar dataKey="valid" name="Valid moves" fill="#6567C9" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="invalid" name="Invalid attempts" fill="#FBDEDD" stroke="#C4625A" strokeWidth={1} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartCard>

                    {/* Chart 4: Completion Rate by Disc Count */}
                    <ChartCard
                      title="Completion Rate by Disc Complexity"
                      subtitle="Percentage of attempts successfully solved (3, 4, and 5 discs)"
                    >
                      <BarChart data={hanoiMetrics.completionByDiscs} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="discs" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                        <Bar dataKey="rate" name="Completion rate %" radius={[6, 6, 0, 0]}>
                          {['#A9A2E8', '#6567C9', '#252640'].map((fill, i) => (
                            <Cell key={i} fill={fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartCard>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── TAB 2: BACKWARD CORSI ─────────────────────────────────────── */}
          {activeTab === 'corsi' && (
            <div>
              {!corsiMetrics ? (
                <EmptyResearchState activityTitle="Backward Corsi (Room 02)" />
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
                    <SummaryCard label="Participants Tested" value={corsiMetrics.participantsCount} color="#252640" sub="Cohort members" />
                    <SummaryCard label="Trials Recorded" value={corsiMetrics.totalTrials} color="#0D9488" sub="Trial-level records" />
                    <SummaryCard label="Overall Accuracy" value={`${corsiMetrics.overallAccuracy}%`} color="#4A9B7F" sub="Correct sequences" />
                    <SummaryCard label="Avg. Max Span" value={corsiMetrics.avgMaxSpan} color="#6567C9" sub="Sequence length" />
                    <SummaryCard label="Avg. Product Score" value={corsiMetrics.avgProductScore} color="#8B5CF6" sub="Span × Correct" />
                  </div>

                  {/* 4 Interactive Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6">
                    {/* Chart 1: Trial Accuracy by Sequence Length */}
                    <ChartCard
                      title="Trial Accuracy by Sequence Length"
                      subtitle="Proportion of fully correct trials per level (Sequence length in parentheses)"
                    >
                      <BarChart data={corsiMetrics.accuracyByLevel} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="level" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                        <Bar dataKey="accuracy" name="Accuracy %" radius={[6, 6, 0, 0]}>
                          {corsiMetrics.accuracyByLevel.map((_, i) => (
                            <Cell key={i} fill={`hsl(${185 - i * 8}, ${55 - i * 4}%, ${55 + i * 2}%)`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartCard>

                    {/* Chart 2: Latency by Level */}
                    <ChartCard
                      title="Response Latency Across Levels"
                      subtitle="Mean reaction time (ms) to initiate backward recall"
                    >
                      <LineChart data={corsiMetrics.latencyByLevel} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="level" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="ms" />
                        <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                        <Line type="monotone" dataKey="avgRt" name="Mean latency (ms)" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 4, fill: '#0D9488' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ChartCard>

                    {/* Chart 3: Maximum Level Reached Distribution */}
                    <ChartCard
                      title="Maximum Level Reached Distribution"
                      subtitle="Number of participants achieving each maximum level threshold"
                    >
                      <BarChart data={corsiMetrics.maxLevelDistribution} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="level" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                        <Bar dataKey="count" name="Participants" fill="#0D9488" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ChartCard>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── TAB 3: STROOP TASK ─────────────────────────────────────────── */}
          {activeTab === 'stroop' && (
            <div>
              {!stroopMetrics ? (
                <EmptyResearchState activityTitle="Stroop Task (Room 03)" />
              ) : !stroopMetrics.hasExperimentalData ? (
                <PracticeOnlyResearchState
                  activityTitle="Stroop Task (Room 03)"
                  practiceCount={stroopMetrics.practiceCount || 0}
                />
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
                    <SummaryCard label="Participants Tested" value={stroopMetrics.participantsCount} color="#252640" sub="Cohort members" />
                    <SummaryCard label="Exp. Trials" value={stroopMetrics.totalExpTrials} color="#6567C9" sub="Practice excluded" />
                    <SummaryCard label="Overall Accuracy" value={`${stroopMetrics.overallAccuracy}%`} color="#4A9B7F" sub="Correct trials" />
                    <SummaryCard label="Congruent RT" value={stroopMetrics.congruentMeanRt !== null ? `${stroopMetrics.congruentMeanRt}ms` : '—'} color="#2563EB" sub={`Acc: ${stroopMetrics.congruentAcc}%`} />
                    <SummaryCard label="Incongruent RT" value={stroopMetrics.incongruentMeanRt !== null ? `${stroopMetrics.incongruentMeanRt}ms` : '—'} color="#DC2626" sub={`Acc: ${stroopMetrics.incongruentAcc}%`} />
                    <SummaryCard label="Stroop Effect" value={typeof stroopMetrics.stroopEffectMs === 'number' ? `${stroopMetrics.stroopEffectMs >= 0 ? '+' : ''}${stroopMetrics.stroopEffectMs}ms` : '—'} color="#EF4444" sub="RT diff on correct trials" />
                  </div>

                  {/* 4 Interactive Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6">
                    {/* Chart 1: RT Comparison */}
                    <ChartCard
                      title="Reaction Time: Congruent vs. Incongruent"
                      subtitle="Mean response latency (ms) on correct trials"
                    >
                      <BarChart data={stroopMetrics.rtComparison} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="condition" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="ms" />
                        <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                        <Bar dataKey="avgRt" name="Mean RT (ms)" radius={[6, 6, 0, 0]}>
                          {stroopMetrics.rtComparison.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartCard>

                    {/* Chart 2: Accuracy Comparison */}
                    <ChartCard
                      title="Accuracy by Condition"
                      subtitle="Percentage of correct ink color classifications"
                    >
                      <BarChart data={stroopMetrics.accuracyComparison} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="condition" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                        <Bar dataKey="accuracy" name="Accuracy %" radius={[6, 6, 0, 0]}>
                          <Cell fill="#2563EB" />
                          <Cell fill="#DC2626" />
                        </Bar>
                      </BarChart>
                    </ChartCard>

                    {/* Chart 3: Stroop Interference by Participant */}
                    <ChartCard
                      title="Stroop Interference Cost by Participant"
                      subtitle="RT difference between correct incongruent and congruent trials"
                    >
                      <BarChart data={stroopMetrics.participantCosts} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="participant" tick={{ fontSize: 10, fill: '#9597AB', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="ms" />
                        <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                        <Bar dataKey="stroopCost" name="Stroop Cost (ms)" fill="#EF4444" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ChartCard>

                    {/* Chart 4: Latency Across Quartiles */}
                    <ChartCard
                      title="Interference Dynamics Across Trials"
                      subtitle="Reaction times across trial progression blocks (20 trials each)"
                    >
                      <LineChart data={stroopMetrics.quartiles} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="quartile" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="ms" />
                        <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Inter', paddingTop: 8 }} />
                        <Line type="monotone" dataKey="congruentRt" name="Congruent RT (ms)" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4, fill: '#2563EB' }} />
                        <Line type="monotone" dataKey="incongruentRt" name="Incongruent RT (ms)" stroke="#DC2626" strokeWidth={2.5} dot={{ r: 4, fill: '#DC2626' }} />
                      </LineChart>
                    </ChartCard>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── TAB 4: TASK SWITCHING ──────────────────────────────────────── */}
          {activeTab === 'task-switching' && (
            <div>
              {!taskSwitchingMetrics ? (
                <EmptyResearchState activityTitle="Task Switching (Room 04)" />
              ) : !taskSwitchingMetrics.hasExperimentalData ? (
                <PracticeOnlyResearchState
                  activityTitle="Task Switching (Room 04)"
                  practiceCount={taskSwitchingMetrics.practiceCount || 0}
                />
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
                    <SummaryCard label="Participants Tested" value={taskSwitchingMetrics.participantsCount} color="#252640" sub="Cohort members" />
                    <SummaryCard label="Exp. Trials" value={taskSwitchingMetrics.totalExpTrials} color="#6567C9" sub="Practice excluded" />
                    <SummaryCard label="Overall Accuracy" value={`${taskSwitchingMetrics.overallAccuracy}%`} color="#4A9B7F" sub="Correct trials" />
                    <SummaryCard label="Pure Block RT" value={taskSwitchingMetrics.pureMeanRt !== null ? `${taskSwitchingMetrics.pureMeanRt}ms` : '—'} color="#3B82F6" sub="Baseline latency" />
                    <SummaryCard label="Mixed Repeat RT" value={taskSwitchingMetrics.mixedRepeatRt !== null ? `${taskSwitchingMetrics.mixedRepeatRt}ms` : '—'} color="#10B981" sub="Repeat trials" />
                    <SummaryCard label="Switch Cost" value={typeof taskSwitchingMetrics.switchCostMs === 'number' ? `${taskSwitchingMetrics.switchCostMs >= 0 ? '+' : ''}${taskSwitchingMetrics.switchCostMs}ms` : '—'} color="#8B5CF6" sub="Switch − Repeat" />
                  </div>

                  {/* 4 Interactive Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6">
                    {/* Chart 1: RT Across Block Conditions */}
                    <ChartCard
                      title="Reaction Time Across Block Conditions"
                      subtitle="Mean response latency (ms) for pure baseline, mixed repeat, and mixed switch trials"
                    >
                      <BarChart data={taskSwitchingMetrics.rtAcrossConditions} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="condition" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="ms" />
                        <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                        <Bar dataKey="avgRt" name="Mean RT (ms)" radius={[6, 6, 0, 0]}>
                          {taskSwitchingMetrics.rtAcrossConditions.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartCard>

                    {/* Chart 2: Accuracy Across Conditions */}
                    <ChartCard
                      title="Accuracy Across Block Conditions"
                      subtitle="Percentage of correct responses in pure vs mixed repeat vs mixed switch blocks"
                    >
                      <BarChart data={taskSwitchingMetrics.accAcrossConditions} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="condition" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                        <Bar dataKey="accuracy" name="Accuracy %" fill="#2563EB" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ChartCard>

                    {/* Chart 3: Executive Switch Cost by Participant */}
                    <ChartCard
                      title="Executive Switch Cost by Participant"
                      subtitle="Switch latency minus repeat latency (ms) for individual participants"
                    >
                      <BarChart data={taskSwitchingMetrics.participantSwitchCosts} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="participant" tick={{ fontSize: 10, fill: '#9597AB', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="ms" />
                        <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                        <Bar dataKey="switchCost" name="Switch Cost (ms)" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ChartCard>

                    {/* Chart 4: Task Asymmetry */}
                    <ChartCard
                      title="Task Asymmetry: Letter vs. Number Tasks"
                      subtitle="Comparing processing speed and precision between task dimensions"
                    >
                      <BarChart data={taskSwitchingMetrics.taskAsymmetry} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                        <XAxis dataKey="task" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="ms" />
                        <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Inter', paddingTop: 8 }} />
                        <Bar dataKey="avgRt" name="Mean RT (ms)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="accuracy" name="Accuracy %" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartCard>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── RESEARCH DATA INTEGRITY BANNER ────────────────────────────── */}
          <div className="bg-[#F8F8FC] rounded-xl border border-[#E9E8F2] p-4 flex items-start gap-3 mt-4">
            <Database size={16} className="text-[#6567C9] flex-shrink-0 mt-0.5" />
            <div className="text-[11px] sm:text-xs text-[#73758C] leading-relaxed">
              <span className="font-semibold text-[#252640]">Live Research Analytical Pipeline:</span> Charts and KPI statistics on this page are computed dynamically from participant sessions, puzzle telemetries, and individual trial rows stored in Supabase. When rooms have not been completed by participants yet, empty states are presented without synthetic placeholders.
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color, sub }: {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E9E8F2] p-3.5 sm:p-4 text-center shadow-2xs">
      <div className="text-lg sm:text-xl font-bold font-['JetBrains_Mono',monospace] mb-0.5" style={{ color }}>
        {value}
      </div>
      <div className="text-[11px] sm:text-xs text-[#252640] font-['Plus_Jakarta_Sans',sans-serif] font-semibold">
        {label}
      </div>
      {sub && <div className="text-[10px] text-[#9597AB] mt-0.5 font-medium">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-6 shadow-2xs">
      <div className="mb-4 sm:mb-5">
        <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">{title}</h3>
        <p className="text-xs text-[#73758C] mt-0.5">{subtitle}</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

function EmptyResearchState({ activityTitle }: { activityTitle: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E9E8F2] p-12 text-center my-6 shadow-2xs">
      <div className="w-12 h-12 rounded-2xl bg-[#EDEAF8] flex items-center justify-center mx-auto mb-3.5">
        <Inbox size={24} className="text-[#6567C9]" />
      </div>
      <h3 className="text-base font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">
        No research data available yet
      </h3>
      <p className="text-xs text-[#73758C] mt-1.5 max-w-md mx-auto leading-relaxed">
        Participant records for <strong className="text-[#252640]">{activityTitle}</strong> will be aggregated and charted here automatically in real time once study sessions are completed in Supabase.
      </p>
    </div>
  );
}

function PracticeOnlyResearchState({ activityTitle, practiceCount }: { activityTitle: string; practiceCount: number }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E9E8F2] p-12 text-center my-6 shadow-2xs">
      <div className="w-12 h-12 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center mx-auto mb-3.5">
        <Inbox size={24} className="text-[#D97706]" />
      </div>
      <h3 className="text-base font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">
        Practice Trials Only Recorded ({practiceCount} Trials)
      </h3>
      <p className="text-xs text-[#73758C] mt-1.5 max-w-md mx-auto leading-relaxed">
        Participant records for <strong className="text-[#252640]">{activityTitle}</strong> currently contain only practice trials. In accordance with cognitive psychology protocol, practice trials are preserved in the raw database but strictly excluded from research metrics. Charts and effect sizes will populate automatically once experimental trials are completed.
      </p>
    </div>
  );
}
