import React, { useState, useRef, useEffect } from 'react';
import { 
  Captions, 
  ArrowLeft, 
  Play, 
  Pause, 
  Download, 
  Sparkles, 
  Layers, 
  Clock, 
  Check, 
  Upload,
  Split
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WatermarkBox, ProcessedWork } from '../types';
import { applyWatermarkRemovalToCanvas } from '../utils/inpaintingEngine';
import { exportCleanVideo, ExportProgress } from '../utils/videoProcessor';
import { saveWork } from '../utils/worksStorage';

interface SubtitleRemoverStudioProps {
  initialVideoUrl?: string;
  onBack: () => void;
  onOpenMyWorks: () => void;
}

export const SubtitleRemoverStudio: React.FC<SubtitleRemoverStudioProps> = ({
  initialVideoUrl,
  onBack,
  onOpenMyWorks,
}) => {
  const [videoUrl, setVideoUrl] = useState<string>(initialVideoUrl || '');
  const [videoName, setVideoName] = useState<string>('subtitled_video.mp4');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(6);

  // Subtitle band parameters (normalized %)
  const [subY, setSubY] = useState<number>(84); // Y offset
  const [subHeight, setSubHeight] = useState<number>(10); // Band height
  const [subWidth, setSubWidth] = useState<number>(76); // Band width
  const [subX, setSubX] = useState<number>(12); // X offset
  const [subPositionPreset, setSubPositionPreset] = useState<'bottom' | 'top' | 'lower_third'>('bottom');

  const [compareMode, setCompareMode] = useState<boolean>(true);
  const [splitPos, setSplitPos] = useState<number>(50);

  // Export
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportedResult, setExportedResult] = useState<{ url: string; sizeBytes: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sync boxes from subtitle sliders
  const boxes: WatermarkBox[] = [
    {
      id: 'sub-box-1',
      x: subX,
      y: subY,
      width: subWidth,
      height: subHeight,
      mode: 'inpaint',
      startTime: 0,
      endTime: duration,
      label: 'Subtitle Ribbon',
    },
  ];

  // Preset snaps for subtitles
  const applyPreset = (preset: 'bottom' | 'top' | 'lower_third') => {
    setSubPositionPreset(preset);
    if (preset === 'bottom') {
      setSubY(84);
      setSubHeight(10);
      setSubWidth(80);
      setSubX(10);
    } else if (preset === 'top') {
      setSubY(6);
      setSubHeight(8);
      setSubWidth(70);
      setSubX(15);
    } else if (preset === 'lower_third') {
      setSubY(72);
      setSubHeight(12);
      setSubWidth(84);
      setSubX(8);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Render loop
  useEffect(() => {
    const render = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 360;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.drawImage(video, 0, 0, width, height);

      if (compareMode) {
        const splitPixel = Math.round((splitPos / 100) * width);
        const temp = document.createElement('canvas');
        temp.width = width;
        temp.height = height;
        const tCtx = temp.getContext('2d')!;
        tCtx.drawImage(canvas, 0, 0);

        applyWatermarkRemovalToCanvas(tCtx, width, height, boxes, video.currentTime);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitPixel, height);
        ctx.clip();
        ctx.drawImage(temp, 0, 0);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(splitPixel, 0);
        ctx.lineTo(splitPixel, height);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(splitPixel - 75, 16, 70, 24);
        ctx.fillRect(splitPixel + 10, 16, 70, 24);

        ctx.fillStyle = '#c084fc';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('Cleaned', splitPixel - 65, 32);

        ctx.fillStyle = '#f87171';
        ctx.fillText('Subtitles', splitPixel + 16, 32);
        ctx.restore();
      } else {
        applyWatermarkRemovalToCanvas(ctx, width, height, boxes, video.currentTime);
      }

      setCurrentTime(video.currentTime);
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [boxes, compareMode, splitPos]);

  // Handle Export
  const handleExport = async () => {
    if (!videoUrl) return;
    setIsExporting(true);
    setExportedResult(null);

    try {
      const res = await exportCleanVideo(
        videoUrl,
        boxes,
        '1080p',
        (prog) => setExportProgress(prog)
      );

      setExportedResult({ url: res.url, sizeBytes: res.sizeBytes });

      saveWork({
        id: `sub-work-${Date.now()}`,
        title: `NoSub_${videoName}`,
        type: 'video',
        blobUrl: res.url,
        thumbnailUrl: '',
        createdAt: Date.now(),
        fileSizeBytes: res.sizeBytes,
        duration: Math.round(duration),
        resolution: '1080p Full HD',
      });

      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
    } catch (e) {
      console.error(e);
      alert('Subtitle removal export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoName(file.name);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>AI Subtitle & Caption Remover</span>
              <span className="text-[10px] font-semibold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                Auto-Ribbon
              </span>
            </h1>
            <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
              Clean hardcoded subtitles and captions with background texture synthesis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Video</span>
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Without Subtitles</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Video Viewport (Col 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div
            ref={containerRef}
            className="relative rounded-2xl overflow-hidden bg-black/90 border border-slate-800 shadow-2xl aspect-video flex items-center justify-center select-none"
          >
            <video
              ref={videoRef}
              src={videoUrl}
              crossOrigin="anonymous"
              playsInline
              muted
              loop
              onLoadedMetadata={() => {
                if (videoRef.current) setDuration(videoRef.current.duration || 6);
              }}
              className="hidden"
            />
            <canvas ref={canvasRef} className="max-h-full max-w-full object-contain pointer-events-none" />

            {/* Subtitle Bounding Ribbon Box Overlay */}
            <div
              style={{
                left: `${subX}%`,
                top: `${subY}%`,
                width: `${subWidth}%`,
                height: `${subHeight}%`,
              }}
              className="absolute border-2 border-dashed border-purple-400 bg-purple-500/15 pointer-events-none shadow-lg shadow-purple-500/20"
            >
              <div className="absolute -top-6 left-0 bg-purple-900/90 text-purple-200 text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-700">
                Subtitle Removal Zone
              </div>
            </div>
          </div>

          {/* Transport Bar */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2 shadow-md shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer text-xs"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <span className="text-xs font-mono text-slate-400">
                {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
              </span>
            </div>

            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                compareMode ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Compare Split</span>
            </button>
          </div>
        </div>

        {/* Right Subtitle Tuning (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Subtitle Position Presets
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => applyPreset('bottom')}
                className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  subPositionPreset === 'bottom'
                    ? 'bg-purple-600/20 border-purple-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                Bottom Banner
              </button>
              <button
                onClick={() => applyPreset('lower_third')}
                className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  subPositionPreset === 'lower_third'
                    ? 'bg-purple-600/20 border-purple-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                Lower-Third
              </button>
              <button
                onClick={() => applyPreset('top')}
                className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  subPositionPreset === 'top'
                    ? 'bg-purple-600/20 border-purple-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                Top Caption
              </button>
            </div>

            {/* Fine Position Sliders */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Vertical Offset (Y)</span>
                  <span className="font-mono text-purple-300">{subY}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={90}
                  value={subY}
                  onChange={(e) => setSubY(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Ribbon Height</span>
                  <span className="font-mono text-purple-300">{subHeight}%</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={25}
                  value={subHeight}
                  onChange={(e) => setSubHeight(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Ribbon Width</span>
                  <span className="font-mono text-purple-300">{subWidth}%</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={98}
                  value={subWidth}
                  onChange={(e) => setSubWidth(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export modal */}
      {(isExporting || exportedResult) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-6 shadow-2xl text-center">
            {isExporting ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto animate-pulse">
                  <Captions className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Synthesizing Video Without Subtitles</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {exportProgress?.status || 'Analyzing ribbon frames...'}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      style={{ width: `${exportProgress?.percent || 0}%` }}
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all"
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>{exportProgress?.percent || 0}%</span>
                    <span>{exportProgress?.currentSecond || 0}s / {duration}s</span>
                  </div>
                </div>
              </div>
            ) : exportedResult ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Subtitles Erased Successfully!</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    HD Video rendered clean. Ready for download.
                  </p>
                </div>
                <a
                  href={exportedResult.url}
                  download={`NoSub_${videoName}`}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer block"
                >
                  <Download className="w-4 h-4 inline" />
                  <span>Download Clean Video</span>
                </a>
                <button
                  onClick={() => {
                    setExportedResult(null);
                    onOpenMyWorks();
                  }}
                  className="w-full py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  View My Works
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
