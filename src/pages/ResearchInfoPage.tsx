import { Page } from '../types';
import ParticipantNav from '../components/ParticipantNav';
import { ArrowRight, Shield, Clock, FlaskConical, BookOpen, Info } from 'lucide-react';

interface Props { navigate: (page: Page) => void; }

export default function ResearchInfoPage({ navigate }: Props) {
  return (
    <div className="min-h-screen bg-[#EAF4F8] dark:bg-[#111C23] text-[#263B46] dark:text-[#EAF4F8] transition-colors font-['Inter',sans-serif]">
      <ParticipantNav navigate={navigate} totalSteps={3} currentStep={1} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-16 animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-[#D5E8EF] text-[#4D91AD] dark:bg-[#203541] dark:text-[#63B8C6] rounded-full px-3.5 sm:px-4 py-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif] mb-4 sm:mb-5">
            <FlaskConical size={12} />
            Study Information Sheet
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#263B46] dark:text-[#EAF4F8] mb-3 sm:mb-4 font-['Plus_Jakarta_Sans',sans-serif]">
            About This Research
          </h1>
          <p className="text-xs sm:text-sm text-[#526E7B] dark:text-[#9BB5C4] leading-relaxed max-w-xl mx-auto">
            Please read the following information carefully before deciding whether to participate.
          </p>
        </div>

        {/* Quick overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-10">
          {[
            { icon: Clock, label: 'Duration', value: '~25 minutes', color: '#4D91AD' },
            { icon: FlaskConical, label: 'Activities', value: '4 cognitive tasks', color: '#63B8C6' },
            { icon: Shield, label: 'Participation', value: 'Voluntary', color: '#263B46' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white dark:bg-[#203541] rounded-xl border border-[#C5DCE4] dark:border-[#2D4654] p-4 sm:p-5 text-center flex sm:flex-col items-center sm:justify-center gap-3.5 sm:gap-0 shadow-2xs">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center sm:mx-auto sm:mb-3 shrink-0 bg-[#D5E8EF] dark:bg-[#192831] text-[#4D91AD] dark:text-[#63B8C6]"
              >
                <Icon size={18} />
              </div>
              <div className="text-left sm:text-center">
                <div className="text-xs text-[#526E7B] dark:text-[#9BB5C4] mb-0.5">{label}</div>
                <div className="text-xs sm:text-sm font-bold text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif]">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Purpose */}
          <div className="bg-white dark:bg-[#203541] rounded-2xl border border-[#C5DCE4] dark:border-[#2D4654] p-5 sm:p-7 shadow-xs">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 bg-[#D5E8EF] dark:bg-[#192831] text-[#4D91AD] dark:text-[#63B8C6] rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen size={16} />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif]">
                Purpose of this study
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#526E7B] dark:text-[#9BB5C4] leading-relaxed">
              This study is about how the brain works. It looks at how well people plan and solve problems, remember where things are, pay attention when there are distractions, and switch between different rules.
            </p>
          </div>

          {/* Voluntary participation */}
          <div className="bg-[#D5E8EF] dark:bg-[#192831] rounded-2xl border border-[#C5DCE4] dark:border-[#2D4654] p-5 sm:p-6 shadow-2xs">
            <div className="flex gap-3">
              <Shield size={20} className="text-[#4D91AD] dark:text-[#63B8C6] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#263B46] dark:text-[#EAF4F8] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  Voluntary participation
                </h3>
                <p className="text-xs sm:text-sm text-[#526E7B] dark:text-[#9BB5C4] leading-relaxed">
                  Participation in this study is entirely voluntary. You may choose not to participate or withdraw at any time without consequence. No personal benefit or disadvantage will result from your decision to participate or not participate.
                </p>
              </div>
            </div>
          </div>

          {/* Not a diagnostic */}
          <div className="bg-[#FEF3C7] dark:bg-[#78350F]/30 rounded-xl border border-[#FDE68A] dark:border-[#92400E] p-4 sm:p-5">
            <div className="flex gap-3">
              <Info size={16} className="text-[#D97706] dark:text-[#FBBF24] flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-[#92400E] dark:text-[#FDE68A] leading-relaxed">
                <strong>Please note:</strong> These activities measure performance on specific research tasks. They are not diagnostic tools and do not assess or reflect overall intelligence, cognitive ability, or health status.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 sm:mt-10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button onClick={() => navigate('landing')} className="btn-ghost justify-center text-xs sm:text-sm py-2.5 cursor-pointer">
            ← Return to home
          </button>
          <button onClick={() => navigate('consent')} className="btn-primary px-6 sm:px-8 py-3 justify-center text-xs sm:text-sm font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
            Let's get started
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
