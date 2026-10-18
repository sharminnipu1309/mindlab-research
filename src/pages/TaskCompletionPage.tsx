import { Page, ParticipantSession } from '../types';
import ParticipantNav from '../components/ParticipantNav';
import { CheckCircle, Layers, Grid3X3, Heart, ArrowRight } from 'lucide-react';

interface Props {
  navigate: (page: Page) => void;
  participant: ParticipantSession;
}

export default function TaskCompletionPage({ navigate, participant }: Props) {
  return (
    <div className="min-h-screen bg-[#D7E0D8] dark:bg-[#282E28] transition-colors duration-200">
      <ParticipantNav navigate={navigate} participantId={participant.id} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-20 text-center">
        {/* Success illustration */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 sm:mb-8">
          <div className="absolute inset-0 bg-[#A3B9A5]/30 rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-[#282E28] dark:bg-[#A3B9A5] rounded-full flex items-center justify-center animate-pop-in shadow-md">
            <CheckCircle size={38} className="text-[#D7E0D8] dark:text-[#1D221E] sm:w-11 sm:h-11" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#282E28] dark:text-[#D7E0D8] mb-3 sm:mb-4 font-['Plus_Jakarta_Sans',sans-serif]">
          Session Complete
        </h1>
        <p className="text-base sm:text-lg text-[#47564A] dark:text-[#B6C7B8] mb-2 font-medium">
          Thank you for participating in this research session, {participant.name.split(' ')[0]}.
        </p>
        <p className="text-xs sm:text-sm text-[#47564A] dark:text-[#B6C7B8] mb-8 sm:mb-12">
          Your responses have been recorded. Your contribution is valued.
        </p>

        {/* Session summary */}
        <div className="bg-white dark:bg-[#354238] rounded-2xl border border-[#BAC8BD] dark:border-[#445448] p-4 sm:p-7 mb-6 sm:mb-8 text-left shadow-sm">
          <h2 className="text-xs sm:text-sm font-bold text-[#282E28] dark:text-[#D7E0D8] uppercase tracking-wider mb-4 sm:mb-5 font-['Plus_Jakarta_Sans',sans-serif]">
            Session Summary
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-[#E4EBE5] dark:bg-[#1D221E] rounded-xl p-3 sm:p-4 border border-[#BAC8BD] dark:border-[#445448]">
              <div className="text-[11px] sm:text-xs text-[#47564A] dark:text-[#B6C7B8] mb-1">Participant ID</div>
              <div className="text-xs sm:text-sm font-bold text-[#282E28] dark:text-[#A3B9A5] font-['JetBrains_Mono',monospace] truncate">{participant.id}</div>
            </div>
            <div className="bg-[#E4EBE5] dark:bg-[#1D221E] rounded-xl p-3 sm:p-4 border border-[#BAC8BD] dark:border-[#445448]">
              <div className="text-[11px] sm:text-xs text-[#47564A] dark:text-[#B6C7B8] mb-1">Activities completed</div>
              <div className="text-xs sm:text-sm font-bold text-[#282E28] dark:text-[#D7E0D8] font-['JetBrains_Mono',monospace]">
                {(participant.hanoiCompleted ? 1 : 0) + (participant.corsiCompleted ? 1 : 0) + (participant.stroopCompleted ? 1 : 0) + (participant.taskSwitchingCompleted ? 1 : 0)} / 4
              </div>
            </div>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {/* Tower of Hanoi */}
            <div
              className={`p-3 sm:p-4 rounded-xl border ${
                participant.hanoiCompleted ? 'bg-[#E4EBE5] dark:bg-[#1D221E] border-[#354238]/20 dark:border-[#445448]' : 'bg-white dark:bg-[#282E28]/40 border-[#BAC8BD] dark:border-[#445448]'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#D7E0D8] dark:bg-[#354238]"
                >
                  <Layers size={16} className="text-[#282E28] dark:text-[#A3B9A5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] truncate">Tower of Hanoi</div>
                </div>
                {participant.hanoiCompleted ? (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold text-[#282E28] dark:text-[#A3B9A5] font-['Plus_Jakarta_Sans',sans-serif]">
                    <CheckCircle size={13} />
                    <span>Done</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#47564A] dark:text-[#B6C7B8]">Pending</span>
                )}
              </div>
            </div>

            {/* Backward Corsi Block Task */}
            <div
              className={`p-3 sm:p-4 rounded-xl border ${
                participant.corsiCompleted ? 'bg-[#E4EBE5] dark:bg-[#1D221E] border-[#354238]/20 dark:border-[#445448]' : 'bg-white dark:bg-[#282E28]/40 border-[#BAC8BD] dark:border-[#445448]'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#D7E0D8] dark:bg-[#354238]"
                >
                  <Grid3X3 size={16} className="text-[#282E28] dark:text-[#A3B9A5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] truncate">Backward Corsi</div>
                </div>
                {participant.corsiCompleted ? (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold text-[#282E28] dark:text-[#A3B9A5] font-['Plus_Jakarta_Sans',sans-serif]">
                    <CheckCircle size={13} />
                    <span>Done</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#47564A] dark:text-[#B6C7B8]">Pending</span>
                )}
              </div>
            </div>

            {/* Stroop Task */}
            <div
              className={`p-3 sm:p-4 rounded-xl border ${
                participant.stroopCompleted ? 'bg-[#E4EBE5] dark:bg-[#1D221E] border-[#354238]/20 dark:border-[#445448]' : 'bg-white dark:bg-[#282E28]/40 border-[#BAC8BD] dark:border-[#445448]'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#D7E0D8] dark:bg-[#354238]"
                >
                  <span className="text-xs font-black text-[#282E28] dark:text-[#A3B9A5] font-['Plus_Jakarta_Sans',sans-serif]">ST</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] truncate">Stroop Task</div>
                </div>
                {participant.stroopCompleted ? (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold text-[#282E28] dark:text-[#A3B9A5] font-['Plus_Jakarta_Sans',sans-serif]">
                    <CheckCircle size={13} />
                    <span>Done</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#47564A] dark:text-[#B6C7B8]">Pending</span>
                )}
              </div>
            </div>

            {/* Task Switching */}
            <div
              className={`p-3 sm:p-4 rounded-xl border ${
                participant.taskSwitchingCompleted ? 'bg-[#E4EBE5] dark:bg-[#1D221E] border-[#354238]/20 dark:border-[#445448]' : 'bg-white dark:bg-[#282E28]/40 border-[#BAC8BD] dark:border-[#445448]'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#D7E0D8] dark:bg-[#354238]"
                >
                  <span className="text-xs font-black text-[#282E28] dark:text-[#A3B9A5] font-['Plus_Jakarta_Sans',sans-serif]">TS</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] truncate">Task Switching</div>
                </div>
                {participant.taskSwitchingCompleted ? (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold text-[#282E28] dark:text-[#A3B9A5] font-['Plus_Jakarta_Sans',sans-serif]">
                    <CheckCircle size={13} />
                    <span>Done</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#47564A] dark:text-[#B6C7B8]">Pending</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Privacy note */}
        <div className="bg-[#E4EBE5] dark:bg-[#354238] rounded-xl border border-[#BAC8BD] dark:border-[#445448] p-4 sm:p-5 mb-8 sm:mb-10 text-left shadow-xs">
          <div className="flex gap-2.5 sm:gap-3">
            <Heart size={16} className="text-[#282E28] dark:text-[#A3B9A5] flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-[#47564A] dark:text-[#B6C7B8]">
              <strong className="text-[#282E28] dark:text-[#D7E0D8]">Thank you</strong> — your responses will contribute to academic research into cognitive processes.
              Your data is handled ethically and in accordance with the research guidelines you reviewed.
              Results are reported at the group level and do not reflect on individual intelligence or ability.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={() => navigate('landing')}
            className="btn-primary w-full sm:w-auto px-8 sm:px-10 py-3.5 text-sm sm:text-base justify-center"
          >
            Return to Homepage
            <ArrowRight size={18} />
          </button>
          <p className="text-xs text-[#47564A] dark:text-[#B6C7B8]">
            You may now close this window or return to the homepage.
          </p>
        </div>
      </div>
    </div>
  );
}
