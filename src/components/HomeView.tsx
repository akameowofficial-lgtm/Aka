import React, { useRef } from 'react';
import { 
  Video, 
  Image as ImageIcon, 
  Captions, 
  Stamp, 
  Crop, 
  Upload, 
  Sparkles, 
  Play, 
  Layers, 
  Clock, 
  ShieldCheck, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { AppTab, SampleMedia } from '../types';
import { SAMPLE_ITEMS } from '../utils/sampleMediaGenerator';

interface HomeViewProps {
  onSelectTab: (tab: AppTab) => void;
  onLoadSample: (sample: SampleMedia) => void;
  onFileUpload: (file: File) => void;
  recentWorksCount: number;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectTab,
  onLoadSample,
  onFileUpload,
  recentWorksCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Welcome & Upload Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/80 p-6 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MarkClear v2.5.4 · AI Content-Aware Inpainting Engine</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Erase Watermarks, Subtitles & Logos with Precision AI
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            The all-in-one AI watermark remover for videos and photos. Select unwanted text, stamps, logos, or captions, and let AI reconstruct clean, seamless backgrounds in seconds.
          </p>

          {/* Quick Upload Drag & Drop Box */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 border-2 border-dashed border-slate-700/80 hover:border-indigo-500/80 rounded-2xl p-6 sm:p-8 bg-slate-900/50 hover:bg-slate-900/80 transition-all cursor-pointer text-center group flex flex-col items-center justify-center gap-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600/30 transition-transform">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-semibold text-slate-200">
                Click to upload video or photo, or drag & drop
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports MP4, WebM, MOV, JPG, PNG, WebP · Up to 4K resolution
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Tools Quick Action Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Core Editing Tools</h2>
            <p className="text-xs text-slate-400 mt-0.5">Select a specialized workflow to start</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tool 1: Video Watermark Remover */}
          <div
            onClick={() => onSelectTab('video_remover')}
            className="group relative rounded-2xl p-6 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between h-56"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                Remove Video Watermark
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Multi-box selection, custom time intervals, and frame-accurate AI inpainting for TikTok handles, timestamps, and logos.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs font-semibold text-indigo-400">
              <span>Launch Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Tool 2: Image Watermark Remover */}
          <div
            onClick={() => onSelectTab('image_remover')}
            className="group relative rounded-2xl p-6 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer shadow-lg hover:shadow-cyan-500/10 flex flex-col justify-between h-56"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/30 group-hover:scale-105 transition-transform">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                Remove Photo Watermark
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Smart Magic Brush and rectangular selection to erase date stamps, copyright marks, price stickers, and unwanted objects.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs font-semibold text-cyan-400">
              <span>Launch Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Tool 3: AI Subtitle Remover */}
          <div
            onClick={() => onSelectTab('subtitle_remover')}
            className="group relative rounded-2xl p-6 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer shadow-lg hover:shadow-purple-500/10 flex flex-col justify-between h-56"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-purple-500 flex items-center justify-center text-white shadow-md shadow-purple-500/30 group-hover:scale-105 transition-transform">
                <Captions className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                AI Subtitle Remover
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                One-touch auto snapping to bottom caption bands and horizontal ribbon reconstruction for hardcoded subtitles.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs font-semibold text-purple-400">
              <span>Auto-Snap Subtitles</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Tool 4: Add Watermark */}
          <div
            onClick={() => onSelectTab('add_watermark')}
            className="group relative rounded-2xl p-6 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer shadow-lg hover:shadow-emerald-500/10 flex flex-col justify-between h-56"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                <Stamp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                Watermark Shield & Stamp
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Protect original creations by adding custom branded text, typography stamps, logos, or anti-theft diagonal tile patterns.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs font-semibold text-emerald-400">
              <span>Add Watermark</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Tool 5: Video Crop & Resize */}
          <div
            onClick={() => onSelectTab('video_crop')}
            className="group relative rounded-2xl p-6 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer shadow-lg hover:shadow-amber-500/10 flex flex-col justify-between h-56"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
                <Crop className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                Crop & Ratio Trim
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Easily trim out edge watermarks, platform borders, and adjust ratios (9:16 Shorts, 16:9 YouTube, 1:1 Feed).
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs font-semibold text-amber-400">
              <span>Open Crop Tool</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Tool 6: My Works / Export History */}
          <div
            onClick={() => onSelectTab('my_works')}
            className="group relative rounded-2xl p-6 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between h-56"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shadow-md group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                My Works & History
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Review and re-download your previously exported clean videos and photos. {recentWorksCount} project{recentWorksCount === 1 ? '' : 's'} saved.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs font-semibold text-slate-300">
              <span>View Saved Projects</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* Instant Interactive Sample Clips (1-Click Test Drive) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Try with Preset Samples</h2>
            <p className="text-xs text-slate-400 mt-0.5">Test real watermark removal immediately without uploading files</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SAMPLE_ITEMS.map((sample) => (
            <div
              key={sample.id}
              onClick={() => onLoadSample(sample)}
              className="group bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-indigo-500/60 p-4 transition-all cursor-pointer hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    sample.type === 'video' 
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    {sample.type === 'video' ? 'VIDEO' : 'IMAGE'} · {sample.aspectRatio}
                  </span>
                  {sample.duration && (
                    <span className="text-[11px] text-slate-400">
                      {sample.duration}s
                    </span>
                  )}
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-indigo-600 transition-colors">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                  {sample.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {sample.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="text-indigo-400 font-medium">
                  {sample.defaultBoxes.length} watermark zone{sample.defaultBoxes.length === 1 ? '' : 's'} configured
                </span>
                <span className="group-hover:translate-x-0.5 transition-transform text-white font-medium">
                  Test Now →
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MarkClear Key Advantages / Features Info */}
      <section className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 md:p-8 space-y-6">
        <h3 className="text-lg font-bold text-white">Why MarkClear AI Stands Out</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Multiple Area Selection</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Remove multiple watermarks, handles, and stamps in different places across the frame at the same time.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Precise Time Range</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Set exact start and end timestamps so watermarks are only cleaned when they appear on screen.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Protected Areas</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mark protected regions to prevent altering faces, character subjects, or critical screen elements.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">HD Fast Export</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real client-side accelerated processing pipeline for crisp 1080p and 4K lossless video downloads.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
