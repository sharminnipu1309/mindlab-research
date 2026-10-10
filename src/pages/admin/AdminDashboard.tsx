import { useMemo, useState, useEffect } from 'react';
import { Page } from '../../types';
import AdminLayout from '../../components/AdminLayout';
import { fetchParticipantsList } from '../../services/adminService';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { Users, CheckCircle, FlaskConical, Activity, ArrowRight, ChevronRight, Inbox, Layers, Grid3X3, Zap, Repeat } from 'lucide-react';

interface Props {
  navigate: (page: Page) => void;
  onLogout: () => void;
  currentPage: Page;
}

function StatCard({ icon: Icon, label, value, sub, color, bg }: {
  icon: typeof Users; label: string; value: string | number; sub?: string; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E9E8F2] p-6 shadow-2xs">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-[#252640] font-['JetBrains_Mono',monospace] mb-1">{value}</div>
      <div className="text-sm font-semibold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">{label}</div>
      {sub && <div className="text-xs text-[#73758C] mt-0.5">{sub}</div>}
    </div>
  );
}

const statusColor: Record<string, string> = {
  'Completed': 'bg-[#D1EDE5] text-[#4A9B7F]',
  'In Progress': 'bg-[#EDEAF8] text-[#6567C9]',
  'Practice Only': 'bg-[#FEF3C7] text-[#D97706]',
  'Incomplete': 'bg-[#FEE2E2] text-[#DC2626]',
  'Not Started': 'bg-[#F8F8FC] text-[#73758C] border border-[#E9E8F2]',
};

