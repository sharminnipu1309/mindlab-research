import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Page } from '../../types';
import AdminLayout from '../../components/AdminLayout';
import { Download, FileText, Database, CheckCircle, ChevronDown, ChevronUp, AlertCircle, RefreshCw, Layers, BarChart3, Info } from 'lucide-react';
import { fetchExportTableData, fetchExportRowCounts } from '../../services/adminService';

interface Props {
  navigate: (page: Page) => void;
  onLogout: () => void;
  currentPage: Page;
}

interface ExportCard {
  id: string;
  category: string;
  title: string;
  dataClassification: 'Raw trial/move records' | 'Participant/session summaries';
  typeTag: 'raw' | 'summary';
  oneRowRepresents: string;
  usefulFor: string;
  columnsList: string[];
  filenamePrefix: string;
  color: string;
  bg: string;
}

const exports: ExportCard[] = [
  {
    id: 'hanoi-summary',
    category: 'Tower of Hanoi',
    title: 'Tower of Hanoi — Puzzle Summaries',
    dataClassification: 'Participant/session summaries',
    typeTag: 'summary',
    oneRowRepresents: 'One row per puzzle attempt.',
    usefulFor: 'Analysing individual puzzle completion rates, solving efficiency, planning latency, and error rates across disc complexities.',
    columnsList: ['participant_id', 'session_id', 'puzzle_num', 'attempt_num', 'disk_count', 'move_limit', 'valid_moves', 'invalid_moves', 'completion_time_ms', 'elapsed_time_ms', 'first_reaction_ms', 'outcome'],
    filenamePrefix: 'memtiva_summary_hanoi_puzzles',
    color: '#6567C9',
    bg: '#EDEAF8',
  },
  {
    id: 'hanoi-moves',
    category: 'Tower of Hanoi',
    title: 'Tower of Hanoi — Individual Move Log',
    dataClassification: 'Raw trial/move records',
    typeTag: 'raw',
    oneRowRepresents: 'One row per individual move attempt.',
    usefulFor: 'Move-by-move strategy analysis, disc placement trajectory, peg transition sequences, and invalid move attempts.',
    columnsList: ['participant_id', 'puzzle_num', 'move_num', 'move_type', 'source_rod', 'dest_rod', 'disk_size', 'timestamp_ms', 'is_valid'],
    filenamePrefix: 'memtiva_raw_hanoi_moves',
    color: '#6567C9',
    bg: '#EDEAF8',
  },
  {
    id: 'hanoi-reaction',
    category: 'Tower of Hanoi',
    title: 'Tower of Hanoi — Inter-Move Reaction Times',
    dataClassification: 'Raw trial/move records',
    typeTag: 'raw',
    oneRowRepresents: 'One row per move transition with inter-move latency.',
    usefulFor: 'Investigating cognitive pause times, intra-puzzle hesitation bursts, sub-goal planning latency, and temporal decision dynamics.',
    columnsList: ['participant_id', 'puzzle_num', 'move_num', 'reaction_time_ms', 'cumulative_time_ms', 'disk_size', 'is_valid'],
    filenamePrefix: 'memtiva_raw_hanoi_intermove_timing',
    color: '#6567C9',
    bg: '#EDEAF8',
  },
  {
    id: 'corsi-summary',
    category: 'Backward Corsi',
    title: 'Backward Corsi — Summary Performance Scores',
    dataClassification: 'Participant/session summaries',
    typeTag: 'summary',
    oneRowRepresents: 'One row per participant session.',
    usefulFor: 'Assessing visuospatial working memory span, stopping-rule outcome, Product Score (Span × Correct at Max Span), and overall trial accuracy.',
    columnsList: ['participant_id', 'session_id', 'max_level', 'sequence_length', 'product_score', 'trial_accuracy', 'total_trials', 'total_correct_trials'],
    filenamePrefix: 'memtiva_summary_corsi_scores',
    color: '#0D9488',
    bg: '#E4F2F0',
  },
  {
    id: 'corsi-trials',
    category: 'Backward Corsi',
    title: 'Backward Corsi — Trial-by-Trial Responses',
    dataClassification: 'Raw trial/move records',
    typeTag: 'raw',
    oneRowRepresents: 'One row per sequence trial presentation.',
    usefulFor: 'Examining sequence recall accuracy at each span length, reversed block sequences, participant responses, and trial reaction times.',
    columnsList: ['participant_id', 'level', 'trial_num', 'sequence_length', 'presented_sequence', 'expected_reverse', 'participant_response', 'is_correct', 'reaction_time_ms', 'timestamp_ms'],
    filenamePrefix: 'memtiva_raw_corsi_trials',
    color: '#0D9488',
    bg: '#E4F2F0',
  },
  {
    id: 'corsi-positions',
    category: 'Backward Corsi',
    title: 'Backward Corsi — Block-Position Response Log',
    dataClassification: 'Raw trial/move records',
    typeTag: 'raw',
    oneRowRepresents: 'One row per tapped block position in a sequence.',
    usefulFor: 'Evaluating block-level accuracy, serial position curves (primacy vs recency), transposition mistakes, and spatial error patterns.',
    columnsList: ['participant_id', 'level', 'trial_num', 'position_num', 'block_id', 'expected_block', 'responded_block', 'is_correct'],
    filenamePrefix: 'memtiva_raw_corsi_positions',
    color: '#0D9488',
    bg: '#E4F2F0',
  },
  {
    id: 'stroop-summary',
    category: 'Stroop Task',
    title: 'Stroop Task — Summary Performance Scores',
    dataClassification: 'Participant/session summaries',
    typeTag: 'summary',
    oneRowRepresents: 'One row per participant session.',
    usefulFor: 'Measuring cognitive inhibition, interference effect (Incongruent RT − Congruent RT), and conditional accuracy differences.',
    columnsList: ['participant_id', 'session_id', 'total_trials', 'congruent_accuracy', 'incongruent_accuracy', 'overall_accuracy', 'congruent_mean_rt_ms', 'incongruent_mean_rt_ms', 'stroop_effect_ms'],
    filenamePrefix: 'memtiva_summary_stroop_scores',
    color: '#E11D48',
    bg: '#FCE8EB',
  },
  {
    id: 'stroop-trials',
    category: 'Stroop Task',
    title: 'Stroop Task — Trial-by-Trial Raw Responses',
    dataClassification: 'Raw trial/move records',
    typeTag: 'raw',
    oneRowRepresents: 'One row per stimulus presentation trial.',
    usefulFor: 'Analysing item-level ink/word conflict, reaction time distributions (ex-Gaussian modeling), post-error slowing, and keypress accuracy.',
    columnsList: ['participant_id', 'trial_num', 'phase', 'word', 'ink_color', 'condition', 'correct_response', 'participant_response', 'is_correct', 'reaction_time_ms', 'timestamp_ms'],
    filenamePrefix: 'memtiva_raw_stroop_trials',
    color: '#E11D48',
    bg: '#FCE8EB',
  },
  {
    id: 'task-switching-summary',
    category: 'Task Switching',
    title: 'Task Switching — Summary Performance Scores',
    dataClassification: 'Participant/session summaries',
    typeTag: 'summary',
    oneRowRepresents: 'One row per participant session.',
    usefulFor: 'Evaluating executive cognitive flexibility via Task Switch Cost (Mixed Switch RT − Mixed Repeat RT), Spatial Shift Cost (Inconsistent RT − Consistent RT), and condition-specific reaction times.',
    columnsList: ['participant_id', 'session_id', 'total_trials', 'overall_accuracy', 'pure_letter_rt_ms', 'pure_number_rt_ms', 'mixed_repeat_rt_ms', 'mixed_switch_rt_ms', 'switch_cost_ms', 'consistent_trials', 'consistent_mean_rt_ms', 'inconsistent_trials', 'inconsistent_mean_rt_ms', 'shift_cost_ms'],
    filenamePrefix: 'memtiva_summary_task_switching_scores',
    color: '#8B5CF6',
    bg: '#F3EEFE',
  },
  {
    id: 'task-switching-trials',
    category: 'Task Switching',
    title: 'Task Switching — Trial-by-Trial Raw Responses',
    dataClassification: 'Raw trial/move records',
    typeTag: 'raw',
    oneRowRepresents: 'One row per stimulus classification trial.',
    usefulFor: 'Investigating trial-by-trial task switching effects, stimulus position (quadrant/row), row consistency (consistent vs inconsistent), error patterns, and RT distributions.',
    columnsList: ['participant_id', 'trial_num', 'phase', 'block_type', 'task_type', 'stimulus_position', 'consistency', 'is_consistent', 'letter', 'number', 'is_switch', 'is_repeat', 'correct_response', 'participant_response', 'is_correct', 'reaction_time_ms', 'timestamp_ms'],
    filenamePrefix: 'memtiva_raw_task_switching_trials',
    color: '#8B5CF6',
    bg: '#F3EEFE',
  },
  {
    id: 'participants',
    category: 'Participants',
    title: 'Registered Participants Cohort',
    dataClassification: 'Participant/session summaries',
    typeTag: 'summary',
    oneRowRepresents: 'One row per registered research participant.',
    usefulFor: 'Demographic stratification, cohort subgroup comparison (by age, gender, ADHD diagnosis status), and participant sample verification.',
    columnsList: ['participant_id', 'name', 'age', 'gender', 'adhd_diagnosis', 'email', 'registration_date', 'created_at'],
    filenamePrefix: 'memtiva_summary_participants',
    color: '#6567C9',
    bg: '#EDEAF8',
  },
  {
    id: 'sessions',
    category: 'Participants',
    title: 'Battery Sessions & Completion Timestamps',
    dataClassification: 'Participant/session summaries',
    typeTag: 'summary',
    oneRowRepresents: 'One row per experimental testing session.',
    usefulFor: 'Monitoring participant battery compliance, task completion timestamps, dropout attrition, and overall testing protocol duration.',
    columnsList: ['participant_id', 'session_id', 'session_status', 'session_start', 'session_end', 'hanoi_completed', 'corsi_completed', 'stroop_completed', 'task_switching_completed'],
    filenamePrefix: 'memtiva_summary_sessions',
    color: '#6567C9',
    bg: '#EDEAF8',
  },
];

