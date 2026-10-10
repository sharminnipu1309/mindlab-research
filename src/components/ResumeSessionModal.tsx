import { useState, useEffect } from 'react';
import { ParticipantSession } from '../types';
import {
  resumeParticipantSession,
  getStoredSessionContext,
  normalizeParticipantCode,
} from '../services/participantService';
import { X, RotateCcw, ArrowRight, UserCheck, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onResume: (participant: ParticipantSession, sessionId: string) => void;
}

export default function ResumeSessionModal({ isOpen, onClose, onResume }: Props) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSession, setLocalSession] = useState<{ id: string; name: string; sessionId: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const stored = getStoredSessionContext();
      if (stored && stored.participantData) {
        setLocalSession({
          id: stored.participantCode || stored.participantData.id,
          name: stored.participantData.name,
          sessionId: stored.sessionId,
        });
        if (!code) {
          setCode(stored.participantCode || stored.participantData.id);
          setName(stored.participantData.name.split(' ')[0]);
          if (stored.participantData.email) {
            setEmail(stored.participantData.email);
          }
        }
      } else {
        setLocalSession(null);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      setError('Please enter your Participant ID.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your First Name for privacy verification.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await resumeParticipantSession(code, name, email);
      if (res.success && res.participant && res.sessionId) {
        onResume(res.participant, res.sessionId);
        onClose();
      } else {
        setError(res.error || 'Participant ID or verification name is incorrect.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeLocal = () => {
    const stored = getStoredSessionContext();
    if (stored && stored.participantData && stored.sessionId) {
      onResume(stored.participantData, stored.sessionId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0B0E23]/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full mx-auto shadow-2xl animate-slide-up border border-[#E9E8F2] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#9597AB] hover:text-[#252640] p-1.5 rounded-xl hover:bg-[#F8F8FC] transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 bg-[#EDEAF8] rounded-2xl flex items-center justify-center text-[#6D5AE6] flex-shrink-0 shadow-xs">
            <RotateCcw size={20} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">
              Resume Session
            </h3>
            <p className="text-xs text-[#73758C] font-medium">
              Continue your cognitive research challenges
            </p>
          </div>
        </div>

        {/* Local Session Quick Resume Card */}
        {localSession && (
          <div className="bg-[#F8F8FC] border border-[#E9E8F2] rounded-2xl p-3.5 sm:p-4 mb-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-[#6D5AE6] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                Active on this device
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#252640] truncate font-['Plus_Jakarta_Sans',sans-serif]">
                {localSession.name}
              </div>
              <div className="text-[11px] font-mono font-semibold text-[#73758C]">
                {localSession.id}
              </div>
            </div>
            <button
              type="button"
              onClick={handleResumeLocal}
              className="px-3 py-2 rounded-xl text-xs font-bold font-['Plus_Jakarta_Sans',sans-serif] bg-[#6D5AE6] text-white hover:bg-[#5B48D9] flex items-center gap-1.5 flex-shrink-0 shadow-xs transition-all"
            >
              <span>Resume</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl p-3 mb-4 flex items-start gap-2.5 text-xs text-[#DC2626]">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {/* Resume Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif] mb-1.5">
              Participant ID <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={e => setCode(normalizeParticipantCode(e.target.value))}
                placeholder="e.g. ML-1042"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E8F2] focus:border-[#6D5AE6] focus:ring-2 focus:ring-[#6D5AE6]/20 font-['JetBrains_Mono',monospace] text-sm text-[#252640] font-semibold placeholder:text-[#9597AB] placeholder:font-normal transition-all"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-[#9597AB] mt-1">
              Enter the 4-digit ID or full code assigned when you first registered.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif] mb-1.5">
              First Name <span className="text-[#DC2626]">*</span> <span className="text-[#9597AB] font-normal">(Privacy Verification)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sarah"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E8F2] focus:border-[#6D5AE6] focus:ring-2 focus:ring-[#6D5AE6]/20 text-sm text-[#252640] font-medium placeholder:text-[#9597AB] transition-all font-['Plus_Jakarta_Sans',sans-serif]"
            />
            <p className="text-[11px] text-[#9597AB] mt-1">
              Verifies session ownership without exposing personal information.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif] mb-1.5">
              Registered Email Address <span className="text-[#9597AB] font-normal">(Required for cross-device resume)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. participant@university.edu"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E8F2] focus:border-[#6D5AE6] focus:ring-2 focus:ring-[#6D5AE6]/20 text-sm text-[#252640] font-medium placeholder:text-[#9597AB] transition-all font-['Plus_Jakarta_Sans',sans-serif]"
            />
            <p className="text-[11px] text-[#9597AB] mt-1">
              Protects your session when resuming from another phone, laptop, or browser.
            </p>
          </div>

          {/* Privacy & Anti-Tamper Note */}
          <div className="bg-[#EDEAF8]/50 rounded-xl p-3 border border-[#C5C1F1]/40 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-[#6D5AE6] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#555770] leading-relaxed">
              MindLab never exposes email addresses or research records through participant lookups. Rate limiting protects your participant profile from unauthorized access.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#73758C] hover:text-[#252640] hover:bg-[#F8F8FC] border border-[#E9E8F2] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-['Plus_Jakarta_Sans',sans-serif] bg-[#6D5AE6] hover:bg-[#5B48D9] text-white flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <span>Resume</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
