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
      setError('Please enter your Participant ID or Full Name / Username.');
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
        setError(res.error || 'No active session found matching this Participant ID or Username.');
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
        className="absolute inset-0 bg-[#111C23]/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white dark:bg-[#203541] rounded-3xl p-6 sm:p-8 max-w-md w-full mx-auto shadow-2xl animate-slide-up border border-[#C5DCE4] dark:border-[#2D4654] max-h-[90vh] overflow-y-auto transition-colors">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#526E7B] hover:text-[#263B46] dark:text-[#9BB5C4] dark:hover:text-[#EAF4F8] p-1.5 rounded-xl hover:bg-[#D5E8EF] dark:hover:bg-[#192831] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 bg-[#D5E8EF] dark:bg-[#192831] rounded-2xl flex items-center justify-center text-[#4D91AD] dark:text-[#63B8C6] flex-shrink-0 shadow-2xs">
            <RotateCcw size={20} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif]">
              Resume Session
            </h3>
            <p className="text-xs text-[#526E7B] dark:text-[#9BB5C4]">
              Pick up right where you left off
            </p>
          </div>
        </div>

        {/* Stored Local Session Quick Restore Banner */}
        {localSession && (
          <div className="mb-5 p-4 rounded-2xl bg-[#EAF4F8] dark:bg-[#192831] border border-[#C5DCE4] dark:border-[#2D4654]">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#4D91AD] dark:text-[#63B8C6] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif]">
                  Active Browser Session Found
                </div>
                <div className="text-xs text-[#526E7B] dark:text-[#9BB5C4] mt-0.5">
                  Participant: <span className="font-semibold text-[#263B46] dark:text-[#EAF4F8]">{localSession.name}</span> ({localSession.id})
                </div>
                <button
                  type="button"
                  onClick={handleResumeLocal}
                  className="mt-3 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#4D91AD] to-[#63B8C6] hover:brightness-105 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <span>Quick Resume Session</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input Form for Participant ID / Name */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#263B46] dark:text-[#EAF4F8] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif] mb-2">
              Participant ID or Full Name / Username
            </label>
            <input
              type="text"
              placeholder="e.g. ML-1001 or Username"
              value={identifier}
              onChange={e => {
                setIdentifier(e.target.value);
                if (error) setError(null);
              }}
              className="ml-input"
              autoFocus={!localSession}
            />
            <p className="text-[11px] text-[#526E7B] dark:text-[#9BB5C4] mt-1.5">
              Enter the exact participant code (e.g. ML-4821) or username used during registration.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 justify-center py-2.5 text-xs sm:text-sm order-2 sm:order-1 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 justify-center py-2.5 text-xs sm:text-sm order-1 sm:order-2 shadow-md cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Find & Resume</span>
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
