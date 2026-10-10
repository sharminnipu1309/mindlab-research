import { useState, useEffect } from 'react';
import { Page } from '../../types';
import AdminLayout from '../../components/AdminLayout';
import { hanoiTrialData, chartData } from '../../data/demo';
import { fetchHanoiAnalysisData, fetchHanoiMovesData } from '../../services/adminService';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { ChevronRight, X, Filter, Inbox } from 'lucide-react';

interface Props {
  navigate: (page: Page) => void;
  onLogout: () => void;
  currentPage: Page;
}

interface HanoiTrialItem {
  id?: string;
  participantId: string;
  puzzle: number | string;
  puzzleIndex?: number;
  diskCount: number;
  moveLimit?: number;
  firstReaction: number | null;
  completionTime: number;
  validMoves: number;
  invalidMoves: number;
  outcome: string;
  attemptNumber?: number;
}

function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms === 0) return '0.0s';
  if (ms >= 60000) return `${(ms/60000).toFixed(1)}m`;
  return `${(ms/1000).toFixed(1)}s`;
}

export default function HanoiAnalysis({ navigate, onLogout, currentPage }: Props) {
  const [trials, setTrials] = useState<HanoiTrialItem[]>(hanoiTrialData);
  const [moves, setMoves] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [filterPid, setFilterPid] = useState('');
  const [filterDisk, setFilterDisk] = useState('All');
  const [selectedTrial, setSelectedTrial] = useState<HanoiTrialItem | null>(null);
  const [activeChart, setActiveChart] = useState<'completion' | 'reaction' | 'invalid'>('completion');

  useEffect(() => {
    Promise.all([fetchHanoiAnalysisData(), fetchHanoiMovesData()]).then(([res, movesRes]) => {
      setTrials(res.trials as HanoiTrialItem[]);
      setMoves(movesRes.moves || []);
      setIsLive(res.isLive);
    });
  }, []);

  const filtered = trials.filter(t => {
    const matchPid = !filterPid || t.participantId.toLowerCase().includes(filterPid.toLowerCase());
    const matchDisk = filterDisk === 'All' || t.diskCount === Number(filterDisk);
    return matchPid && matchDisk;
  });

  const total = trials.length;
  const completedTrials = trials.filter(t => t.outcome === 'Completed');
  const completed = completedTrials.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : null;

  // Average time ONLY for completed puzzles (where completion is meaningful)
  const completedWithTime = completedTrials.filter(t => t.completionTime > 0);
  const avgSolvedTimeSec = completedWithTime.length > 0
    ? +(completedWithTime.reduce((s, t) => s + t.completionTime, 0) / completedWithTime.length / 1000).toFixed(1)
    : null;

  // Average elapsed time across all attempts (including move-limit attempts)
  const allWithTime = trials.filter(t => t.completionTime > 0);
  const avgAllAttemptsTimeSec = allWithTime.length > 0
    ? +(allWithTime.reduce((s, t) => s + t.completionTime, 0) / allWithTime.length / 1000).toFixed(1)
    : null;

  const avgMoves = total > 0
    ? +(trials.reduce((s, t) => s + (t.validMoves || 0), 0) / total).toFixed(1)
    : null;

  const trialsWithReaction = trials.filter(t => t.firstReaction !== null && t.firstReaction !== undefined);
  const avgReaction = trialsWithReaction.length > 0
    ? Math.round(trialsWithReaction.reduce((s, t) => s + (t.firstReaction || 0), 0) / trialsWithReaction.length)
    : null;

  // Dynamic puzzle completion data: includes all attempted puzzles (including move-limit attempts)
  const dynamicCompletionData = [1, 2, 3, 4, 5, 6].map((pNum, idx) => {
    const pTrials = trials.filter(t => t.puzzleIndex === idx || String(t.puzzle).includes(String(pNum)));
    const cTrials = pTrials.filter(t => t.outcome === 'Completed' && t.completionTime > 0);
    const avgT = cTrials.length > 0 ? +(cTrials.reduce((s, t) => s + t.completionTime, 0) / cTrials.length / 1000).toFixed(1) : null;
    const vMoves = pTrials.length > 0 ? +(pTrials.reduce((s, t) => s + (t.validMoves || 0), 0) / pTrials.length).toFixed(1) : 0;
    const compRate = pTrials.length > 0 ? Math.round((pTrials.filter(t => t.outcome === 'Completed').length / pTrials.length) * 100) : 0;
    const diskCount = pTrials[0]?.diskCount || (idx < 4 ? 3 : idx === 4 ? 4 : 5);
    return {
      puzzle: `P${pNum}`,
      rate: compRate,
      avgTime: avgT,
      avgMoves: vMoves,
      attempts: pTrials.length,
      completed: pTrials.filter(t => t.outcome === 'Completed').length,
      moveLimitHit: pTrials.filter(t => t.outcome === 'Move Limit Reached').length,
      diskCount,
    };
  }).filter(d => !isLive || d.attempts > 0);

  // Dynamic reaction latency from real move telemetry or first reaction latency per puzzle
  let dynamicReactionData: Array<{ move: string; avgReaction: number; attempts?: number }> = [];
  if (moves.length > 0) {
    const moveGroups: Record<number, number[]> = {};
    const movesByPuzzle: Record<string, any[]> = {};
    moves.forEach(m => {
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
          const matchTrial = trials.find(t => t.puzzleIndex === pMoves[i].puzzle_index);
          if (matchTrial && matchTrial.firstReaction !== null && matchTrial.firstReaction > 0) {
            moveGroups[moveNum].push(matchTrial.firstReaction);
          }
        } else {
          const curTime = pMoves[i].timestamp_ms;
          const prevTime = pMoves[i - 1].timestamp_ms;
          if (curTime !== null && curTime !== undefined && prevTime !== null && prevTime !== undefined) {
            const dt = curTime - prevTime;
            if (dt > 0 && dt < 60000) moveGroups[moveNum].push(dt);
          }
        }
      }
    });

    dynamicReactionData = Object.entries(moveGroups)
      .map(([mNum, dts]) => ({
        move: `Move ${mNum}`,
        avgReaction: dts.length > 0 ? Math.round(dts.reduce((a, b) => a + b, 0) / dts.length) : 0,
      }))
      .slice(0, 10);
  }

  if (dynamicReactionData.length === 0) {
    dynamicReactionData = [1, 2, 3, 4, 5, 6].map((pNum, idx) => {
      const pTrials = trials.filter(t => t.puzzleIndex === idx || String(t.puzzle).includes(String(pNum)));
      const rts = pTrials.filter(t => t.firstReaction !== null && t.firstReaction !== undefined && t.firstReaction > 0);
      const avg = rts.length > 0 ? Math.round(rts.reduce((s, t) => s + (t.firstReaction || 0), 0) / rts.length) : 0;
      return {
        move: `P${pNum}`,
        avgReaction: avg,
        attempts: pTrials.length,
      };
    }).filter(p => !isLive || (p.attempts ?? 0) > 0);
  }

  const dynamicInvalidData = [1, 2, 3, 4, 5, 6].map((pNum, idx) => {
    const pTrials = trials.filter(t => String(t.puzzle).includes(String(pNum)) || t.puzzleIndex === idx);
    const v = pTrials.reduce((s, t) => s + (t.validMoves || 0), 0);
    const inv = pTrials.reduce((s, t) => s + (t.invalidMoves || 0), 0);
    return {
      puzzle: `P${pNum}`,
      valid: v,
      invalid: inv,
      attempts: pTrials.length,
    };
  }).filter(d => !isLive || d.attempts > 0);

  const activeCompletionChartData: any[] = isLive && total > 0 ? dynamicCompletionData : chartData.hanoiCompletionByPuzzle;
  const activeReactionChartData: any[] = isLive && total > 0 ? dynamicReactionData : chartData.hanoiReactionTime;
  const activeInvalidChartData = isLive && total > 0 ? dynamicInvalidData : chartData.hanoiInvalidMoves;

  return (
    <AdminLayout
      currentPage={currentPage}
      navigate={navigate}
      onLogout={onLogout}
      pageTitle="Tower of Hanoi — Analysis"
      breadcrumb="Analysis"
    >
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Total Attempts', value: total, color: '#252640', sub: 'All recorded attempts' },
          { label: 'Solved Puzzles', value: completed, color: '#4A9B7F', sub: 'Successful outcomes' },
          { label: 'Completion Rate', value: completionRate !== null ? `${completionRate}%` : '—', color: '#4A9B7F', sub: 'Solved / Attempts' },
          { label: 'Avg. Solved Time', value: avgSolvedTimeSec !== null ? `${avgSolvedTimeSec}s` : '—', color: '#6567C9', sub: 'Completed puzzles only' },
          { label: 'Avg. Time (All Attempts)', value: avgAllAttemptsTimeSec !== null ? `${avgAllAttemptsTimeSec}s` : '—', color: '#73758C', sub: 'Includes move-limit trials' },
          { label: 'Avg. Valid Moves', value: avgMoves !== null ? avgMoves : '—', color: '#69AFA8', sub: 'Moves per attempt' },
          { label: 'Avg. 1st Reaction', value: avgReaction !== null ? `${(avgReaction/1000).toFixed(1)}s` : '—', color: '#A9A2E8', sub: 'Initial planning latency' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E9E8F2] p-3.5 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-bold font-['JetBrains_Mono',monospace] mb-1" style={{ color }}>{value}</div>
            <div className="text-[11px] sm:text-xs text-[#73758C] font-['Plus_Jakarta_Sans',sans-serif] font-medium">{label}</div>
            <div className="text-[10px] text-[#9597AB] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {isLive && total === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E9E8F2] p-12 text-center my-6">
          <Inbox size={36} className="text-[#C5C1F1] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">No Participant Hanoi Trials Yet</h3>
          <p className="text-xs text-[#73758C] mt-1 max-w-md mx-auto">
            Real participant puzzle attempts and move telemetries will be aggregated here automatically once participants begin Room 01.
          </p>
        </div>
      ) : (
        <>
          {/* Chart section */}
          <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
              <div>
                <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Performance Charts</h3>
                <p className="text-xs text-[#73758C] mt-0.5">{isLive ? 'Live Database Telemetry' : 'Illustrative Demo Mode'} · n={total} trials</p>
              </div>
              <div className="flex flex-wrap gap-1 bg-[#F8F8FC] border border-[#E9E8F2] rounded-lg p-1">
                {(['completion', 'reaction', 'invalid'] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setActiveChart(c)}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-semibold font-['Plus_Jakarta_Sans',sans-serif] transition-all ${
                      activeChart === c ? 'bg-white shadow-sm text-[#252640]' : 'text-[#73758C] hover:text-[#252640]'
                    }`}
                  >
                    {c === 'completion' ? 'Completion Time' : c === 'reaction' ? 'Reaction Time' : 'Invalid Moves'}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              {activeChart === 'completion' ? (
                <BarChart data={activeCompletionChartData} margin={{ left: -10 }}>
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
                  <Bar dataKey="avgTime" name="Avg. time (s)" radius={[6,6,0,0]}>
                    {activeCompletionChartData.map((_, i) => (
                      <Cell key={i} fill={i < 4 ? '#A9A2E8' : i === 4 ? '#6567C9' : '#252640'} />
                    ))}
                  </Bar>
                </BarChart>
              ) : activeChart === 'reaction' ? (
                <LineChart data={activeReactionChartData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                  <XAxis dataKey="move" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} label={{ value: 'Move / Puzzle', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#9597AB' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} unit="ms" />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                  <Line type="monotone" dataKey="avgReaction" name="Avg. reaction (ms)" stroke="#6567C9" strokeWidth={2.5} dot={{ r: 4, fill: '#6567C9' }} />
                </LineChart>
              ) : (
                <BarChart data={activeInvalidChartData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                  <XAxis dataKey="puzzle" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Inter' }} />
                  <Bar dataKey="valid" name="Valid moves" fill="#6567C9" radius={[4,4,0,0]} />
                  <Bar dataKey="invalid" name="Invalid attempts" fill="#C4625A" radius={[4,4,0,0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-[#73758C]" />
              <input
                type="text"
                placeholder="Filter by participant ID..."
                value={filterPid}
                onChange={e => setFilterPid(e.target.value)}
                className="ml-input text-xs py-2 w-full sm:w-44"
              />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-xs text-[#73758C]">Discs:</span>
              {['All', '3', '4', '5'].map(d => (
                <button
                  key={d}
                  onClick={() => setFilterDisk(d)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold font-['Plus_Jakarta_Sans',sans-serif] ${
                    filterDisk === d ? 'bg-[#6567C9] text-white' : 'bg-white border border-[#E9E8F2] text-[#73758C] hover:bg-[#F8F8FC]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <span className="sm:ml-auto text-xs text-[#9597AB]">{filtered.length} trial{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Trial table */}
          <div className="bg-white rounded-2xl border border-[#E9E8F2] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Puzzle</th>
                    <th>Discs</th>
                    <th>1st Reaction</th>
                    <th>Completion Time</th>
                    <th>Valid Moves</th>
                    <th>Invalid</th>
                    <th>Outcome</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => (
                    <tr key={i} className="cursor-pointer" onClick={() => setSelectedTrial(t)}>
                      <td><span className="font-['JetBrains_Mono',monospace] text-[#6567C9] text-xs font-bold">{t.participantId}</span></td>
                      <td className="font-['JetBrains_Mono',monospace] text-sm">
                        {typeof t.puzzle === 'number' ? `Puzzle ${t.puzzle}` : t.puzzle}
                        {t.attemptNumber && t.attemptNumber > 1 ? (
                          <span className="text-[11px] text-[#73758C] font-sans ml-1"> (Att. {t.attemptNumber})</span>
                        ) : null}
                      </td>
                      <td>
                        <span className="font-bold text-sm" style={{
                          color: t.diskCount === 3 ? '#A9A2E8' : t.diskCount === 4 ? '#6567C9' : '#252640'
                        }}>{t.diskCount}</span>
                      </td>
                      <td className="font-['JetBrains_Mono',monospace] text-sm text-[#73758C]">
                        {t.firstReaction !== null && t.firstReaction !== undefined ? `${(t.firstReaction/1000).toFixed(2)}s` : '—'}
                      </td>
                      <td className="font-['JetBrains_Mono',monospace] text-sm">
                        {t.outcome === 'Completed' ? (
                          formatMs(t.completionTime)
                        ) : (
                          <span className="text-[#9597AB]" title={`${formatMs(t.completionTime)} elapsed before limit`}>—</span>
                        )}
                      </td>
                      <td className="font-['JetBrains_Mono',monospace] text-sm text-[#4A9B7F]">{t.validMoves}</td>
                      <td className="font-['JetBrains_Mono',monospace] text-sm text-[#C4625A]">{t.invalidMoves}</td>
                      <td>
                        <span className={`badge text-[11px] ${
                          t.outcome === 'Completed' ? 'bg-[#D1EDE5] text-[#4A9B7F]' : 'bg-[#FCEFD9] text-[#D4813A]'
                        }`}>
                          {t.outcome}
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

      {/* Trial detail drawer */}
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
                { label: 'Participant', value: selectedTrial.participantId, mono: true, color: '#6567C9' },
                { label: 'Puzzle', value: String(selectedTrial.puzzle) },
                { label: 'Disc count', value: String(selectedTrial.diskCount) },
                {
                  label: '1st reaction time',
                  value: selectedTrial.firstReaction !== null && selectedTrial.firstReaction !== undefined
                    ? `${(selectedTrial.firstReaction/1000).toFixed(3)}s`
                    : '—',
                  mono: true,
                },
                {
                  label: selectedTrial.outcome === 'Completed' ? 'Completion time' : 'Elapsed time',
                  value: selectedTrial.outcome === 'Completed'
                    ? formatMs(selectedTrial.completionTime)
                    : `— (${formatMs(selectedTrial.completionTime)} elapsed before ${selectedTrial.outcome.toLowerCase()})`,
                  mono: true,
                },
                { label: 'Valid moves', value: String(selectedTrial.validMoves), mono: true, color: '#4A9B7F' },
                { label: 'Invalid attempts', value: String(selectedTrial.invalidMoves), mono: true, color: '#C4625A' },
                { label: 'Outcome', value: selectedTrial.outcome },
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
