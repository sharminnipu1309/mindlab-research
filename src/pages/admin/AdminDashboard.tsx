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

function StatCard({ icon: Icon, label, value, sub }: {
  icon: typeof Users; label: string; value: string | number; sub?: string; color?: string; bg?: string;
}) {
  return (
    <div className="bg-white dark:bg-[#354238] rounded-2xl border border-[#BAC8BD] dark:border-[#445448] p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#E4EBE5] dark:bg-[#1D221E] text-[#282E28] dark:text-[#A3B9A5]">
          <Icon size={18} />
        </div>
      </div>
      <div className="text-2xl font-bold text-[#282E28] dark:text-[#D7E0D8] font-['JetBrains_Mono',monospace] mb-1">{value}</div>
      <div className="text-sm font-semibold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif]">{label}</div>
      {sub && <div className="text-xs text-[#47564A] dark:text-[#B6C7B8] mt-0.5">{sub}</div>}
    </div>
  );
}

const statusColor: Record<string, string> = {
  'Completed': 'bg-[#E4EBE5] dark:bg-[#1D221E] text-[#282E28] dark:text-[#A3B9A5] border border-[#354238]/30 dark:border-[#445448]',
  'In Progress': 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700',
  'Practice Only': 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
  'Incomplete': 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
  'Not Started': 'bg-[#E4EBE5] dark:bg-[#282E28] text-[#47564A] dark:text-[#B6C7B8] border border-[#BAC8BD] dark:border-[#445448]',
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
        <StatCard icon={Users} label="Total Participants" value={totalParticipants} sub="Registered cohort" />
        <StatCard icon={CheckCircle} label="Completed Sessions" value={completedSessions} sub={`${completionRate}% protocol completion`} />
        <StatCard icon={FlaskConical} label="Active Experiments" value={1} sub="Main Cognitive Battery" />
        <StatCard icon={Activity} label="Available Activities" value={4} sub="Tower of Hanoi · Corsi · Stroop · Task Switching" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-5 sm:mb-7">
        {/* Activity trend */}
        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-[#354238] rounded-2xl border border-[#BAC8BD] dark:border-[#445448] p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <h3 className="text-sm font-bold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif]">Participant Activity Timeline</h3>
              <p className="text-xs text-[#47564A] dark:text-[#B6C7B8] mt-0.5">Live sessions registered per day</p>
            </div>
            <span className="text-[11px] sm:text-xs text-[#282E28] dark:text-[#A3B9A5] bg-[#E4EBE5] dark:bg-[#1D221E] border border-[#BAC8BD] dark:border-[#445448] rounded-lg px-2.5 sm:px-3 py-1 font-['Plus_Jakarta_Sans',sans-serif] font-semibold">
              Live DB Timestamps
            </span>
          </div>

          {activityTrend.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center">
              <Inbox size={24} className="text-[#47564A] dark:text-[#B6C7B8] mb-1" />
              <p className="text-xs text-[#47564A] dark:text-[#B6C7B8]">No registrations recorded yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={activityTrend} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#BAC8BD" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#47564A', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#47564A', fontFamily: 'Inter' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#354238', border: '1px solid #445448', borderRadius: 10, fontSize: 12, color: '#D7E0D8' }}
                  cursor={{ stroke: '#BAC8BD' }}
                />
                <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#354238" strokeWidth={2.5} dot={{ r: 4, fill: '#354238', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Completion breakdown */}
        <div className="bg-white dark:bg-[#354238] rounded-2xl border border-[#BAC8BD] dark:border-[#445448] p-4 sm:p-6 shadow-sm">
          <h3 className="text-sm font-bold text-[#282E28] dark:text-[#D7E0D8] mb-4 sm:mb-5 font-['Plus_Jakarta_Sans',sans-serif]">Session Status</h3>
          <div className="space-y-2.5 mb-4">
            {[
              { label: 'Completed', count: completedSessions, color: '#354238', pct: totalParticipants > 0 ? Math.round((completedSessions / totalParticipants) * 100) : 0 },
              { label: 'In Progress', count: inProgress, color: '#D97706', pct: totalParticipants > 0 ? Math.round((inProgress / totalParticipants) * 100) : 0 },
              { label: 'Practice Only', count: practiceOnly, color: '#B45309', pct: totalParticipants > 0 ? Math.round((practiceOnly / totalParticipants) * 100) : 0 },
              { label: 'Incomplete', count: incomplete, color: '#DC2626', pct: totalParticipants > 0 ? Math.round((incomplete / totalParticipants) * 100) : 0 },
              { label: 'Not Started', count: notStarted, color: '#BAC8BD', pct: totalParticipants > 0 ? Math.round((notStarted / totalParticipants) * 100) : 0 },
            ].map(({ label, count, color, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#47564A] dark:text-[#B6C7B8] font-medium">{label}</span>
                  <span className="font-bold font-['JetBrains_Mono',monospace] text-[#282E28] dark:text-[#D7E0D8]">{count}</span>
                </div>
                <div className="h-1.5 bg-[#E4EBE5] dark:bg-[#1D221E] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#BAC8BD] dark:border-[#445448] pt-4 mt-4">
            <div className="text-xs text-[#47564A] dark:text-[#B6C7B8] mb-1">Study completion rate</div>
            <div className="text-xl font-bold text-[#282E28] dark:text-[#D7E0D8] font-['JetBrains_Mono',monospace]">{completionRate}%</div>
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-5 sm:mb-7">
        {[
          { label: 'Avg. Corsi Span', value: corsiAvgMaxSpan ? corsiAvgMaxSpan : '—', unit: corsiAvgMaxSpan ? 'Max sequence' : 'Incomplete' },
          { label: 'Avg. Product Score', value: corsiAvgProductScore ? `${corsiAvgProductScore} pts` : '—', unit: corsiAvgProductScore ? 'Span × correct' : 'Incomplete' },
          { label: 'Hanoi Attempt Success', value: hanoiSuccessRate !== null ? `${hanoiSuccessRate}%` : '—', unit: totalHanoiAttempts > 0 ? `${totalHanoiCompleted}/${totalHanoiAttempts} solved` : 'No attempts' },
          { label: 'Available Activities', value: '4', unit: 'Hanoi · Corsi · Stroop · TS' },
        ].map(({ label, value, unit }) => (
          <div key={label} className="bg-white dark:bg-[#354238] rounded-xl border border-[#BAC8BD] dark:border-[#445448] p-3.5 sm:p-5 shadow-sm">
            <div className="text-xs text-[#47564A] dark:text-[#B6C7B8] mb-1.5 sm:mb-2 leading-tight">{label}</div>
            <div className="text-xl sm:text-2xl font-bold font-['JetBrains_Mono',monospace] text-[#282E28] dark:text-[#A3B9A5]">{value}</div>
            <div className="text-[10px] sm:text-[11px] text-[#47564A] dark:text-[#B6C7B8] mt-0.5">{unit}</div>
          </div>
        ))}
      </div>

      {/* Recent participants table */}
      <div className="bg-white dark:bg-[#354238] rounded-2xl border border-[#BAC8BD] dark:border-[#445448] overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-[#BAC8BD] dark:border-[#445448]">
          <div>
            <h3 className="text-sm font-bold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif]">Recent Participants</h3>
            <p className="text-xs text-[#47564A] dark:text-[#B6C7B8] mt-0.5">Most recently registered — showing {recent.length} of {totalParticipants}</p>
          </div>
          <button
            onClick={() => navigate('admin-participants')}
            className="flex items-center gap-1.5 text-xs text-[#282E28] dark:text-[#A3B9A5] hover:opacity-80 font-semibold font-['Plus_Jakarta_Sans',sans-serif]"
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
                    <span className="font-['JetBrains_Mono',monospace] text-[#282E28] dark:text-[#A3B9A5] text-xs font-bold">{p.id}</span>
                  </td>
                  <td className="font-medium text-[#282E28] dark:text-[#D7E0D8]">{p.name}</td>
                  <td className="text-[#47564A] dark:text-[#B6C7B8]">{p.age}</td>
                  <td className="text-[#47564A] dark:text-[#B6C7B8]">{p.gender}</td>
                  <td className="text-[#47564A] dark:text-[#B6C7B8] text-xs">{p.registered}</td>
                  <td>
                    <span className={`badge text-[11px] ${statusColor[p.status]}`}>{p.status}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className={`flex items-center ${p.hanoiDone ? 'text-[#282E28] dark:text-[#A3B9A5]' : 'text-[#BAC8BD] dark:text-[#445448]'}`} title="Tower of Hanoi">
                        <Layers size={12} />
                      </div>
                      <div className={`flex items-center ${p.corsiDone ? 'text-[#282E28] dark:text-[#A3B9A5]' : 'text-[#BAC8BD] dark:text-[#445448]'}`} title="Backward Corsi">
                        <Grid3X3 size={12} />
                      </div>
                      <div className={`flex items-center ${p.stroopDone ? 'text-[#282E28] dark:text-[#A3B9A5]' : 'text-[#BAC8BD] dark:text-[#445448]'}`} title="Stroop Task">
                        <Zap size={12} />
                      </div>
                      <div className={`flex items-center ${p.taskSwitchingDone ? 'text-[#282E28] dark:text-[#A3B9A5]' : 'text-[#BAC8BD] dark:text-[#445448]'}`} title="Task Switching">
                        <Repeat size={12} />
                      </div>
                      <span className="text-xs text-[#47564A] dark:text-[#B6C7B8] ml-0.5">
                        {count}/4
                      </span>
                    </div>
                  </td>
                  <td>
                    <ChevronRight size={14} className="text-[#BAC8BD] dark:text-[#445448]" />
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
          { label: 'View all participants', sub: 'Manage research participants', page: 'admin-participants' as Page },
          { label: 'Configure experiments', sub: 'Cognitive task settings', page: 'admin-experiments' as Page },
          { label: 'Export research data', sub: 'CSV · Excel · Raw logs', page: 'admin-exports' as Page },
        ].map(({ label, sub, page }) => (
          <button
            key={label}
            onClick={() => navigate(page)}
            className="bg-white dark:bg-[#354238] rounded-xl border border-[#BAC8BD] dark:border-[#445448] p-4 sm:p-5 text-left hover:border-[#282E28] dark:hover:border-[#A3B9A5] hover:bg-[#E4EBE5] dark:hover:bg-[#1D221E] transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-sm font-bold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif]">{label}</span>
              <ArrowRight size={14} className="text-[#282E28] dark:text-[#A3B9A5] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xs text-[#47564A] dark:text-[#B6C7B8]">{sub}</span>
          </button>
        ))}
      </div>
    </AdminLayout>
  );
}
