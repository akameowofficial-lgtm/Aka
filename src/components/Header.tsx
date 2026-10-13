import React from 'react';
import { 
  Sparkles, 
  Settings as SettingsIcon, 
  FolderClock,
  Smartphone,
  Monitor,
  Zap,
  Crop
} from 'lucide-react';
import { AppTab } from '../types';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenSettings: () => void;
  isMobileLayout: boolean;
  onToggleMobileLayout: () => void;
  savedWorksCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
  isMobileLayout,
  onToggleMobileLayout,
  savedWorksCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div 
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none group whitespace-nowrap shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              MarkClear
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => onSelectTab('home')}
            className={`whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer ${
              activeTab === 'home' ? 'text-indigo-400 font-semibold' : ''
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onSelectTab('video_remover')}
            className={`whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer ${
              activeTab === 'video_remover' ? 'text-indigo-400 font-semibold' : ''
            }`}
          >
            Video Watermark
          </button>
          <button
            onClick={() => onSelectTab('image_remover')}
            className={`whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer ${
              activeTab === 'image_remover' ? 'text-indigo-400 font-semibold' : ''
            }`}
          >
            Photo Watermark
          </button>
          <button
            onClick={() => onSelectTab('subtitle_remover')}
            className={`whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer ${
              activeTab === 'subtitle_remover' ? 'text-indigo-400 font-semibold' : ''
            }`}
          >
            AI Subtitles
          </button>
          <button
            onClick={() => onSelectTab('video_crop')}
            className={`whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer ${
              activeTab === 'video_crop' ? 'text-indigo-400 font-semibold' : ''
            }`}
          >
            Crop & Trim
          </button>
          <button
            onClick={() => onSelectTab('add_watermark')}
            className={`whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer ${
              activeTab === 'add_watermark' ? 'text-indigo-400 font-semibold' : ''
            }`}
          >
            Add Watermark
          </button>
          <button
            onClick={() => onSelectTab('my_works')}
            className={`whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'my_works' ? 'text-indigo-400 font-semibold' : ''
            }`}
          >
            <span>My Works</span>
            {savedWorksCount > 0 && (
              <span className="px-1.5 py-0.2 text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                {savedWorksCount}
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Layout Toggle (Mobile view simulation vs Widescreen) */}
          <button
            onClick={onToggleMobileLayout}
            title={isMobileLayout ? 'Switch to Widescreen Studio' : 'Switch to Phone View'}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors hidden sm:flex items-center justify-center cursor-pointer"
          >
            {isMobileLayout ? (
              <Monitor className="w-4 h-4 text-cyan-400" />
            ) : (
              <Smartphone className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Quick Works Button on small screens */}
          <button
            onClick={() => onSelectTab('my_works')}
            className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors relative cursor-pointer"
            title="My Works"
          >
            <FolderClock className="w-4 h-4" />
            {savedWorksCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {savedWorksCount}
              </span>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* 100% Free All Features Badge */}
          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 select-none whitespace-nowrap shrink-0">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Free · 4K HD</span>
          </div>
        </div>
      </div>
    </header>
  );
};
