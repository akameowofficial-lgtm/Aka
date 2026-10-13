import React, { useState, useRef, useEffect } from 'react';
import { 
  Crop, 
  ArrowLeft, 
  Play, 
  Pause, 
  Download, 
  Upload, 
  Sparkles, 
  RotateCcw,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProcessedWork } from '../types';
import { saveWork } from '../utils/worksStorage';

interface VideoCropStudioProps {
  initialVideoUrl?: string;
  onBack: () => void;
  onOpenMyWorks: () => void;
}

export const VideoCropStudio: React.FC<VideoCropStudioProps> = ({
  initialVideoUrl,
  onBack,
  onOpenMyWorks,
}) => {
  const [videoUrl, setVideoUrl] = useState<string>(initialVideoUrl || '');
  const [videoName, setVideoName] = useState<string>('video_clip.mp4');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(5);

  // Crop Aspect Presets
  const [selectedRatio, setSelectedRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5' | 'free'>('9:16');
  const [cropX, setCropX] = useState<number>(25); // percentage
  const [cropY, setCropY] = useState<number>(0); // percentage
  const [cropW, setCropW] = useState<number>(50); // percentage
  const [cropH, setCropH] = useState<number>(100); // percentage

  // Trim Range
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(5);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportedResult, setExportedResult] = useState<{ url: string; sizeBytes: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Apply Ratio Presets
  const applyRatio = (ratio: '9:16' | '16:9' | '1:1' | '4:5' | 'free') => {
    setSelectedRatio(ratio);
    if (ratio === '9:16') {
      setCropW(56.25);
      setCropH(100);
      setCropX((100 - 56.25) / 2);
      setCropY(0);
    } else if (ratio === '16:9') {
      setCropW(100);
      setCropH(56.25);
      setCropX(0);
      setCropY((100 - 56.25) / 2);
    } else if (ratio === '1:1') {
      setCropW(70);
      setCropH(70);
      setCropX(15);
      setCropY(15);
    } else if (ratio === '4:5') {
      setCropW(60);
      setCropH(75);
      setCropX(20);
      setCropY(12.5);
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

  // Preview Loop
  useEffect(() => {
    const render = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d')!;
      const vW = video.videoWidth || 1280;
      const vH = video.videoHeight || 720;

      // Crop coordinates in video pixels
      const sx = (cropX / 100) * vW;
      const sy = (cropY / 100) * vH;
      const sw = (cropW / 100) * vW;
      const sh = (cropH / 100) * vH;

      if (canvas.width !== sw || canvas.height !== sh) {
        canvas.width = sw;
        canvas.height = sh;
      }

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
      setCurrentTime(video.currentTime);

      // Loop inside trim range
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cropX, cropY, cropW, cropH, trimStart, trimEnd]);

  // Export cropped video
  const handleExport = async () => {
    const video = videoRef.current;
    if (!video) return;

    setIsExporting(true);
    setExportProgress(0);
    setExportedResult(null);

    try {
      const vW = video.videoWidth || 1280;
      const vH = video.videoHeight || 720;
      const sx = (cropX / 100) * vW;
      const sy = (cropY / 100) * vH;
      const sw = (cropW / 100) * vW;
      const sh = (cropH / 100) * vH;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = sw;
      offCanvas.height = sh;
      const offCtx = offCanvas.getContext('2d')!;

      const fps = 30;
      const trimDur = Math.max(0.5, trimEnd - trimStart);

      const stream = offCanvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, { videoBitsPerSecond: 8000000 });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      let isFinished = false;

      const resultPromise = new Promise<{ url: string; size: number }>((resolve, reject) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          resolve({ url, size: blob.size });
        };
        recorder.onerror = reject;
      });

      recorder.start(100);

      video.currentTime = trimStart;
      await video.play().catch(() => {});

      const fallbackTimer = setTimeout(() => {
        if (!isFinished && recorder.state === 'recording') {
          recorder.stop();
        }
      }, (trimDur + 3) * 1000);

      const recordTick = () => {
        if (isFinished) return;

        offCtx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

        const currentProgressSec = Math.max(0, video.currentTime - trimStart);
        const pct = Math.min(99, Math.round((currentProgressSec / trimDur) * 100));
        setExportProgress(pct);

        if (video.currentTime >= trimEnd || video.ended) {
          isFinished = true;
          clearTimeout(fallbackTimer);
          setExportProgress(100);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
          return;
        }

        requestAnimationFrame(recordTick);
      };

      recordTick();

      const res = await resultPromise;
      setExportedResult({ url: res.url, sizeBytes: res.size });

      saveWork({
        id: `crop-work-${Date.now()}`,
        title: `Cropped_${videoName}`,
        type: 'video',
        blobUrl: res.url,
        thumbnailUrl: '',
        createdAt: Date.now(),
        fileSizeBytes: res.size,
        duration: Math.round(trimDur),
        resolution: `${Math.round(sw)}x${Math.round(sh)}`,
      });

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error(err);
      alert('Video crop export failed.');
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
              <span>Video Crop & Trim</span>
              <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                100% Free
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Crop away edge watermarks, adjust aspect ratios for TikTok/YouTube, and trim duration
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
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-amber-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Cropped HD</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Viewport (Col 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-black/90 border border-slate-800 shadow-2xl min-h-[400px] max-h-[560px] flex items-center justify-center p-4">
            <video
              ref={videoRef}
              src={videoUrl}
              crossOrigin="anonymous"
              playsInline
              muted
              loop
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  const d = videoRef.current.duration || 5;
                  setDuration(d);
                  setTrimEnd(d);
                }
              }}
              className="hidden"
            />
            <canvas ref={canvasRef} className="max-h-[500px] max-w-full object-contain rounded shadow-lg" />
          </div>

          {/* Transport Controls */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer text-xs"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <span className="text-xs font-mono text-slate-400">
                {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
              </span>
            </div>

            <span className="text-xs font-semibold text-amber-400">
              Active Ratio: {selectedRatio.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Right Crop & Trim Controls (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Aspect Ratio Presets
            </h3>

            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              {[
                { id: '9:16', label: '9:16 Shorts' },
                { id: '16:9', label: '16:9 YouTube' },
                { id: '1:1', label: '1:1 Square' },
                { id: '4:5', label: '4:5 Feed' },
                { id: 'free', label: 'Free Crop' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => applyRatio(r.id as any)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    selectedRatio === r.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Position Sliders */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Horizontal Offset (X)</span>
                  <span className="font-mono text-amber-300">{Math.round(cropX)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100 - cropW}
                  value={cropX}
                  onChange={(e) => setCropX(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Vertical Offset (Y)</span>
                  <span className="font-mono text-amber-300">{Math.round(cropY)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100 - cropH}
                  value={cropY}
                  onChange={(e) => setCropY(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Video Time Trimmer */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Time Trimmer (Duration Cut)
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400">Trim Start: {trimStart.toFixed(1)}s</span>
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={trimStart}
                    onChange={(e) => setTrimStart(Math.min(parseFloat(e.target.value), trimEnd - 0.5))}
                    className="w-full h-1 bg-slate-800 rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400">Trim End: {trimEnd.toFixed(1)}s</span>
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(Math.max(parseFloat(e.target.value), trimStart + 0.5))}
                    className="w-full h-1 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
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
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto animate-pulse">
                  <Crop className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Rendering Cropped Video</h3>
                  <p className="text-xs text-slate-400 mt-1">Exporting cleanly without watermarks...</p>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      style={{ width: `${exportProgress}%` }}
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all"
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-400">{exportProgress}%</span>
                </div>
              </div>
            ) : exportedResult ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cropped Video Ready!</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    File size: {(exportedResult.sizeBytes / 1024 / 1024).toFixed(2)} MB.
                  </p>
                </div>
                <a
                  href={exportedResult.url}
                  download={`Cropped_${videoName}`}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-transform active:scale-95 cursor-pointer block"
                >
                  <Download className="w-4 h-4 inline" />
                  <span>Download Cropped Video</span>
                </a>
                <button
                  onClick={() => {
                    setExportedResult(null);
                    onOpenMyWorks();
                  }}
                  className="w-full py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  View in My Works
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
