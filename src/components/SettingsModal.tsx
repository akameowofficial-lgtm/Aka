import React, { useState } from 'react';
import { Settings, X, Cpu, HardDrive, Globe, Info, Trash2, Check } from 'lucide-react';
import { clearAllWorks } from '../utils/worksStorage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshWorks: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onRefreshWorks,
}) => {
  const [hardwareAccel, setHardwareAccel] = useState<boolean>(true);
  const [defaultQuality, setDefaultQuality] = useState<'1080p' | '720p' | '4k'>('1080p');
  const [cacheCleared, setCacheCleared] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleClearCache = () => {
    clearAllWorks();
    onRefreshWorks();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">MarkClear Settings</h2>
            <p className="text-xs text-slate-400">Application and rendering preferences</p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4 pt-1">
          {/* Hardware acceleration */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="text-xs font-semibold text-white">GPU Video Acceleration</p>
                <p className="text-[10px] text-slate-400">WebCodecs & Canvas Stream</p>
              </div>
            </div>
            <button
              onClick={() => setHardwareAccel(!hardwareAccel)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                hardwareAccel ? 'bg-indigo-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                  hardwareAccel ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Default export resolution */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <p className="text-xs font-semibold text-white">Default Export Resolution</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['720p', '1080p', '4k'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setDefaultQuality(q)}
                  className={`p-1.5 rounded-lg border font-bold uppercase transition-all cursor-pointer ${
                    defaultQuality === q
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Cache */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-white">Clear Project Storage</p>
                <p className="text-[10px] text-slate-400">Remove cached local video blobs</p>
              </div>
            </div>
            <button
              onClick={handleClearCache}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/50 hover:text-red-400 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              {cacheCleared ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : 'Clear'}
            </button>
          </div>

          {/* About Xiaoxu Technology & Package details */}
          <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>About MarkClear</span>
            </div>
            <div className="space-y-1 text-[11px] leading-relaxed">
              <p><strong className="text-slate-300">Package:</strong> com.xiaoxu.spqsy</p>
              <p><strong className="text-slate-300">Developer:</strong> Xiaoxu Technology</p>
              <p><strong className="text-slate-300">Version:</strong> 2.5.4 (Latest)</p>
              <p><strong className="text-slate-300">Features:</strong> AI Video Watermark Remover, Subtitle Erase, Object Eraser</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
