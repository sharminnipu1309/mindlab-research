import { useState, useEffect } from 'react';
import { Page, StroopColor } from '../../types';
import AdminLayout from '../../components/AdminLayout';
import { stroopTrialData, chartData, demoParticipants } from '../../data/demo';
import { fetchStroopAnalysisData, fetchParticipantsList } from '../../services/adminService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { Info, ChevronRight, X, Filter, Zap, CheckCircle2, AlertCircle, Inbox } from 'lucide-react';

interface Props {
  navigate: (page: Page) => void;
  onLogout: () => void;
  currentPage: Page;
}

interface StroopTrialItem {
  id?: string;
  participantId: string;
  trialNumber: number;
  phase: 'practice' | 'experiment';
  word: StroopColor;
  inkColor: StroopColor;
  condition: 'congruent' | 'incongruent';
  correctResponse: StroopColor;
  participantResponse: StroopColor;
  isCorrect: boolean;
  reactionTimeMs: number;
  timestampMs?: number;
}

const colorHexMap: Record<StroopColor, string> = {
  RED: '#DC2626',
  GREEN: '#16A34A',
  BLUE: '#2563EB',
  YELLOW: '#CA8A04',
};

export default function StroopAnalysis({ navigate, onLogout, currentPage }: Props) {
  const [trials, setTrials] = useState<StroopTrialItem[]>(stroopTrialData);
  const [participants, setParticipants] = useState<typeof demoParticipants>(demoParticipants);
  const [isLive, setIsLive] = useState(false);
  const [filterPid, setFilterPid] = useState('');
  const [filterCondition, setFilterCondition] = useState<'All' | 'congruent' | 'incongruent'>('All');
  const [filterPhase, setFilterPhase] = useState<'all' | 'experiment' | 'practice'>('all');
  const [activeChart, setActiveChart] = useState<'rt-comparison' | 'accuracy'>('rt-comparison');
  const [selectedTrial, setSelectedTrial] = useState<StroopTrialItem | null>(null);

  useEffect(() => {
    fetchStroopAnalysisData().then(res => {
      setTrials(res.trials as StroopTrialItem[]);
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
    const matchCond = filterCondition === 'All' || t.condition === filterCondition;
    const matchPhase = filterPhase === 'all' || t.phase === filterPhase;
    return matchPid && matchCond && matchPhase;
  });

  // Main experimental calculations (Excluding practice trials)
  const experimentalTrials = trials.filter(t => t.phase === 'experiment');
  const totalExpTrials = experimentalTrials.length;
  const correctExpTrials = experimentalTrials.filter(t => t.isCorrect).length;
  const overallAccuracy = totalExpTrials > 0 ? (correctExpTrials / totalExpTrials) * 100 : null;

  const congruentTrials = experimentalTrials.filter(t => t.condition === 'congruent');
  const incongruentTrials = experimentalTrials.filter(t => t.condition === 'incongruent');

  const congruentCorrect = congruentTrials.filter(t => t.isCorrect).length;
  const incongruentCorrect = incongruentTrials.filter(t => t.isCorrect).length;

  const congruentAccuracy = congruentTrials.length > 0 ? (congruentCorrect / congruentTrials.length) * 100 : null;
  const incongruentAccuracy = incongruentTrials.length > 0 ? (incongruentCorrect / incongruentTrials.length) * 100 : null;

  const correctCongruent = congruentTrials.filter(t => t.isCorrect);
  const correctIncongruent = incongruentTrials.filter(t => t.isCorrect);

  const meanCongruentRt = correctCongruent.length > 0
    ? Math.round(correctCongruent.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctCongruent.length)
    : null;

  const meanIncongruentRt = correctIncongruent.length > 0
    ? Math.round(correctIncongruent.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctIncongruent.length)
    : null;

  const stroopEffectMs = (meanIncongruentRt !== null && meanCongruentRt !== null)
    ? meanIncongruentRt - meanCongruentRt
    : null;

  // Participant summaries from live data
  const participantIds = Array.from(new Set(trials.map(t => t.participantId)));
  const computedParticipants = participantIds.map(pid => {
    const pTrials = trials.filter(t => t.participantId === pid);
    const pExpTrials = pTrials.filter(t => t.phase === 'experiment');
    const pPracticeTrials = pTrials.filter(t => t.phase === 'practice');

    if (pExpTrials.length === 0) {
      return {
        id: pid,
        hasExperimentalData: false,
        stroopAccuracy: null as number | null,
        stroopCongruentMeanRt: null as number | null,
        stroopIncongruentMeanRt: null as number | null,
        stroopEffect: null as number | null,
        totalExpTrials: 0,
        totalPracticeTrials: pPracticeTrials.length,
        status: `Practice Only (${pPracticeTrials.length} trials)`,
      };
    }

    const pCongruent = pExpTrials.filter(t => t.condition === 'congruent' && t.isCorrect);
    const pIncongruent = pExpTrials.filter(t => t.condition === 'incongruent' && t.isCorrect);
    const cMean = pCongruent.length > 0 ? Math.round(pCongruent.reduce((s, t) => s + t.reactionTimeMs, 0) / pCongruent.length) : null;
    const iMean = pIncongruent.length > 0 ? Math.round(pIncongruent.reduce((s, t) => s + t.reactionTimeMs, 0) / pIncongruent.length) : null;
    const effect = (cMean !== null && iMean !== null) ? iMean - cMean : null;
    const acc = (pExpTrials.filter(t => t.isCorrect).length / pExpTrials.length) * 100;
    const isFull = pExpTrials.length >= 128 || (pExpTrials.length >= 80 && Boolean(participants.find(p => p.id === pid)?.stroopDone));

    return {
      id: pid,
      hasExperimentalData: true,
      stroopAccuracy: acc,
      stroopCongruentMeanRt: cMean,
      stroopIncongruentMeanRt: iMean,
      stroopEffect: effect,
      totalExpTrials: pExpTrials.length,
      totalPracticeTrials: pPracticeTrials.length,
      status: isFull ? 'Complete' : `Incomplete (${pExpTrials.length}/${pExpTrials.length > 80 || pExpTrials.length === 0 ? 128 : 80})`,
    };
  });

  const displayParticipants = isLive && computedParticipants.length > 0
    ? computedParticipants
    : participants.filter(p => p.stroopDone).map(p => ({
        ...p,
        hasExperimentalData: true,
        status: 'Complete',
      }));

  // Dynamic chart data (strictly from real experimental trials)
  const dynamicRtComparison = totalExpTrials > 0 && meanCongruentRt !== null && meanIncongruentRt !== null ? [
    { condition: 'Congruent', avgRt: meanCongruentRt },
    { condition: 'Incongruent', avgRt: meanIncongruentRt },
  ] : [];

  const dynamicAccuracyComparison = totalExpTrials > 0 ? [
    {
      condition: 'Congruent',
      accuracy: congruentAccuracy !== null ? Math.round(congruentAccuracy) : 0,
      errorRate: congruentAccuracy !== null ? Math.round(100 - congruentAccuracy) : 0,
    },
    {
      condition: 'Incongruent',
      accuracy: incongruentAccuracy !== null ? Math.round(incongruentAccuracy) : 0,
      errorRate: incongruentAccuracy !== null ? Math.round(100 - incongruentAccuracy) : 0,
    },
  ] : [];

  const activeRtChartData = isLive ? dynamicRtComparison : chartData.stroopRtComparison;
  const activeAccuracyChartData = isLive ? dynamicAccuracyComparison : chartData.stroopAccuracyByCondition;

  return (
    <AdminLayout
      currentPage={currentPage}
      navigate={navigate}
      onLogout={onLogout}
      pageTitle="Stroop Task — Analysis"
      breadcrumb="Analysis"
    >
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Participants Tested', value: displayParticipants.filter(p => p.hasExperimentalData).length, color: '#252640', sub: 'With exp. trials' },
          { label: 'Total Exp. Trials', value: totalExpTrials, color: '#6567C9', sub: 'Practice excluded' },
          { label: 'Overall Accuracy', value: overallAccuracy !== null ? `${overallAccuracy.toFixed(1)}%` : '—', color: '#4A9B7F', sub: totalExpTrials > 0 ? `${correctExpTrials}/${totalExpTrials} correct` : 'No exp. data' },
          { label: 'Congruent Mean RT', value: meanCongruentRt !== null ? `${meanCongruentRt}ms` : '—', color: '#2563EB', sub: congruentAccuracy !== null ? `Acc: ${congruentAccuracy.toFixed(0)}%` : 'Correct trials only' },
          { label: 'Incongruent Mean RT', value: meanIncongruentRt !== null ? `${meanIncongruentRt}ms` : '—', color: '#DC2626', sub: incongruentAccuracy !== null ? `Acc: ${incongruentAccuracy.toFixed(0)}%` : 'Correct trials only' },
          { label: 'Stroop Effect (Cost)', value: stroopEffectMs !== null ? `${stroopEffectMs >= 0 ? '+' : ''}${stroopEffectMs}ms` : '—', color: '#E11D48', sub: 'RT diff on correct trials' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E9E8F2] p-3.5 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-bold font-['JetBrains_Mono',monospace] mb-0.5" style={{ color }}>{value}</div>
            <div className="text-[11px] sm:text-xs text-[#252640] font-['Plus_Jakarta_Sans',sans-serif] font-semibold">{label}</div>
            <div className="text-[10px] text-[#9597AB] mt-0.5 font-medium">{sub}</div>
          </div>
        ))}
      </div>

      {/* Research & Formula Explanation Banner */}
      <div className="bg-[#FFF5F6] rounded-xl border border-[#FECDD3] p-3.5 sm:p-4 mb-6">
        <div className="flex items-start gap-3">
          <Zap size={16} className="text-[#E11D48] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#73758C] leading-relaxed space-y-1">
            <p>
              <strong className="text-[#252640]">Stroop Effect (Interference Cost)</strong> = The reaction time (RT) difference between correctly answered congruent and incongruent trials (Mean RT Incongruent − Mean RT Congruent). Evaluates selective attention and inhibitory control.
            </p>
            <p>
              <strong className="text-[#252640]">Trial Structure:</strong> 20 Practice trials (retained in raw data but excluded from research metrics) + 128 Experimental trials (96 Congruent [75%], 32 Incongruent [25%]).
            </p>
            <p>
              <strong className="text-[#252640]">Response Keys:</strong> R = Red · G = Green · B = Blue · Y = Yellow.
            </p>
          </div>
        </div>
      </div>

      {/* Practice-Only Telemetry Notice Banner */}
      {isLive && totalExpTrials === 0 && trials.length > 0 && (
        <div className="bg-[#FFFBEB] rounded-xl border border-[#FDE68A] p-3.5 sm:p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="text-[#D97706] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[#92400E] leading-relaxed">
              <strong className="font-bold">Practice Trials Only Recorded:</strong> The database currently contains {trials.length} practice trials (Phase: <code className="bg-[#FEF3C7] px-1 py-0.5 rounded font-mono">practice</code>) and 0 experimental trials. Under cognitive psychology protocols, practice trials are preserved in raw telemetry but strictly excluded from primary research statistics. Charts and effect sizes will populate when participants complete experimental trials.
            </div>
          </div>
        </div>
      )}

      {isLive && trials.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E9E8F2] p-12 text-center my-6">
          <Inbox size={36} className="text-[#C5C1F1] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">No Participant Stroop Trials Yet</h3>
          <p className="text-xs text-[#73758C] mt-1 max-w-md mx-auto">
            Interference cost latencies, congruent vs. incongruent reaction times, and trial accuracy will be aggregated here automatically once participants begin Room 03.
          </p>
        </div>
      ) : (
        <>
          {/* Interactive Charts Section */}
          <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
              <div>
                <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Research Performance Charts</h3>
                <p className="text-xs text-[#73758C] mt-0.5">{isLive ? 'Live Database Telemetry' : 'Demo Mode'} · n={totalExpTrials} experimental trials</p>
              </div>
              <div className="flex flex-wrap gap-1 bg-[#F8F8FC] border border-[#E9E8F2] rounded-lg p-1">
                {([
                  ['rt-comparison', 'RT Comparison (ms)'],
                  ['accuracy', 'Accuracy by Condition'],
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
                {activeChart === 'rt-comparison' ? (
                  <BarChart data={activeRtChartData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                    <XAxis dataKey="condition" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="ms" domain={[0, 'dataMax + 150']} />
                    <Tooltip
                      contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }}
                      formatter={(val: unknown) => [`${val} ms`, 'Mean RT']}
                    />
                    <Bar dataKey="avgRt" name="Mean Reaction Time" radius={[6, 6, 0, 0]}>
                      {activeRtChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.condition === 'Congruent' ? '#2563EB' : '#DC2626'} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <BarChart data={activeAccuracyChartData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                    <XAxis dataKey="condition" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }}
                      formatter={(val: unknown) => [`${val}%`, 'Accuracy']}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Inter' }} />
                    <Bar dataKey="accuracy" name="Accuracy %" fill="#4A9B7F" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="errorRate" name="Error Rate %" fill="#FDA4AF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          {/* Participant Performance Summary */}
          <div className="bg-white rounded-2xl border border-[#E9E8F2] mb-6 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-[#E9E8F2] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Participant Performance Summary</h3>
                <p className="text-xs text-[#73758C] mt-0.5">Summary metrics for participants with Stroop task data</p>
              </div>
              <span className="text-xs font-semibold text-[#6567C9] bg-[#EDEAF8] px-2.5 py-1 rounded-lg">
                {displayParticipants.length} Participants
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Participant ID</th>
                    <th>Overall Accuracy</th>
                    <th>Congruent RT</th>
                    <th>Incongruent RT</th>
                    <th>Stroop Effect</th>
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
                          {p.stroopAccuracy !== null && p.stroopAccuracy !== undefined ? `${p.stroopAccuracy.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-sm text-[#2563EB]">
                          {p.stroopCongruentMeanRt !== null && p.stroopCongruentMeanRt !== undefined ? `${p.stroopCongruentMeanRt}ms` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-sm text-[#DC2626]">
                          {p.stroopIncongruentMeanRt !== null && p.stroopIncongruentMeanRt !== undefined ? `${p.stroopIncongruentMeanRt}ms` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-sm font-bold text-[#E11D48]">
                          {p.stroopEffect !== null && p.stroopEffect !== undefined ? `${p.stroopEffect >= 0 ? '+' : ''}${p.stroopEffect}ms` : '—'}
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

                {/* Filter by Condition */}
                <div className="flex items-center gap-1 bg-[#F8F8FC] border border-[#E9E8F2] rounded-lg p-1">
                  {(['All', 'congruent', 'incongruent'] as const).map(c => (
                    <button
                      key={c}
                      onClick={() => setFilterCondition(c)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold font-['Plus_Jakarta_Sans',sans-serif] transition-all capitalize ${
                        filterCondition === c ? 'bg-white shadow-sm text-[#252640]' : 'text-[#73758C] hover:text-[#252640]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {/* Filter by Phase */}
                <div className="flex items-center gap-1 bg-[#F8F8FC] border border-[#E9E8F2] rounded-lg p-1">
                  {(['all', 'experiment', 'practice'] as const).map(p => (
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
                    <th>Word</th>
                    <th>Ink Color</th>
                    <th>Condition</th>
                    <th>Expected</th>
                    <th>Response</th>
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
                        <span className="font-bold text-xs" style={{ color: colorHexMap[t.word] || '#252640' }}>
                          {t.word}
                        </span>
                      </td>
                      <td>
                        <span className="font-bold text-xs" style={{ color: colorHexMap[t.inkColor] || '#252640' }}>
                          {t.inkColor}
                        </span>
                      </td>
                      <td>
                        <span className={`badge text-[11px] ${
                          t.condition === 'congruent' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#FEF2F2] text-[#DC2626]'
                        }`}>
                          {t.condition}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-xs font-bold" style={{ color: colorHexMap[t.correctResponse] }}>
                          {t.correctResponse}
                        </span>
                      </td>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-xs font-bold" style={{ color: colorHexMap[t.participantResponse] }}>
                          {t.participantResponse}
                        </span>
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
              <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Stroop Trial Detail</h3>
              <button onClick={() => setSelectedTrial(null)} className="text-[#73758C] hover:text-[#252640] p-1 rounded">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Participant', value: selectedTrial.participantId, mono: true, color: '#6567C9' },
                { label: 'Trial Number', value: String(selectedTrial.trialNumber), mono: true },
                { label: 'Phase', value: selectedTrial.phase },
                { label: 'Stimulus Word', value: selectedTrial.word, color: colorHexMap[selectedTrial.word] },
                { label: 'Ink Color', value: selectedTrial.inkColor, color: colorHexMap[selectedTrial.inkColor] },
                { label: 'Condition', value: selectedTrial.condition },
                { label: 'Correct Response', value: selectedTrial.correctResponse, mono: true, color: colorHexMap[selectedTrial.correctResponse] },
                { label: 'Participant Key', value: selectedTrial.participantResponse, mono: true, color: colorHexMap[selectedTrial.participantResponse] },
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
