import { useState, useEffect } from 'react';
import { Page } from '../../types';
import AdminLayout from '../../components/AdminLayout';
import { corsiTrialData, chartData, demoParticipants } from '../../data/demo';
import { fetchCorsiAnalysisData, fetchParticipantsList } from '../../services/adminService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Info, ChevronRight, X, Inbox } from 'lucide-react';

interface Props {
  navigate: (page: Page) => void;
  onLogout: () => void;
  currentPage: Page;
}

interface CorsiTrialItem {
  id?: string;
  participantId: string;
  level: number;
  seqLen: number;
  trial: number;
  correct: boolean;
  positions: number | null;
  reactionTimeMs?: number | null;
  timestampMs?: number;
}

export default function CorsiAnalysis({ navigate, onLogout, currentPage }: Props) {
  const [trials, setTrials] = useState<CorsiTrialItem[]>(corsiTrialData);
  const [participants, setParticipants] = useState<typeof demoParticipants>(demoParticipants);
  const [isLive, setIsLive] = useState(false);
  const [filterPid, setFilterPid] = useState('');
  const [activeChart, setActiveChart] = useState<'accuracy' | 'maxlevel' | 'product'>('accuracy');
  const [selectedTrial, setSelectedTrial] = useState<CorsiTrialItem | null>(null);

  useEffect(() => {
    fetchCorsiAnalysisData().then(res => {
      setTrials(res.trials);
      setIsLive(res.isLive);
    });
    fetchParticipantsList().then(res => {
      if (res && res.length > 0) {
        setParticipants(res as unknown as typeof demoParticipants);
      }
    });
  }, []);

  const filtered = trials.filter(t =>
    !filterPid || t.participantId.toLowerCase().includes(filterPid.toLowerCase())
  );

  // Group trials by participant to compute actual live participant scores
  const participantIds = Array.from(new Set(trials.map(t => t.participantId)));
  const computedParticipants = participantIds.map(pid => {
    const pTrials = trials.filter(t => t.participantId === pid);
    
    // Evaluate protocol completion:
    // A level is completed if correct trials >= 4 out of 6.
    // Stopping rule: participant attempted all 6 trials of a level and had < 4 correct.
    let maxCompletedLevel = 0;
    let correctAtMaxLevel = 0;
    let isProtocolCompleted = false;

    for (let lvl = 1; lvl <= 8; lvl++) {
      const lvlTrials = pTrials.filter(t => t.level === lvl);
      const correctLvl = lvlTrials.filter(t => t.correct).length;
      if (lvlTrials.length >= 6) {
        if (correctLvl >= 4) {
          maxCompletedLevel = lvl;
          correctAtMaxLevel = correctLvl;
          if (lvl === 8) isProtocolCompleted = true; // completed all levels
        } else {
          // Stopping rule reached at this level (failed with < 4 / 6 correct)
          isProtocolCompleted = true;
          break;
        }
      } else if (lvlTrials.length > 0) {
        // Interrupted/abandoned mid-level before 6 trials
        break;
      }
    }

    const totalCorrect = pTrials.filter(t => t.correct).length;
    const trialAcc = pTrials.length > 0 ? (totalCorrect / pTrials.length) * 100 : 0;

    if (isProtocolCompleted) {
      const maxCompletedSpan = maxCompletedLevel > 0 ? maxCompletedLevel + 1 : 0;
      const productScore = maxCompletedSpan * correctAtMaxLevel;
      return {
        id: pid,
        isProtocolCompleted: true,
        maxLevel: maxCompletedLevel,
        maxSpan: maxCompletedSpan,
        correctAtMaxSpan: correctAtMaxLevel,
        productScore,
        trialAccuracy: trialAcc,
        totalTrials: pTrials.length,
        status: 'Completed',
      };
    } else {
      // Incomplete / abandoned session - do not convert missing trials into zero scores
      return {
        id: pid,
        isProtocolCompleted: false,
        maxLevel: null,
        maxSpan: null,
        correctAtMaxSpan: null,
        productScore: null,
        trialAccuracy: trialAcc,
        totalTrials: pTrials.length,
        status: `Incomplete (${pTrials.length} trial${pTrials.length !== 1 ? 's' : ''})`,
      };
    }
  });

  const displayParticipants = isLive && computedParticipants.length > 0
    ? computedParticipants
    : participants.filter(p => p.corsiDone).map(p => ({
        ...p,
        isProtocolCompleted: true,
      }));

  const totalTrialsCount = trials.length;
  const totalCorrectTrials = trials.filter(t => t.correct).length;
  const accuracy = totalTrialsCount > 0 ? (totalCorrectTrials / totalTrialsCount) * 100 : 0;

  // Cohort statistics calculated strictly from completed sessions
  const completedCohort = displayParticipants.filter(p => p.isProtocolCompleted && p.maxSpan !== null);
  const incompleteCohortCount = displayParticipants.filter(p => !p.isProtocolCompleted).length;

  const avgMaxSpan = completedCohort.length > 0
    ? (completedCohort.reduce((s, p) => s + (p.maxSpan ?? 0), 0) / completedCohort.length).toFixed(1)
    : '—';

  const avgProductScore = completedCohort.length > 0
    ? (completedCohort.reduce((s, p) => s + (p.productScore ?? 0), 0) / completedCohort.length).toFixed(1)
    : '—';

  // Dynamic accuracy by level
  const dynamicAccuracyByLevel = [1, 2, 3, 4, 5, 6, 7, 8].map(lvl => {
    const lvlTrials = trials.filter(t => t.level === lvl);
    const correctCount = lvlTrials.filter(t => t.correct).length;
    const acc = lvlTrials.length > 0 ? Math.round((correctCount / lvlTrials.length) * 100) : 0;
    return {
      level: `L${lvl} (${lvl + 1})`,
      accuracy: acc,
      n: lvlTrials.length,
    };
  });

  // Dynamic product score distribution (strictly completed cohort)
  const productScoreBuckets = [
    { range: '0–10', count: completedCohort.filter(p => (p.productScore ?? 0) <= 10).length },
    { range: '11–20', count: completedCohort.filter(p => (p.productScore ?? 0) > 10 && (p.productScore ?? 0) <= 20).length },
    { range: '21–30', count: completedCohort.filter(p => (p.productScore ?? 0) > 20 && (p.productScore ?? 0) <= 30).length },
    { range: '31–40', count: completedCohort.filter(p => (p.productScore ?? 0) > 30 && (p.productScore ?? 0) <= 40).length },
    { range: '41+', count: completedCohort.filter(p => (p.productScore ?? 0) > 40).length },
  ];

  const activeAccuracyChartData = isLive && totalTrialsCount > 0 ? dynamicAccuracyByLevel : chartData.corsiAccuracyByLevel;
  const activeProductChartData = isLive && completedCohort.length > 0 ? productScoreBuckets : [
    { range: '0–10', count: 0 },
    { range: '11–20', count: 1 },
    { range: '21–30', count: 5 },
    { range: '31–40', count: 1 },
    { range: '41+', count: 1 },
  ];

  return (
    <AdminLayout
      currentPage={currentPage}
      navigate={navigate}
      onLogout={onLogout}
      pageTitle="Backward Corsi — Analysis"
      breadcrumb="Analysis"
    >
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Completed Sessions', value: completedCohort.length, color: '#252640', sub: incompleteCohortCount > 0 ? `${incompleteCohortCount} incomplete excluded` : undefined },
          { label: 'Avg. Max Span', value: avgMaxSpan, color: '#69AFA8', sub: 'Completed protocols' },
          { label: 'Avg. Product Score', value: avgProductScore !== '—' ? `${avgProductScore} pts` : '—', color: '#6567C9', sub: 'Span × correct' },
          { label: 'Trial Accuracy', value: `${accuracy.toFixed(0)}%`, color: '#4A9B7F', sub: `${totalCorrectTrials}/${totalTrialsCount} trials` },
          { label: 'Trials Recorded', value: totalTrialsCount, color: '#A9A2E8', sub: 'Raw telemetry rows' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E9E8F2] p-3.5 sm:p-4 text-center shadow-2xs">
            <div className="text-lg sm:text-xl font-bold font-['JetBrains_Mono',monospace] mb-1" style={{ color }}>{value}</div>
            <div className="text-[11px] sm:text-xs text-[#73758C] font-['Plus_Jakarta_Sans',sans-serif] font-medium">{label}</div>
            {sub && <div className="text-[10px] text-[#9597AB] mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Score explanation */}
      <div className="bg-[#EDEAF8] rounded-xl border border-[#C5C1F1] p-3.5 sm:p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info size={15} className="text-[#6567C9] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#73758C] leading-relaxed space-y-1">
            <p><strong className="text-[#252640]">Product score</strong> = highest successfully completed sequence length × number of correct trials at that level.</p>
            <p><strong className="text-[#252640]">Trial accuracy</strong> = (correct trials / total scored trials) × 100.</p>
          </div>
        </div>
      </div>

      {isLive && totalTrialsCount === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E9E8F2] p-12 text-center my-6">
          <Inbox size={36} className="text-[#C5C1F1] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">No Participant Corsi Trials Yet</h3>
          <p className="text-xs text-[#73758C] mt-1 max-w-md mx-auto">
            Spatial span metrics and sequence reproductions will be aggregated here automatically once participants begin Room 02.
          </p>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
              <div>
                <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Research Charts</h3>
                <p className="text-xs text-[#73758C] mt-0.5">{isLive ? 'Live Database Telemetry' : 'Demo Mode'} · n={totalTrialsCount} trials</p>
              </div>
              <div className="flex flex-wrap gap-1 bg-[#F8F8FC] border border-[#E9E8F2] rounded-lg p-1">
                {([
                  ['accuracy', 'Accuracy by Level'],
                  ['maxlevel', 'Max Level Distribution'],
                  ['product', 'Product Score Dist.'],
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

            <ResponsiveContainer width="100%" height={220}>
              {activeChart === 'accuracy' ? (
                <BarChart data={activeAccuracyChartData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                  <XAxis dataKey="level" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: unknown, _: unknown, props: { payload?: { n?: number } }) => [`${v}% (n=${props?.payload?.n})`, 'Accuracy']} />
                  <Bar dataKey="accuracy" name="Accuracy %" radius={[6,6,0,0]}>
                    {activeAccuracyChartData.map((_, i) => (
                      <Cell key={i} fill={`hsl(${240 - i * 15}, ${60 - i * 5}%, ${60 + i * 2}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              ) : activeChart === 'maxlevel' ? (
                <BarChart data={chartData.corsiMaxLevel} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                  <XAxis dataKey="level" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="count" name="Participants" fill="#69AFA8" radius={[6,6,0,0]} />
                </BarChart>
              ) : (
                <BarChart data={activeProductChartData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="count" name="Participants" fill="#A9A2E8" radius={[6,6,0,0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Participant performance table */}
          <div className="bg-white rounded-2xl border border-[#E9E8F2] mb-6 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-[#E9E8F2]">
              <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Participant Performance Summary</h3>
              <p className="text-xs text-[#73758C] mt-0.5">Calculated product scores & span limits</p>
            </div>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Participant ID</th>
                    <th>Max Level</th>
                    <th>Max Span</th>
                    <th>Product Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayParticipants.map(p => (
                    <tr key={p.id}>
                      <td><span className="font-['JetBrains_Mono',monospace] text-[#6567C9] text-xs font-bold">{p.id}</span></td>
                      <td><span className="font-['JetBrains_Mono',monospace] text-sm font-bold text-[#69AFA8]">{p.maxLevel !== null && p.maxLevel !== undefined ? p.maxLevel : '—'}</span></td>
                      <td><span className="font-['JetBrains_Mono',monospace] text-sm text-[#73758C]">{p.maxSpan !== null && p.maxSpan !== undefined ? p.maxSpan : '—'}</span></td>
                      <td><span className="font-['JetBrains_Mono',monospace] text-sm font-bold text-[#6567C9]">{p.productScore !== null && p.productScore !== undefined ? p.productScore : '—'}</span></td>
                      <td>
                        <span className={`badge text-[11px] ${p.isProtocolCompleted ? 'bg-[#D1EDE5] text-[#4A9B7F]' : 'bg-[#FEF3C7] text-[#D97706]'}`}>
                          {p.status || (p.isProtocolCompleted ? 'Complete' : 'Incomplete')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trial table */}
          <div className="bg-white rounded-2xl border border-[#E9E8F2] overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-[#E9E8F2]">
              <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Trial-Level Data</h3>
              <input
                type="text"
                placeholder="Filter by participant ID..."
                value={filterPid}
                onChange={e => setFilterPid(e.target.value)}
                className="ml-input text-xs py-1.5 w-full sm:w-44"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Level</th>
                    <th>Seq. Length</th>
                    <th>Trial</th>
                    <th>Correct</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => (
                    <tr key={i} className="cursor-pointer" onClick={() => setSelectedTrial(t)}>
                      <td><span className="font-['JetBrains_Mono',monospace] text-[#6567C9] text-xs font-bold">{t.participantId}</span></td>
                      <td><span className="font-['JetBrains_Mono',monospace] text-sm">{t.level}</span></td>
                      <td><span className="font-['JetBrains_Mono',monospace] text-sm text-[#73758C]">{t.seqLen}</span></td>
                      <td><span className="font-['JetBrains_Mono',monospace] text-sm text-[#73758C]">{t.trial}/{6}</span></td>
                      <td>
                        <span className={`badge text-[11px] ${t.correct ? 'bg-[#D1EDE5] text-[#4A9B7F]' : 'bg-[#FBDEDD] text-[#C4625A]'}`}>
                          {t.correct ? 'Correct' : 'Incorrect'}
                        </span>
                      </td>
                      <td><ChevronRight size={14} className="text-[#C5C1F1]" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Trial drawer */}
      {selectedTrial && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-[#252640]/20 backdrop-blur-sm" onClick={() => setSelectedTrial(null)} />
          <div className="relative w-full max-w-xs sm:w-80 bg-white shadow-2xl h-full overflow-y-auto custom-scroll animate-slide-right p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Trial Detail</h3>
              <button onClick={() => setSelectedTrial(null)} className="text-[#73758C] hover:text-[#252640] p-1 rounded">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Participant', value: selectedTrial.participantId, color: '#6567C9', mono: true },
                { label: 'Level', value: String(selectedTrial.level), mono: true },
                { label: 'Sequence length', value: String(selectedTrial.seqLen), mono: true },
                { label: 'Trial number', value: `${selectedTrial.trial} of 6`, mono: true },
                { label: 'Result', value: selectedTrial.correct ? 'Correct' : 'Incorrect', color: selectedTrial.correct ? '#4A9B7F' : '#C4625A' },
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
