import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Paintbrush, 
  Square, 
  Eraser, 
  ShieldCheck, 
  Undo2, 
  Redo2, 
  Download, 
  Sparkles, 
  Upload, 
  ArrowLeft, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  Check,
  Split
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BrushToolType, ProcessedWork } from '../types';
import { inpaintImageMask } from '../utils/inpaintingEngine';
import { saveWork } from '../utils/worksStorage';
import { detectWatermarksWithAI, cleanImageWithAI } from '../utils/aiDetection';

interface ImageWatermarkStudioProps {
  initialImageUrl?: string;
  onBack: () => void;
  onOpenMyWorks: () => void;
}

export const ImageWatermarkStudio: React.FC<ImageWatermarkStudioProps> = ({
  initialImageUrl,
  onBack,
  onOpenMyWorks,
}) => {
  const [imageUrl, setImageUrl] = useState<string>(initialImageUrl || '');
  const [imageName, setImageName] = useState<string>('photo.jpg');
  const [activeTool, setActiveTool] = useState<BrushToolType>('brush');
  const [brushSize, setBrushSize] = useState<number>(32);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasExported, setHasExported] = useState<boolean>(false);

  // Compare mode
  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);
  const [aiScanStatus, setAiScanStatus] = useState<string>('');

  // History for Undo/Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Drawing state
  const isDrawing = useRef<boolean>(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Canvases
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load image onto base canvas
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      originalImageRef.current = img;

      const base = baseCanvasRef.current;
      const mask = maskCanvasRef.current;
      const display = displayCanvasRef.current;
      if (!base || !mask || !display) return;

      base.width = img.width;
      base.height = img.height;
      mask.width = img.width;
      mask.height = img.height;
      display.width = img.width;
      display.height = img.height;

      const bCtx = base.getContext('2d')!;
      const mCtx = mask.getContext('2d')!;
      const dCtx = display.getContext('2d')!;

      bCtx.drawImage(img, 0, 0);
      mCtx.clearRect(0, 0, img.width, img.height);
      dCtx.drawImage(img, 0, 0);

      const initData = bCtx.getImageData(0, 0, img.width, img.height);
      setHistory([initData]);
      setHistoryIndex(0);
    };
  }, [imageUrl]);

  // Redraw display canvas composite
  const updateDisplayComposite = useCallback(() => {
    const base = baseCanvasRef.current;
    const mask = maskCanvasRef.current;
    const display = displayCanvasRef.current;
    if (!base || !mask || !display) return;

    const dCtx = display.getContext('2d')!;
    dCtx.clearRect(0, 0, display.width, display.height);

    if (isHoldingOriginal && originalImageRef.current) {
      dCtx.drawImage(originalImageRef.current, 0, 0);
      return;
    }

    // Draw base
    dCtx.drawImage(base, 0, 0);

    // Overlay translucent mask
    dCtx.save();
    dCtx.globalAlpha = 0.55;
    dCtx.drawImage(mask, 0, 0);
    dCtx.restore();
  }, [isHoldingOriginal]);

  useEffect(() => {
    updateDisplayComposite();
  }, [updateDisplayComposite]);

  // Pointer events for drawing mask
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const display = displayCanvasRef.current;
    if (!display) return { x: 0, y: 0 };
    const rect = display.getBoundingClientRect();
    const scaleX = display.width / rect.width;
    const scaleY = display.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const { x, y } = getCanvasCoords(e);
    lastPos.current = { x, y };

    const mask = maskCanvasRef.current;
    if (!mask) return;
    const mCtx = mask.getContext('2d')!;

    if (activeTool === 'eraser') {
      mCtx.globalCompositeOperation = 'destination-out';
      mCtx.beginPath();
      mCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      mCtx.fill();
    } else {
      mCtx.globalCompositeOperation = 'source-over';
      mCtx.fillStyle = activeTool === 'protect' ? '#10b981' : '#6366f1';
      mCtx.beginPath();
      mCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      mCtx.fill();
    }

    updateDisplayComposite();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPos.current) return;
    const { x, y } = getCanvasCoords(e);
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const mCtx = mask.getContext('2d')!;

    mCtx.lineWidth = brushSize;
    mCtx.lineCap = 'round';
    mCtx.lineJoin = 'round';

    if (activeTool === 'eraser') {
      mCtx.globalCompositeOperation = 'destination-out';
      mCtx.beginPath();
      mCtx.moveTo(lastPos.current.x, lastPos.current.y);
      mCtx.lineTo(x, y);
      mCtx.stroke();
    } else {
      mCtx.globalCompositeOperation = 'source-over';
      mCtx.strokeStyle = activeTool === 'protect' ? '#10b981' : '#6366f1';
      mCtx.beginPath();
      mCtx.moveTo(lastPos.current.x, lastPos.current.y);
      mCtx.lineTo(x, y);
      mCtx.stroke();
    }

    lastPos.current = { x, y };
    updateDisplayComposite();
  };

  const handlePointerUp = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };

  // Run AI Cleanup on masked areas
  const handleApplyCleanup = () => {
    const base = baseCanvasRef.current;
    const mask = maskCanvasRef.current;
    if (!base || !mask) return;

    setIsProcessing(true);

    setTimeout(() => {
      const output = document.createElement('canvas');
      inpaintImageMask(base, mask, output);

      const bCtx = base.getContext('2d')!;
      bCtx.drawImage(output, 0, 0);

      // Clear mask after cleanup
      const mCtx = mask.getContext('2d')!;
      mCtx.clearRect(0, 0, mask.width, mask.height);

      // Push history
      const newImgData = bCtx.getImageData(0, 0, base.width, base.height);
      const newHist = history.slice(0, historyIndex + 1);
      setHistory([...newHist, newImgData]);
      setHistoryIndex(newHist.length);

      setIsProcessing(false);
      updateDisplayComposite();
    }, 100);
  };

  // 1-Click AI Auto Detection & Removal (Zero Manual Painting)
  const handleAiAutoClean = async () => {
    const base = baseCanvasRef.current;
    const mask = maskCanvasRef.current;
    if (!base || !mask) return;

    setIsProcessing(true);
    setAiScanStatus('AI Scanning image for logos, date stamps & watermarks...');

    try {
      const detected = await detectWatermarksWithAI(base);
      if (detected.length > 0) {
        const mCtx = mask.getContext('2d')!;
        mCtx.clearRect(0, 0, mask.width, mask.height);
        mCtx.fillStyle = '#6366f1';

        // Automatically target detected watermark coordinates
        for (const box of detected) {
          const px = (box.x / 100) * mask.width;
          const py = (box.y / 100) * mask.height;
          const pw = (box.width / 100) * mask.width;
          const ph = (box.height / 100) * mask.height;
          mCtx.fillRect(px, py, pw, ph);
        }

        updateDisplayComposite();
        setAiScanStatus(`AI detected ${detected.length} watermarks. Reconstructing background...`);

        setTimeout(() => {
          const output = document.createElement('canvas');
          inpaintImageMask(base, mask, output);

          const bCtx = base.getContext('2d')!;
          bCtx.drawImage(output, 0, 0);

          mCtx.clearRect(0, 0, mask.width, mask.height);

          const newImgData = bCtx.getImageData(0, 0, base.width, base.height);
          const newHist = history.slice(0, historyIndex + 1);
          setHistory([...newHist, newImgData]);
          setHistoryIndex(newHist.length);

          setIsProcessing(false);
          setAiScanStatus(`AI successfully erased ${detected.length} watermarks with zero blur!`);
          updateDisplayComposite();
          setTimeout(() => setAiScanStatus(''), 3500);
        }, 150);
      } else {
        setIsProcessing(false);
        setAiScanStatus('No watermarks detected in image.');
        setTimeout(() => setAiScanStatus(''), 2500);
      }
    } catch (err) {
      console.warn('AI detect failed:', err);
      setIsProcessing(false);
      setAiScanStatus('');
    }
  };

  // Gemini AI Generative Inpainting
  const handleGeminiAiClean = async () => {
    const base = baseCanvasRef.current;
    if (!base) return;

    setIsProcessing(true);
    setAiScanStatus('Gemini AI Generative background clean in progress...');

    try {
      const cleanedUrl = await cleanImageWithAI(base);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = cleanedUrl;
      img.onload = () => {
        const bCtx = base.getContext('2d')!;
        bCtx.drawImage(img, 0, 0);

        const mask = maskCanvasRef.current;
        if (mask) {
          const mCtx = mask.getContext('2d')!;
          mCtx.clearRect(0, 0, mask.width, mask.height);
        }

        const newImgData = bCtx.getImageData(0, 0, base.width, base.height);
        const newHist = history.slice(0, historyIndex + 1);
        setHistory([...newHist, newImgData]);
        setHistoryIndex(newHist.length);

        setIsProcessing(false);
        setAiScanStatus('Gemini AI Clean completed successfully!');
        updateDisplayComposite();
        setTimeout(() => setAiScanStatus(''), 3500);
      };
    } catch (e: any) {
      console.warn('Gemini clean fallback to local AI:', e);
      handleAiAutoClean();
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const nextIdx = historyIndex - 1;
    const base = baseCanvasRef.current;
    if (!base) return;
    const bCtx = base.getContext('2d')!;
    bCtx.putImageData(history[nextIdx], 0, 0);
    setHistoryIndex(nextIdx);
    updateDisplayComposite();
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIdx = historyIndex + 1;
    const base = baseCanvasRef.current;
    if (!base) return;
    const bCtx = base.getContext('2d')!;
    bCtx.putImageData(history[nextIdx], 0, 0);
    setHistoryIndex(nextIdx);
    updateDisplayComposite();
  };

  // Export Clean Image
  const handleExportImage = () => {
    const base = baseCanvasRef.current;
    if (!base) return;

    base.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);

      // Download
      const a = document.createElement('a');
      a.href = url;
      a.download = `Clean_${imageName}`;
      a.click();

      // Save to My Works
      const newWork: ProcessedWork = {
        id: `img-work-${Date.now()}`,
        title: `Clean_${imageName}`,
        type: 'image',
        blobUrl: url,
        thumbnailUrl: url,
        createdAt: Date.now(),
        fileSizeBytes: blob.size,
        resolution: `${base.width}x${base.height}`,
      };
      saveWork(newWork);

      setHasExported(true);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    }, 'image/png');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setImageName(file.name);
      setHasExported(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Offscreen canvases */}
      <canvas ref={baseCanvasRef} className="hidden" />
      <canvas ref={maskCanvasRef} className="hidden" />

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
              <span>AI Photo Watermark Remover</span>
              <span className="text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                Magic Brush
              </span>
            </h1>
            <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
              {imageName} · Brush over unwanted stamps or objects
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>

          {/* AI 1-Click Auto Clean */}
          <button
            onClick={handleAiAutoClean}
            disabled={isProcessing}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-500 hover:from-cyan-500 hover:to-indigo-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 text-cyan-200 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'AI Cleaning...' : 'AI 1-Click Auto Clean'}</span>
          </button>

          <button
            onClick={handleExportImage}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Save HD Photo</span>
          </button>
        </div>
      </div>

      {/* AI Scan Status Feedback Banner */}
      {aiScanStatus && (
        <div className="rounded-xl bg-gradient-to-r from-cyan-950/70 via-indigo-950/70 to-slate-900 border border-cyan-500/40 px-4 py-2.5 flex items-center gap-3 text-xs text-cyan-200 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
          <span className="font-semibold">{aiScanStatus}</span>
        </div>
      )}

      {/* Main Studio Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Canvas Workspace (Col 8) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl min-h-[420px] max-h-[580px] flex items-center justify-center p-2 select-none overflow-auto">
            <canvas
              ref={displayCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
              className="max-h-[540px] max-w-full object-contain cursor-crosshair-canvas rounded shadow-md transition-transform"
            />

            {/* Quick Hold to Compare Original Overlay */}
            {isHoldingOriginal && (
              <div className="absolute top-4 left-4 bg-red-500/80 text-white text-xs font-bold px-3 py-1 rounded-md shadow pointer-events-none">
                Original Image
              </div>
            )}
          </div>

          {/* Bottom Toolbar: Undo, Redo, Zoom, Compare */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              <div className="h-5 w-px bg-slate-800 mx-1" />

              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-400 px-1">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Hold to Compare Original */}
              <button
                onPointerDown={() => setIsHoldingOriginal(true)}
                onPointerUp={() => setIsHoldingOriginal(false)}
                onPointerLeave={() => setIsHoldingOriginal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer active:bg-indigo-600 active:text-white transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Hold to Compare</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Tools Inspector (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Toolbox
            </h3>

            {/* Brush / Box / Eraser / Protect selectors */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTool('brush')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  activeTool === 'brush'
                    ? 'bg-cyan-500/20 border-cyan-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Paintbrush className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold">Magic Brush</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Stroke over mark</p>
              </button>

              <button
                onClick={() => setActiveTool('eraser')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  activeTool === 'eraser'
                    ? 'bg-red-500/20 border-red-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eraser className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-bold">Mask Eraser</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Erase selection</p>
              </button>

              <button
                onClick={() => setActiveTool('protect')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all col-span-2 ${
                  activeTool === 'protect'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold">Protected Area Brush</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Protect subjects & faces from changes</p>
              </button>
            </div>

            {/* Brush Size Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Brush Radius</span>
                <span className="font-mono text-cyan-400">{brushSize}px</span>
              </div>
              <input
                type="range"
                min={8}
                max={90}
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* Action Buttons: AI 1-Click Auto Clean + Manual Brush Clean */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleAiAutoClean}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-500 hover:from-cyan-500 hover:to-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>{isProcessing ? 'AI Scanning & Cleaning...' : 'AI 1-Click Auto Clean (Zero Effort)'}</span>
              </button>

              <button
                onClick={handleApplyCleanup}
                disabled={isProcessing}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>Clean Manual Brush Mask</span>
              </button>

              <button
                onClick={handleGeminiAiClean}
                disabled={isProcessing}
                className="w-full py-2 rounded-xl bg-slate-900 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Gemini Generative AI Clean</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
