import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Plus, 
  Trash2, 
  Download, 
  Sliders, 
  Check, 
  Eye, 
  Volume2, 
  VolumeX, 
  Upload,
  ArrowLeft,
  Sparkles,
  Layers,
  Clock,
  Split,
  Maximize2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WatermarkBox, WatermarkMode, ProcessedWork, SampleMedia } from '../types';
import { applyWatermarkRemovalToCanvas } from '../utils/inpaintingEngine';
import { exportCleanVideo, ExportProgress } from '../utils/videoProcessor';
import { saveWork } from '../utils/worksStorage';
import { detectWatermarksWithAI } from '../utils/aiDetection';

interface VideoWatermarkStudioProps {
  initialVideoUrl?: string;
  initialBoxes?: Omit<WatermarkBox, 'id'>[];
  onBack: () => void;
  onOpenMyWorks: () => void;
}

export const VideoWatermarkStudio: React.FC<VideoWatermarkStudioProps> = ({
  initialVideoUrl,
  initialBoxes,
  onBack,
  onOpenMyWorks,
}) => {
  const [videoUrl, setVideoUrl] = useState<string>(initialVideoUrl || '');
  const [videoName, setVideoName] = useState<string>('video_clip.mp4');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(5);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // Boxes
  const [boxes, setBoxes] = useState<WatermarkBox[]>(() => {
    if (initialBoxes && initialBoxes.length > 0) {
      return initialBoxes.map((b, idx) => ({
        ...b,
        id: `box-${Date.now()}-${idx}`,
      }));
    }
    return [
      {
        id: 'box-1',
        x: 6,
        y: 8,
        width: 32,
        height: 6,
        mode: 'inpaint',
        startTime: 0,
        endTime: 5,
        label: 'Watermark Zone 1',
      },
    ];
  });

  const [activeBoxId, setActiveBoxId] = useState<string>('box-1');

  // Split-screen comparison
  const [compareMode, setCompareMode] = useState<boolean>(true);
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0 - 100
  const isDraggingSplit = useRef<boolean>(false);

  // Interaction with bounding box
  const [isDrawingNewBox, setIsDrawingNewBox] = useState<boolean>(false);
  const [dragAction, setDragAction] = useState<{
    type: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';
    boxId: string;
    startX: number;
    startY: number;
    origBox: WatermarkBox;
  } | null>(null);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportedResult, setExportedResult] = useState<{ url: string; sizeBytes: number } | null>(null);
  const [exportResolution, setExportResolution] = useState<'original' | '1080p' | '720p' | '4k'>('1080p');

  // AI Auto Scanner State
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);
  const [aiScanStatus, setAiScanStatus] = useState<string>('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const activeBox = boxes.find((b) => b.id === activeBoxId) || boxes[0];

  // Load video metadata
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 5;
      setDuration(dur);
      // Adjust boxes duration if default
      setBoxes((prev) =>
        prev.map((b) => ({
          ...b,
          endTime: Math.min(b.endTime, dur) || dur,
        }))
      );
    }
  };

  // 1-Click AI Auto Scan & Detection
  const handleAutoDetectAI = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsAiScanning(true);
    setAiScanStatus('AI Scanning video frame for logos, usernames & subtitles...');

    try {
      const detected = await detectWatermarksWithAI(canvas, duration);
      if (detected.length > 0) {
        setBoxes(detected);
        setActiveBoxId(detected[0].id);
        setAiScanStatus(`AI successfully targeted ${detected.length} watermark zones!`);
        setTimeout(() => setAiScanStatus(''), 3500);
      }
    } catch (e) {
      console.warn('AI detect failed:', e);
      setAiScanStatus('');
    } finally {
      setIsAiScanning(false);
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Step +/- time
  const stepTime = (delta: number) => {
    if (!videoRef.current) return;
    const next = Math.max(0, Math.min(duration, currentTime + delta));
    videoRef.current.currentTime = next;
    setCurrentTime(next);
  };

  // Handle Scrub
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseFloat(e.target.value);
    setCurrentTime(next);
    if (videoRef.current) {
      videoRef.current.currentTime = next;
    }
  };

  // Render loop onto Canvas
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(renderFrame);
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

    // 1. Draw raw video frame
    ctx.drawImage(video, 0, 0, width, height);

    if (compareMode) {
      // Split Screen Comparison:
      // Left side: Cleaned (inpainted)
      // Right side: Original frame untouched
      const splitPixel = Math.round((splitPos / 100) * width);

      // Create temporary canvas for clean version
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.drawImage(canvas, 0, 0);

      // Apply watermark removal to temp canvas
      applyWatermarkRemovalToCanvas(tempCtx, width, height, boxes, video.currentTime);

      // Composite left clean half onto main canvas
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitPixel, height);
      ctx.clip();
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();

      // Draw subtle dividing line on split position
      ctx.save();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(splitPixel, 0);
      ctx.lineTo(splitPixel, height);
      ctx.stroke();

      // Split labels
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(splitPixel - 70, 16, 60, 24);
      ctx.fillRect(splitPixel + 10, 16, 65, 24);

      ctx.fillStyle = '#67e8f9';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('AI Clean', splitPixel - 64, 32);

      ctx.fillStyle = '#f87171';
      ctx.fillText('Original', splitPixel + 16, 32);
      ctx.restore();

    } else {
      // Normal full-screen clean preview
      applyWatermarkRemovalToCanvas(ctx, width, height, boxes, video.currentTime);
    }

    setCurrentTime(video.currentTime);
    animFrameRef.current = requestAnimationFrame(renderFrame);
  }, [boxes, compareMode, splitPos]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [renderFrame]);

  // Handle Box Actions
  const handleAddBox = () => {
    const newId = `box-${Date.now()}`;
    const newBox: WatermarkBox = {
      id: newId,
      x: 35,
      y: 40,
      width: 30,
      height: 12,
      mode: 'inpaint',
      startTime: 0,
      endTime: duration,
      label: `Zone ${boxes.length + 1}`,
    };
    setBoxes([...boxes, newBox]);
    setActiveBoxId(newId);
  };

  const handleDeleteBox = (id: string) => {
    if (boxes.length <= 1) return;
    const remaining = boxes.filter((b) => b.id !== id);
    setBoxes(remaining);
    setActiveBoxId(remaining[0].id);
  };

  const handleUpdateActiveBox = (patch: Partial<WatermarkBox>) => {
    if (!activeBox) return;
    setBoxes(boxes.map((b) => (b.id === activeBox.id ? { ...b, ...patch } : b)));
  };

  // Preset snaps
  const snapPreset = (preset: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'subtitle' | 'center') => {
    if (!activeBox) return;
    switch (preset) {
      case 'top-left':
        handleUpdateActiveBox({ x: 5, y: 6, width: 28, height: 8 });
        break;
      case 'top-right':
        handleUpdateActiveBox({ x: 67, y: 6, width: 28, height: 8 });
        break;
      case 'bottom-left':
        handleUpdateActiveBox({ x: 5, y: 84, width: 32, height: 8 });
        break;
      case 'bottom-right':
        handleUpdateActiveBox({ x: 63, y: 84, width: 32, height: 8 });
        break;
      case 'subtitle':
        handleUpdateActiveBox({ x: 12, y: 83, width: 76, height: 11 });
        break;
      case 'center':
        handleUpdateActiveBox({ x: 20, y: 40, width: 60, height: 20 });
        break;
    }
  };

  // Dragging bounding box on overlay
  const handlePointerDownBox = (e: React.PointerEvent, boxId: string, action: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w') => {
    e.stopPropagation();
    const box = boxes.find((b) => b.id === boxId);
    if (!box) return;
    setActiveBoxId(boxId);
    setDragAction({
      type: action,
      boxId,
      startX: e.clientX,
      startY: e.clientY,
      origBox: { ...box },
    });
  };

  const handleContainerPointerMove = (e: React.PointerEvent) => {
    if (isDraggingSplit.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const pct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
      setSplitPos(pct);
      return;
    }

    if (!dragAction || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaXPct = ((e.clientX - dragAction.startX) / rect.width) * 100;
    const deltaYPct = ((e.clientY - dragAction.startY) / rect.height) * 100;
    const orig = dragAction.origBox;

    let { x, y, width, height } = orig;

    switch (dragAction.type) {
      case 'move':
        x = Math.max(0, Math.min(100 - width, orig.x + deltaXPct));
        y = Math.max(0, Math.min(100 - height, orig.y + deltaYPct));
        break;
      case 'se':
        width = Math.max(4, Math.min(100 - orig.x, orig.width + deltaXPct));
        height = Math.max(3, Math.min(100 - orig.y, orig.height + deltaYPct));
        break;
      case 'nw':
        const newX = Math.max(0, Math.min(orig.x + orig.width - 4, orig.x + deltaXPct));
        const newY = Math.max(0, Math.min(orig.y + orig.height - 3, orig.y + deltaYPct));
        width = orig.width + (orig.x - newX);
        height = orig.height + (orig.y - newY);
        x = newX;
        y = newY;
        break;
      case 'ne':
        width = Math.max(4, Math.min(100 - orig.x, orig.width + deltaXPct));
        const newYNe = Math.max(0, Math.min(orig.y + orig.height - 3, orig.y + deltaYPct));
        height = orig.height + (orig.y - newYNe);
        y = newYNe;
        break;
      case 'sw':
        const newXSw = Math.max(0, Math.min(orig.x + orig.width - 4, orig.x + deltaXPct));
        width = orig.width + (orig.x - newXSw);
        x = newXSw;
        height = Math.max(3, Math.min(100 - orig.y, orig.height + deltaYPct));
        break;
    }

    handleUpdateActiveBox({
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      width: Math.round(width * 10) / 10,
      height: Math.round(height * 10) / 10,
    });
  };

  const handleContainerPointerUp = () => {
    isDraggingSplit.current = false;
    setDragAction(null);
  };

  // File Upload
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

  // Start Export Process
  const handleStartExport = async () => {
    if (!videoUrl) return;
    setIsExporting(true);
    setExportedResult(null);

    try {
      const res = await exportCleanVideo(
        videoUrl,
        boxes,
        exportResolution,
        (prog) => setExportProgress(prog)
      );

      setExportedResult({ url: res.url, sizeBytes: res.sizeBytes });

      // Save to My Works
      const newWork: ProcessedWork = {
        id: `video-work-${Date.now()}`,
        title: `Clean_${videoName}`,
        type: 'video',
        blobUrl: res.url,
        thumbnailUrl: '',
        createdAt: Date.now(),
        fileSizeBytes: res.sizeBytes,
        duration: Math.round(duration),
        resolution: exportResolution === '4k' ? '4K Ultra HD' : exportResolution === '1080p' ? '1080p Full HD' : exportResolution === '720p' ? '720p HD' : 'Original',
      };
      saveWork(newWork);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Export failed:', err);
      alert('Video export encountered an error. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Format timecode
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
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
              <span>AI Video Watermark Remover</span>
              <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                Studio
              </span>
            </h1>
            <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
              {videoName} · {boxes.length} Active Watermark Zone{boxes.length === 1 ? '' : 's'}
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
            <span>Upload Another Video</span>
          </button>

          {/* AI 1-Click Auto Detect & Clean */}
          <button
            onClick={handleAutoDetectAI}
            disabled={isAiScanning}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-500 hover:from-cyan-500 hover:to-indigo-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 text-cyan-200 ${isAiScanning ? 'animate-spin' : ''}`} />
            <span>{isAiScanning ? 'AI Scanning...' : 'AI Auto-Detect & Clean'}</span>
          </button>

          {/* Free Resolution Selector */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold">
            {(['720p', '1080p', '4k'] as const).map((res) => (
              <button
                key={res}
                onClick={() => setExportResolution(res)}
                className={`px-2.5 py-1 rounded-lg uppercase transition-all cursor-pointer ${
                  exportResolution === res
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {res === '4k' ? '4K Ultra' : res}
              </button>
            ))}
          </div>

          <button
            onClick={handleStartExport}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Clean Video</span>
          </button>
        </div>
      </div>

      {/* AI Scan Feedback Banner */}
      {aiScanStatus && (
        <div className="rounded-xl bg-gradient-to-r from-cyan-950/70 via-indigo-950/70 to-slate-900 border border-cyan-500/40 px-4 py-2.5 flex items-center gap-3 text-xs text-cyan-200 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
          <span className="font-semibold">{aiScanStatus}</span>
        </div>
      )}

      {/* Main Workspace: Left Video Viewport + Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Video Viewport & Playback Bar (Col 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div
            ref={containerRef}
            onPointerMove={handleContainerPointerMove}
            onPointerUp={handleContainerPointerUp}
            className="relative rounded-2xl overflow-hidden bg-black/90 border border-slate-800 shadow-2xl aspect-video flex items-center justify-center select-none"
          >
            {/* Hidden Source Video */}
            <video
              ref={videoRef}
              src={videoUrl}
              crossOrigin="anonymous"
              playsInline
              muted={isMuted}
              loop
              onLoadedMetadata={handleLoadedMetadata}
              className="hidden"
            />

            {/* Display Canvas with inpainting render */}
            <canvas
              ref={canvasRef}
              className="max-h-full max-w-full object-contain pointer-events-none"
            />

            {/* Interactive Bounding Box Overlays */}
            {boxes.map((box) => {
              const isActive = box.id === activeBoxId;
              const isTimeActive = currentTime >= box.startTime && currentTime <= box.endTime;

              return (
                <div
                  key={box.id}
                  onPointerDown={(e) => handlePointerDownBox(e, box.id, 'move')}
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                  }}
                  className={`absolute cursor-move transition-opacity ${
                    isActive
                      ? 'border-2 border-indigo-400 bg-indigo-500/15 shadow-lg shadow-indigo-500/30'
                      : 'border-2 border-dashed border-cyan-400/70 bg-cyan-500/10'
                  } ${!isTimeActive ? 'opacity-40 border-slate-500 bg-slate-500/10' : ''}`}
                >
                  {/* Label badge */}
                  <div className="absolute -top-6 left-0 bg-slate-900/90 text-[10px] font-bold text-white px-1.5 py-0.5 rounded border border-slate-700 pointer-events-none whitespace-nowrap flex items-center gap-1">
                    <span>{box.label}</span>
                    <span className="text-cyan-400 font-mono">
                      [{box.mode.toUpperCase()}]
                    </span>
                  </div>

                  {/* Corner Resize Handles when active */}
                  {isActive && (
                    <>
                      <div
                        onPointerDown={(e) => handlePointerDownBox(e, box.id, 'nw')}
                        className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-nw-resize"
                      />
                      <div
                        onPointerDown={(e) => handlePointerDownBox(e, box.id, 'ne')}
                        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-ne-resize"
                      />
                      <div
                        onPointerDown={(e) => handlePointerDownBox(e, box.id, 'se')}
                        className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-se-resize"
                      />
                      <div
                        onPointerDown={(e) => handlePointerDownBox(e, box.id, 'sw')}
                        className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-sw-resize"
                      />
                    </>
                  )}
                </div>
              );
            })}

            {/* Split Screen Slider Handle (when compareMode is true) */}
            {compareMode && (
              <div
                style={{ left: `${splitPos}%` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  isDraggingSplit.current = true;
                }}
                className="absolute top-0 bottom-0 w-8 -ml-4 flex items-center justify-center cursor-ew-resize z-20 group"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Split className="w-3.5 h-3.5" />
                </div>
              </div>
            )}
          </div>

          {/* Timeline & Playback Bar */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            {/* Scrubber Range */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={duration}
                step={0.05}
                value={currentTime}
                onChange={handleScrub}
                className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span className="text-slate-500">Duration: {formatTime(duration)}</span>
              </div>
            </div>

            {/* Transport Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => stepTime(-0.5)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Step Back 0.5s"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={togglePlay}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  <span className="text-xs">{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  onClick={() => stepTime(0.5)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Step Forward 0.5s"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* View options: Compare Split Slider Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCompareMode(!compareMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    compareMode
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>Split Compare {compareMode ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Watermark Box Inspector (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Box List & Add Box */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Watermark Zones ({boxes.length})
                </h3>
              </div>
              <button
                onClick={handleAddBox}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Box</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {boxes.map((box, index) => (
                <div
                  key={box.id}
                  onClick={() => setActiveBoxId(box.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    box.id === activeBoxId
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-slate-800 text-[10px] font-mono font-bold flex items-center justify-center text-slate-300">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-white truncate max-w-[120px]">
                        {box.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {box.startTime.toFixed(1)}s - {box.endTime.toFixed(1)}s
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono uppercase">
                      {box.mode}
                    </span>
                    {boxes.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBox(box.id);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Box Settings */}
          {activeBox && (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white">
                  Edit {activeBox.label}
                </span>
                <input
                  type="text"
                  value={activeBox.label}
                  onChange={(e) => handleUpdateActiveBox({ label: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-white w-32 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Removal Algorithm Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  AI Removal Algorithm
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'inpaint', name: 'AI Inpaint', desc: 'Synthesize BG' },
                      { id: 'blur', name: 'Gaussian Blur', desc: 'Smooth Blur' },
                      { id: 'mosaic', name: 'Pixel Mosaic', desc: 'Pixel Grid' },
                      { id: 'clone', name: 'Clone Stamp', desc: 'Patch Copy' },
                    ] as const
                  ).map((alg) => (
                    <button
                      key={alg.id}
                      onClick={() => handleUpdateActiveBox({ mode: alg.id })}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        activeBox.mode === alg.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <p className="text-xs font-bold">{alg.name}</p>
                      <p className="text-[10px] text-slate-500">{alg.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Snap Presets */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Quick Position Snap
                </label>
                <div className="grid grid-cols-3 gap-1 text-[11px]">
                  <button
                    onClick={() => snapPreset('top-left')}
                    className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    Top Left
                  </button>
                  <button
                    onClick={() => snapPreset('top-right')}
                    className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    Top Right
                  </button>
                  <button
                    onClick={() => snapPreset('center')}
                    className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    Center
                  </button>
                  <button
                    onClick={() => snapPreset('bottom-left')}
                    className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    Bottom Left
                  </button>
                  <button
                    onClick={() => snapPreset('bottom-right')}
                    className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    Bottom Right
                  </button>
                  <button
                    onClick={() => snapPreset('subtitle')}
                    className="p-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/60 rounded-lg text-indigo-300 font-medium transition-colors cursor-pointer"
                  >
                    Subtitle
                  </button>
                </div>
              </div>

              {/* Keyframe Time Range (MarkClear Time Interval Feature) */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Active Time Interval</span>
                  </div>
                  <button
                    onClick={() => handleUpdateActiveBox({ startTime: 0, endTime: duration })}
                    className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    Full Duration
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">Start Time: {activeBox.startTime.toFixed(1)}s</span>
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={activeBox.startTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        handleUpdateActiveBox({
                          startTime: Math.min(val, activeBox.endTime - 0.2),
                        });
                      }}
                      className="w-full h-1 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">End Time: {activeBox.endTime.toFixed(1)}s</span>
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={activeBox.endTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        handleUpdateActiveBox({
                          endTime: Math.max(val, activeBox.startTime + 0.2),
                        });
                      }}
                      className="w-full h-1 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export In-Progress / Completed Modal */}
      {(isExporting || exportedResult) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-6 shadow-2xl text-center">
            {isExporting ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto animate-pulse">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Rendering Clean Video</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {exportProgress?.status || 'Applying AI frame-by-frame synthesis...'}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      style={{ width: `${exportProgress?.percent || 0}%` }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-150"
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>{exportProgress?.percent || 0}%</span>
                    <span>
                      {exportProgress?.currentSecond || 0}s / {exportProgress?.totalDuration || duration}s
                    </span>
                  </div>
                </div>
              </div>
            ) : exportedResult ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Export Complete!</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Watermarks removed successfully. File size: {(exportedResult.sizeBytes / 1024 / 1024).toFixed(2)} MB.
                  </p>
                </div>

                {/* Direct Download Button */}
                <div className="space-y-2 pt-2">
                  <a
                    href={exportedResult.url}
                    download={`Clean_${videoName}`}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Clean Video</span>
                  </a>

                  <button
                    onClick={() => {
                      setExportedResult(null);
                      onOpenMyWorks();
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    View in My Works
                  </button>

                  <button
                    onClick={() => setExportedResult(null)}
                    className="text-xs text-slate-500 hover:text-slate-400 pt-1 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
