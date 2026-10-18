import { useState, useEffect } from 'react';
import { ParticipantSession } from '../types';
import {
  resumeParticipantSession,
  getStoredSessionContext,
} from '../services/participantService';
import { X, RotateCcw, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onResume: (participant: ParticipantSession, sessionId: string) => void;
}

export default function ResumeSessionModal({ isOpen, onClose, onResume }: Props) {
  const [identifier, setIdentifier] = useState('');
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
        if (!identifier) {
          setIdentifier(stored.participantCode || stored.participantData.id || stored.participantData.name);
        }
      } else {
        setLocalSession(null);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your Participant ID or Full Name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await resumeParticipantSession(identifier.trim());
      if (res.success && res.participant && res.sessionId) {
        onResume(res.participant, res.sessionId);
        onClose();
      } else {
        setError(res.error || 'No active session found matching this Participant ID or Name.');
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
        className="absolute inset-0 bg-[#1D221E]/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white dark:bg-[#354238] rounded-3xl p-6 sm:p-8 max-w-md w-full mx-auto shadow-2xl animate-slide-up border border-[#BAC8BD] dark:border-[#445448] max-h-[90vh] overflow-y-auto transition-colors">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#47564A] hover:text-[#282E28] dark:text-[#B6C7B8] dark:hover:text-[#D7E0D8] p-1.5 rounded-xl hover:bg-[#E4EBE5] dark:hover:bg-[#282E28] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 bg-[#E4EBE5] dark:bg-[#282E28] rounded-2xl flex items-center justify-center text-[#282E28] dark:text-[#A3B9A5] flex-shrink-0 shadow-2xs">
            <RotateCcw size={20} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif]">
              Resume Session
            </h3>
            <p className="text-xs text-[#47564A] dark:text-[#B6C7B8] font-medium">
              Enter your Participant ID or Name to continue
            </p>
          </div>
        </div>

        {/* Local Session Quick Resume Card */}
        {localSession && (
          <div className="bg-[#E4EBE5] dark:bg-[#282E28] border border-[#CAD5CC] dark:border-[#445448] rounded-2xl p-3.5 sm:p-4 mb-5 flex items-center justify-between gap-3 shadow-2xs">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-[#354238] dark:text-[#A3B9A5] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                Saved on this device
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#282E28] dark:text-[#D7E0D8] truncate font-['Plus_Jakarta_Sans',sans-serif]">
                {localSession.name}
              </div>
              <div className="text-[11px] font-mono text-[#47564A] dark:text-[#B6C7B8] truncate">
                ID: {localSession.id}
              </div>
            </div>
            <button
              type="button"
              onClick={handleResumeLocal}
              className="px-3 py-2 rounded-xl text-xs font-bold font-['Plus_Jakarta_Sans',sans-serif] bg-[#282E28] text-[#D7E0D8] hover:bg-[#354238] dark:bg-[#A3B9A5] dark:text-[#1D221E] dark:hover:bg-[#D7E0D8] flex items-center gap-1.5 flex-shrink-0 shadow-2xs transition-all cursor-pointer"
            >
              <span>Resume</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="bg-[#FEF2F2] dark:bg-[#450A0A]/40 border border-[#FCA5A5] dark:border-[#7F1D1D] rounded-xl p-3 mb-4 flex items-start gap-2.5 text-xs text-[#DC2626] dark:text-[#F87171]">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {/* Resume Form: Participant ID or Full Name */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] mb-1.5">
              Participant ID or Full Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="e.g. ML-1234 or your Full Name"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#BAC8BD] dark:border-[#445448] bg-white dark:bg-[#1D221E] focus:border-[#282E28] dark:focus:border-[#A3B9A5] focus:ring-2 focus:ring-[#354238]/20 dark:focus:ring-[#A3B9A5]/20 text-sm text-[#282E28] dark:text-[#D7E0D8] font-medium placeholder:text-[#647366] dark:placeholder:text-[#8F9E91] transition-all font-['Plus_Jakarta_Sans',sans-serif] outline-none"
            />
            <p className="text-[11px] text-[#47564A] dark:text-[#B6C7B8] mt-1">
              Enter your assigned Participant ID or the name you registered with.
            </p>
          </div>

          {/* Privacy Note */}
          <div className="bg-[#E4EBE5] dark:bg-[#282E28] rounded-xl p-3 border border-[#CAD5CC] dark:border-[#445448] flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-[#354238] dark:text-[#A3B9A5] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#47564A] dark:text-[#B6C7B8] leading-relaxed">
              Resuming safely restores your active session, completed tasks, and research progress directly from the study database.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#47564A] dark:text-[#B6C7B8] hover:text-[#282E28] dark:hover:text-[#D7E0D8] hover:bg-[#E4EBE5] dark:hover:bg-[#282E28] border border-[#BAC8BD] dark:border-[#445448] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-['Plus_Jakarta_Sans',sans-serif] bg-[#282E28] hover:bg-[#354238] text-[#D7E0D8] dark:bg-[#A3B9A5] dark:hover:bg-[#D7E0D8] dark:text-[#1D221E] flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Resuming...</span>
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
