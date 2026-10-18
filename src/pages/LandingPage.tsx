import { useState } from 'react';
import { Page, ParticipantSession } from '../types';
import Logo from '../components/Logo';
import CognitiveNetworkHero from '../components/CognitiveNetworkHero';
import ResumeSessionModal from '../components/ResumeSessionModal';
import ThemeToggle from '../components/ThemeToggle';
import { HanoiVisual, CorsiVisual, StroopVisual, TaskSwitchingVisual } from '../components/TaskVisuals';
import { ArrowRight, ChevronRight, Shield, BookOpen, FlaskConical, CheckCircle2, Lock, Sparkles, RotateCcw } from 'lucide-react';

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
    <div className="min-h-screen bg-[#D7E0D8] text-[#282E28] dark:bg-[#282E28] dark:text-[#D7E0D8] selection:bg-[#354238] selection:text-[#D7E0D8] dark:selection:bg-[#A3B9A5] dark:selection:text-[#1D221E] font-['Inter',sans-serif] transition-colors">
      {/* ─── TOP NAVIGATION BAR ────────────────────────────────────────── */}
      <nav className="bg-[#D7E0D8]/90 dark:bg-[#1D221E]/95 backdrop-blur-md border-b border-[#BAC8BD] dark:border-[#445448] sticky top-0 z-50 px-4 sm:px-10 py-3 sm:py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="cursor-pointer shrink-0" onClick={() => navigate('landing')}>
            <Logo size="md" />
          </div>

          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-[#47564A] dark:text-[#B6C7B8]">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#282E28] dark:hover:text-[#D7E0D8] transition-colors cursor-pointer"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('challenges')}
              className="hover:text-[#282E28] dark:hover:text-[#D7E0D8] transition-colors cursor-pointer"
            >
              Challenges
            </button>
            <button
              onClick={() => navigate('research-info')}
              className="hover:text-[#282E28] dark:hover:text-[#D7E0D8] transition-colors cursor-pointer"
            >
              The research
            </button>
            <button
              onClick={() => navigate('admin-login')}
              className="hover:text-[#282E28] dark:hover:text-[#A3B9A5] transition-colors text-xs text-[#47564A] dark:text-[#B6C7B8] flex items-center gap-1 cursor-pointer"
            >
              <Lock size={12} />
              Researcher login
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />
            <button
              onClick={() => navigate('consent')}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#282E28] hover:bg-[#354238] text-[#D7E0D8] dark:bg-[#A3B9A5] dark:hover:bg-[#D7E0D8] dark:text-[#1D221E] flex items-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>Begin session</span>
              <ArrowRight size={14} className="sm:w-[15px] sm:h-[15px]" />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO SECTION ─────────────────────────────────────────────── */}
      <section className="relative pt-8 sm:pt-16 pb-14 sm:pb-24 px-4 sm:px-10 overflow-hidden bg-gradient-to-b from-[#D7E0D8] via-[#E4EBE5] to-[#D7E0D8] dark:from-[#282E28] dark:via-[#1D221E] dark:to-[#282E28]">
        {/* Ambient lighting glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#354238]/10 dark:bg-[#A3B9A5]/10 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[280px] sm:w-[450px] h-[280px] sm:h-[450px] bg-[#A3B9A5]/15 dark:bg-[#354238]/20 rounded-full blur-[100px] sm:blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center relative z-10">
          {/* Left Hero Column */}
          <div className="lg:col-span-6 animate-fade-in-up">
            {/* Small uppercase category label with horizontal line accent */}
            <div className="inline-flex items-center gap-2 sm:gap-2.5 text-[#354238] dark:text-[#A3B9A5] text-[11px] sm:text-xs font-bold font-['Plus_Jakarta_Sans',sans-serif] uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-4 sm:mb-6">
              <span className="w-6 sm:w-8 h-[2px] bg-[#354238] dark:bg-[#A3B9A5] rounded-full" />
              Cognitive Research Platform
            </div>

            {/* Massive Bold Headline */}
            <h1 className="text-3xl xs:text-4xl sm:text-6xl lg:text-[68px] font-extrabold text-[#282E28] dark:text-[#D7E0D8] leading-[1.08] sm:leading-[1.06] tracking-tight mb-4 sm:mb-6 font-['Plus_Jakarta_Sans',sans-serif]">
              Explore how<br />
              your mind<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#282E28] via-[#354238] to-[#47564A] dark:from-[#A3B9A5] dark:via-[#D7E0D8] dark:to-[#A3B9A5]">
                works.
              </span>
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base lg:text-lg text-[#47564A] dark:text-[#B6C7B8] leading-relaxed mb-6 sm:mb-10 max-w-xl">
              Try four brain games that show how well you plan, remember, pay attention, and switch between ideas.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-8 sm:mb-10">
              <button
                onClick={() => navigate('consent')}
                className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base font-['Plus_Jakarta_Sans',sans-serif] bg-[#282E28] hover:bg-[#354238] text-[#D7E0D8] dark:bg-[#A3B9A5] dark:hover:bg-[#D7E0D8] dark:text-[#1D221E] flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Begin your session
                <ArrowRight size={18} />
              </button>

              <button
                onClick={() => setShowResumeModal(true)}
                className="px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-white hover:bg-[#E4EBE5] border border-[#BAC8BD] hover:border-[#354238] text-[#282E28] dark:bg-[#354238] dark:hover:bg-[#3F4F43] dark:border-[#445448] dark:hover:border-[#A3B9A5] dark:text-[#D7E0D8] flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <RotateCcw size={16} className="text-[#354238] dark:text-[#A3B9A5]" />
                Resume existing session
              </button>

              <button
                onClick={() => navigate('research-info')}
                className="px-4 sm:px-5 py-3 sm:py-4 rounded-xl font-semibold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-white hover:bg-[#E4EBE5] border border-[#BAC8BD] hover:border-[#354238] text-[#282E28] dark:bg-[#354238] dark:hover:bg-[#3F4F43] dark:border-[#445448] dark:hover:border-[#A3B9A5] dark:text-[#D7E0D8] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                Explore research
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Research Trust Indicator */}
            <div className="flex items-center gap-3 sm:gap-3.5 pt-5 sm:pt-6 border-t border-[#BAC8BD] dark:border-[#445448] max-w-lg">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#354238]/10 dark:bg-[#A3B9A5]/20 border border-[#354238]/20 dark:border-[#A3B9A5]/40 flex items-center justify-center flex-shrink-0 text-[#354238] dark:text-[#A3B9A5]">
                <CheckCircle2 size={16} className="sm:w-[18px] sm:h-[18px]" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif]">
                  Research-grade & confidential
                </div>
                <div className="text-[11px] sm:text-xs text-[#47564A] dark:text-[#B6C7B8]">
                  Your responses are securely recorded for academic research
                </div>
              </div>
            </div>
          </div>

          {/* Right Hero Column: Cognitive Network Visualization */}
          <div className="lg:col-span-6 flex justify-center animate-fade-in w-full overflow-hidden">
            <CognitiveNetworkHero onSelectTask={() => navigate('consent')} />
          </div>
        </div>
      </section>

      {/* ─── FOUR CHALLENGES OVERVIEW SECTION ─────────────────────────── */}
      <section id="challenges" className="py-14 sm:py-24 px-4 sm:px-10 border-t border-[#BAC8BD] dark:border-[#445448] bg-white dark:bg-[#1D221E]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E4EBE5] text-[#354238] dark:bg-[#354238] dark:text-[#A3B9A5] text-xs font-bold tracking-widest uppercase mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
              <Sparkles size={13} className="text-[#354238] dark:text-[#A3B9A5]" />
              Four Interactive Tasks
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] mb-3 sm:mb-4">
              Explore Four Cognitive Domains
            </h2>
            <p className="text-xs sm:text-base text-[#47564A] dark:text-[#B6C7B8] max-w-2xl mx-auto leading-relaxed">
              Each challenge focuses on one brain skill at a time, using research-style games made for the web.
            </p>
          </div>

          {/* 4 Challenge Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Challenge 1: Tower of Hanoi */}
            <div className="rounded-2xl p-5 sm:p-6 bg-white border border-[#BAC8BD] hover:border-[#354238] hover:shadow-lg dark:bg-[#354238] dark:border-[#445448] dark:hover:border-[#A3B9A5] transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1">
              <div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E4EBE5] border border-[#CAD5CC] dark:bg-[#282E28] dark:border-[#445448] flex items-center justify-center p-2 mb-4 sm:mb-6 transition-colors">
                  <HanoiVisual size="md" variant="dark" />
                </div>
                <div className="text-[10px] font-bold text-[#354238] dark:text-[#A3B9A5] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif] mb-1">
                  Room 01 · Strategy
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#282E28] dark:text-[#D7E0D8] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  Tower of Hanoi
                </h3>
                <div className="text-xs font-semibold text-[#47564A] dark:text-[#B6C7B8] mb-4 sm:mb-6">
                  Planning & Problem-Solving
                </div>
              </div>
              <div className="pt-3 sm:pt-4 border-t border-[#E4EBE5] dark:border-[#445448] flex items-center justify-between text-xs text-[#47564A] dark:text-[#A3B9A5] font-['Plus_Jakarta_Sans',sans-serif] font-semibold">
                <span>6 puzzles</span>
                <span>~12 min</span>
              </div>
            </div>

            {/* Challenge 2: Backward Corsi Block */}
            <div className="rounded-2xl p-5 sm:p-6 bg-white border border-[#BAC8BD] hover:border-[#354238] hover:shadow-lg dark:bg-[#354238] dark:border-[#445448] dark:hover:border-[#A3B9A5] transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1">
              <div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E4EBE5] border border-[#CAD5CC] dark:bg-[#282E28] dark:border-[#445448] flex items-center justify-center p-2 mb-4 sm:mb-6 transition-colors">
                  <CorsiVisual size="md" variant="dark" />
                </div>
                <div className="text-[10px] font-bold text-[#354238] dark:text-[#A3B9A5] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif] mb-1">
                  Room 02 · Memory
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#282E28] dark:text-[#D7E0D8] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  Backward Corsi Block
                </h3>
                <div className="text-xs font-semibold text-[#47564A] dark:text-[#B6C7B8] mb-4 sm:mb-6">
                  Spatial Working Memory
                </div>
              </div>
              <div className="pt-3 sm:pt-4 border-t border-[#E4EBE5] dark:border-[#445448] flex items-center justify-between text-xs text-[#47564A] dark:text-[#A3B9A5] font-['Plus_Jakarta_Sans',sans-serif] font-semibold">
                <span>8 levels</span>
                <span>~8–10 min</span>
              </div>
            </div>

            {/* Challenge 3: Stroop Task */}
            <div className="rounded-2xl p-5 sm:p-6 bg-white border border-[#BAC8BD] hover:border-[#354238] hover:shadow-lg dark:bg-[#354238] dark:border-[#445448] dark:hover:border-[#A3B9A5] transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1">
              <div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E4EBE5] border border-[#CAD5CC] dark:bg-[#282E28] dark:border-[#445448] flex items-center justify-center p-2 mb-4 sm:mb-6 transition-colors">
                  <StroopVisual size="md" variant="dark" />
                </div>
                <div className="text-[10px] font-bold text-[#354238] dark:text-[#A3B9A5] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif] mb-1">
                  Room 03 · Attention
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#282E28] dark:text-[#D7E0D8] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  Stroop Task
                </h3>
                <div className="text-xs font-semibold text-[#47564A] dark:text-[#B6C7B8] mb-4 sm:mb-6">
                  Selective Attention & Control
                </div>
              </div>
              <div className="pt-3 sm:pt-4 border-t border-[#E4EBE5] dark:border-[#445448] flex items-center justify-between text-xs text-[#47564A] dark:text-[#A3B9A5] font-['Plus_Jakarta_Sans',sans-serif] font-semibold">
                <span>128 trials</span>
                <span>~7 min</span>
              </div>
            </div>

            {/* Challenge 4: Task Switching */}
            <div className="rounded-2xl p-5 sm:p-6 bg-white border border-[#BAC8BD] hover:border-[#354238] hover:shadow-lg dark:bg-[#354238] dark:border-[#445448] dark:hover:border-[#A3B9A5] transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1">
              <div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E4EBE5] border border-[#CAD5CC] dark:bg-[#282E28] dark:border-[#445448] flex items-center justify-center p-1.5 mb-4 sm:mb-6 transition-colors">
                  <TaskSwitchingVisual size="md" variant="dark" />
                </div>
                <div className="text-[10px] font-bold text-[#354238] dark:text-[#A3B9A5] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif] mb-1">
                  Room 04 · Flexibility
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#282E28] dark:text-[#D7E0D8] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  Task Switching
                </h3>
                <div className="text-xs font-semibold text-[#47564A] dark:text-[#B6C7B8] mb-4 sm:mb-6">
                  Cognitive Flexibility
                </div>
              </div>
              <div className="pt-3 sm:pt-4 border-t border-[#E4EBE5] dark:border-[#445448] flex items-center justify-between text-xs text-[#47564A] dark:text-[#A3B9A5] font-['Plus_Jakarta_Sans',sans-serif] font-semibold">
                <span>64 trials</span>
                <span>~6 min</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS / RESEARCH PROTOCOL ─────────────────────────── */}
      <section id="how-it-works" className="py-14 sm:py-24 px-4 sm:px-10 border-t border-[#BAC8BD] dark:border-[#445448] bg-[#D7E0D8] dark:bg-[#282E28]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-5">
            <div className="text-[11px] sm:text-xs font-bold text-[#354238] dark:text-[#A3B9A5] uppercase tracking-[0.2em] mb-2 sm:mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
              Study Information
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] mb-4 sm:mb-6 leading-tight">
              Rigorous Cognitive Science on the Modern Web
            </h2>
            <p className="text-xs sm:text-sm text-[#47564A] dark:text-[#B6C7B8] leading-relaxed mb-4 sm:mb-6">
              MindLab has brain tests built to measure how the mind works. Every click and answer is timed to the millisecond. The tests check how often you get things right, how fast you respond, and how long it takes to switch from one task to another.
            </p>
            <p className="text-xs sm:text-sm text-[#47564A] dark:text-[#B6C7B8] leading-relaxed mb-6 sm:mb-8">
              Participation is voluntary, anonymous, and strictly non-diagnostic. Results are recorded for empirical behavioral research.
            </p>
            <button
              onClick={() => navigate('research-info')}
              className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl font-semibold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-white hover:bg-[#E4EBE5] border border-[#BAC8BD] text-[#282E28] dark:bg-[#354238] dark:hover:bg-[#3F4F43] dark:border-[#445448] dark:text-[#D7E0D8] flex items-center gap-2 transition-all w-full sm:w-auto justify-center cursor-pointer shadow-xs"
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
                color: '#354238',
              },
              {
                icon: BookOpen,
                title: 'Informed Consent',
                desc: 'Complete protocol guidelines and data governance policies are presented prior to the start of any testing session.',
                color: '#47564A',
              },
              {
                icon: FlaskConical,
                title: 'See how your mind is working',
                desc: 'Observe how you plan, focus, remember, and adapt in real time across four distinct brain challenges.',
                color: '#282E28',
              },
              {
                icon: Lock,
                title: 'Non-Diagnostic',
                desc: 'Tasks evaluate specific experimental cognitive metrics and do not measure or imply overall intelligence, clinical condition, or health.',
                color: '#354238',
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="p-5 sm:p-6 rounded-2xl bg-white border border-[#BAC8BD] dark:bg-[#354238] dark:border-[#445448] shadow-xs">
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-3 sm:mb-4 bg-[#E4EBE5] dark:bg-[#282E28] text-[#282E28] dark:text-[#A3B9A5]"
                >
                  <Icon size={18} className="sm:w-5 sm:h-5" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#282E28] dark:text-[#D7E0D8] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  {title}
                </h3>
                <p className="text-xs text-[#47564A] dark:text-[#B6C7B8] leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── READY TO BEGIN CALL TO ACTION ────────────────────────────── */}
      <section className="py-14 sm:py-24 px-4 sm:px-10 border-t border-[#BAC8BD] dark:border-[#445448] bg-gradient-to-b from-[#E4EBE5] to-[#D7E0D8] dark:from-[#354238] dark:to-[#1D221E] text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#354238]/10 dark:bg-[#A3B9A5]/20 border border-[#354238]/20 dark:border-[#A3B9A5]/40 flex items-center justify-center mx-auto mb-4 sm:mb-6 text-[#282E28] dark:text-[#A3B9A5]">
            <Sparkles size={24} className="sm:w-7 sm:h-7" />
          </div>
          <h2 className="text-2xl sm:text-5xl font-extrabold text-[#282E28] dark:text-[#D7E0D8] mb-3 sm:mb-4 font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
            Ready to Explore Your Mind?
          </h2>
          <p className="text-xs sm:text-base text-[#47564A] dark:text-[#B6C7B8] mb-6 sm:mb-10 max-w-xl mx-auto leading-relaxed">
            The full testing session takes approximately 25 minutes. Find a comfortable, quiet environment to begin your cognitive challenges.
          </p>
          <button
            onClick={() => navigate('consent')}
            className="px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base font-['Plus_Jakarta_Sans',sans-serif] bg-[#282E28] hover:bg-[#354238] text-[#D7E0D8] dark:bg-[#A3B9A5] dark:hover:bg-[#D7E0D8] dark:text-[#1D221E] inline-flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all hover:scale-[1.03] active:scale-[0.98] w-full sm:w-auto cursor-pointer"
          >
            Start Research Session
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-[#BAC8BD] dark:border-[#445448] bg-[#282E28] dark:bg-[#1D221E] px-4 sm:px-10 py-8 sm:py-10 text-[#D7E0D8]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" variant="white" />
          </div>
          <p className="text-[11px] sm:text-xs text-[#B6C7B8] text-center">
            MindLab Research Platform · For academic cognitive psychology research only · Not a diagnostic tool
          </p>
          <button
            onClick={() => navigate('admin-login')}
            className="text-xs font-semibold text-[#A3B9A5] hover:text-white transition-colors cursor-pointer"
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
