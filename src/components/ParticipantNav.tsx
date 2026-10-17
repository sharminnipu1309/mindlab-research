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
    <nav className="w-full bg-white border-b border-[#E9E8F2] px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-40">
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
                      ? 'bg-[#6D5AE6] text-white shadow-sm'
                      : i + 1 === currentStep
                      ? 'bg-[#6D5AE6] text-white ring-2 sm:ring-4 ring-[#6D5AE6]/20 shadow-md'
                      : 'bg-[#E9E8F2] text-[#73758C]'
                  }`}
                >
                  {i + 1 < currentStep ? '✓' : i + 1}
                </div>
                {i < totalSteps - 1 && (
                  <div
                    className={`w-3 sm:w-6 md:w-10 h-0.5 rounded-full transition-all ${
                      i + 1 < currentStep ? 'bg-[#6D5AE6]' : 'bg-[#E9E8F2]'
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
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#F8F8FC] hover:bg-[#EDEAF8] text-[#11152F] text-xs font-bold border border-[#E9E8F2] transition-colors cursor-pointer"
            title="Return to application homepage"
          >
            <Home size={14} className="text-[#6D5AE6]" />
            <span className="hidden xs:inline">Back to Home</span>
            <span className="xs:hidden">Home</span>
          </button>
          {participantId && (
            <span className="text-xs sm:text-sm font-['JetBrains_Mono',monospace] text-[#73758C] bg-[#F8F8FC] px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[#E9E8F2] truncate max-w-[120px] sm:max-w-none">
              {participantId}
            </span>
          )}
          {showExit && onExit && (
            <button
              onClick={onExit}
              className="btn-ghost text-[#73758C] hover:text-[#C4625A] text-xs sm:text-sm px-2 sm:px-3 py-1.5"
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
      <div className="absolute inset-0 bg-[#11152F]/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-5 sm:p-8 max-w-sm w-full mx-auto shadow-2xl animate-slide-up border border-[#E9E8F2] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#73758C] hover:text-[#11152F] p-1 rounded-lg hover:bg-[#F8F8FC]"
        >
          <X size={18} />
        </button>

        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FCEFD9] rounded-xl flex items-center justify-center mb-3 sm:mb-4">
          <LogOut size={20} className="text-[#D4813A] sm:w-[22px] sm:h-[22px]" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-[#11152F] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Exit activity?</h3>
        <p className="text-xs sm:text-sm text-[#73758C] leading-relaxed mb-5 sm:mb-6">
          Your current progress on this task will not be saved. You can return to the participant dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center py-2.5 text-xs sm:text-sm">
            Continue task
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#FCEFD9] text-[#D4813A] font-semibold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] hover:bg-[#D4813A] hover:text-white transition-all text-center"
          >
            Exit session
          </button>
        </div>
      </div>
    </div>
  );
}