export default function DataExport({ navigate, onLogout, currentPage }: Props) {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [expandedDict, setExpandedDict] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [rowCounts, setRowCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCounts = async () => {
    setLoadingCounts(true);
    try {
      const counts = await fetchExportRowCounts();
      setRowCounts(counts);
    } catch (err) {
      console.warn('Failed to fetch export row counts:', err);
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const handleDownload = async (card: ExportCard) => {
    setDownloading(card.id);
    setErrorMessage(null);
    try {
      const liveData = await fetchExportTableData(card.id);
      if (!liveData || liveData.length === 0) {
        setErrorMessage(`No live records found in database for "${card.title}".`);
        setTimeout(() => setErrorMessage(null), 5000);
        return;
      }

      const filename = `${card.filenamePrefix}.${format}`;

      if (format === 'xlsx') {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(liveData);
        XLSX.utils.book_append_sheet(wb, ws, card.id.slice(0, 31));
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const ws = XLSX.utils.json_to_sheet(liveData);
        const csvContent = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setDownloaded(prev => new Set([...prev, card.id]));
      setTimeout(() => {
        setDownloaded(prev => {
          const next = new Set(prev);
          next.delete(card.id);
          return next;
        });
      }, 3000);
    } catch (err: any) {
      console.error('Export download error:', err);
      setErrorMessage(err?.message || 'Failed to download export data.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setDownloading(null);
    }
  };

  const categories = ['Tower of Hanoi', 'Backward Corsi', 'Stroop Task', 'Task Switching', 'Participants'];

  return (
    <AdminLayout
      currentPage={currentPage}
      navigate={navigate}
      onLogout={onLogout}
      pageTitle="Data Exports"
      breadcrumb="Data"
    >
      {/* Feedback Alert */}
      {errorMessage && (
        <div className="mb-4 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl p-3.5 flex items-center gap-3 text-xs text-[#B91C1C] animate-fade-in">
          <AlertCircle size={16} className="flex-shrink-0 text-[#DC2626]" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Top Banner: Explaining Export Types vs Graphs */}
      <div className="mb-6 bg-white border border-[#E9E8F2] rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Export Research Datasets</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F8F3] text-[#2D7A61] border border-[#BCE8DB]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4A9B7F] animate-pulse" />
                Live Supabase Database
              </span>
            </div>
            <p className="text-xs text-[#73758C] mt-1 max-w-3xl leading-relaxed">
              Export authentic participant records, fine-grained telemetry logs, and participant-level summaries. For aggregated condition means and cohort-level chart datasets, visit{' '}
              <button onClick={() => navigate('admin-graphs' as Page)} className="text-[#6567C9] font-bold underline hover:text-[#5254A8] cursor-pointer">
                Graphs &amp; Research Insights
              </button>.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
            <button
              onClick={loadCounts}
              disabled={loadingCounts}
              className="p-2 rounded-lg border border-[#E9E8F2] text-[#73758C] hover:text-[#252640] hover:bg-[#F8F8FC] transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh database record counts"
            >
              <RefreshCw size={14} className={loadingCounts ? 'animate-spin text-[#6567C9]' : ''} />
              <span>Refresh Counts</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#73758C] font-semibold">Format:</span>
              <div className="flex bg-[#F8F8FC] border border-[#E9E8F2] rounded-lg p-1">
                {(['csv', 'xlsx'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-3 py-1 rounded-md text-xs font-bold font-['JetBrains_Mono',monospace] transition-all cursor-pointer ${
                      format === f ? 'bg-white shadow-xs text-[#252640]' : 'text-[#73758C] hover:text-[#252640]'
                    }`}
                  >
                    .{f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend / Distinction Guide */}
        <div className="mt-4 pt-3.5 border-t border-[#F0EFFB] flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-[#4F46E5]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
            <span className="font-semibold">Raw Trial/Move Records:</span>
            <span className="text-[#73758C]">Full telemetry (one row per click, keypress, or presented stimulus).</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#059669]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
            <span className="font-semibold">Summary Results:</span>
            <span className="text-[#73758C]">Calculated metrics (one row per participant or puzzle attempt).</span>
          </div>
        </div>
      </div>

      {/* Export cards by category */}
      {categories.map(cat => {
        const catExports = exports.filter(e => e.category === cat);
        return (
          <div key={cat} className="mb-7">
            <h3 className="text-xs font-bold text-[#73758C] uppercase tracking-widest mb-3.5 font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-2">
              <span>{cat}</span>
              <span className="text-[10px] text-[#9597AB] font-normal normal-case">({catExports.length} datasets)</span>
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {catExports.map(exp => {
                const liveCount = rowCounts[exp.id];
                const countBadge =
                  liveCount !== undefined
                    ? `${liveCount.toLocaleString()} ${liveCount === 1 ? 'record' : 'records'} in database`
                    : 'Querying database...';

                return (
                  <div
                    key={exp.id}
                    className="bg-white rounded-xl border border-[#E9E8F2] p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:border-[#C5C1F1] transition-all"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: exp.bg }}
                          >
                            <FileText size={18} style={{ color: exp.color }} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif] leading-snug">
                              {exp.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  exp.typeTag === 'raw'
                                    ? 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]'
                                    : 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                                }`}
                              >
                                {exp.dataClassification}
                              </span>
                              <span className="text-[11px] font-semibold text-[#73758C] font-['JetBrains_Mono',monospace]">
                                Formats: CSV · Excel
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="text-xs font-bold font-['JetBrains_Mono',monospace] text-[#6567C9] bg-[#EDEAF8] px-2 py-1 rounded-md flex-shrink-0">
                          .{format}
                        </span>
                      </div>

                      {/* Card Explanation Body */}
                      <div className="space-y-2.5 my-3.5 text-xs">
                        <div className="bg-[#F8F8FC] border border-[#F0EFFB] rounded-lg p-2.5">
                          <span className="font-bold text-[#252640] block mb-0.5">What one row represents:</span>
                          <span className="text-[#4B5563] leading-relaxed">{exp.oneRowRepresents}</span>
                        </div>

                        <div>
                          <span className="font-bold text-[#252640] block mb-0.5">Useful for:</span>
                          <p className="text-[#6B7280] leading-relaxed">{exp.usefulFor}</p>
                        </div>

                        <div>
                          <span className="font-bold text-[#252640] block mb-1">Main columns included:</span>
                          <div className="flex flex-wrap gap-1">
                            {exp.columnsList.map(col => (
                              <code
                                key={col}
                                className="text-[10.5px] font-['JetBrains_Mono',monospace] bg-[#F1F5F9] text-[#475569] px-1.5 py-0.5 rounded border border-[#E2E8F0]"
                              >
                                {col}
                              </code>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Live Record Count, Filename, & Download Button */}
                    <div className="pt-3.5 border-t border-[#F0EFFB] mt-2">
                      <div className="flex items-center justify-between text-xs mb-3 gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#059669]">
                          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                          <span>{countBadge}</span>
                        </div>
                        <div className="text-[11px] text-[#6B7280] font-['JetBrains_Mono',monospace] truncate max-w-xs" title={`${exp.filenamePrefix}.${format}`}>
                          File: <span className="text-[#6567C9]">{exp.filenamePrefix}.{format}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownload(exp)}
                        disabled={downloading === exp.id}
                        className={`w-full py-2.5 rounded-lg text-xs font-bold font-['Plus_Jakarta_Sans',sans-serif] flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          downloaded.has(exp.id)
                            ? 'bg-[#D1EDE5] text-[#4A9B7F]'
                            : downloading === exp.id
                            ? 'bg-[#EDEAF8] text-[#6567C9] cursor-wait'
                            : 'bg-[#F8F8FC] text-[#252640] border border-[#E9E8F2] hover:border-[#6567C9] hover:bg-[#EDEAF8] hover:text-[#6567C9]'
                        }`}
                      >
                        {downloaded.has(exp.id) ? (
                          <><CheckCircle size={14} /> Downloaded ({format.toUpperCase()})</>
                        ) : downloading === exp.id ? (
                          <><span className="w-3.5 h-3.5 border-2 border-[#6567C9]/30 border-t-[#6567C9] rounded-full animate-spin" /> Querying Supabase...</>
                        ) : (
                          <><Download size={14} /> Download .{format} ({exp.typeTag === 'raw' ? 'Raw Telemetry' : 'Summary Scores'})</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Data dictionary */}
      <div className="bg-white rounded-2xl border border-[#E9E8F2] shadow-2xs">
        <button
          onClick={() => setExpandedDict(!expandedDict)}
          className="w-full flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Database size={18} className="text-[#6567C9]" />
            <div className="text-left">
              <div className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Data Dictionary &amp; Column Definitions</div>
              <div className="text-xs text-[#73758C] mt-0.5">Measurement units, scoring formulas, and variable semantics</div>
            </div>
          </div>
          {expandedDict ? <ChevronUp size={16} className="text-[#73758C]" /> : <ChevronDown size={16} className="text-[#73758C]" />}
        </button>

        {expandedDict && (
          <div className="px-4 sm:px-6 pb-6 border-t border-[#E9E8F2] pt-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                {
                  section: 'Tower of Hanoi',
                  fields: [
                    ['valid_moves', 'Number of legal moves completed according to rules'],
                    ['invalid_moves', 'Recorded attempts to place a larger disc on a smaller disc'],
                    ['completion_time_ms', 'Time in ms from presentation to successful completion (null if uncompleted)'],
                    ['elapsed_time_ms', 'Total elapsed session time on puzzle attempt in milliseconds'],
                    ['first_reaction_ms', 'Planning time in ms from puzzle presentation to first disc pick attempt'],
                    ['outcome', '"Completed" | "Move Limit Reached" | "Abandoned"'],
                  ],
                },
                {
                  section: 'Backward Corsi Block Task',
                  fields: [
                    ['max_level', 'Highest level reached with at least 4/6 correct (1–8)'],
                    ['sequence_length', 'Block count in max-level sequence (= max_level + 1)'],
                    ['product_score', 'Working memory index: max_completed_span × correct_trials_at_max_span'],
                    ['trial_accuracy', 'Proportion (%) of fully correct trials across the protocol'],
                    ['is_correct', 'Boolean: exact reverse sequence reproduced without error'],
                  ],
                },
                {
                  section: 'Stroop Task',
                  fields: [
                    ['congruent_mean_rt_ms', 'Mean reaction time (ms) for correctly answered congruent trials (word matches ink color)'],
                    ['incongruent_mean_rt_ms', 'Mean reaction time (ms) for correctly answered incongruent trials (word differs from ink color)'],
                    ['stroop_effect_ms', 'Inhibition interference: incongruent_mean_rt_ms − congruent_mean_rt_ms on correct trials'],
                    ['congruent_accuracy', 'Percentage of correct responses in congruent trials'],
                    ['incongruent_accuracy', 'Percentage of correct responses in incongruent trials'],
                  ],
                },
                {
                  section: 'Task Switching',
                  fields: [
                    ['pure_letter_rt_ms', 'Mean reaction time (ms) for pure letter classification block'],
                    ['pure_number_rt_ms', 'Mean reaction time (ms) for pure number classification block'],
                    ['mixed_repeat_rt_ms', 'Mean reaction time (ms) for task repeat trials within mixed block'],
                    ['mixed_switch_rt_ms', 'Mean reaction time (ms) for task switch trials within mixed block'],
                    ['switch_cost_ms', 'Cognitive switch cost: mixed_switch_rt_ms − mixed_repeat_rt_ms'],
                  ],
                },
              ].map(({ section, fields }) => (
                <div key={section}>
                  <h4 className="text-xs font-bold text-[#252640] mb-3 font-['Plus_Jakarta_Sans',sans-serif] uppercase tracking-wider">{section}</h4>
                  <div className="space-y-2">
                    {fields.map(([col, def]) => (
                      <div key={col} className="flex flex-col xs:flex-row xs:items-start gap-1 xs:gap-3 text-xs">
                        <code className="text-[#6567C9] font-['JetBrains_Mono',monospace] bg-[#EDEAF8] px-2 py-0.5 rounded flex-shrink-0 self-start break-all">
                          {col}
                        </code>
                        <span className="text-[#73758C] leading-relaxed">{def}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 text-xs text-[#2D7A61] bg-[#E8F8F3] border border-[#BCE8DB] rounded-xl p-3.5 mt-6 font-['Plus_Jakarta_Sans',sans-serif]">
        <CheckCircle size={15} className="text-[#4A9B7F] flex-shrink-0" />
        <span>
          All exports pull authentic research data from live Supabase tables and analytical views. Participant IDs are mapped to standard research codes (<code className="font-['JetBrains_Mono',monospace]">ML-xxxx</code>) and all raw timestamps and reaction times are preserved.
        </span>
      </div>
    </AdminLayout>
  );
}
