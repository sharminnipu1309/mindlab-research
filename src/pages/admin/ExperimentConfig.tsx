import { useState, useEffect } from 'react';
import {
  Page,
  DEFAULT_HANOI_PUZZLES,
  ExperimentSessionOptions,
  DataMeasurementsConfig,
  DEFAULT_SESSION_OPTIONS,
  DEFAULT_DATA_MEASUREMENTS,
} from '../../types';
import AdminLayout from '../../components/AdminLayout';
import { Save, AlertTriangle, CheckCircle, Info, ToggleLeft, ToggleRight, ChevronUp, ChevronDown } from 'lucide-react';
import {
  fetchExperimentSessionOptions,
  saveExperimentSessionOptions,
  fetchDataMeasurementsConfig,
  saveDataMeasurementsConfig,
  fetchHanoiPuzzlesConfig,
  saveHanoiPuzzlesConfig,
} from '../../services/adminService';

interface Props {
  navigate: (page: Page) => void;
  onLogout: () => void;
  currentPage: Page;
}

type TabId = 'general' | 'hanoi' | 'corsi' | 'data';

export default function ExperimentConfig({ navigate, onLogout, currentPage }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [puzzles, setPuzzles] = useState(DEFAULT_HANOI_PUZZLES);
  const [corsiConfig, setCorsiConfig] = useState({
    highlightDuration: 500,
    interBlockPause: 500,
    trialsPerLevel: 6,
    requiredCorrect: 4,
  });
  const [sessionOptions, setSessionOptions] = useState<ExperimentSessionOptions>(DEFAULT_SESSION_OPTIONS);
  const [dataMeasurements, setDataMeasurements] = useState<DataMeasurementsConfig>(DEFAULT_DATA_MEASUREMENTS);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchExperimentSessionOptions(),
      fetchDataMeasurementsConfig(),
      fetchHanoiPuzzlesConfig(),
    ]).then(([opts, dm, pz]) => {
      setSessionOptions(opts);
      setDataMeasurements(dm);
      setPuzzles(pz);
    }).catch(err => {
      console.warn('Error loading experiment configs on mount:', err);
    });
  }, []);

  const fiveDiskActive = puzzles.filter(p => p.diskCount === 5 && p.enabled).length;

  const togglePuzzle = (idx: number) => {
    const p = puzzles[idx];
    if (p.diskCount === 5 && p.enabled && fiveDiskActive <= 1) return;
    const updated = puzzles.map((pz, i) => i === idx ? { ...pz, enabled: !pz.enabled } : pz);
    setPuzzles(updated);
    setUnsaved(true);
  };

  const updateMoveLimit = (idx: number, val: number) => {
    const cleanVal = isNaN(val) ? 1 : Math.max(1, Math.min(500, Math.round(val)));
    const updated = puzzles.map((pz, i) => i === idx ? { ...pz, moveLimit: cleanVal } : pz);
    setPuzzles(updated);
    setUnsaved(true);
  };

  const movePuzzle = (idx: number, dir: -1 | 1) => {
    const newPuzzles = [...puzzles];
    const swap = idx + dir;
    if (swap < 0 || swap >= newPuzzles.length) return;
    [newPuzzles[idx], newPuzzles[swap]] = [newPuzzles[swap], newPuzzles[idx]];
    setPuzzles(newPuzzles.map((p, i) => ({ ...p, puzzleIndex: i })));
    setUnsaved(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const [sessOk, dataOk, hanoiOk] = await Promise.all([
        saveExperimentSessionOptions(sessionOptions),
        saveDataMeasurementsConfig(dataMeasurements),
        saveHanoiPuzzlesConfig(puzzles),
      ]);
      if (sessOk && dataOk && hanoiOk) {
        setSavedSuccess(true);
        setUnsaved(false);
        setSaveError(null);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setSaveError('Failed to persist configuration to database. Changes remain unsaved.');
        setUnsaved(true);
      }
    } catch (err: any) {
      setSaveError(err?.message || 'An unexpected error occurred while saving.');
      setUnsaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const diskColor: Record<number, string> = { 3: '#A9A2E8', 4: '#6567C9', 5: '#252640' };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'general', label: 'General Settings' },
    { id: 'hanoi', label: 'Tower of Hanoi' },
    { id: 'corsi', label: 'Backward Corsi' },
    { id: 'data', label: 'Data Collection' },
  ];

  return (
    <AdminLayout
      currentPage={currentPage}
      navigate={navigate}
      onLogout={onLogout}
      pageTitle="Experiment Configuration"
      breadcrumb="Experiments"
    >
      {/* Tab bar */}
      <div className="flex flex-wrap sm:flex-nowrap gap-1 bg-white rounded-xl border border-[#E9E8F2] p-1.5 mb-6 max-w-full sm:max-w-lg">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 min-w-[120px] sm:min-w-0 py-2 px-3 rounded-lg text-xs font-semibold font-['Plus_Jakarta_Sans',sans-serif] transition-all text-center ${
              activeTab === id
                ? 'bg-[#6567C9] text-white shadow-sm'
                : 'text-[#73758C] hover:text-[#252640] hover:bg-[#F8F8FC]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Save banner / Error banner */}
      {saveError && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl mb-5 border bg-[#FCE8E6] border-[#D93025]/30">
          <div className="flex items-center gap-2 text-sm text-[#D93025]">
            <AlertTriangle size={15} className="text-[#D93025] flex-shrink-0" />
            <span className="font-medium">{saveError}</span>
          </div>
          <button
            onClick={() => setSaveError(null)}
            className="text-xs font-semibold text-[#D93025] hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {(unsaved || savedSuccess) && (
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl mb-5 border ${
          savedSuccess ? 'bg-[#D1EDE5] border-[#4A9B7F]/20' : 'bg-[#FCEFD9] border-[#F0CFA0]'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            {savedSuccess
              ? <><CheckCircle size={15} className="text-[#4A9B7F]" /> <span className="font-medium text-[#252640]">Configuration saved successfully</span></>
              : <><AlertTriangle size={15} className="text-[#D4813A]" /> <span className="font-medium text-[#252640]">You have unsaved changes</span></>
            }
          </div>
          {unsaved && (
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => { setPuzzles(DEFAULT_HANOI_PUZZLES); setUnsaved(false); setSaveError(null); }} className="btn-ghost text-xs py-1.5 flex-1 sm:flex-initial">Discard</button>
              <button onClick={handleSave} disabled={isSaving} className="btn-primary text-xs py-1.5 px-4 flex-1 sm:flex-initial justify-center">
                <Save size={13} className={isSaving ? 'animate-spin' : ''} /> {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* General tab */}
      {activeTab === 'general' && (
        <div className="space-y-5 max-w-2xl">
          <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-7">
            <h3 className="text-sm font-bold text-[#252640] mb-5 font-['Plus_Jakarta_Sans',sans-serif]">Study Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Study title</label>
                <input
                  value={sessionOptions.studyTitle || ''}
                  onChange={e => {
                    setSessionOptions(prev => ({ ...prev, studyTitle: e.target.value }));
                    setUnsaved(true);
                  }}
                  className="ml-input text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Researcher name</label>
                <input
                  value={sessionOptions.researcherName || ''}
                  onChange={e => {
                    setSessionOptions(prev => ({ ...prev, researcherName: e.target.value }));
                    setUnsaved(true);
                  }}
                  className="ml-input text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Ethics reference</label>
                <input
                  value={sessionOptions.ethicsReference || ''}
                  onChange={e => {
                    setSessionOptions(prev => ({ ...prev, ethicsReference: e.target.value }));
                    setUnsaved(true);
                  }}
                  className="ml-input text-sm font-['JetBrains_Mono',monospace]"
                />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-7">
            <h3 className="text-sm font-bold text-[#252640] mb-5 font-['Plus_Jakarta_Sans',sans-serif]">Session Options</h3>
            {[
              {
                id: 'allowMidSessionExit' as const,
                label: 'Allow participants to exit mid-session',
                desc: 'Controls whether the "Exit" button is visible in participant rooms',
                checked: sessionOptions.allowMidSessionExit,
              },
              {
                id: 'recordInvalidMoves' as const,
                label: 'Record invalid move attempts',
                desc: 'Tracks and persists illegal disk move attempts during Tower of Hanoi',
                checked: sessionOptions.recordInvalidMoves,
              },
              {
                id: 'showTimer' as const,
                label: 'Show timer to participants',
                desc: 'Displays the live elapsed timer in the participant HUD during experiments',
                checked: sessionOptions.showTimer,
              },
              {
                id: 'showMoveCounter' as const,
                label: 'Show move counter to participants',
                desc: 'Displays moves count and remaining moves HUD counter during Tower of Hanoi',
                checked: sessionOptions.showMoveCounter,
              },
            ].map(({ id, label, desc, checked }) => (
              <div key={id} className="flex items-center justify-between py-3.5 border-b border-[#F3F2FA] last:border-0">
                <div>
                  <div className="text-sm font-medium text-[#252640]">{label}</div>
                  <div className="text-xs text-[#9597AB] mt-0.5">{desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSessionOptions(prev => ({ ...prev, [id]: !prev[id] }));
                    setUnsaved(true);
                  }}
                  className={`cursor-pointer transition-colors p-1 ${checked ? 'text-[#6567C9]' : 'text-[#C5C1F1]'}`}
                  aria-label={`Toggle ${label}`}
                >
                  {checked ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hanoi tab */}
      {activeTab === 'hanoi' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Puzzle list */}
          <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl border border-[#E9E8F2] overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-[#E9E8F2] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Puzzle Sequence</h3>
                <p className="text-xs text-[#73758C] mt-0.5">
                  {puzzles.filter(p => p.enabled).length} of {puzzles.length} puzzles active
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#D4813A] bg-[#FCEFD9] px-3 py-1.5 rounded-lg w-fit">
                <AlertTriangle size={12} />
                At least one 5-disc puzzle required
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Discs</th>
                    <th>Move limit</th>
                    <th>Status</th>
                    <th>Order</th>
                  </tr>
                </thead>
                <tbody>
                  {puzzles.map((p, i) => (
                    <tr key={i} className={!p.enabled ? 'opacity-50' : ''}>
                      <td>
                        <span className="font-['JetBrains_Mono',monospace] text-xs text-[#73758C]">
                          Puzzle {i + 1}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: diskColor[p.diskCount] }}
                          />
                          <span className="text-sm font-semibold font-['JetBrains_Mono',monospace]">{p.diskCount}</span>
                          <span className="text-xs text-[#9597AB]">discs</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={p.moveLimit}
                            onChange={e => updateMoveLimit(i, Number(e.target.value))}
                            disabled={!p.enabled}
                            className="w-16 ml-input text-center text-sm py-1.5 font-['JetBrains_Mono',monospace]"
                            min={1}
                          />
                          <span className="text-xs text-[#9597AB]">moves</span>
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => togglePuzzle(i)}
                          disabled={p.diskCount === 5 && p.enabled && fiveDiskActive <= 1}
                          className={`badge cursor-pointer transition-all ${
                            p.enabled ? 'bg-[#D1EDE5] text-[#4A9B7F]' : 'bg-[#F8F8FC] text-[#9597AB] border border-[#E9E8F2]'
                          } disabled:cursor-not-allowed`}
                        >
                          {p.enabled ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            onClick={() => movePuzzle(i, -1)}
                            disabled={i === 0}
                            className="p-1 rounded hover:bg-[#F8F8FC] text-[#73758C] disabled:opacity-30"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => movePuzzle(i, 1)}
                            disabled={i === puzzles.length - 1}
                            className="p-1 rounded hover:bg-[#F8F8FC] text-[#73758C] disabled:opacity-30"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Participant flow preview */}
          <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-6">
            <h3 className="text-sm font-bold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Participant Flow</h3>
            <p className="text-xs text-[#73758C] mb-5">Fixed order for all participants</p>
            <div className="space-y-2">
              {puzzles.filter(p => p.enabled).map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-[#F8F8FC] border border-[#E9E8F2]"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold font-['Plus_Jakarta_Sans',sans-serif] flex-shrink-0"
                    style={{ background: diskColor[p.diskCount] }}
                  >
                    {i + 1}
                  </div>
                  <div className="text-xs text-[#252640]">
                    <span className="font-semibold">{p.diskCount} discs</span>
                    <span className="text-[#9597AB] ml-1">· {p.moveLimit} moves</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#E9E8F2] text-xs text-[#9597AB]">
              <Info size={11} className="inline mr-1" />
              Participants cannot skip or reorder puzzles
            </div>
          </div>
        </div>
      )}

      {/* Corsi tab */}
      {activeTab === 'corsi' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
          <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-6 space-y-5">
            <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Timing Configuration</h3>
            {[
              { label: 'Highlight duration (ms)', key: 'highlightDuration', min: 300, max: 1000, step: 50 },
              { label: 'Inter-block pause (ms)', key: 'interBlockPause', min: 200, max: 1000, step: 50 },
            ].map(({ label, key, min, max, step }) => (
              <div key={key}>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">{label}</label>
                  <span className="text-sm font-bold text-[#6567C9] font-['JetBrains_Mono',monospace]">
                    {corsiConfig[key as keyof typeof corsiConfig]}ms
                  </span>
                </div>
                <input
                  type="range"
                  min={min} max={max} step={step}
                  value={corsiConfig[key as keyof typeof corsiConfig]}
                  onChange={e => { setCorsiConfig(c => ({ ...c, [key]: Number(e.target.value) })); setUnsaved(true); }}
                  className="w-full accent-[#6567C9]"
                />
                <div className="flex justify-between text-[11px] text-[#9597AB] mt-1">
                  <span>{min}ms</span>
                  <span>{max}ms</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#E9E8F2] p-6 space-y-5">
            <h3 className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Progression Rules</h3>
            <div>
              <label className="block text-sm font-semibold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Trials per level</label>
              <input type="number" value={corsiConfig.trialsPerLevel} min={3} max={12}
                onChange={e => { setCorsiConfig(c => ({ ...c, trialsPerLevel: Number(e.target.value) })); setUnsaved(true); }}
                className="ml-input w-24 font-['JetBrains_Mono',monospace]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Required correct to advance</label>
              <input type="number" value={corsiConfig.requiredCorrect} min={1} max={corsiConfig.trialsPerLevel}
                onChange={e => { setCorsiConfig(c => ({ ...c, requiredCorrect: Number(e.target.value) })); setUnsaved(true); }}
                className="ml-input w-24 font-['JetBrains_Mono',monospace]" />
            </div>

            <div className="pt-4 border-t border-[#E9E8F2]">
              <h4 className="text-xs font-bold text-[#73758C] uppercase tracking-wider mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
                Level Sequence
              </h4>
              <div className="space-y-1.5">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="text-[#9597AB] w-14 font-['Plus_Jakarta_Sans',sans-serif]">Level {i + 1}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: i + 2 }, (_, j) => (
                        <div key={j} className="w-4 h-4 rounded bg-[#6567C9]" style={{ opacity: 0.3 + (j / (i + 2)) * 0.7 }} />
                      ))}
                    </div>
                    <span className="text-[#73758C] font-['JetBrains_Mono',monospace]">{i + 2} blocks</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data tab */}
      {activeTab === 'data' && (
        <div className="max-w-2xl space-y-5">
          <div className="bg-white rounded-2xl border border-[#E9E8F2] p-7">
            <h3 className="text-sm font-bold text-[#252640] mb-5 font-['Plus_Jakarta_Sans',sans-serif]">Recorded Measurements</h3>
            {[
              {
                id: 'recordMoveTimestamps' as const,
                label: 'Record Hanoi move reaction times',
                desc: 'Relative millisecond timestamp for each Tower of Hanoi move attempt',
                enabled: dataMeasurements.recordMoveTimestamps,
              },
              {
                id: 'recordFirstMoveRt' as const,
                label: 'First-move reaction time',
                desc: 'Time from puzzle start to first move attempt',
                enabled: dataMeasurements.recordFirstMoveRt,
              },
              {
                id: 'recordInvalidMoveAttempts' as const,
                label: 'Invalid move attempts',
                desc: 'Count and type of invalid move attempts',
                enabled: dataMeasurements.recordInvalidMoveAttempts,
              },
              {
                id: 'recordSessionTimestamps' as const,
                label: 'Record task completion timestamps',
                desc: 'Record completion timestamps when participant finishes each activity and full study battery (session start is always recorded for audit)',
                enabled: dataMeasurements.recordSessionTimestamps,
              },
            ].map(({ id, label, desc, enabled }) => (
              <div key={id} className="flex items-center justify-between py-3.5 border-b border-[#F3F2FA] last:border-0">
                <div>
                  <div className="text-sm font-medium text-[#252640]">{label}</div>
                  <div className="text-xs text-[#9597AB] mt-0.5">{desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDataMeasurements(prev => ({ ...prev, [id]: !prev[id] }));
                    setUnsaved(true);
                  }}
                  className={`cursor-pointer transition-colors p-1 ${enabled ? 'text-[#6567C9]' : 'text-[#C5C1F1]'}`}
                  aria-label={`Toggle ${label}`}
                >
                  {enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save button (bottom) */}
      {unsaved && (
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} className="btn-primary">
            <Save size={15} />
            Save Configuration
          </button>
          <button
            onClick={() => {
              fetchHanoiPuzzlesConfig().then(setPuzzles);
              fetchExperimentSessionOptions().then(setSessionOptions);
              fetchDataMeasurementsConfig().then(setDataMeasurements);
              setUnsaved(false);
            }}
            className="btn-secondary"
          >
            Discard Changes
          </button>
        </div>
      )}
    </AdminLayout>
  );
}
