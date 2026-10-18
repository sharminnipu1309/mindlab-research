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
    <nav className="w-full bg-white dark:bg-[#1D221E] border-b border-[#BAC8BD] dark:border-[#445448] px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-40 transition-colors">
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
                      ? 'bg-[#282E28] text-[#D7E0D8] dark:bg-[#A3B9A5] dark:text-[#1D221E] shadow-xs'
                      : i + 1 === currentStep
                      ? 'bg-[#282E28] text-[#D7E0D8] ring-2 sm:ring-4 ring-[#354238]/30 dark:bg-[#A3B9A5] dark:text-[#1D221E] dark:ring-[#A3B9A5]/30 shadow-sm'
                      : 'bg-[#E4EBE5] text-[#47564A] dark:bg-[#354238] dark:text-[#B6C7B8]'
                  }`}
                >
                  {i + 1 < currentStep ? '✓' : i + 1}
                </div>
                {i < totalSteps - 1 && (
                  <div
                    className={`w-3 sm:w-6 md:w-10 h-0.5 rounded-full transition-all ${
                      i + 1 < currentStep
                        ? 'bg-[#282E28] dark:bg-[#A3B9A5]'
                        : 'bg-[#BAC8BD] dark:bg-[#445448]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle />
          <button
            onClick={() => navigate('landing')}
            className="group flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-[#282E28] text-[#282E28] hover:text-[#D7E0D8] dark:bg-[#354238] dark:hover:bg-[#A3B9A5] dark:text-[#D7E0D8] dark:hover:text-[#1D221E] text-xs sm:text-sm font-extrabold border-2 border-[#BAC8BD] hover:border-[#282E28] dark:border-[#445448] dark:hover:border-[#A3B9A5] shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
            title="Return to application homepage"
          >
            <Home size={16} className="text-[#354238] group-hover:text-[#D7E0D8] dark:text-[#A3B9A5] dark:group-hover:text-[#1D221E] shrink-0 transition-colors" />
            <span className="font-bold font-['Plus_Jakarta_Sans',sans-serif]">Back to Home</span>
          </button>
          {participantId && (
            <span className="text-xs sm:text-sm font-['JetBrains_Mono',monospace] text-[#47564A] dark:text-[#B6C7B8] bg-[#E4EBE5] dark:bg-[#354238] px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[#BAC8BD] dark:border-[#445448] truncate max-w-[120px] sm:max-w-none">
              {participantId}
            </span>
          )}
          {showExit && onExit && (
            <button
              onClick={onExit}
              className="btn-ghost text-[#47564A] hover:text-[#DC2626] dark:text-[#B6C7B8] dark:hover:text-[#F87171] text-xs sm:text-sm px-2 sm:px-3 py-1.5 cursor-pointer"
            >
              <LogOut size={14} className="sm:w-[15px] sm:h-[15px]" />
              <span className="hidden xs:inline">Exit</span>
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
      <div className="absolute inset-0 bg-[#1D221E]/75 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#354238] rounded-2xl p-5 sm:p-8 max-w-sm w-full mx-auto shadow-2xl animate-slide-up border border-[#BAC8BD] dark:border-[#445448] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#47564A] dark:text-[#B6C7B8] hover:text-[#282E28] dark:hover:text-[#D7E0D8] p-1 rounded-lg hover:bg-[#E4EBE5] dark:hover:bg-[#282E28] cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FEF3C7] dark:bg-[#78350F]/40 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
          <LogOut size={20} className="text-[#D97706] dark:text-[#FBBF24] sm:w-[22px] sm:h-[22px]" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-[#282E28] dark:text-[#D7E0D8] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Exit activity?</h3>
        <p className="text-xs sm:text-sm text-[#47564A] dark:text-[#B6C7B8] leading-relaxed mb-5 sm:mb-6">
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
