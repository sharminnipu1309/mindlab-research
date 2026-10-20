import { useState, useEffect } from 'react';
import { Page } from '../../types';
import AdminLayout from '../../components/AdminLayout';
import { demoParticipants } from '../../data/demo';
import { fetchParticipantsList } from '../../services/adminService';
import {
  Search, Filter, ChevronRight, X, CheckCircle,
  Layers, Grid3X3, Zap, Repeat, Mail, Calendar, User, Inbox
} from 'lucide-react';

interface Props {
  navigate: (page: Page) => void;
  onLogout: () => void;
  currentPage: Page;
}

const statusColor: Record<string, string> = {
  'Completed': 'bg-[#D1EDE5] text-[#4A9B7F]',
  'In Progress': 'bg-[#EDEAF8] text-[#6567C9]',
  'Practice Only': 'bg-[#FEF3C7] text-[#D97706]',
  'Incomplete': 'bg-[#FEE2E2] text-[#DC2626]',
  'Not Started': 'bg-[#F8F8FC] text-[#73758C] border border-[#E9E8F2]',
};

export default function ParticipantManagement({ navigate, onLogout, currentPage }: Props) {
  const [participants, setParticipants] = useState<typeof demoParticipants>(demoParticipants);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedParticipant, setSelectedParticipant] = useState<typeof demoParticipants[0] | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  useEffect(() => {
    fetchParticipantsList().then(res => {
      if (res) {
        setParticipants(res as unknown as typeof demoParticipants);
      }
    });
  }, []);

  const filtered = participants.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageData = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <AdminLayout
      currentPage={currentPage}
      navigate={navigate}
      onLogout={onLogout}
      pageTitle="Participant Management"
      breadcrumb="Participants"
    >
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
        <div className="relative flex-1 max-w-full sm:max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9597AB]" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or ID..."
            className="ml-input pl-10 text-sm py-2 w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Filter size={14} className="text-[#73758C] flex-shrink-0 mr-1" />
          {['All', 'Completed', 'In Progress', 'Practice Only', 'Incomplete', 'Not Started'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold font-['Plus_Jakarta_Sans',sans-serif] transition-all ${
                statusFilter === s
                  ? 'bg-[#6567C9] text-white'
                  : 'bg-white border border-[#E9E8F2] text-[#73758C] hover:bg-[#F8F8FC]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="text-xs text-[#9597AB] sm:ml-auto">
          {filtered.length} participant{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E9E8F2] overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="admin-table">
          <thead>
            <tr>
              <th>Participant ID</th>
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
            {pageData.map(p => {
              const hDone = Boolean(p.hanoiDone);
              const cDone = Boolean(p.corsiDone);
              const sDone = Boolean((p as any).stroopDone);
              const tsDone = Boolean((p as any).taskSwitchingDone);
              const count = (hDone ? 1 : 0) + (cDone ? 1 : 0) + (sDone ? 1 : 0) + (tsDone ? 1 : 0);

              const hHasData = (p as any).hanoiAttempts > 0;
              const cHasData = (p as any).corsiTrialsCount > 0;
              const sHasData = (p as any).stroopExpCount > 0 || (p as any).stroopPracticeCount > 0;
              const tsHasData = (p as any).taskSwitchingExpCount > 0 || (p as any).taskSwitchingPracticeCount > 0;

              return (
                <tr
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedParticipant(p)}
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
                      <div
                        className={`flex items-center ${hDone ? 'text-[#6567C9]' : hHasData ? 'text-[#A9A2E8]' : 'text-[#E9E8F2]'}`}
                        title={hDone ? 'Tower of Hanoi: Completed' : hHasData ? `Tower of Hanoi: ${(p as any).hanoiCompletedCount || 0}/6 puzzles` : 'Tower of Hanoi: Not Started'}
                      >
                        <Layers size={13} />
                      </div>
                      <div
                        className={`flex items-center ${cDone ? 'text-[#69AFA8]' : cHasData ? 'text-[#99D2CC]' : 'text-[#E9E8F2]'}`}
                        title={cDone ? `Backward Corsi: Span ${(p as any).corsiMaxSpan}` : cHasData ? `Backward Corsi: Incomplete (${(p as any).corsiTrialsCount} trials)` : 'Backward Corsi: Not Started'}
                      >
                        <Grid3X3 size={13} />
                      </div>
                      <div
                        className={`flex items-center ${sDone ? 'text-[#E11D48]' : sHasData ? 'text-[#FDA4AF]' : 'text-[#E9E8F2]'}`}
                        title={sDone ? `Stroop: ${(p as any).stroopExpCount} exp trials` : sHasData ? `Stroop: Practice only (${(p as any).stroopPracticeCount} trials)` : 'Stroop: Not Started'}
                      >
                        <Zap size={13} />
                      </div>
                      <div
                        className={`flex items-center ${tsDone ? 'text-[#8B5CF6]' : tsHasData ? 'text-[#C4B5FD]' : 'text-[#E9E8F2]'}`}
                        title={tsDone ? `Task Switching: ${(p as any).taskSwitchingExpCount} exp trials` : tsHasData ? `Task Switching: Practice only (${(p as any).taskSwitchingPracticeCount} trials)` : 'Task Switching: Not Started'}
                      >
                        <Repeat size={13} />
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

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox size={28} className="text-[#C5C1F1] mb-3" />
            <p className="text-sm font-semibold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">No participants found</p>
            <p className="text-xs text-[#9597AB] mt-1">Participants will appear automatically after registration.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#73758C]">
          <span>Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</span>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-7 h-7 rounded-lg text-xs font-bold font-['JetBrains_Mono',monospace] ${
                  page === i + 1 ? 'bg-[#6567C9] text-white' : 'bg-white border border-[#E9E8F2] hover:bg-[#F8F8FC]'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Participant detail drawer */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-[#252640]/20 backdrop-blur-sm" onClick={() => setSelectedParticipant(null)} />
          <div className="relative w-full max-w-sm sm:w-96 bg-white shadow-2xl h-full overflow-y-auto custom-scroll animate-slide-right">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#E9E8F2]">
              <div>
                <div className="text-[10px] font-bold text-[#9597AB] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif] mb-1">
                  Participant Detail
                </div>
                <span className="text-base font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">
                  {selectedParticipant.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedParticipant(null)}
                className="text-[#73758C] hover:text-[#252640] p-1.5 rounded-lg hover:bg-[#F8F8FC]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* ID badge */}
              <div className="bg-[#F8F8FC] rounded-xl border border-[#E9E8F2] p-4">
                <div className="text-xs text-[#73758C] mb-1">Participant ID</div>
                <div className="text-xl font-bold text-[#6567C9] font-['JetBrains_Mono',monospace]">{selectedParticipant.id}</div>
                <span className={`badge text-[11px] mt-2 ${statusColor[selectedParticipant.status]}`}>
                  {selectedParticipant.status}
                </span>
              </div>

              {/* Demographics */}
              <div>
                <h4 className="text-xs font-bold text-[#73758C] uppercase tracking-widest mb-3 font-['Plus_Jakarta_Sans',sans-serif]">Demographics</h4>
                <div className="space-y-2">
                  {[
                    { icon: User, label: 'Age', value: selectedParticipant.age },
                    { icon: User, label: 'Gender', value: selectedParticipant.gender },
                    { icon: Calendar, label: 'Registered', value: selectedParticipant.registered },
                    ...(selectedParticipant.email ? [{ icon: Mail, label: 'Email', value: selectedParticipant.email }] : []),
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 text-sm">
                      <div className="w-7 h-7 bg-[#F8F8FC] rounded-lg flex items-center justify-center border border-[#E9E8F2] flex-shrink-0">
                        <Icon size={13} className="text-[#9597AB]" />
                      </div>
                      <span className="text-[#73758C] w-20 flex-shrink-0 text-xs">{label}</span>
                      <span className="text-[#252640] font-medium text-xs">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity status */}
              <div>
                <h4 className="text-xs font-bold text-[#73758C] uppercase tracking-widest mb-3 font-['Plus_Jakarta_Sans',sans-serif]">Activity Status</h4>
                <div className="space-y-2.5">
                  {(() => {
                    const sp = selectedParticipant as any;

                    // Hanoi
                    const hDone = Boolean(sp.hanoiDone);
                    const hAttempts = sp.hanoiAttempts ?? (hDone ? 6 : 0);
                    const hCompleted = sp.hanoiCompletedCount ?? (hDone ? 6 : 0);
                    const hDetail = hAttempts > 0
                      ? `${hCompleted}/6 puzzles completed (${hAttempts} attempted)`
                      : (hDone ? 'Completed' : 'Not Started');

                    // Corsi
                    const cDone = Boolean(sp.corsiDone);
                    const cTrials = sp.corsiTrialsCount ?? 0;
                    const cSpan = sp.corsiMaxSpan ?? sp.maxSpan;
                    const cScore = sp.corsiProductScore ?? sp.productScore;
                    let cDetail: string;
                    let cStatusLabel = cDone ? 'Done' : 'Not Done';
                    let cStatusColor = cDone ? 'text-[#4A9B7F]' : 'text-[#9597AB]';
                    if (cDone && cSpan) {
                      cDetail = `Span: ${cSpan} · Product Score: ${cScore ?? 0}`;
                    } else if (cTrials > 0) {
                      cDetail = `Incomplete: ${cTrials} trial(s) recorded (stopped before Level 1 completion)`;
                      cStatusLabel = 'Incomplete';
                      cStatusColor = 'text-[#D97706]';
                    } else {
                      cDetail = 'Not Started';
                    }

                    // Stroop
                    const sDone = Boolean(sp.stroopDone);
                    const sExp = sp.stroopExpCount ?? 0;
                    const sPractice = sp.stroopPracticeCount ?? 0;
                    let sDetail: string;
                    let sStatusLabel = sDone ? 'Done' : 'Not Done';
                    let sStatusColor = sDone ? 'text-[#4A9B7F]' : 'text-[#9597AB]';
                    if (sExp >= 128) {
                      sDetail = '128/128 experimental trials completed';
                    } else if (sExp >= 80 && sDone) {
                      sDetail = '80/80 experimental trials completed (protocol v1)';
                    } else if (sExp > 0) {
                      sDetail = `${sExp}/128 experimental trials completed`;
                      sStatusLabel = 'Partial';
                      sStatusColor = 'text-[#D97706]';
                    } else if (sPractice > 0) {
                      sDetail = `Incomplete: ${sPractice} practice trial(s) only (0/128 experimental trials)`;
                      sStatusLabel = 'Practice Only';
                      sStatusColor = 'text-[#D97706]';
                    } else {
                      sDetail = 'Not Started';
                    }

                    // Task Switching
                    const tsDone = Boolean(sp.taskSwitchingDone);
                    const tsExp = sp.taskSwitchingExpCount ?? 0;
                    const tsPractice = sp.taskSwitchingPracticeCount ?? 0;
                    let tsDetail: string;
                    let tsStatusLabel = tsDone ? 'Done' : 'Not Done';
                    let tsStatusColor = tsDone ? 'text-[#4A9B7F]' : 'text-[#9597AB]';
                    if (tsExp >= 128) {
                      tsDetail = '128/128 experimental trials completed';
                    } else if (tsExp >= 64 && tsDone) {
                      tsDetail = '64/64 experimental trials completed (protocol v1)';
                    } else if (tsExp > 0) {
                      tsDetail = `${tsExp}/128 experimental trials completed`;
                      tsStatusLabel = 'Partial';
                      tsStatusColor = 'text-[#D97706]';
                    } else if (tsPractice > 0) {
                      tsDetail = `Incomplete: ${tsPractice} practice trial(s) only (0/128 experimental trials)`;
                      tsStatusLabel = 'Practice Only';
                      tsStatusColor = 'text-[#D97706]';
                    } else {
                      tsDetail = 'Not Started';
                    }

                    const activities = [
                      {
                        icon: Layers,
                        label: 'Tower of Hanoi',
                        domain: 'Planning & Problem-Solving',
                        done: hDone,
                        statusLabel: hDone ? 'Done' : hAttempts > 0 ? 'Partial' : 'Not Done',
                        statusColor: hDone ? 'text-[#4A9B7F]' : hAttempts > 0 ? 'text-[#D97706]' : 'text-[#9597AB]',
                        detail: hDetail,
                        color: '#6567C9'
                      },
                      {
                        icon: Grid3X3,
                        label: 'Backward Corsi',
                        domain: 'Spatial Working Memory',
                        done: cDone,
                        statusLabel: cStatusLabel,
                        statusColor: cStatusColor,
                        detail: cDetail,
                        color: '#69AFA8'
                      },
                      {
                        icon: Zap,
                        label: 'Stroop Task',
                        domain: 'Selective Attention & Control',
                        done: sDone,
                        statusLabel: sStatusLabel,
                        statusColor: sStatusColor,
                        detail: sDetail,
                        color: '#E11D48'
                      },
                      {
                        icon: Repeat,
                        label: 'Task Switching',
                        domain: 'Cognitive Flexibility & Set-Shifting',
                        done: tsDone,
                        statusLabel: tsStatusLabel,
                        statusColor: tsStatusColor,
                        detail: tsDetail,
                        color: '#8B5CF6'
                      },
                    ];

                    return activities.map(({ icon: Icon, label, domain, done, statusLabel, statusColor: sc, detail, color }) => (
                      <div
                        key={label}
                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                          done ? 'border-[#4A9B7F]/20 bg-[#D1EDE5]/30' : 'border-[#E9E8F2] bg-[#F8F8FC]'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '20' }}>
                          <Icon size={15} style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#252640]">{label}</span>
                            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${sc}`}>
                              {done && <CheckCircle size={10} />}
                              {statusLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#73758C]">{domain}</div>
                          {detail && <div className="text-[10px] text-[#6567C9] font-['JetBrains_Mono',monospace] mt-0.5">{detail}</div>}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
