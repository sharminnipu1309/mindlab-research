import { useState, useEffect } from 'react';
import { Page, TaskSwitchingBlockType, TaskType } from '../../types';
import AdminLayout from '../../components/AdminLayout';
import { taskSwitchingTrialData, chartData, demoParticipants } from '../../data/demo';
import { fetchTaskSwitchingAnalysisData, fetchParticipantsList } from '../../services/adminService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { Repeat, ChevronRight, X, Filter, Inbox } from 'lucide-react';

interface Props {
  navigate: (page: Page) => void;
  onLogout: () => void;
  currentPage: Page;
}

interface TaskSwitchingTrialItem {
  id?: string;
  participantId: string;
  trialNumber: number;
  phase: 'practice' | 'experimental';
  blockType: TaskSwitchingBlockType;
  taskType: TaskType;
  letter: string;
  number: number;
  correctResponse: 'B' | 'N';
  participantResponse: 'B' | 'N';
  isCorrect: boolean;
  status: 'correct' | 'incorrect';
  isTaskSwitch: boolean;
  isTaskRepeat: boolean;
  reactionTimeMs: number;
  timestampMs?: number;
  stimulusPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  consistency?: 'consistent' | 'inconsistent' | null;
  isConsistent?: boolean | null;
}

export default function TaskSwitchingAnalysis({ navigate, onLogout, currentPage }: Props) {
  const [trials, setTrials] = useState<TaskSwitchingTrialItem[]>(taskSwitchingTrialData as TaskSwitchingTrialItem[]);
  const [participants, setParticipants] = useState<typeof demoParticipants>(demoParticipants);
  const [isLive, setIsLive] = useState(false);
  const [filterPid, setFilterPid] = useState('');
  const [filterBlock, setFilterBlock] = useState<'All' | 'pure-letter' | 'pure-number' | 'mixed-repeat' | 'mixed-switch' | 'mixed-consistent' | 'mixed-inconsistent'>('All');
  const [filterPhase, setFilterPhase] = useState<'all' | 'experimental' | 'practice'>('all');
  const [activeChart, setActiveChart] = useState<'rt-blocks' | 'accuracy' | 'switch-cost' | 'shift-cost'>('rt-blocks');
  const [selectedTrial, setSelectedTrial] = useState<TaskSwitchingTrialItem | null>(null);

  useEffect(() => {
    fetchTaskSwitchingAnalysisData().then(res => {
      setTrials(res.trials as TaskSwitchingTrialItem[]);
      setIsLive(res.isLive);
    });
    fetchParticipantsList().then(res => {
      if (res && res.length > 0) {
        setParticipants(res as unknown as typeof demoParticipants);
      }
    });
  }, []);

  // Filtered trial-level list
  const filteredTrials = trials.filter(t => {
    const matchPid = !filterPid || t.participantId.toLowerCase().includes(filterPid.toLowerCase());
    let matchBlock = true;
    if (filterBlock === 'pure-letter') matchBlock = t.blockType === 'pure-letter';
    else if (filterBlock === 'pure-number') matchBlock = t.blockType === 'pure-number';
    else if (filterBlock === 'mixed-repeat') matchBlock = t.blockType === 'mixed' && t.isTaskRepeat;
    else if (filterBlock === 'mixed-switch') matchBlock = t.blockType === 'mixed' && t.isTaskSwitch;
    else if (filterBlock === 'mixed-consistent') matchBlock = t.blockType === 'mixed' && t.consistency === 'consistent';
    else if (filterBlock === 'mixed-inconsistent') matchBlock = t.blockType === 'mixed' && t.consistency === 'inconsistent';

    const matchPhase = filterPhase === 'all' || t.phase === filterPhase;
    return matchPid && matchBlock && matchPhase;
  });

  // Experimental trials (Practice trials excluded from research calculations)
  const experimentalTrials = trials.filter(t => t.phase === 'experimental');
  const totalExpTrials = experimentalTrials.length;
  const correctExpTrials = experimentalTrials.filter(t => t.isCorrect).length;
  const overallAccuracy = totalExpTrials > 0 ? (correctExpTrials / totalExpTrials) * 100 : null;

  // Pure Letter trials
  const pureLetterTrials = experimentalTrials.filter(t => t.blockType === 'pure-letter');
  const pureLetterCorrect = pureLetterTrials.filter(t => t.isCorrect && t.reactionTimeMs > 0);
  const pureLetterMeanRt = pureLetterCorrect.length > 0
    ? Math.round(pureLetterCorrect.reduce((s, t) => s + t.reactionTimeMs, 0) / pureLetterCorrect.length)
    : null;
  const pureLetterAcc = pureLetterTrials.length > 0
    ? (pureLetterCorrect.length / pureLetterTrials.length) * 100
    : null;

  // Pure Number trials
  const pureNumberTrials = experimentalTrials.filter(t => t.blockType === 'pure-number');
  const pureNumberCorrect = pureNumberTrials.filter(t => t.isCorrect && t.reactionTimeMs > 0);
  const pureNumberMeanRt = pureNumberCorrect.length > 0
    ? Math.round(pureNumberCorrect.reduce((s, t) => s + t.reactionTimeMs, 0) / pureNumberCorrect.length)
    : null;
  const pureNumberAcc = pureNumberTrials.length > 0
    ? (pureNumberCorrect.length / pureNumberTrials.length) * 100
    : null;

  // Mixed Repeat trials (excluding first mixed trial as it has isTaskRepeat: false, isTaskSwitch: false)
  const mixedRepeatTrials = experimentalTrials.filter(t => t.blockType === 'mixed' && t.isTaskRepeat);
  const mixedRepeatCorrect = mixedRepeatTrials.filter(t => t.isCorrect && t.reactionTimeMs > 0);
  const mixedRepeatMeanRt = mixedRepeatCorrect.length > 0
    ? Math.round(mixedRepeatCorrect.reduce((s, t) => s + t.reactionTimeMs, 0) / mixedRepeatCorrect.length)
    : null;
  const mixedRepeatAcc = mixedRepeatTrials.length > 0
    ? (mixedRepeatCorrect.length / mixedRepeatTrials.length) * 100
    : null;

  // Mixed Switch trials
  const mixedSwitchTrials = experimentalTrials.filter(t => t.blockType === 'mixed' && t.isTaskSwitch);
  const mixedSwitchCorrect = mixedSwitchTrials.filter(t => t.isCorrect && t.reactionTimeMs > 0);
  const mixedSwitchMeanRt = mixedSwitchCorrect.length > 0
    ? Math.round(mixedSwitchCorrect.reduce((s, t) => s + t.reactionTimeMs, 0) / mixedSwitchCorrect.length)
    : null;
  const mixedSwitchAcc = mixedSwitchTrials.length > 0
    ? (mixedSwitchCorrect.length / mixedSwitchTrials.length) * 100
    : null;

  // Switch Cost = Switch RT − Repeat RT (on correct trials)
  const switchCostMs = (mixedSwitchMeanRt !== null && mixedRepeatMeanRt !== null)
    ? mixedSwitchMeanRt - mixedRepeatMeanRt
    : null;

  // Spatial Shift Cost (Row Consistency in Randomized Mixed Block)
  // Practice and pure blocks are strictly excluded from shift-cost calculations
  const mixedExpTrials = experimentalTrials.filter(t => t.blockType === 'mixed');
  const mixedConsistentTrials = mixedExpTrials.filter(t => t.consistency === 'consistent');
  const mixedConsistentCorrect = mixedConsistentTrials.filter(t => t.isCorrect && t.reactionTimeMs > 0);
  const mixedConsistentMeanRt = mixedConsistentCorrect.length > 0
    ? Math.round(mixedConsistentCorrect.reduce((s, t) => s + t.reactionTimeMs, 0) / mixedConsistentCorrect.length)
    : null;
  const mixedConsistentAcc = mixedConsistentTrials.length > 0
    ? (mixedConsistentCorrect.length / mixedConsistentTrials.length) * 100
    : null;

  const mixedInconsistentTrials = mixedExpTrials.filter(t => t.consistency === 'inconsistent');
  const mixedInconsistentCorrect = mixedInconsistentTrials.filter(t => t.isCorrect && t.reactionTimeMs > 0);
  const mixedInconsistentMeanRt = mixedInconsistentCorrect.length > 0
    ? Math.round(mixedInconsistentCorrect.reduce((s, t) => s + t.reactionTimeMs, 0) / mixedInconsistentCorrect.length)
    : null;
  const mixedInconsistentAcc = mixedInconsistentTrials.length > 0
    ? (mixedInconsistentCorrect.length / mixedInconsistentTrials.length) * 100
    : null;

  // Shift Cost = Mean RT (inconsistent) − Mean RT (consistent) on valid correct trials
  const shiftCostMs = (mixedInconsistentMeanRt !== null && mixedConsistentMeanRt !== null)
    ? mixedInconsistentMeanRt - mixedConsistentMeanRt
    : null;

  // Participant summaries from live data
  const participantIds = Array.from(new Set(trials.map(t => t.participantId)));
  const computedParticipants = participantIds.map(pid => {
    const pTrials = trials.filter(t => t.participantId === pid);
    const pExpTrials = pTrials.filter(t => t.phase === 'experimental');
    const pPracticeTrials = pTrials.filter(t => t.phase === 'practice');

    if (pExpTrials.length === 0) {
      return {
        id: pid,
        hasExperimentalData: false,
        taskSwitchingAccuracy: null as number | null,
        pureLetterMeanRt: null as number | null,
        pureNumberMeanRt: null as number | null,
        mixedRepeatMeanRt: null as number | null,
        mixedSwitchMeanRt: null as number | null,
        switchCost: null as number | null,
        consistentMeanRt: null as number | null,
        inconsistentMeanRt: null as number | null,
        shiftCost: null as number | null,
        totalExpTrials: 0,
        totalPracticeTrials: pPracticeTrials.length,
        status: `Practice Only (${pPracticeTrials.length} trials)`,
      };
    }

    const pLetter = pExpTrials.filter(t => t.blockType === 'pure-letter' && t.isCorrect && t.reactionTimeMs > 0);
    const pNumber = pExpTrials.filter(t => t.blockType === 'pure-number' && t.isCorrect && t.reactionTimeMs > 0);
    const pRepeat = pExpTrials.filter(t => t.blockType === 'mixed' && t.isTaskRepeat && t.isCorrect && t.reactionTimeMs > 0);
    const pSwitch = pExpTrials.filter(t => t.blockType === 'mixed' && t.isTaskSwitch && t.isCorrect && t.reactionTimeMs > 0);

    const letterMean = pLetter.length > 0 ? Math.round(pLetter.reduce((s, t) => s + t.reactionTimeMs, 0) / pLetter.length) : null;
    const numberMean = pNumber.length > 0 ? Math.round(pNumber.reduce((s, t) => s + t.reactionTimeMs, 0) / pNumber.length) : null;
    const repeatMean = pRepeat.length > 0 ? Math.round(pRepeat.reduce((s, t) => s + t.reactionTimeMs, 0) / pRepeat.length) : null;
    const switchMean = pSwitch.length > 0 ? Math.round(pSwitch.reduce((s, t) => s + t.reactionTimeMs, 0) / pSwitch.length) : null;
    const cost = (switchMean !== null && repeatMean !== null) ? switchMean - repeatMean : null;

    const pMixed = pExpTrials.filter(t => t.blockType === 'mixed');
    const pConsistent = pMixed.filter(t => t.consistency === 'consistent' && t.isCorrect && t.reactionTimeMs > 0);
    const pInconsistent = pMixed.filter(t => t.consistency === 'inconsistent' && t.isCorrect && t.reactionTimeMs > 0);
    const consistentMean = pConsistent.length > 0 ? Math.round(pConsistent.reduce((s, t) => s + t.reactionTimeMs, 0) / pConsistent.length) : null;
    const inconsistentMean = pInconsistent.length > 0 ? Math.round(pInconsistent.reduce((s, t) => s + t.reactionTimeMs, 0) / pInconsistent.length) : null;
    const pShiftCost = (inconsistentMean !== null && consistentMean !== null) ? inconsistentMean - consistentMean : null;

    const acc = (pExpTrials.filter(t => t.isCorrect).length / pExpTrials.length) * 100;
    const isFull = pExpTrials.length >= 64;

    return {
      id: pid,
      hasExperimentalData: true,
      taskSwitchingAccuracy: acc,
      pureLetterMeanRt: letterMean,
      pureNumberMeanRt: numberMean,
      mixedRepeatMeanRt: repeatMean,
      mixedSwitchMeanRt: switchMean,
      switchCost: cost,
      consistentMeanRt: consistentMean,
      inconsistentMeanRt: inconsistentMean,
      shiftCost: pShiftCost,
      totalExpTrials: pExpTrials.length,
      totalPracticeTrials: pPracticeTrials.length,
      status: isFull ? 'Complete' : `Incomplete (${pExpTrials.length}/64)`,
    };
  });

  const displayParticipants = isLive && computedParticipants.length > 0
    ? computedParticipants
    : participants.filter(p => p.taskSwitchingDone).map(p => ({
        ...p,
        hasExperimentalData: true,
        status: 'Complete',
        consistentMeanRt: (p as any).consistentMeanRt ?? 605,
        inconsistentMeanRt: (p as any).inconsistentMeanRt ?? 752,
        shiftCost: (p as any).shiftCost ?? 147,
      }));

  // Dynamic charts
  const dynamicRtComparison = totalExpTrials > 0 && pureLetterMeanRt !== null && pureNumberMeanRt !== null ? [
    { condition: 'Pure Letter', avgRt: pureLetterMeanRt },
    { condition: 'Pure Number', avgRt: pureNumberMeanRt },
    { condition: 'Mixed Repeat', avgRt: mixedRepeatMeanRt || 0 },
    { condition: 'Mixed Switch', avgRt: mixedSwitchMeanRt || 0 },
  ] : [];

  const dynamicAccuracyByBlock = totalExpTrials > 0 && pureLetterAcc !== null ? [
    { block: 'Pure Letter', accuracy: Math.round(pureLetterAcc) },
    { block: 'Pure Number', accuracy: Math.round(pureNumberAcc || 0) },
    { block: 'Mixed Repeat', accuracy: Math.round(mixedRepeatAcc || 0) },
    { block: 'Mixed Switch', accuracy: Math.round(mixedSwitchAcc || 0) },
  ] : [];

  const dynamicSwitchCostByParticipant = displayParticipants.filter(p => p.hasExperimentalData && p.switchCost !== null).slice(0, 8).map(p => ({
    participant: p.id,
    repeatRt: p.mixedRepeatMeanRt || 0,
    switchRt: p.mixedSwitchMeanRt || 0,
  }));

  const dynamicShiftCostData = [
    { condition: 'Consistent (Same Row)', avgRt: mixedConsistentMeanRt || 0 },
    { condition: 'Inconsistent (Row Shift)', avgRt: mixedInconsistentMeanRt || 0 },
  ];

  const activeRtChartData = isLive ? dynamicRtComparison : chartData.taskSwitchingRtComparison;
  const activeAccuracyChartData = isLive ? dynamicAccuracyByBlock : chartData.taskSwitchingAccuracyByBlock;
  const activeSwitchCostChartData = isLive ? dynamicSwitchCostByParticipant : chartData.taskSwitchingSwitchCostByParticipant;
  const activeShiftCostChartData = dynamicShiftCostData;

  return (
    <AdminLayout
      currentPage={currentPage}
      navigate={navigate}
      onLogout={onLogout}
      pageTitle="Task Switching — Analysis"
      breadcrumb="Analysis"
    >
      {/* Summary KPI Cards: Task Switch Cost & Baseline */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 mb-4">
        {[
          { label: 'Participants', value: displayParticipants.filter(p => p.hasExperimentalData).length, color: '#252640', sub: 'With exp. trials' },
          { label: 'Total Trials', value: totalExpTrials, color: '#6567C9', sub: 'Practice excluded' },
          { label: 'Accuracy', value: overallAccuracy !== null ? `${overallAccuracy.toFixed(1)}%` : '—', color: '#4A9B7F', sub: totalExpTrials > 0 ? `${correctExpTrials}/${totalExpTrials} correct` : 'No exp. data' },
          { label: 'Pure Letter RT', value: pureLetterMeanRt !== null ? `${pureLetterMeanRt}ms` : '—', color: '#3B82F6', sub: pureLetterAcc !== null ? `Acc: ${pureLetterAcc.toFixed(0)}%` : 'Correct trials only' },
          { label: 'Pure Number RT', value: pureNumberMeanRt !== null ? `${pureNumberMeanRt}ms` : '—', color: '#0D9488', sub: pureNumberAcc !== null ? `Acc: ${pureNumberAcc.toFixed(0)}%` : 'Correct trials only' },
          { label: 'Mixed Repeat RT', value: mixedRepeatMeanRt !== null ? `${mixedRepeatMeanRt}ms` : '—', color: '#6366F1', sub: mixedRepeatAcc !== null ? `Acc: ${mixedRepeatAcc.toFixed(0)}%` : 'Correct trials only' },
          { label: 'Task Switch Cost', value: switchCostMs !== null ? `${switchCostMs >= 0 ? '+' : ''}${switchCostMs}ms` : '—', color: '#8B5CF6', sub: 'Switch − Repeat' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E9E8F2] p-3 sm:p-3.5 text-center shadow-xs">
            <div className="text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] mb-0.5" style={{ color }}>{value}</div>
            <div className="text-[11px] sm:text-xs text-[#252640] font-['Plus_Jakarta_Sans',sans-serif] font-semibold">{label}</div>
            <div className="text-[10px] text-[#9597AB] mt-0.5 font-medium">{sub}</div>
          </div>
        ))}
      </div>

      {/* Summary KPI Cards: Spatial Row Consistency & Shift Cost */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#A7F3D0] bg-gradient-to-br from-white to-[#ECFDF5]/30 p-3.5 sm:p-4 text-center shadow-xs">
          <div className="text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#059669] mb-0.5">
            {mixedConsistentMeanRt !== null ? `${mixedConsistentMeanRt}ms` : '—'}
          </div>
          <div className="text-xs text-[#065F46] font-['Plus_Jakarta_Sans',sans-serif] font-bold">
            Row-Consistent Condition (Same Row)
          </div>
          <div className="text-[11px] text-[#059669] mt-0.5 font-medium">
            {mixedConsistentTrials.length} trials · {mixedConsistentCorrect.length} valid correct
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#FDE68A] bg-gradient-to-br from-white to-[#FFFBEB]/30 p-3.5 sm:p-4 text-center shadow-xs">
          <div className="text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#D97706] mb-0.5">
            {mixedInconsistentMeanRt !== null ? `${mixedInconsistentMeanRt}ms` : '—'}
          </div>
          <div className="text-xs text-[#92400E] font-['Plus_Jakarta_Sans',sans-serif] font-bold">
            Row-Inconsistent Condition (Row Shift)
          </div>
          <div className="text-[11px] text-[#D97706] mt-0.5 font-medium">
            {mixedInconsistentTrials.length} trials · {mixedInconsistentCorrect.length} valid correct
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#DDD6FE] bg-gradient-to-br from-white to-[#F5F3FF]/40 p-3.5 sm:p-4 text-center shadow-xs">
          <div className="text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#7C3AED] mb-0.5">
            {shiftCostMs !== null ? `${shiftCostMs >= 0 ? '+' : ''}${shiftCostMs}ms` : '—'}
          </div>
          <div className="text-xs text-[#5B21B6] font-['Plus_Jakarta_Sans',sans-serif] font-bold">
            Spatial Shift Cost (Inconsistent − Consistent)
          </div>
          <div className="text-[11px] text-[#7C3AED] mt-0.5 font-medium">
            {shiftCostMs !== null ? 'Mean RT (Inconsistent) − Mean RT (Consistent)' : 'Insufficient valid correct trials'}
          </div>
        </div>
      </div>

      {/* Cognitive Paradigm Explanation Banner */}
      <div className="bg-[#F5F3FF] rounded-xl border border-[#DDD6FE] p-3.5 sm:p-4 mb-6">
        <div className="flex items-start gap-3">
          <Repeat size={16} className="text-[#8B5CF6] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#73758C] leading-relaxed space-y-1">
            <p>
              <strong className="text-[#252640]">Alternating-Runs Task Switching:</strong> Rogers &amp; Monsell (1995) 2×2 quadrant paradigm. Stimulus position in the grid indicates the task: <strong>Top Row = Letter Task</strong>, <strong>Bottom Row = Number Task</strong>. The mixed block rotates clockwise (Q1 → Q2 → Q3 → Q4), producing predictable runs of two trials per task without explicit cues.
            </p>
            <p>
              <strong className="text-[#252640]">Task Switch Cost</strong> = Mean RT (Mixed Switch) − Mean RT (Mixed Repeat) on correct trials. Evaluates cognitive flexibility and executive set-shifting. Excludes the first neutral mixed trial.
            </p>
            <p>
              <strong className="text-[#252640]">Spatial Shift Cost</strong> = Mean RT (Inconsistent) − Mean RT (Consistent) on correct trials in the randomized mixed block. Classifies row consistency: Consistent (both in top row or both in bottom row) vs. Inconsistent (top-to-bottom or bottom-to-top transition). The first randomized trial is unclassified. Practice and pure-task blocks are excluded.
            </p>
            <p>
              <strong className="text-[#252640]">Trial Structure:</strong> 8 Practice Trials (excluded from research metrics) + 128 Experimental Trials (32 Pure Letter, 32 Pure Number, 64 Mixed Alternating-Runs: 1 neutral, 32 repeat, 31 switch).
            </p>
            <p>
              <strong className="text-[#252640]">Keys Mapping:</strong> Letter Task: B = Vowel, N = Consonant · Number Task: B = Odd, N = Even.
            </p>
          </div>
        </div>
      </div>

      {/* Practice-Only Telemetry Notice Banner */}
      {isLive && totalExpTrials === 0 && trials.length > 0 && (
        <div className="bg-[#FFFBEB] rounded-xl border border-[#FDE68A] p-3.5 sm:p-4 mb-6">
          <div className="flex items-start gap-3">
            <Repeat size={16} className="text-[#D97706] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[#92400E] leading-relaxed">
              <strong className="font-bold">Practice Trials Only Recorded:</strong> The database currently contains {trials.length} practice trials (Phase: <code className="bg-[#FEF3C7] px-1 py-0.5 rounded font-mono">practice</code>) and 0 experimental trials. Under cognitive psychology protocols, practice trials are preserved in raw telemetry but strictly excluded from primary research statistics. Charts and switch cost latencies will populate when participants complete experimental trials.
            </div>
          </div>
        </div>
      )}

      {isLive && trials.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E9E8F2] p-12 text-center my-6">
          <Inbox size={36} className="text-[#C5C1F1] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">No Participant Task Switching Trials Yet</h3>
          <p className="text-xs text-[#73758C] mt-1 max-w-md mx-auto">
            Switch costs, pure vs. mixed block reaction times, and cognitive flexibility metrics will be aggregated here automatically once participants begin Room 04.
          </p>
        </div>
      ) : (
        <>
          {/* Interactive Research Charts */}
          <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
              <div>
                <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Research Performance Charts</h3>
                <p className="text-xs text-[#73758C] mt-0.5">{isLive ? 'Live Database Telemetry' : 'Demo Mode'} · n={totalExpTrials} experimental trials</p>
              </div>
              <div className="flex flex-wrap gap-1 bg-[#F8F8FC] border border-[#E9E8F2] rounded-lg p-1">
                {([
                  ['rt-blocks', 'Condition RT Comparison'],
                  ['accuracy', 'Accuracy by Block'],
                  ['switch-cost', 'Switch Cost by Participant'],
                  ['shift-cost', 'Spatial Shift Cost'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setActiveChart(id)}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-semibold font-['Plus_Jakarta_Sans',sans-serif] transition-all ${
                      activeChart === id ? 'bg-white shadow-sm text-[#252640]' : 'text-[#73758C] hover:text-[#252640]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {isLive && totalExpTrials === 0 ? (
              <div className="py-12 text-center">
                <Inbox size={32} className="text-[#C5C1F1] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#252640]">No Experimental Trials Recorded Yet</p>
                <p className="text-[11px] text-[#73758C] mt-1 max-w-sm mx-auto">
                  The database contains {trials.length} practice trials. Under research protocol, practice trials are excluded from research performance charts.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                {activeChart === 'rt-blocks' ? (
                  <BarChart data={activeRtChartData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                    <XAxis dataKey="condition" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="ms" domain={[0, 'dataMax + 150']} />
                    <Tooltip
                      contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }}
                      formatter={(val: unknown) => [`${val} ms`, 'Mean RT']}
                    />
                    <Bar dataKey="avgRt" name="Mean Reaction Time" radius={[6, 6, 0, 0]}>
                      {activeRtChartData.map((_, i) => (
                        <Cell key={i} fill={['#3B82F6', '#0D9488', '#6366F1', '#8B5CF6'][i % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : activeChart === 'accuracy' ? (
                  <BarChart data={activeAccuracyChartData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                    <XAxis dataKey="block" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }}
                      formatter={(val: unknown) => [`${val}%`, 'Accuracy']}
                    />
                    <Bar dataKey="accuracy" name="Accuracy %" radius={[6, 6, 0, 0]}>
                      {activeAccuracyChartData.map((_, i) => (
                        <Cell key={i} fill={['#69AFA8', '#4A9B7F', '#6567C9', '#8B5CF6'][i % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : activeChart === 'shift-cost' ? (
                  <BarChart data={activeShiftCostChartData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                    <XAxis dataKey="condition" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="ms" domain={[0, 'dataMax + 150']} />
                    <Tooltip
                      contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }}
                      formatter={(val: unknown) => [`${val} ms`, 'Mean RT']}
                    />
                    <Bar dataKey="avgRt" name="Mean Reaction Time" radius={[6, 6, 0, 0]}>
                      {activeShiftCostChartData.map((_, i) => (
                        <Cell key={i} fill={['#059669', '#D97706'][i % 2]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <BarChart data={activeSwitchCostChartData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                    <XAxis dataKey="participant" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="ms" />
                    <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Inter' }} />
                    <Bar dataKey="repeatRt" name="Mixed Repeat RT" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="switchRt" name="Mixed Switch RT" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          {/* Participant Performance Summary Table */}
          <div className="bg-white rounded-2xl border border-[#E9E8F2] mb-6 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-[#E9E8F2] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Participant Performance Summary</h3>
                <p className="text-xs text-[#73758C] mt-0.5">Summary metrics including Switch Cost and Spatial Shift Cost</p>
              </div>
              <span className="text-xs font-semibold text-[#8B5CF6] bg-[#F5F3FF] px-2.5 py-1 rounded-lg">
                {displayParticipants.length} Participants
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Participant ID</th>
                    <th>Overall Accuracy</th>
                    <th>Pure Letter RT</th>
                    <th>Pure Number RT</th>
                    <th>Mixed Repeat RT</th>
                    <th>Mixed Switch RT</th>
                    <th>Switch Cost</th>
                    <th>Consistent RT</th>
                    <th>Inconsistent RT</th>
                    <th>Shift Cost</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayParticipants.map(p => (
                    <tr key={p.id}>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-[#6567C9] text-xs font-bold">{p.id}</span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-sm font-bold text-[#4A9B7F]">
                          {p.taskSwitchingAccuracy !== null && p.taskSwitchingAccuracy !== undefined ? `${p.taskSwitchingAccuracy.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-sm text-[#3B82F6]">
                          {p.pureLetterMeanRt !== null && p.pureLetterMeanRt !== undefined ? `${p.pureLetterMeanRt}ms` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-sm text-[#0D9488]">
                          {p.pureNumberMeanRt !== null && p.pureNumberMeanRt !== undefined ? `${p.pureNumberMeanRt}ms` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-sm text-[#6366F1]">
                          {p.mixedRepeatMeanRt !== null && p.mixedRepeatMeanRt !== undefined ? `${p.mixedRepeatMeanRt}ms` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-sm text-[#8B5CF6]">
                          {p.mixedSwitchMeanRt !== null && p.mixedSwitchMeanRt !== undefined ? `${p.mixedSwitchMeanRt}ms` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-sm font-bold text-[#8B5CF6]">
                          {p.switchCost !== null && p.switchCost !== undefined ? `${p.switchCost >= 0 ? '+' : ''}${p.switchCost}ms` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-sm text-[#059669]">
                          {p.consistentMeanRt !== null && p.consistentMeanRt !== undefined ? `${p.consistentMeanRt}ms` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-sm text-[#D97706]">
                          {p.inconsistentMeanRt !== null && p.inconsistentMeanRt !== undefined ? `${p.inconsistentMeanRt}ms` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-sm font-bold text-[#7C3AED]">
                          {p.shiftCost !== null && p.shiftCost !== undefined ? `${p.shiftCost >= 0 ? '+' : ''}${p.shiftCost}ms` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge text-[11px] ${
                          p.status === 'Complete'
                            ? 'bg-[#D1EDE5] text-[#4A9B7F]'
                            : p.hasExperimentalData
                            ? 'bg-[#FEF3C7] text-[#D97706]'
                            : 'bg-[#EDEAF8] text-[#6567C9]'
                        }`}>
                          {p.status || 'Complete'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trial-Level Data Table */}
          <div className="bg-white rounded-2xl border border-[#E9E8F2] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[#E9E8F2] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Trial-Level Data</h3>
                <p className="text-xs text-[#73758C] mt-0.5">Granular raw stimulus and response records</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Filter by Participant ID */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filter by Participant ID..."
                    value={filterPid}
                    onChange={e => setFilterPid(e.target.value)}
                    className="ml-input text-xs py-1.5 px-3 w-40 sm:w-48"
                  />
                </div>

                {/* Filter by Block */}
                <div className="flex items-center gap-1 bg-[#F8F8FC] border border-[#E9E8F2] rounded-lg p-1">
                  {(['All', 'pure-letter', 'pure-number', 'mixed-repeat', 'mixed-switch', 'mixed-consistent', 'mixed-inconsistent'] as const).map(b => (
                    <button
                      key={b}
                      onClick={() => setFilterBlock(b)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold font-['Plus_Jakarta_Sans',sans-serif] transition-all capitalize ${
                        filterBlock === b ? 'bg-white shadow-sm text-[#252640]' : 'text-[#73758C] hover:text-[#252640]'
                      }`}
                    >
                      {b.replace('-', ' ')}
                    </button>
                  ))}
                </div>

                {/* Filter by Phase */}
                <div className="flex items-center gap-1 bg-[#F8F8FC] border border-[#E9E8F2] rounded-lg p-1">
                  {(['all', 'experimental', 'practice'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setFilterPhase(p)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold font-['Plus_Jakarta_Sans',sans-serif] transition-all capitalize ${
                        filterPhase === p ? 'bg-white shadow-sm text-[#252640]' : 'text-[#73758C] hover:text-[#252640]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-[#9597AB] font-medium ml-1">
                  {filteredTrials.length} trials
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Trial</th>
                    <th>Phase</th>
                    <th>Block</th>
                    <th>Task</th>
                    <th>Stimulus</th>
                    <th>Position</th>
                    <th>Expected</th>
                    <th>Response</th>
                    <th>Task Shift</th>
                    <th>Row Consistency</th>
                    <th>Accuracy</th>
                    <th>RT (ms)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrials.slice(0, 100).map((t, i) => (
                    <tr key={i} className="cursor-pointer" onClick={() => setSelectedTrial(t)}>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-[#6567C9] text-xs font-bold">{t.participantId}</span>
                      </td>
                      <td className="font-['JetBrains_Mono',monospace] text-sm">{t.trialNumber}</td>
                      <td>
                        <span className={`badge text-[10px] ${t.phase === 'practice' ? 'bg-[#EDEAF8] text-[#6567C9]' : 'bg-[#F8F8FC] text-[#252640] border border-[#E9E8F2]'}`}>
                          {t.phase}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-medium text-[#73758C] capitalize">
                          {t.blockType.replace('-', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge text-[11px] ${
                          t.taskType === 'letter' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F0FDF4] text-[#16A34A]'
                        }`}>
                          {t.taskType}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-sm font-bold text-[#252640]">
                          {t.letter}{t.number}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-xs text-[#64748B]">
                          {t.stimulusPosition || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-xs font-bold text-[#252640]">
                          {t.correctResponse}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-xs font-bold text-[#6567C9]">
                          {t.participantResponse}
                        </span>
                      </td>
                      <td>
                        {t.isTaskSwitch ? (
                          <span className="badge text-[10px] bg-[#F5F3FF] text-[#8B5CF6]">Switch</span>
                        ) : t.isTaskRepeat ? (
                          <span className="badge text-[10px] bg-[#EDEAF8] text-[#6366F1]">Repeat</span>
                        ) : (
                          <span className="text-xs text-[#9597AB]">—</span>
                        )}
                      </td>
                      <td>
                        {t.consistency === 'consistent' ? (
                          <span className="badge text-[10px] bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">Consistent</span>
                        ) : t.consistency === 'inconsistent' ? (
                          <span className="badge text-[10px] bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">Inconsistent</span>
                        ) : (
                          <span className="text-xs text-[#9597AB]">{t.blockType === 'mixed' && (t.trialNumber === 33 || t.trialNumber === 1) ? 'First (Neutral)' : '—'}</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge text-[11px] ${t.isCorrect ? 'bg-[#D1EDE5] text-[#4A9B7F]' : 'bg-[#FBDEDD] text-[#C4625A]'}`}>
                          {t.isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-sm text-[#252640] font-semibold">
                          {t.reactionTimeMs}ms
                        </span>
                      </td>
                      <td>
                        <ChevronRight size={14} className="text-[#C5C1F1]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Trial Detail Drawer */}
      {selectedTrial && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-[#252640]/20 backdrop-blur-sm" onClick={() => setSelectedTrial(null)} />
          <div className="relative w-full max-w-xs sm:w-80 bg-white shadow-2xl h-full overflow-y-auto custom-scroll animate-slide-right p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Task Switching Trial Detail</h3>
              <button onClick={() => setSelectedTrial(null)} className="text-[#73758C] hover:text-[#252640] p-1 rounded">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Participant', value: selectedTrial.participantId, mono: true, color: '#6567C9' },
                { label: 'Trial Number', value: String(selectedTrial.trialNumber), mono: true },
                { label: 'Phase', value: selectedTrial.phase },
                { label: 'Block', value: selectedTrial.blockType },
                { label: 'Task Target', value: selectedTrial.taskType },
                { label: 'Stimulus Pair', value: `${selectedTrial.letter}${selectedTrial.number}`, mono: true },
                { label: 'Stimulus Position', value: selectedTrial.stimulusPosition || 'N/A', mono: true },
                { label: 'Correct Key', value: selectedTrial.correctResponse, mono: true },
                { label: 'Participant Key', value: selectedTrial.participantResponse, mono: true, color: '#6567C9' },
                { label: 'Task Switch', value: selectedTrial.isTaskSwitch ? 'Task Switch' : selectedTrial.isTaskRepeat ? 'Task Repeat' : 'Pure Block' },
                { label: 'Row Consistency', value: selectedTrial.consistency === 'consistent' ? 'Consistent (Same Row)' : selectedTrial.consistency === 'inconsistent' ? 'Inconsistent (Row Shift)' : 'Unclassified', color: selectedTrial.consistency === 'consistent' ? '#059669' : selectedTrial.consistency === 'inconsistent' ? '#D97706' : undefined },
                { label: 'Result', value: selectedTrial.isCorrect ? 'Correct' : 'Incorrect', color: selectedTrial.isCorrect ? '#4A9B7F' : '#C4625A' },
                { label: 'Reaction Time', value: `${selectedTrial.reactionTimeMs}ms`, mono: true },
              ].map(({ label, value, mono, color }) => (
                <div key={label} className="flex justify-between items-center py-2.5 border-b border-[#F3F2FA] last:border-0">
                  <span className="text-xs text-[#73758C]">{label}</span>
                  <span
                    className={`text-xs font-bold ${mono ? 'font-["JetBrains_Mono",monospace]' : 'font-["Plus_Jakarta_Sans",sans-serif]'}`}
                    style={{ color: color || '#252640' }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
