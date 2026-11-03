import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Headphones, 
  Languages, 
  FileText, 
  Mic, 
  BarChart3, 
  Settings as SettingsIcon, 
  LayoutDashboard, 
  Flame, 
  Timer, 
  Play, 
  Pause,
  Menu,
  X
} from 'lucide-react';

export type NavTab = 
  | 'dashboard' 
  | 'vocabulary' 
  | 'listening' 
  | 'grammar' 
  | 'reading' 
  | 'speaking' 
  | 'progress' 
  | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  streak: number;
  todaySeconds: number;
  goalMinutes: number;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  streak,
  todaySeconds,
  goalMinutes,
  isTimerRunning,
  onToggleTimer,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const navItems: { id: NavTab; label: string; zh: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', zh: '仪表盘', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'vocabulary', label: 'Vocabulary', zh: '词汇', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'listening', label: 'Listening', zh: '听力', icon: <Headphones className="w-4 h-4" /> },
    { id: 'grammar', label: 'Grammar', zh: '语法', icon: <Languages className="w-4 h-4" /> },
    { id: 'reading', label: 'Reading', zh: '阅读', icon: <FileText className="w-4 h-4" /> },
    { id: 'speaking', label: 'Speaking', zh: '口语', icon: <Mic className="w-4 h-4" /> },
    { id: 'progress', label: 'My Progress', zh: '进度', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', zh: '设置', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Strict 3-zone Top Bar Contract: Brand - Nav Links - Primary Action/Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        
        {/* Zone 1: Single text element wordmark with CEFR target */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => handleTabClick('dashboard')}
            className="flex items-center gap-2.5 text-left group focus-visible:outline-hidden"
          >
            <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold text-lg shadow-xs group-hover:bg-sky-600 transition-colors">
              ME
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-sky-600 transition-colors whitespace-nowrap block">
                My English
              </span>
              <span className="text-[11px] font-medium text-slate-400 block -mt-1">
                我的英语 · A2 → B1
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary action / Study tracker bar */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Daily streak indicator */}
          <div 
            title={`Daily streak: ${streak} day(s)`}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200/60 rounded-lg text-amber-700 text-xs font-semibold tabular-nums"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{streak}d</span>
          </div>

          {/* Interactive study timer */}
          <button
            onClick={onToggleTimer}
            title={isTimerRunning ? 'Pause study timer' : 'Start study timer'}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap shrink-0 ${
              isTimerRunning
                ? 'bg-sky-500 text-white border-sky-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {isTimerRunning ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 text-sky-600" />
            )}
            <span className="tabular-nums font-semibold">{formatTime(todaySeconds)}</span>
            <span className="hidden sm:inline text-[11px] opacity-80">/ {goalMinutes}m</span>
          </button>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg animate-in fade-in duration-150">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg text-left ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <span className="text-xs text-slate-400">{item.zh}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
