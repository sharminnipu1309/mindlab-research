import { useState } from 'react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { Page } from '../types';
import {
  LayoutDashboard, Users, FlaskConical, BarChart3, Activity,
  LineChart, Download, Settings, LogOut, Bell, ChevronRight,
  Menu, X, Zap, Repeat
} from 'lucide-react';

type AdminPage = 'admin-dashboard' | 'admin-participants' | 'admin-experiments' |
  'admin-hanoi-analysis' | 'admin-corsi-analysis' | 'admin-stroop-analysis' | 'admin-task-switching-analysis' |
  'admin-graphs' | 'admin-exports' | 'admin-settings';

interface AdminLayoutProps {
  currentPage: Page;
  navigate: (page: Page) => void;
  onLogout: () => void;
  children: React.ReactNode;
  pageTitle: string;
  breadcrumb?: string;
}

const navItems = [
  { id: 'admin-dashboard' as AdminPage, label: 'Overview', icon: LayoutDashboard, group: 'main' },
  { id: 'admin-participants' as AdminPage, label: 'Participants', icon: Users, group: 'main' },
  { id: 'admin-experiments' as AdminPage, label: 'Experiments', icon: FlaskConical, group: 'main' },
  { id: 'admin-hanoi-analysis' as AdminPage, label: 'Tower of Hanoi', icon: BarChart3, group: 'analysis' },
  { id: 'admin-corsi-analysis' as AdminPage, label: 'Corsi Analysis', icon: Activity, group: 'analysis' },
  { id: 'admin-stroop-analysis' as AdminPage, label: 'Stroop Analysis', icon: Zap, group: 'analysis' },
  { id: 'admin-task-switching-analysis' as AdminPage, label: 'Task Switching', icon: Repeat, group: 'analysis' },
  { id: 'admin-graphs' as AdminPage, label: 'Graphs & Insights', icon: LineChart, group: 'analysis' },
  { id: 'admin-exports' as AdminPage, label: 'Data Exports', icon: Download, group: 'data' },
  { id: 'admin-settings' as AdminPage, label: 'Settings', icon: Settings, group: 'data' },
];

const groupLabels: Record<string, string> = {
  main: 'Research',
  analysis: 'Analysis',
  data: 'Data',
};

const SIDEBAR_STORAGE_KEY = 'mindlab_admin_sidebar_expanded';

function getInitialSidebarState(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.innerWidth < 768) return false;
  const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  return saved !== null ? saved === 'true' : true;
}

