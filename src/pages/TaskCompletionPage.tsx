import { useState } from 'react';
import { Page, ParticipantSession } from '../types';
import ParticipantNav from '../components/ParticipantNav';
import {
  CheckCircle,
  Layers,
  Grid3X3,
  Heart,
  ArrowRight,
  Mail,
  Sparkles,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import { updateParticipantEmail } from '../services/participantService';

interface Props {
  navigate: (page: Page) => void;
  participant: ParticipantSession;
}

export default function TaskCompletionPage({ navigate, participant }: Props) {
  const [showResultSection, setShowResultSection] = useState(false);
  const [email, setEmail] = useState(participant.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setEmailError('Please enter a valid email format (e.g. name@gmail.com).');
      return;
    }

    setIsSubmitting(true);
    setEmailError(null);
    try {
      await updateParticipantEmail(participant.id, cleanEmail);
      setEmailSubmitted(true);
    } catch {
      setEmailError('Could not save email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EAF4F8] dark:bg-[#111C23] text-[#263B46] dark:text-[#EAF4F8] transition-colors duration-200">
      <ParticipantNav navigate={navigate} participantId={participant.id} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-20 text-center">
        {/* Success illustration */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 sm:mb-8">
          <div
            className="absolute inset-0 bg-[#63B8C6]/30 rounded-full animate-pulse"
            style={{ animationDuration: '2s' }}
          />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-[#4D91AD] to-[#63B8C6] rounded-full flex items-center justify-center animate-pop-in shadow-md">
            <CheckCircle size={38} className="text-white sm:w-11 sm:h-11" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#263B46] dark:text-[#EAF4F8] mb-3 sm:mb-4 font-['Plus_Jakarta_Sans',sans-serif]">
          Session Complete
        </h1>
        <p className="text-base sm:text-lg text-[#526E7B] dark:text-[#9BB5C4] mb-2 font-medium">
          Thank you for participating in this research session, {participant.name.split(' ')[0]}.
        </p>
        <p className="text-xs sm:text-sm text-[#526E7B] dark:text-[#9BB5C4] mb-8 sm:mb-12">
          Your responses have been recorded. Your contribution is valued.
        </p>

        {/* Session summary */}
        <div className="bg-white dark:bg-[#203541] rounded-2xl border border-[#C5DCE4] dark:border-[#2D4654] p-4 sm:p-7 mb-6 sm:mb-8 text-left shadow-sm">
          <h2 className="text-xs sm:text-sm font-bold text-[#263B46] dark:text-[#EAF4F8] uppercase tracking-wider mb-4 sm:mb-5 font-['Plus_Jakarta_Sans',sans-serif]">
            Session Summary
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-[#D5E8EF] dark:bg-[#192831] rounded-xl p-3 sm:p-4 border border-[#C5DCE4] dark:border-[#2D4654]">
              <div className="text-[11px] sm:text-xs text-[#526E7B] dark:text-[#9BB5C4] mb-1">Participant ID</div>
              <div className="text-xs sm:text-sm font-bold text-[#4D91AD] dark:text-[#63B8C6] font-['JetBrains_Mono',monospace] truncate">
                {participant.id}
              </div>
            </div>
            <div className="bg-[#D5E8EF] dark:bg-[#192831] rounded-xl p-3 sm:p-4 border border-[#C5DCE4] dark:border-[#2D4654]">
              <div className="text-[11px] sm:text-xs text-[#526E7B] dark:text-[#9BB5C4] mb-1">Activities completed</div>
              <div className="text-xs sm:text-sm font-bold text-[#263B46] dark:text-[#EAF4F8] font-['JetBrains_Mono',monospace]">
                {(participant.hanoiCompleted ? 1 : 0) +
                  (participant.corsiCompleted ? 1 : 0) +
                  (participant.stroopCompleted ? 1 : 0) +
                  (participant.taskSwitchingCompleted ? 1 : 0)}{' '}
                / 4
              </div>
            </div>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {/* Tower of Hanoi */}
            <div
              className={`p-3 sm:p-4 rounded-xl border ${
                participant.hanoiCompleted
                  ? 'bg-[#D5E8EF] dark:bg-[#192831] border-[#C5DCE4] dark:border-[#2D4654]'
                  : 'bg-white dark:bg-[#203541]/40 border-[#C5DCE4] dark:border-[#2D4654]'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#EAF4F8] dark:bg-[#203541]">
                  <Layers size={16} className="text-[#4D91AD] dark:text-[#63B8C6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif] truncate">
                    Tower of Hanoi
                  </div>
                </div>
                {participant.hanoiCompleted ? (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold text-[#2B7F8C] dark:text-[#63B8C6] font-['Plus_Jakarta_Sans',sans-serif]">
                    <CheckCircle size={13} />
                    <span>Done</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#526E7B] dark:text-[#9BB5C4]">Pending</span>
                )}
              </div>
            </div>

            {/* Backward Corsi Block Task */}
            <div
              className={`p-3 sm:p-4 rounded-xl border ${
                participant.corsiCompleted
                  ? 'bg-[#D5E8EF] dark:bg-[#192831] border-[#C5DCE4] dark:border-[#2D4654]'
                  : 'bg-white dark:bg-[#203541]/40 border-[#C5DCE4] dark:border-[#2D4654]'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#EAF4F8] dark:bg-[#203541]">
                  <Grid3X3 size={16} className="text-[#4D91AD] dark:text-[#63B8C6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif] truncate">
                    Backward Corsi
                  </div>
                </div>
                {participant.corsiCompleted ? (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold text-[#2B7F8C] dark:text-[#63B8C6] font-['Plus_Jakarta_Sans',sans-serif]">
                    <CheckCircle size={13} />
                    <span>Done</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#526E7B] dark:text-[#9BB5C4]">Pending</span>
                )}
              </div>
            </div>

            {/* Stroop Task */}
            <div
              className={`p-3 sm:p-4 rounded-xl border ${
                participant.stroopCompleted
                  ? 'bg-[#D5E8EF] dark:bg-[#192831] border-[#C5DCE4] dark:border-[#2D4654]'
                  : 'bg-white dark:bg-[#203541]/40 border-[#C5DCE4] dark:border-[#2D4654]'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#EAF4F8] dark:bg-[#203541]">
                  <span className="text-xs font-black text-[#4D91AD] dark:text-[#63B8C6] font-['Plus_Jakarta_Sans',sans-serif]">
                    ST
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif] truncate">
                    Stroop Task
                  </div>
                </div>
                {participant.stroopCompleted ? (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold text-[#2B7F8C] dark:text-[#63B8C6] font-['Plus_Jakarta_Sans',sans-serif]">
                    <CheckCircle size={13} />
                    <span>Done</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#526E7B] dark:text-[#9BB5C4]">Pending</span>
                )}
              </div>
            </div>

            {/* Task Switching */}
            <div
              className={`p-3 sm:p-4 rounded-xl border ${
                participant.taskSwitchingCompleted
                  ? 'bg-[#D5E8EF] dark:bg-[#192831] border-[#C5DCE4] dark:border-[#2D4654]'
                  : 'bg-white dark:bg-[#203541]/40 border-[#C5DCE4] dark:border-[#2D4654]'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#EAF4F8] dark:bg-[#203541]">
                  <span className="text-xs font-black text-[#4D91AD] dark:text-[#63B8C6] font-['Plus_Jakarta_Sans',sans-serif]">
                    TS
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif] truncate">
                    Task Switching
                  </div>
                </div>
                {participant.taskSwitchingCompleted ? (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold text-[#2B7F8C] dark:text-[#63B8C6] font-['Plus_Jakarta_Sans',sans-serif]">
                    <CheckCircle size={13} />
                    <span>Done</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#526E7B] dark:text-[#9BB5C4]">Pending</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Privacy note */}
        <div className="bg-[#D5E8EF] dark:bg-[#203541] rounded-xl border border-[#C5DCE4] dark:border-[#2D4654] p-4 sm:p-5 mb-6 sm:mb-8 text-left shadow-xs">
          <div className="flex gap-2.5 sm:gap-3">
            <Heart size={16} className="text-[#4D91AD] dark:text-[#63B8C6] flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-[#526E7B] dark:text-[#9BB5C4]">
              <strong className="text-[#263B46] dark:text-[#EAF4F8]">Thank you</strong> — your responses will contribute
              to academic research into cognitive processes. Your data is handled ethically and in accordance with the
              research guidelines you reviewed. Results are reported at the group level and do not reflect on individual
              intelligence or ability.
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Research Result Section (Above Return to Homepage)                        */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-[#203541] rounded-2xl border-2 border-[#C5DCE4] dark:border-[#2D4654] p-5 sm:p-7 mb-6 text-left shadow-sm transition-all">
          {!showResultSection ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D5E8EF] dark:bg-[#192831] flex items-center justify-center shrink-0 text-[#4D91AD] dark:text-[#63B8C6]">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif]">
                    Research Result
                  </h3>
                  <p className="text-xs text-[#526E7B] dark:text-[#9BB5C4] mt-0.5">
                    Want your personalized cognitive results and interpretation sent to you?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResultSection(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#D5E8EF] hover:bg-[#4D91AD] text-[#263B46] hover:text-white dark:bg-[#192831] dark:hover:bg-[#63B8C6] dark:text-[#EAF4F8] dark:hover:text-[#111C23] font-bold text-xs sm:text-sm border border-[#C5DCE4] hover:border-[#4D91AD] dark:border-[#2D4654] dark:hover:border-[#63B8C6] transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-2xs"
              >
                <Sparkles size={15} />
                <span>Research Result</span>
              </button>
            </div>
          ) : (
            <div className="animate-fade-in-up">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-[#D5E8EF] dark:bg-[#192831] flex items-center justify-center text-[#4D91AD] dark:text-[#63B8C6]">
                    <Mail size={16} />
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif]">
                    Research Result & Interpretation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResultSection(false)}
                  className="text-xs text-[#526E7B] dark:text-[#9BB5C4] hover:underline cursor-pointer"
                >
                  Close
                </button>
              </div>

              <p className="text-xs sm:text-sm text-[#526E7B] dark:text-[#9BB5C4] leading-relaxed mb-4">
                After finishing the research, you can have your result and interpretation. To get that, provide your email address here, and we will send it to you soon.
              </p>

              {emailSubmitted ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 font-['Plus_Jakarta_Sans',sans-serif]">
                      Email Registered Successfully!
                    </div>
                    <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                      We have recorded <span className="font-semibold">{email}</span>. Once our research analysis is finalized, we will send your individual results and detailed interpretation directly to your inbox.
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveEmail} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9597AB]" />
                      <input
                        type="email"
                        placeholder="Enter your email address (e.g. name@gmail.com)"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailError(null);
                        }}
                        className={`ml-input pl-10 text-xs sm:text-sm py-2.5 w-full ${
                          emailError ? 'border-red-400' : ''
                        }`}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary px-5 py-2.5 text-xs sm:text-sm justify-center cursor-pointer shrink-0"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Email</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                  {emailError && (
                    <p className="flex items-center gap-1.5 text-xs text-[#EF4444]">
                      <AlertCircle size={13} /> {emailError}
                    </p>
                  )}
                  <p className="text-[11px] text-[#526E7B] dark:text-[#9BB5C4]">
                    Providing your email is completely optional. If you do not wish to receive your results, you can directly return to the homepage below.
                  </p>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Return to Homepage Button */}
        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={() => navigate('landing')}
            className="btn-primary w-full sm:w-auto px-8 sm:px-10 py-3.5 text-sm sm:text-base justify-center cursor-pointer"
          >
            Return to Homepage
            <ArrowRight size={18} />
          </button>
          <p className="text-xs text-[#526E7B] dark:text-[#9BB5C4]">
            You may now close this window or return to the homepage.
          </p>
        </div>
      </div>
    </div>
  );
}
