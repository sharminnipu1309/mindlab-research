import { Page } from '../types';
import ParticipantNav from '../components/ParticipantNav';
import { ArrowRight, Shield, Clock, FlaskConical, BookOpen, Info, CheckCircle } from 'lucide-react';

interface Props { navigate: (page: Page) => void; }

export default function ResearchInfoPage({ navigate }: Props) {
  return (
    <div className="min-h-screen bg-[#F8F8FC]">
      <ParticipantNav navigate={navigate} totalSteps={3} currentStep={1} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-16 animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-[#EDEAF8] text-[#6567C9] rounded-full px-3.5 sm:px-4 py-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif] mb-4 sm:mb-5">
            <FlaskConical size={12} />
            Study Information Sheet
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#252640] mb-3 sm:mb-4 font-['Plus_Jakarta_Sans',sans-serif]">
            About This Research
          </h1>
          <p className="text-xs sm:text-sm text-[#73758C] leading-relaxed max-w-xl mx-auto">
            Please read the following information carefully before deciding whether to participate.
          </p>
        </div>

        {/* Quick overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-10">
          {[
            { icon: Clock, label: 'Duration', value: '~25 minutes', color: '#6567C9' },
            { icon: FlaskConical, label: 'Activities', value: '4 cognitive tasks', color: '#69AFA8' },
            { icon: Shield, label: 'Participation', value: 'Voluntary', color: '#A9A2E8' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-[#E9E8F2] p-4 sm:p-5 text-center flex sm:flex-col items-center sm:justify-center gap-3.5 sm:gap-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center sm:mx-auto sm:mb-3 shrink-0"
                style={{ background: color + '20' }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              <div className="text-left sm:text-center">
                <div className="text-xs text-[#73758C] mb-0.5">{label}</div>
                <div className="text-xs sm:text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Purpose */}
          <div className="bg-white rounded-2xl border border-[#E9E8F2] p-5 sm:p-7">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 bg-[#EDEAF8] rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen size={16} className="text-[#6567C9]" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">
                Purpose of this study
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#73758C] leading-relaxed">
              This study is part of academic research in cognitive psychology. We are investigating how individuals perform on tasks that assess planning and problem-solving, spatial working memory, selective attention and interference control, and cognitive flexibility.
            </p>
          </div>

          {/* What you'll do */}
          <div className="bg-white rounded-2xl border border-[#E9E8F2] p-5 sm:p-7">
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <div className="w-8 h-8 bg-[#E4F2F0] rounded-lg flex items-center justify-center flex-shrink-0">
                <FlaskConical size={16} className="text-[#69AFA8]" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">
                What you will be asked to do
              </h2>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {[
                {
                  num: '01',
                  title: 'Tower of Hanoi',
                  desc: 'You will complete a series of disc-moving puzzles, working through 6 puzzles of increasing difficulty. Each puzzle involves moving discs between three rods according to specific rules.',
                  tag: 'Planning & Problem-Solving',
                  color: '#6567C9',
                },
                {
                  num: '02',
                  title: 'Backward Corsi Block Task',
                  desc: 'You will watch sequences of highlighted squares and recall them in reverse order. Sequences increase in length as you progress through the task.',
                  tag: 'Spatial Working Memory',
                  color: '#69AFA8',
                },
                {
                  num: '03',
                  title: 'Stroop Task',
                  desc: 'You will see color words presented in colored ink and identify the ink color as quickly and accurately as possible while ignoring the printed word meaning.',
                  tag: 'Selective Attention & Interference Control',
                  color: '#E11D48',
                },
                {
                  num: '04',
                  title: 'Task Switching',
                  desc: 'You will classify stimulus pairs containing a letter and a number, switching dynamically between letter (vowel/consonant) and number (odd/even) classification rules.',
                  tag: 'Cognitive Flexibility & Task Switching',
                  color: '#8B5CF6',
                },
              ].map(({ num, title, desc, tag, color }) => (
                <div key={num} className="flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-[#F8F8FC] border border-[#E9E8F2]">
                  <div
                    className="text-xs sm:text-sm font-bold font-['JetBrains_Mono',monospace] mt-0.5 flex-shrink-0"
                    style={{ color }}
                  >
                    {num}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                      <span className="text-xs sm:text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">{title}</span>
                      <span
                        className="text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full font-['Plus_Jakarta_Sans',sans-serif]"
                        style={{ background: color + '20', color }}
                      >
                        {tag}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#73758C] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data collection */}
          <div className="bg-white rounded-2xl border border-[#E9E8F2] p-5 sm:p-7">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 bg-[#F8F8FC] rounded-lg flex items-center justify-center flex-shrink-0 border border-[#E9E8F2]">
                <Info size={16} className="text-[#73758C]" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">
                Data collection and privacy
              </h2>
            </div>
            <div className="space-y-2.5 sm:space-y-3">
              {[
                'Task responses and performance will be recorded (move sequences, timing, accuracy)',
                'Basic demographic information will be collected (age, gender, ADHD diagnosis) for research purposes',
                'You will be assigned an anonymous participant ID — your name is not linked to your task data in research outputs',
                'Data is handled in accordance with ethical research guidelines',
              ].map((item, i) => (
                <div key={i} className="flex gap-2.5 sm:gap-3 items-start text-xs sm:text-sm text-[#73758C]">
                  <CheckCircle size={15} className="text-[#4A9B7F] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Voluntary participation */}
          <div className="bg-[#EDEAF8] rounded-2xl border border-[#C5C1F1] p-5 sm:p-6">
            <div className="flex gap-3">
              <Shield size={20} className="text-[#6567C9] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#252640] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  Voluntary participation
                </h3>
                <p className="text-xs sm:text-sm text-[#73758C] leading-relaxed">
                  Participation in this study is entirely voluntary. You may choose not to participate, withdraw at any time, or skip any activity without consequence. No personal benefit or disadvantage will result from your decision to participate or not participate.
                </p>
              </div>
            </div>
          </div>

          {/* Not a diagnostic */}
          <div className="bg-[#FCEFD9] rounded-xl border border-[#F0CFA0] p-4 sm:p-5">
            <div className="flex gap-3">
              <Info size={16} className="text-[#D4813A] flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-[#8B5A1F] leading-relaxed">
                <strong>Please note:</strong> These activities measure performance on specific research tasks. They are not diagnostic tools and do not assess or reflect overall intelligence, cognitive ability, or health status.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 sm:mt-10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button onClick={() => navigate('landing')} className="btn-ghost justify-center text-xs sm:text-sm py-2.5">
            ← Return to home
          </button>
          <button onClick={() => navigate('consent')} className="btn-primary px-6 sm:px-8 py-3 justify-center text-xs sm:text-sm">
            Continue to registration
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
