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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSession, setLocalSession] = useState<{ id: string; name: string; email?: string; sessionId: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const stored = getStoredSessionContext();
      if (stored && stored.participantData) {
        setLocalSession({
          id: stored.participantCode || stored.participantData.id,
          name: stored.participantData.name,
          email: stored.participantData.email,
          sessionId: stored.sessionId,
        });
        if (!name) {
          setName(stored.participantData.name);
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
    if (!name.trim()) {
      setError('Please enter your Name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter your registered Email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await resumeParticipantSession(name.trim(), email.trim());
      if (res.success && res.participant && res.sessionId) {
        onResume(res.participant, res.sessionId);
        onClose();
      } else {
        setError(res.error || 'No active session found matching this Name and Email address.');
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
        className="absolute inset-0 bg-[#0B0E23]/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white dark:bg-[#131B2E] rounded-3xl p-6 sm:p-8 max-w-md w-full mx-auto shadow-2xl animate-slide-up border border-[#E9E8F2] dark:border-[#22304F] max-h-[90vh] overflow-y-auto transition-colors">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#9597AB] hover:text-[#252640] dark:hover:text-white p-1.5 rounded-xl hover:bg-[#F8F8FC] dark:hover:bg-[#1E293B] transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 bg-[#EDEAF8] dark:bg-[#6D5AE6]/20 rounded-2xl flex items-center justify-center text-[#6D5AE6] dark:text-[#A5B4FC] flex-shrink-0 shadow-xs">
            <RotateCcw size={20} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#252640] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              Resume Session
            </h3>
            <p className="text-xs text-[#73758C] dark:text-[#94A3B8] font-medium">
              Enter your name and registered email to continue
            </p>
          </div>
        </div>

        {/* Local Session Quick Resume Card */}
        {localSession && (
          <div className="bg-[#F8F8FC] dark:bg-[#1A243D] border border-[#E9E8F2] dark:border-[#2A374F] rounded-2xl p-3.5 sm:p-4 mb-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-[#6D5AE6] dark:text-[#A5B4FC] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                Saved on this device
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#252640] dark:text-white truncate font-['Plus_Jakarta_Sans',sans-serif]">
                {localSession.name}
              </div>
              {localSession.email && (
                <div className="text-[11px] text-[#73758C] dark:text-[#94A3B8] truncate">
                  {localSession.email}
                </div>
              )}
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
          <div className="bg-[#FEF2F2] dark:bg-[#450A0A]/40 border border-[#FCA5A5] dark:border-[#7F1D1D] rounded-xl p-3 mb-4 flex items-start gap-2.5 text-xs text-[#DC2626] dark:text-[#F87171]">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {/* Resume Form: Name & Email ONLY */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#252640] dark:text-[#E2E8F0] font-['Plus_Jakarta_Sans',sans-serif] mb-1.5">
              Full Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sarah Connor"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E8F2] dark:border-[#2A374F] bg-white dark:bg-[#162036] focus:border-[#6D5AE6] focus:ring-2 focus:ring-[#6D5AE6]/20 text-sm text-[#252640] dark:text-white font-medium placeholder:text-[#9597AB] dark:placeholder:text-[#64748B] transition-all font-['Plus_Jakarta_Sans',sans-serif]"
            />
            <p className="text-[11px] text-[#9597AB] dark:text-[#64748B] mt-1">
              The name you entered when registering for the study.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#252640] dark:text-[#E2E8F0] font-['Plus_Jakarta_Sans',sans-serif] mb-1.5">
              Registered Email Address <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. participant@university.edu"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9E8F2] dark:border-[#2A374F] bg-white dark:bg-[#162036] focus:border-[#6D5AE6] focus:ring-2 focus:ring-[#6D5AE6]/20 text-sm text-[#252640] dark:text-white font-medium placeholder:text-[#9597AB] dark:placeholder:text-[#64748B] transition-all font-['Plus_Jakarta_Sans',sans-serif]"
            />
            <p className="text-[11px] text-[#9597AB] dark:text-[#64748B] mt-1">
              Your registered email will safely restore your ongoing research session.
            </p>
          </div>

          {/* Privacy Note */}
          <div className="bg-[#EDEAF8]/60 dark:bg-[#1A243D] rounded-xl p-3 border border-[#C5C1F1]/40 dark:border-[#2D3A5D] flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-[#6D5AE6] dark:text-[#A5B4FC] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#555770] dark:text-[#94A3B8] leading-relaxed">
              Resuming restores all completed tasks and ongoing 24-hour interval countdowns directly from the study database.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold font-['Plus_Jakarta_Sans',sans-serif] text-[#73758C] dark:text-[#94A3B8] hover:text-[#252640] dark:hover:text-white hover:bg-[#F8F8FC] dark:hover:bg-[#1E293B] border border-[#E9E8F2] dark:border-[#2A374F] transition-all"
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
