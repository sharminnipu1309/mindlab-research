import { useState } from 'react';
import { Page } from '../../types';
import Logo from '../../components/Logo';
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

import { signInAdmin } from '../../services/adminService';

interface Props {
  navigate: (page: Page) => void;
  onLogin: () => void;
}

export default function AdminLogin({ navigate, onLogin }: Props) {
  const [email, setEmail] = useState('admin@mindlab.io');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) { setError('Please enter the admin password.'); return; }

    setLoading(true);
    try {
      const result = await signInAdmin(password, email);
      if (result.success) {
        onLogin();
        navigate('admin-dashboard');
      } else {
        setError(result.error || 'Authentication failed. (Hint: try "mindlab2024")');
        setLoading(false);
      }
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#D7E0D8] dark:bg-[#282E28] flex transition-colors duration-200">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-[480px] bg-[#1D221E] relative overflow-hidden flex-shrink-0 border-r border-[#354238]">
        {/* Abstract bg art */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 480 800" fill="none" preserveAspectRatio="xMidYMid slice">
          <circle cx="100" cy="200" r="180" stroke="#A3B9A5" strokeWidth="1" opacity="0.2" />
          <circle cx="400" cy="600" r="220" stroke="#D7E0D8" strokeWidth="1" opacity="0.15" />
          <circle cx="240" cy="400" r="100" stroke="#A3B9A5" strokeWidth="1" opacity="0.2" />
          <line x1="100" y1="200" x2="240" y2="400" stroke="#A3B9A5" strokeWidth="1" opacity="0.3" />
          <line x1="240" y1="400" x2="400" y2="600" stroke="#D7E0D8" strokeWidth="1" opacity="0.25" />
          <line x1="100" y1="200" x2="400" y2="600" stroke="#A3B9A5" strokeWidth="0.5" opacity="0.2" />
          <circle cx="100" cy="200" r="8" fill="#A3B9A5" opacity="0.6" />
          <circle cx="240" cy="400" r="12" fill="#A3B9A5" opacity="0.8" />
          <circle cx="400" cy="600" r="8" fill="#D7E0D8" opacity="0.6" />
          <circle cx="340" cy="150" r="4" fill="#D7E0D8" opacity="0.4" />
          <circle cx="80" cy="500" r="5" fill="#A3B9A5" opacity="0.4" />
          <circle cx="420" cy="300" r="4" fill="#A3B9A5" opacity="0.4" />
        </svg>

        <div className="relative z-10 flex flex-col h-full p-10">
          <Logo size="md" variant="white" />

          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-8">
              <div className="text-xs font-bold text-[#A3B9A5] uppercase tracking-widest mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
                Researcher Access
              </div>
              <h2 className="text-3xl font-bold text-[#D7E0D8] mb-4 font-['Plus_Jakarta_Sans',sans-serif] leading-tight">
                Cognitive Research Administration
              </h2>
              <p className="text-[#D7E0D8]/80 text-sm leading-relaxed">
                Secure access for authorized researchers to manage participants, configure experiments, and analyze cognitive performance data.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Participant Management', desc: 'View and manage all research participants' },
                { label: 'Experiment Configuration', desc: 'Configure cognitive experiment parameters' },
                { label: 'Research Analysis', desc: 'Trial-level data, charts, and statistical summaries' },
                { label: 'Data Export', desc: 'Export CSV/Excel datasets for analysis' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#A3B9A5] mt-2 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif]">{label}</div>
                    <div className="text-xs text-[#D7E0D8]/70">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-[#A3B9A5]/60">
            MindLab Research Platform · Academic use only
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-8 py-16">
        <div className="w-full max-w-md bg-white dark:bg-[#354238] rounded-2xl border border-[#BAC8BD] dark:border-[#445448] p-6 sm:p-10 shadow-lg">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="mb-8">
            <div className="w-12 h-12 bg-[#E4EBE5] dark:bg-[#282E28] rounded-xl flex items-center justify-center mb-4 text-[#282E28] dark:text-[#A3B9A5]">
              <Lock size={22} />
            </div>
            <h1 className="text-2xl font-bold text-[#282E28] dark:text-[#D7E0D8] mb-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
              Researcher Login
            </h1>
            <p className="text-sm text-[#47564A] dark:text-[#B6C7B8]">Sign in to access the research administration area.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#282E28] dark:text-[#D7E0D8] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="ml-input"
                placeholder="admin@mindlab.io"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#282E28] dark:text-[#D7E0D8] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className={`ml-input pr-11 ${error ? 'error' : ''}`}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#47564A] dark:text-[#B6C7B8] hover:text-[#282E28] dark:hover:text-[#D7E0D8] p-1 rounded"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && (
                <div className="flex items-center gap-1.5 text-xs text-[#EF4444] mt-2">
                  <AlertCircle size={13} /> {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-sm mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <>
                  Sign In to Admin Area
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#BAC8BD] dark:border-[#445448] flex items-center justify-between text-xs text-[#47564A] dark:text-[#B6C7B8]">
            <button onClick={() => navigate('landing')} className="hover:text-[#282E28] dark:hover:text-[#D7E0D8] transition-colors">
              ← Back to participant site
            </button>
            <span className="bg-[#E4EBE5] dark:bg-[#1D221E] border border-[#BAC8BD] dark:border-[#445448] rounded px-2 py-1 font-['JetBrains_Mono',monospace] text-[#282E28] dark:text-[#D7E0D8]">
              Demo: mindlab2024
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