export default function AdminDashboard({ navigate, onLogout, currentPage }: Props) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParticipantsList().then(res => {
      setParticipants(res || []);
      setLoading(false);
    });
  }, []);

  const totalParticipants = participants.length;
  const completedSessions = participants.filter(p => p.status === 'Completed').length;
  const inProgress = participants.filter(p => p.status === 'In Progress').length;
  const practiceOnly = participants.filter(p => p.status === 'Practice Only').length;
  const incomplete = participants.filter(p => p.status === 'Incomplete').length;
  const notStarted = participants.filter(p => p.status === 'Not Started').length;
  const completionRate = totalParticipants > 0 ? Math.round((completedSessions / totalParticipants) * 100) : 0;

  // Real participant timeline dynamic date aggregation
  const activityTrend = useMemo(() => {
    if (!participants || participants.length === 0) return [];
    const dateMap = new Map<string, { date: string; count: number }>();
    participants.forEach((p: any) => {
      const rawDate = p.createdAt || p.registered;
      if (!rawDate) return;
      const d = new Date(rawDate);
      const dayKey = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dateMap.has(dayKey)) {
        dateMap.set(dayKey, { date: displayDate, count: 0 });
      }
      dateMap.get(dayKey)!.count += 1;
    });

    return Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, val]) => ({
        date: val.date,
        sessions: val.count,
      }));
  }, [participants]);

  // Dynamic research metrics from genuine participants
  const completedCorsiParticipants = participants.filter((p: any) => p.corsiIsCompleted && p.corsiMaxSpan !== null);
  const corsiAvgMaxSpan = completedCorsiParticipants.length > 0
    ? (completedCorsiParticipants.reduce((sum: number, p: any) => sum + p.corsiMaxSpan, 0) / completedCorsiParticipants.length).toFixed(1)
    : null;
  const corsiAvgProductScore = completedCorsiParticipants.length > 0
    ? (completedCorsiParticipants.reduce((sum: number, p: any) => sum + p.corsiProductScore, 0) / completedCorsiParticipants.length).toFixed(1)
    : null;

  const totalHanoiAttempts = participants.reduce((sum: number, p: any) => sum + (p.hanoiAttempts || 0), 0);
  const totalHanoiCompleted = participants.reduce((sum: number, p: any) => sum + (p.hanoiCompletedCount || 0), 0);
  const hanoiSuccessRate = totalHanoiAttempts > 0 ? Math.round((totalHanoiCompleted / totalHanoiAttempts) * 100) : null;

  const recent = participants.slice(0, 6);

  return (
    <AdminLayout
      currentPage={currentPage}
      navigate={navigate}
      onLogout={onLogout}
      pageTitle="Research Overview"
      breadcrumb="Overview"
    >
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-5 sm:mb-7">
        <StatCard icon={Users} label="Total Participants" value={totalParticipants} sub="Registered cohort" color="#6567C9" bg="#EDEAF8" />
        <StatCard icon={CheckCircle} label="Completed Sessions" value={completedSessions} sub={`${completionRate}% protocol completion`} color="#4A9B7F" bg="#D1EDE5" />
        <StatCard icon={FlaskConical} label="Active Experiments" value={1} sub="Main Cognitive Battery" color="#69AFA8" bg="#E4F2F0" />
        <StatCard icon={Activity} label="Available Activities" value={4} sub="Tower of Hanoi · Corsi · Stroop · Task Switching" color="#A9A2E8" bg="#EDEAF8" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-5 sm:mb-7">
        {/* Activity trend */}
        <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Participant Activity Timeline</h3>
              <p className="text-xs text-[#73758C] mt-0.5">Live sessions registered per day</p>
            </div>
            <span className="text-[11px] sm:text-xs text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg px-2.5 sm:px-3 py-1 font-['Plus_Jakarta_Sans',sans-serif] font-semibold">
              Live DB Timestamps
            </span>
          </div>

          {activityTrend.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center">
              <Inbox size={24} className="text-[#9597AB] mb-1" />
              <p className="text-xs text-[#73758C]">No registrations recorded yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={activityTrend} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EFFB" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9597AB', fontFamily: 'Inter' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid #E9E8F2', borderRadius: 10, fontSize: 12 }}
                  cursor={{ stroke: '#E9E8F2' }}
                />
                <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#6567C9" strokeWidth={2.5} dot={{ r: 4, fill: '#6567C9', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Completion breakdown */}
        <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-6 shadow-2xs">
          <h3 className="text-sm font-bold text-[#252640] mb-4 sm:mb-5 font-['Plus_Jakarta_Sans',sans-serif]">Session Status</h3>
          <div className="space-y-2.5 mb-4">
            {[
              { label: 'Completed', count: completedSessions, color: '#4A9B7F', pct: totalParticipants > 0 ? Math.round((completedSessions / totalParticipants) * 100) : 0 },
              { label: 'In Progress', count: inProgress, color: '#6567C9', pct: totalParticipants > 0 ? Math.round((inProgress / totalParticipants) * 100) : 0 },
              { label: 'Practice Only', count: practiceOnly, color: '#D97706', pct: totalParticipants > 0 ? Math.round((practiceOnly / totalParticipants) * 100) : 0 },
              { label: 'Incomplete', count: incomplete, color: '#DC2626', pct: totalParticipants > 0 ? Math.round((incomplete / totalParticipants) * 100) : 0 },
              { label: 'Not Started', count: notStarted, color: '#9597AB', pct: totalParticipants > 0 ? Math.round((notStarted / totalParticipants) * 100) : 0 },
            ].map(({ label, count, color, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#73758C] font-medium">{label}</span>
                  <span className="font-bold font-['JetBrains_Mono',monospace] text-[#252640]">{count}</span>
                </div>
                <div className="h-1.5 bg-[#F8F8FC] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#E9E8F2] pt-4 mt-4">
            <div className="text-xs text-[#73758C] mb-1">Study completion rate</div>
            <div className="text-xl font-bold text-[#252640] font-['JetBrains_Mono',monospace]">{completionRate}%</div>
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-5 sm:mb-7">
        {[
          { label: 'Avg. Corsi Span', value: corsiAvgMaxSpan ? corsiAvgMaxSpan : '—', unit: corsiAvgMaxSpan ? 'Max sequence' : 'Incomplete', color: '#69AFA8' },
          { label: 'Avg. Product Score', value: corsiAvgProductScore ? `${corsiAvgProductScore} pts` : '—', unit: corsiAvgProductScore ? 'Span × correct' : 'Incomplete', color: '#6567C9' },
          { label: 'Hanoi Attempt Success', value: hanoiSuccessRate !== null ? `${hanoiSuccessRate}%` : '—', unit: totalHanoiAttempts > 0 ? `${totalHanoiCompleted}/${totalHanoiAttempts} solved` : 'No attempts', color: '#4A9B7F' },
          { label: 'Available Activities', value: '4', unit: 'Hanoi · Corsi · Stroop · TS', color: '#A9A2E8' },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E9E8F2] p-3.5 sm:p-5 shadow-2xs">
            <div className="text-xs text-[#73758C] mb-1.5 sm:mb-2 leading-tight">{label}</div>
            <div className="text-xl sm:text-2xl font-bold font-['JetBrains_Mono',monospace]" style={{ color }}>{value}</div>
            <div className="text-[10px] sm:text-[11px] text-[#9597AB] mt-0.5">{unit}</div>
          </div>
        ))}
      </div>

      {/* Recent participants table */}
      <div className="bg-white rounded-2xl border border-[#E9E8F2] overflow-hidden shadow-2xs">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-[#E9E8F2]">
          <div>
            <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Recent Participants</h3>
            <p className="text-xs text-[#73758C] mt-0.5">Most recently registered — showing {recent.length} of {totalParticipants}</p>
          </div>
          <button
            onClick={() => navigate('admin-participants')}
            className="flex items-center gap-1.5 text-xs text-[#6567C9] hover:text-[#5254A8] font-semibold font-['Plus_Jakarta_Sans',sans-serif]"
          >
            View all <ChevronRight size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Registered</th>
              <th>Status</th>
              <th>Activities</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recent.map(p => {
              const count = (p.hanoiDone ? 1 : 0) + (p.corsiDone ? 1 : 0) + (p.stroopDone ? 1 : 0) + (p.taskSwitchingDone ? 1 : 0);
              return (
                <tr
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => navigate('admin-participants')}
                >
                  <td>
                    <span className="font-['JetBrains_Mono',monospace] text-[#6567C9] text-xs font-bold">{p.id}</span>
                  </td>
                  <td className="font-medium">{p.name}</td>
                  <td className="text-[#73758C]">{p.age}</td>
                  <td className="text-[#73758C]">{p.gender}</td>
                  <td className="text-[#73758C] text-xs">{p.registered}</td>
                  <td>
                    <span className={`badge text-[11px] ${statusColor[p.status]}`}>{p.status}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className={`flex items-center ${p.hanoiDone ? 'text-[#6567C9]' : 'text-[#C5C1F1]'}`} title="Tower of Hanoi">
                        <Layers size={12} />
                      </div>
                      <div className={`flex items-center ${p.corsiDone ? 'text-[#69AFA8]' : 'text-[#C5C1F1]'}`} title="Backward Corsi">
                        <Grid3X3 size={12} />
                      </div>
                      <div className={`flex items-center ${p.stroopDone ? 'text-[#E11D48]' : 'text-[#C5C1F1]'}`} title="Stroop Task">
                        <Zap size={12} />
                      </div>
                      <div className={`flex items-center ${p.taskSwitchingDone ? 'text-[#8B5CF6]' : 'text-[#C5C1F1]'}`} title="Task Switching">
                        <Repeat size={12} />
                      </div>
                      <span className="text-xs text-[#9597AB] ml-0.5">
                        {count}/4
                      </span>
                    </div>
                  </td>
                  <td>
                    <ChevronRight size={14} className="text-[#C5C1F1]" />
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-5">
        {[
          { label: 'View all participants', sub: 'Manage research participants', page: 'admin-participants' as Page, color: '#6567C9' },
          { label: 'Configure experiments', sub: 'Cognitive task settings', page: 'admin-experiments' as Page, color: '#69AFA8' },
          { label: 'Export research data', sub: 'CSV · Excel · Raw logs', page: 'admin-exports' as Page, color: '#A9A2E8' },
        ].map(({ label, sub, page, color }) => (
          <button
            key={label}
            onClick={() => navigate(page)}
            className="bg-white rounded-xl border border-[#E9E8F2] p-4 sm:p-5 text-left hover:border-[#C5C1F1] hover:bg-[#F8F8FC] transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">{label}</span>
              <ArrowRight size={14} style={{ color }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xs text-[#73758C]">{sub}</span>
          </button>
        ))}
      </div>
    </AdminLayout>
  );
}
