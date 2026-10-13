import React from 'react';
import { Home, Video, Image as ImageIcon, Captions, FolderClock } from 'lucide-react';
import { AppTab } from '../types';

interface MobileBottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  savedWorksCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  savedWorksCount,
}) => {
  const tabs = [
    { id: 'home' as AppTab, label: 'Home', icon: Home },
    { id: 'video_remover' as AppTab, label: 'Video AI', icon: Video },
    { id: 'image_remover' as AppTab, label: 'Photo AI', icon: ImageIcon },
    { id: 'subtitle_remover' as AppTab, label: 'Subtitles', icon: Captions },
    { id: 'my_works' as AppTab, label: 'My Works', icon: FolderClock, count: savedWorksCount },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1 md:hidden">
      <div className="grid grid-cols-5 items-center h-14 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center h-full relative cursor-pointer transition-colors ${
                isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="absolute -top-1 -right-2 bg-indigo-500 text-white text-[9px] font-bold px-1 rounded-full">
                    {tab.count}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-1 ${isActive ? 'font-bold text-indigo-400' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
