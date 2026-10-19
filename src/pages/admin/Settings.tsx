import { useState } from 'react';
import { Page } from '../../types';
import AdminLayout from '../../components/AdminLayout';
import { Save, AlertTriangle, CheckCircle, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface Props {
  navigate: (page: Page) => void;
  onLogout: () => void;
  currentPage: Page;
}

type SettingsTab = 'research' | 'consent' | 'privacy' | 'account' | 'interface';

export default function Settings({ navigate, onLogout, currentPage }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('research');
  const [saved, setSaved] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'research', label: 'Research Info' },
    { id: 'consent', label: 'Consent Text' },
    { id: 'privacy', label: 'Data & Privacy' },
    { id: 'account', label: 'Admin Account' },
    { id: 'interface', label: 'Interface' },
  ];

  return (
    <AdminLayout
      currentPage={currentPage}
      navigate={navigate}
      onLogout={onLogout}
      pageTitle="Settings"
      breadcrumb="Settings"
    >
      {saved && (
        <div className="flex items-center gap-2 bg-[#D1EDE5] border border-[#4A9B7F]/20 rounded-xl p-4 mb-5 text-sm text-[#4A9B7F] font-medium">
          <CheckCircle size={16} />
          Settings saved successfully.
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
        {/* Sidebar nav */}
        <div className="w-full md:w-48 flex-shrink-0">
          <div className="bg-white rounded-xl border border-[#E9E8F2] p-1.5 md:p-2 flex flex-row md:flex-col overflow-x-auto gap-1 md:space-y-0.5 custom-scroll">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-shrink-0 md:w-full text-left px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold font-['Plus_Jakarta_Sans',sans-serif] transition-all flex items-center justify-between whitespace-nowrap ${
                  activeTab === id ? 'bg-[#EDEAF8] text-[#6567C9]' : 'text-[#73758C] hover:bg-[#F8F8FC] hover:text-[#252640]'
                }`}
              >
                <span>{label}</span>
                {activeTab === id && <ChevronRight size={13} className="hidden md:inline ml-2" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-full md:max-w-xl">
          {activeTab === 'research' && (
            <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-7 space-y-4 sm:space-y-5">
              <h3 className="text-sm font-bold text-[#252640] mb-5 font-['Plus_Jakarta_Sans',sans-serif]">Research Information</h3>
              {[
                { label: 'Study title', value: 'Cognitive Performance Study 2024', type: 'text' },
                { label: 'Principal researcher', value: 'Dr. Researcher Name', type: 'text' },
                { label: 'Institution', value: 'Department of Psychology', type: 'text' },
                { label: 'Ethics reference number', value: 'ETH-2024-COG-001', type: 'text', mono: true },
                { label: 'Contact email', value: 'research@institution.ac.uk', type: 'email' },
              ].map(({ label, value, type, mono }) => (
                <div key={label}>
                  <label className="block text-sm font-semibold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">{label}</label>
                  <input
                    type={type}
                    defaultValue={value}
                    className={`ml-input text-sm ${mono ? 'font-["JetBrains_Mono",monospace]' : ''}`}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Study description (shown to participants)</label>
                <textarea
                  defaultValue="This study is part of academic research in cognitive psychology. We are investigating how individuals perform on tasks that assess planning and problem-solving, spatial working memory, selective attention and interference control, and cognitive flexibility."
                  rows={3}
                  className="ml-input text-sm resize-none"
                />
              </div>
              <button onClick={handleSave} className="btn-primary text-sm">
                <Save size={14} /> Save changes
              </button>
            </div>
          )}

          {activeTab === 'consent' && (
            <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-7 space-y-4 sm:space-y-5">
              <h3 className="text-sm font-bold text-[#252640] mb-1 font-['Plus_Jakarta_Sans',sans-serif]">Participant Consent Text</h3>
              <p className="text-xs text-[#73758C] mb-5">This text is displayed to participants before they register. Ensure it accurately reflects your ethical approval.</p>
              <div className="bg-[#FCEFD9] border border-[#F0CFA0] rounded-xl p-4 flex gap-3 mb-5">
                <AlertTriangle size={15} className="text-[#D4813A] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#8B5A1F]">
                  Consent text should be reviewed and approved by your institution's ethics committee before use with real participants.
                </p>
              </div>
              {[
                { label: 'Consent statement items', value: 'I have read and understood the research information provided.\nI understand that participation is voluntary.\nI understand that my data may be recorded for research purposes.\nI am 16 years of age or older.', rows: 6 },
                { label: 'Voluntary participation note', value: 'Participation in this study is entirely voluntary. You may withdraw at any time without consequence.', rows: 3 },
                { label: 'Data usage statement', value: 'Your data will be used for academic research purposes and handled in accordance with ethical guidelines.', rows: 3 },
              ].map(({ label, value, rows }) => (
                <div key={label}>
                  <label className="block text-sm font-semibold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">{label}</label>
                  <textarea
                    defaultValue={value}
                    rows={rows}
                    className="ml-input text-sm resize-none"
                  />
                </div>
              ))}
              <button onClick={handleSave} className="btn-primary text-sm">
                <Save size={14} /> Save consent text
              </button>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-7 space-y-4 sm:space-y-5">
              <h3 className="text-sm font-bold text-[#252640] mb-5 font-['Plus_Jakarta_Sans',sans-serif]">Data & Privacy Settings</h3>
              {[
                { label: 'Collect participant names', desc: 'Names are visible in the admin area only and not included in research outputs.', enabled: true },
                { label: 'Collect email addresses (optional)', desc: 'Email is optional for participants and not linked to research data.', enabled: true },
                { label: 'Record move-level timestamps', desc: 'Precise timestamps for each move event.', enabled: true },
                { label: 'Record invalid move attempts', desc: 'Track and store invalid move counts per puzzle.', enabled: true },
                { label: 'Allow data correction after session', desc: 'Allow researchers to annotate or flag trial data after collection.', enabled: false },
              ].map(({ label, desc, enabled }) => (
                <div key={label} className="flex items-start justify-between py-3 border-b border-[#F3F2FA] last:border-0 gap-4">
                  <div>
                    <div className="text-sm font-medium text-[#252640]">{label}</div>
                    <div className="text-xs text-[#9597AB] mt-0.5">{desc}</div>
                  </div>
                  <div
                    className={`flex-shrink-0 w-10 h-6 rounded-full transition-all cursor-pointer relative ${enabled ? 'bg-[#6567C9]' : 'bg-[#E9E8F2]'}`}
                    onClick={() => {}}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-5' : 'left-1'}`} />
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Data retention period</label>
                <select className="ml-input text-sm w-48">
                  <option>12 months</option>
                  <option>24 months</option>
                  <option>36 months</option>
                  <option>Indefinite</option>
                </select>
              </div>
              <button onClick={handleSave} className="btn-primary text-sm">
                <Save size={14} /> Save settings
              </button>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-7 space-y-4 sm:space-y-5">
              <h3 className="text-sm font-bold text-[#252640] mb-5 font-['Plus_Jakarta_Sans',sans-serif]">Admin Account</h3>
              <div className="flex items-center gap-4 p-4 bg-[#F8F8FC] rounded-xl border border-[#E9E8F2] mb-5">
                <div className="w-12 h-12 bg-[#6567C9] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold font-['Plus_Jakarta_Sans',sans-serif]">R</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">Researcher Admin</div>
                  <div className="text-xs text-[#73758C]">admin@memtiva.io</div>
                </div>
              </div>
              {[
                { label: 'Display name', value: 'Researcher Admin', type: 'text' },
                { label: 'Email address', value: 'admin@memtiva.io', type: 'email' },
              ].map(({ label, value, type }) => (
                <div key={label}>
                  <label className="block text-sm font-semibold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">{label}</label>
                  <input type={type} defaultValue={value} className="ml-input text-sm" />
                </div>
              ))}
              <div className="pt-4 border-t border-[#E9E8F2]">
                <h4 className="text-sm font-semibold text-[#252640] mb-4 font-['Plus_Jakarta_Sans',sans-serif]">Change Password</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Current password', placeholder: 'Enter current password' },
                    { label: 'New password', placeholder: 'Enter new password' },
                    { label: 'Confirm new password', placeholder: 'Confirm new password' },
                  ].map(({ label, placeholder }) => (
                    <div key={label}>
                      <label className="block text-sm font-semibold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">{label}</label>
                      <div className="relative">
                        <input
                          type={showPw ? 'text' : 'password'}
                          placeholder={placeholder}
                          className="ml-input text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9597AB] hover:text-[#73758C]"
                        >
                          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleSave} className="btn-primary text-sm">
                <Save size={14} /> Update account
              </button>
            </div>
          )}

          {activeTab === 'interface' && (
            <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-7 space-y-4 sm:space-y-5">
              <h3 className="text-sm font-bold text-[#252640] mb-5 font-['Plus_Jakarta_Sans',sans-serif]">Interface Preferences</h3>
              {[
                { label: 'Compact table rows', desc: 'Reduce row height in data tables', enabled: false },
                { label: 'Show participant email in tables', desc: 'Display email column in participant management', enabled: false },
                { label: 'Auto-expand drawers on row click', desc: 'Open detail drawer automatically when clicking table rows', enabled: true },
                { label: 'Show demo data badge', desc: 'Display "Demo Data" badge in the admin header', enabled: true },
              ].map(({ label, desc, enabled }) => (
                <div key={label} className="flex items-start justify-between py-3 border-b border-[#F3F2FA] last:border-0 gap-4">
                  <div>
                    <div className="text-sm font-medium text-[#252640]">{label}</div>
                    <div className="text-xs text-[#9597AB] mt-0.5">{desc}</div>
                  </div>
                  <div
                    className={`flex-shrink-0 w-10 h-6 rounded-full transition-all cursor-pointer relative ${enabled ? 'bg-[#6567C9]' : 'bg-[#E9E8F2]'}`}
                    onClick={() => {}}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-5' : 'left-1'}`} />
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Table rows per page</label>
                <select className="ml-input text-sm w-24">
                  {[10, 20, 50, 100].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <button onClick={handleSave} className="btn-primary text-sm">
                <Save size={14} /> Save preferences
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
