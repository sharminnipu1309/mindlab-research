import Logo from './Logo';
import { X, LogOut, Home } from 'lucide-react';
import { Page } from '../types';
import ThemeToggle from './ThemeToggle';

interface ParticipantNavProps {
  navigate: (page: Page) => void;
  currentPage?: string;
  totalSteps?: number;
  currentStep?: number;
  showExit?: boolean;
  onExit?: () => void;
  participantId?: string;
}

export default function ParticipantNav({
  navigate,
  showExit = false,
  onExit,
  participantId,
  totalSteps,
  currentStep,
}: ParticipantNavProps) {
  return (
    <nav className="w-full bg-white dark:bg-[#111C23] border-b border-[#C5DCE4] dark:border-[#2D4654] px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-40 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        <div
          className="cursor-pointer shrink-0"
          onClick={() => navigate('landing')}
        >
          <Logo size="sm" />
        </div>

        {/* Progress steps */}
        {totalSteps && currentStep && (
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className="flex items-center gap-1.5 sm:gap-3">
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold font-['Plus_Jakarta_Sans',sans-serif] transition-all ${
                    i + 1 < currentStep
                      ? 'bg-[#4D91AD] text-white dark:bg-[#63B8C6] dark:text-[#111C23] shadow-xs'
                      : i + 1 === currentStep
                      ? 'bg-[#4D91AD] text-white ring-2 sm:ring-4 ring-[#4D91AD]/30 dark:bg-[#63B8C6] dark:text-[#111C23] dark:ring-[#63B8C6]/30 shadow-sm'
                      : 'bg-[#D5E8EF] text-[#526E7B] dark:bg-[#203541] dark:text-[#9BB5C4]'
                  }`}
                >
                  {i + 1 < currentStep ? '✓' : i + 1}
                </div>
                {i < totalSteps - 1 && (
                  <div
                    className={`w-3 sm:w-6 md:w-10 h-0.5 rounded-full transition-all ${
                      i + 1 < currentStep
                        ? 'bg-[#4D91AD] dark:bg-[#63B8C6]'
                        : 'bg-[#C5DCE4] dark:bg-[#2D4654]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <ThemeToggle />
          <button
            onClick={() => navigate('landing')}
            className="group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-[#4D91AD] text-[#263B46] hover:text-white dark:bg-[#203541] dark:hover:bg-[#63B8C6] dark:text-[#EAF4F8] dark:hover:text-[#111C23] text-xs sm:text-sm font-extrabold border-2 border-[#C5DCE4] hover:border-[#4D91AD] dark:border-[#2D4654] dark:hover:border-[#63B8C6] shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
            title="Return to application homepage"
          >
            <Home size={15} className="text-[#4D91AD] group-hover:text-white dark:text-[#63B8C6] dark:group-hover:text-[#111C23] shrink-0 transition-colors" />
            <span className="hidden sm:inline font-bold font-['Plus_Jakarta_Sans',sans-serif]">Back to Home</span>
            <span className="sm:hidden font-bold font-['Plus_Jakarta_Sans',sans-serif]">Home</span>
          </button>
          {participantId && (
            <span className="hidden sm:inline-block text-xs sm:text-sm font-['JetBrains_Mono',monospace] text-[#526E7B] dark:text-[#9BB5C4] bg-[#D5E8EF] dark:bg-[#203541] px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[#C5DCE4] dark:border-[#2D4654] truncate max-w-[120px] sm:max-w-none">
              {participantId}
            </span>
          )}
          {showExit && onExit && (
            <button
              onClick={onExit}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-[#DC2626] dark:text-[#F87171] border border-rose-200 dark:border-rose-900/50 text-xs sm:text-sm font-bold shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
              title="Exit current activity"
            >
              <LogOut size={14} className="shrink-0" />
              <span className="font-bold font-['Plus_Jakarta_Sans',sans-serif]">Exit</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

interface ConfirmExitModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmExitModal({ onConfirm, onCancel }: ConfirmExitModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#111C23]/75 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#203541] rounded-2xl p-5 sm:p-8 max-w-sm w-full mx-auto shadow-2xl animate-slide-up border border-[#C5DCE4] dark:border-[#2D4654] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#526E7B] dark:text-[#9BB5C4] hover:text-[#263B46] dark:hover:text-[#EAF4F8] p-1 rounded-lg hover:bg-[#D5E8EF] dark:hover:bg-[#192831] cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FEF3C7] dark:bg-[#78350F]/40 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
          <LogOut size={20} className="text-[#D97706] dark:text-[#FBBF24] sm:w-[22px] sm:h-[22px]" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-[#263B46] dark:text-[#EAF4F8] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Exit activity?</h3>
        <p className="text-xs sm:text-sm text-[#526E7B] dark:text-[#9BB5C4] leading-relaxed mb-5 sm:mb-6">
          Your current progress on this task will not be saved. You can return to the participant dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center py-2.5 text-xs sm:text-sm cursor-pointer">
            Continue task
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#FEF3C7] hover:bg-[#D97706] text-[#D97706] hover:text-white dark:bg-[#78350F]/50 dark:hover:bg-[#D97706] dark:text-[#FDE68A] dark:hover:text-white font-semibold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] transition-all text-center cursor-pointer"
          >
            Exit session
          </button>
        </div>
      </div>
    </div>
  );
}