export default function AdminLayout({ currentPage, navigate, onLogout, children, pageTitle, breadcrumb }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(getInitialSidebarState);
  const [notifOpen, setNotifOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      }
      return next;
    });
  };

  const groups = ['main', 'analysis', 'data'];

  return (
    <div className="flex h-screen bg-[#EAF4F8] dark:bg-[#111C23] overflow-hidden relative transition-colors duration-200">
      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onClick={e => e.stopPropagation()}
        className={`fixed md:relative inset-y-0 left-0 z-40 ${
          sidebarOpen ? 'w-60 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-16'
        } flex-shrink-0 bg-white dark:bg-[#203541] border-r border-[#C5DCE4] dark:border-[#2D4654] flex flex-col transition-all duration-300 overflow-hidden shadow-lg md:shadow-none`}
      >
        {/* Logo area */}
        <div className="p-4 sm:p-5 border-b border-[#C5DCE4] dark:border-[#2D4654] flex items-center justify-between min-h-[60px] sm:min-h-[65px] gap-2">
          <button
            type="button"
            onClick={() => {
              navigate('admin-dashboard');
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity text-left focus:outline-hidden cursor-pointer"
            title="Go to Overview (Dashboard)"
          >
            {sidebarOpen ? (
              <Logo size="sm" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#4D91AD] dark:bg-[#63B8C6] flex items-center justify-center mx-auto shadow-xs">
                <span className="text-white dark:text-[#111C23] text-xs font-bold font-['Plus_Jakarta_Sans',sans-serif]">M</span>
              </div>
            )}
          </button>
          {sidebarOpen && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="text-[#526E7B] dark:text-[#9BB5C4] hover:text-[#263B46] dark:hover:text-[#EAF4F8] p-1.5 rounded-md hover:bg-[#D5E8EF] dark:hover:bg-[#192831] cursor-pointer"
              aria-label="Collapse navigation menu"
              title="Collapse sidebar"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto custom-scroll">
          {groups.map((group, gi) => {
            const items = navItems.filter(n => n.group === group);
            return (
              <div key={group} className={gi > 0 ? 'mt-2' : ''}>
                {sidebarOpen && (
                  <div className="px-4 py-2 text-[10px] font-semibold text-[#526E7B] dark:text-[#9BB5C4] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">
                    {groupLabels[group]}
                  </div>
                )}
                {!sidebarOpen && gi > 0 && <div className="my-2 mx-3 h-px bg-[#C5DCE4] dark:border-[#2D4654]" />}
                {items.map(item => {
                  const Icon = item.icon;
                  const active = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate(item.id as Page);
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 mx-0 text-sm font-medium transition-all relative group cursor-pointer ${
                        active
                          ? 'text-[#4D91AD] dark:text-[#63B8C6] bg-[#D5E8EF] dark:bg-[#192831] font-bold'
                          : 'text-[#526E7B] dark:text-[#9BB5C4] hover:text-[#263B46] dark:hover:text-[#EAF4F8] hover:bg-[#EAF4F8] dark:hover:bg-[#192831]'
                      }`}
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      {active && (
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#4D91AD] dark:bg-[#63B8C6] rounded-r-full" />
                      )}
                      <Icon size={17} className="flex-shrink-0" />
                      {sidebarOpen && (
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[13px]">
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Admin profile */}
        <div className={`border-t border-[#C5DCE4] dark:border-[#2D4654] p-4 ${sidebarOpen ? '' : 'flex justify-center'}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#4D91AD] dark:bg-[#63B8C6] flex items-center justify-center flex-shrink-0">
                <span className="text-white dark:text-[#111C23] text-xs font-bold font-['Plus_Jakarta_Sans',sans-serif]">R</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#263B46] dark:text-[#EAF4F8] truncate font-['Plus_Jakarta_Sans',sans-serif]">Researcher</div>
                <div className="text-[11px] text-[#526E7B] dark:text-[#9BB5C4] truncate">admin@memtiva.io</div>
              </div>
              <button
                onClick={onLogout}
                className="ml-auto text-[#526E7B] dark:text-[#9BB5C4] hover:text-[#EF4444] p-1.5 rounded transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut size={15} />
              </button>
              <div className="w-full mt-2 pt-2 border-t border-[#C5DCE4]/50 dark:border-[#2D4654]/50 text-[10px] text-[#526E7B] dark:text-[#9BB5C4] text-center font-['Plus_Jakarta_Sans',sans-serif]">
                <span>Designed &amp; Developed with Care 🧠 by</span>
                <span className="font-semibold text-[#263B46] dark:text-[#EAF4F8] ml-1">Nipu Basher</span>
              </div>
            </div>
          ) : (
            <button
              onClick={onLogout}
              className="text-[#526E7B] dark:text-[#9BB5C4] hover:text-[#EF4444] p-1.5 rounded transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-[#192831] border-b border-[#C5DCE4] dark:border-[#2D4654] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0 min-h-[60px] sm:min-h-[65px]">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={toggleSidebar}
              className="text-[#526E7B] dark:text-[#9BB5C4] hover:text-[#263B46] dark:hover:text-[#EAF4F8] p-1.5 rounded-lg hover:bg-[#D5E8EF] dark:hover:bg-[#111C23] flex-shrink-0 cursor-pointer"
              aria-label="Toggle navigation menu"
              title="Toggle sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              {breadcrumb && (
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#526E7B] dark:text-[#9BB5C4] mb-0.5 font-['Plus_Jakarta_Sans',sans-serif] truncate">
                  <span>Admin</span>
                  <ChevronRight size={12} />
                  <span className="truncate">{breadcrumb}</span>
                </div>
              )}
              <h1 className="text-sm sm:text-base font-bold text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif] truncate">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <ThemeToggle />
            <div className="text-[11px] sm:text-xs text-[#526E7B] dark:text-[#9BB5C4] bg-[#D5E8EF] dark:bg-[#203541] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[#C5DCE4] dark:border-[#2D4654] font-['Plus_Jakarta_Sans',sans-serif]">
              <span className="text-[#4D91AD] dark:text-[#63B8C6] font-bold">●</span>{' '}
              <span className="font-medium hidden xs:inline">Demo Data</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-[#526E7B] dark:text-[#9BB5C4] hover:text-[#263B46] dark:hover:text-[#EAF4F8] rounded-lg hover:bg-[#D5E8EF] dark:hover:bg-[#111C23] transition-colors cursor-pointer"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#4D91AD] dark:bg-[#63B8C6] rounded-full" />
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#203541] rounded-xl border border-[#C5DCE4] dark:border-[#2D4654] shadow-xl z-20 animate-fade-in-up">
                    <div className="p-4 border-b border-[#C5DCE4] dark:border-[#2D4654]">
                      <span className="text-sm font-semibold text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif]">Notifications</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex gap-3 items-start">
                        <div className="w-2 h-2 bg-[#4D91AD] dark:bg-[#63B8C6] rounded-full mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-[#263B46] dark:text-[#EAF4F8]">New participant registered</p>
                          <p className="text-xs text-[#526E7B] dark:text-[#9BB5C4]">ML-0012 — 2 minutes ago</p>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <div className="w-2 h-2 bg-[#63B8C6] dark:text-[#63B8C6] rounded-full mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-[#263B46] dark:text-[#EAF4F8]">Session completed</p>
                          <p className="text-xs text-[#526E7B] dark:text-[#9BB5C4]">ML-0011 — 18 minutes ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto custom-scroll">
          <div className="p-3 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
