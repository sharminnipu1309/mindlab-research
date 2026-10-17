import { useState } from 'react';
import { Page, ParticipantSession } from '../types';
import Logo from '../components/Logo';
import CognitiveNetworkHero from '../components/CognitiveNetworkHero';
import ResumeSessionModal from '../components/ResumeSessionModal';
import ThemeToggle from '../components/ThemeToggle';
import { HanoiVisual, CorsiVisual, StroopVisual, TaskSwitchingVisual } from '../components/TaskVisuals';
import { ArrowRight, ChevronRight, Shield, BookOpen, FlaskConical, CheckCircle2, Lock, Sparkles, Layers, Grid3X3, Eye, Repeat, RotateCcw } from 'lucide-react';

interface Props {
  navigate: (page: Page) => void;
  onResume?: (participant: ParticipantSession, sessionId: string) => void;
}

export default function LandingPage({ navigate, onResume }: Props) {
  const [showResumeModal, setShowResumeModal] = useState(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleResumeSuccess = (participant: ParticipantSession, sessionId: string) => {
    if (onResume) {
      onResume(participant, sessionId);
    } else {
      navigate('participant-dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E23] text-white selection:bg-[#6D5AE6] selection:text-white font-['Inter',sans-serif]">
      {/* ─── TOP NAVIGATION BAR ────────────────────────────────────────── */}
      <nav className="bg-[#0D1026]/90 backdrop-blur-md border-b border-[#1E2552] sticky top-0 z-50 px-4 sm:px-10 py-3 sm:py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="cursor-pointer shrink-0" onClick={() => navigate('landing')}>
            <Logo size="md" variant="white" />
          </div>

          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-[#94A3B8]">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('challenges')}
              className="hover:text-white transition-colors"
            >
              Challenges
            </button>
            <button
              onClick={() => navigate('research-info')}
              className="hover:text-white transition-colors"
            >
              The research
            </button>
            <button
              onClick={() => navigate('admin-login')}
              className="hover:text-[#A5B4FC] transition-colors text-xs text-[#64748B] flex items-center gap-1"
            >
              <Lock size={12} />
              Researcher login
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />
            <button
              onClick={() => navigate('research-info')}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#6D5AE6] hover:bg-[#5B48D9] text-white flex items-center gap-1.5 sm:gap-2 shadow-[0_0_20px_rgba(109,90,230,0.45)] hover:shadow-[0_0_28px_rgba(109,90,230,0.65)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Begin session</span>
              <ArrowRight size={14} className="sm:w-[15px] sm:h-[15px]" />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO SECTION ─────────────────────────────────────────────── */}
      <section className="relative pt-8 sm:pt-16 pb-14 sm:pb-24 px-4 sm:px-10 overflow-hidden bg-gradient-to-b from-[#0B0E23] via-[#0F1333] to-[#0B0E23]">
        {/* Background ambient lighting glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#6D5AE6]/12 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[280px] sm:w-[450px] h-[280px] sm:h-[450px] bg-[#0D9488]/10 rounded-full blur-[100px] sm:blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center relative z-10">
          {/* Left Hero Column */}
          <div className="lg:col-span-6 animate-fade-in-up">
            {/* Small uppercase category label with horizontal line accent */}
            <div className="inline-flex items-center gap-2 sm:gap-2.5 text-[#818CF8] text-[11px] sm:text-xs font-bold font-['Plus_Jakarta_Sans',sans-serif] uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-4 sm:mb-6">
              <span className="w-6 sm:w-8 h-[2px] bg-[#818CF8] rounded-full" />
              Cognitive Research Platform
            </div>

            {/* Massive Bold Headline */}
            <h1 className="text-3xl xs:text-4xl sm:text-6xl lg:text-[68px] font-extrabold text-white leading-[1.08] sm:leading-[1.06] tracking-tight mb-4 sm:mb-6 font-['Plus_Jakarta_Sans',sans-serif]">
              Explore how<br />
              your mind<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] via-[#818CF8] to-[#60A5FA]">
                works.
              </span>
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base lg:text-lg text-[#94A3B8] leading-relaxed mb-6 sm:mb-10 max-w-xl">
              Try four brain games that show how well you plan, remember, pay attention, and switch between ideas.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-8 sm:mb-10">
              <button
                onClick={() => navigate('research-info')}
                className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base font-['Plus_Jakarta_Sans',sans-serif] bg-[#6D5AE6] hover:bg-[#5B48D9] text-white flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(109,90,230,0.5)] hover:shadow-[0_0_40px_rgba(109,90,230,0.7)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Begin your session
                <ArrowRight size={18} />
              </button>

              <button
                onClick={() => setShowResumeModal(true)}
                className="px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#1E2452]/90 hover:bg-[#252D66] border border-[#6D5AE6]/50 hover:border-[#818CF8] text-[#C7D2FE] hover:text-white flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(109,90,230,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <RotateCcw size={16} className="text-[#818CF8]" />
                Resume existing session
              </button>

              <button
                onClick={() => navigate('research-info')}
                className="px-4 sm:px-5 py-3 sm:py-4 rounded-xl font-semibold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#171B3A]/80 hover:bg-[#1E2452] border border-[#2D356D] hover:border-[#6D5AE6] text-white flex items-center justify-center gap-2 transition-all"
              >
                Explore research
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Research Trust Indicator */}
            <div className="flex items-center gap-3 sm:gap-3.5 pt-5 sm:pt-6 border-t border-[#1E2552]/80 max-w-lg">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0D9488]/20 border border-[#0D9488]/40 flex items-center justify-center flex-shrink-0 text-[#2DD4BF]">
                <CheckCircle2 size={16} className="sm:w-[18px] sm:h-[18px]" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white font-['Plus_Jakarta_Sans',sans-serif]">
                  Research-grade & confidential
                </div>
                <div className="text-[11px] sm:text-xs text-[#94A3B8]">
                  Your responses are securely recorded for academic research
                </div>
              </div>
            </div>
          </div>

          {/* Right Hero Column: Cognitive Network Visualization */}
          <div className="lg:col-span-6 flex justify-center animate-fade-in w-full overflow-hidden">
            <CognitiveNetworkHero onSelectTask={() => navigate('research-info')} />
          </div>
        </div>
      </section>

      {/* ─── FOUR CHALLENGES OVERVIEW SECTION ─────────────────────────── */}
      <section id="challenges" className="py-14 sm:py-24 px-4 sm:px-10 border-t border-[#1E2552] bg-[#0E122E]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1F2552] text-[#A5B4FC] text-xs font-bold tracking-widest uppercase mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
              <Sparkles size={13} className="text-[#818CF8]" />
              Four Interactive Tasks
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white font-['Plus_Jakarta_Sans',sans-serif] mb-3 sm:mb-4">
              Explore Four Cognitive Domains
            </h2>
            <p className="text-xs sm:text-base text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
              Each challenge focuses on one brain skill at a time, using research-style games made for the web.
            </p>
          </div>

          {/* 4 Challenge Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Challenge 1: Tower of Hanoi */}
            <div className="rounded-2xl p-5 sm:p-6 bg-[#171B3A] border border-[#2D3670] hover:border-[#6D5AE6] hover:shadow-[0_0_30px_rgba(109,90,230,0.25)] transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1">
              <div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#23295C] border border-[#3E498E] flex items-center justify-center p-2 mb-4 sm:mb-6 group-hover:border-[#6D5AE6] transition-colors">
                  <HanoiVisual size="md" variant="dark" />
                </div>
                <div className="text-[10px] font-bold text-[#818CF8] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif] mb-1">
                  Room 01 · Strategy
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  Tower of Hanoi
                </h3>
                <div className="text-xs font-semibold text-[#A5B4FC] mb-2.5 sm:mb-3">
                  Planning & Problem-Solving
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed mb-4 sm:mb-6">
                  Solve multi-step disc manipulation puzzles under strict constraint rules to evaluate lookahead planning and recursive problem solving.
                </p>
              </div>
              <div className="pt-3 sm:pt-4 border-t border-[#232B5C] flex items-center justify-between text-xs text-[#818CF8] font-['Plus_Jakarta_Sans',sans-serif] font-semibold">
                <span>6 puzzles</span>
                <span>~12 min</span>
              </div>
            </div>

            {/* Challenge 2: Backward Corsi Block */}
            <div className="rounded-2xl p-5 sm:p-6 bg-[#171B3A] border border-[#2D3670] hover:border-[#0D9488] hover:shadow-[0_0_30px_rgba(13,148,136,0.25)] transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1">
              <div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#17303D] border border-[#23585F] flex items-center justify-center p-2 mb-4 sm:mb-6 group-hover:border-[#0D9488] transition-colors">
                  <CorsiVisual size="md" variant="dark" />
                </div>
                <div className="text-[10px] font-bold text-[#2DD4BF] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif] mb-1">
                  Room 02 · Memory
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  Backward Corsi Block
                </h3>
                <div className="text-xs font-semibold text-[#5EEAD4] mb-2.5 sm:mb-3">
                  Spatial Working Memory
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed mb-4 sm:mb-6">
                  Observe sequences of illuminated blocks across a 3×3 spatial grid and mentally reproduce the exact reverse sequence.
                </p>
              </div>
              <div className="pt-3 sm:pt-4 border-t border-[#232B5C] flex items-center justify-between text-xs text-[#2DD4BF] font-['Plus_Jakarta_Sans',sans-serif] font-semibold">
                <span>8 levels</span>
                <span>~8–10 min</span>
              </div>
            </div>

            {/* Challenge 3: Stroop Task */}
            <div className="rounded-2xl p-5 sm:p-6 bg-[#171B3A] border border-[#2D3670] hover:border-[#EF4444] hover:shadow-[0_0_30px_rgba(239,68,68,0.25)] transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1">
              <div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#361E2E] border border-[#69293C] flex items-center justify-center p-2 mb-4 sm:mb-6 group-hover:border-[#EF4444] transition-colors">
                  <StroopVisual size="md" variant="dark" />
                </div>
                <div className="text-[10px] font-bold text-[#F87171] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif] mb-1">
                  Room 03 · Attention
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  Stroop Task
                </h3>
                <div className="text-xs font-semibold text-[#FCA5A5] mb-2.5 sm:mb-3">
                  Selective Attention & Control
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed mb-4 sm:mb-6">
                  Identify the ink color of color words while suppressing the automatic interference of reading the printed semantic word.
                </p>
              </div>
              <div className="pt-3 sm:pt-4 border-t border-[#232B5C] flex items-center justify-between text-xs text-[#F87171] font-['Plus_Jakarta_Sans',sans-serif] font-semibold">
                <span>128 trials</span>
                <span>~7 min</span>
              </div>
            </div>

            {/* Challenge 4: Task Switching */}
            <div className="rounded-2xl p-5 sm:p-6 bg-[#171B3A] border border-[#2D3670] hover:border-[#2563EB] hover:shadow-[0_0_30px_rgba(37,99,235,0.25)] transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1">
              <div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#1E2C58] border border-[#2B4B8F] flex items-center justify-center p-1.5 mb-4 sm:mb-6 group-hover:border-[#2563EB] transition-colors">
                  <TaskSwitchingVisual size="md" variant="dark" />
                </div>
                <div className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif] mb-1">
                  Room 04 · Flexibility
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  Task Switching
                </h3>
                <div className="text-xs font-semibold text-[#93C5FD] mb-2.5 sm:mb-3">
                  Cognitive Flexibility
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed mb-4 sm:mb-6">
                  Classify letter-number pairs while alternating between vowel/consonant and odd/even rules to quantify mental switch costs.
                </p>
              </div>
              <div className="pt-3 sm:pt-4 border-t border-[#232B5C] flex items-center justify-between text-xs text-[#60A5FA] font-['Plus_Jakarta_Sans',sans-serif] font-semibold">
                <span>64 trials</span>
                <span>~6 min</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS / RESEARCH PROTOCOL ─────────────────────────── */}
      <section id="how-it-works" className="py-14 sm:py-24 px-4 sm:px-10 border-t border-[#1E2552] bg-[#0B0E23]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-5">
            <div className="text-[11px] sm:text-xs font-bold text-[#818CF8] uppercase tracking-[0.2em] mb-2 sm:mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
              Study Information
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white font-['Plus_Jakarta_Sans',sans-serif] mb-4 sm:mb-6 leading-tight">
              Rigorous Cognitive Science on the Modern Web
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed mb-4 sm:mb-6">
              MindLab has brain tests built to measure how the mind works. Every click and answer is timed to the millisecond. The tests check how often you get things right, how fast you respond, and how long it takes to switch from one task to another.
            </p>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed mb-6 sm:mb-8">
              Participation is voluntary, anonymous, and strictly non-diagnostic. Results are recorded for empirical behavioral research.
            </p>
            <button
              onClick={() => navigate('research-info')}
              className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl font-semibold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#1F2552] hover:bg-[#2D3670] border border-[#3E498E] text-white flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
            >
              Read full information sheet
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {[
              {
                icon: Shield,
                title: 'Voluntary & Anonymous',
                desc: 'You may withdraw at any moment without penalty. You are assigned an anonymous ID with zero personal tracking in research outputs.',
                color: '#6D5AE6',
              },
              {
                icon: BookOpen,
                title: 'Informed Consent',
                desc: 'Complete protocol guidelines and data governance policies are presented prior to the start of any testing session.',
                color: '#0D9488',
              },
              {
                icon: FlaskConical,
                title: 'High-Precision Timing',
                desc: 'All reaction times and move timestamps use high-resolution browser performance clocks to ensure scientific data fidelity.',
                color: '#EF4444',
              },
              {
                icon: Lock,
                title: 'Non-Diagnostic',
                desc: 'Tasks evaluate specific experimental cognitive metrics and do not measure or imply overall intelligence, clinical condition, or health.',
                color: '#2563EB',
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="p-5 sm:p-6 rounded-2xl bg-[#131738] border border-[#232B5C]">
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-3 sm:mb-4"
                  style={{ background: color + '25', color }}
                >
                  <Icon size={18} className="sm:w-5 sm:h-5" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  {title}
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── READY TO BEGIN CALL TO ACTION ────────────────────────────── */}
      <section className="py-14 sm:py-24 px-4 sm:px-10 border-t border-[#1E2552] bg-gradient-to-b from-[#0F1333] to-[#0B0E23] text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-radial from-[#6D5AE6]/10 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#6D5AE6]/20 border border-[#6D5AE6]/40 flex items-center justify-center mx-auto mb-4 sm:mb-6 text-[#A5B4FC]">
            <Sparkles size={24} className="sm:w-7 sm:h-7" />
          </div>
          <h2 className="text-2xl sm:text-5xl font-extrabold text-white mb-3 sm:mb-4 font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
            Ready to Explore Your Mind?
          </h2>
          <p className="text-xs sm:text-base text-[#94A3B8] mb-6 sm:mb-10 max-w-xl mx-auto leading-relaxed">
            The full testing session takes approximately 25 minutes. Find a comfortable, quiet environment to begin your cognitive challenges.
          </p>
          <button
            onClick={() => navigate('research-info')}
            className="px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base font-['Plus_Jakarta_Sans',sans-serif] bg-[#6D5AE6] hover:bg-[#5B48D9] text-white inline-flex items-center justify-center gap-2.5 shadow-[0_0_35px_rgba(109,90,230,0.55)] hover:shadow-[0_0_45px_rgba(109,90,230,0.75)] transition-all hover:scale-[1.03] active:scale-[0.98] w-full sm:w-auto"
          >
            Start Research Session
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1E2552] bg-[#090B1D] px-4 sm:px-10 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" variant="white" />
          </div>
          <p className="text-[11px] sm:text-xs text-[#64748B] text-center">
            MindLab Research Platform · For academic cognitive psychology research only · Not a diagnostic tool
          </p>
          <button
            onClick={() => navigate('admin-login')}
            className="text-xs font-semibold text-[#818CF8] hover:text-white transition-colors"
          >
            Researcher Access
          </button>
        </div>
      </footer>

      {/* ─── RESUME SESSION MODAL ──────────────────────────────────────── */}
      <ResumeSessionModal
        isOpen={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        onResume={handleResumeSuccess}
      />
    </div>
  );
}
