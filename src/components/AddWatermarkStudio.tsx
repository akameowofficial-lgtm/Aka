import React, { useState, useRef, useEffect } from 'react';
import { 
  Stamp, 
  ArrowLeft, 
  Download, 
  Upload, 
  Sliders, 
  Sparkles,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProcessedWork } from '../types';
import { saveWork } from '../utils/worksStorage';

interface AddWatermarkStudioProps {
  initialImageUrl?: string;
  onBack: () => void;
  onOpenMyWorks: () => void;
}

export const AddWatermarkStudio: React.FC<AddWatermarkStudioProps> = ({
  initialImageUrl,
  onBack,
  onOpenMyWorks,
}) => {
  const [imageUrl, setImageUrl] = useState<string>(initialImageUrl || '');
  const [imageName, setImageName] = useState<string>('branded_photo.jpg');

  // Watermark parameters
  const [watermarkText, setWatermarkText] = useState<string>('© MARKCLEAR CREATOR');
  const [fontSize, setFontSize] = useState<number>(36);
  const [opacity, setOpacity] = useState<number>(0.65);
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [isTiled, setIsTiled] = useState<boolean>(false);
  const [positionPreset, setPositionPreset] = useState<'bottom-right' | 'top-right' | 'center' | 'bottom-left'>('bottom-right');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imgRef.current = img;
      renderWatermark();
    };
  }, [imageUrl]);

  const renderWatermark = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;

    // Draw background image
    ctx.drawImage(img, 0, 0);

    ctx.save();
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = textColor;
    ctx.globalAlpha = opacity;

    if (isTiled) {
      // Diagonal repeating tile pattern
      const textMetrics = ctx.measureText(watermarkText);
      const stepX = textMetrics.width + 120;
      const stepY = fontSize + 90;

      ctx.rotate(-Math.PI / 8);
      for (let y = -img.height; y < img.height * 2; y += stepY) {
        for (let x = -img.width; x < img.width * 2; x += stepX) {
          ctx.fillText(watermarkText, x, y);
        }
      }
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;

      const metrics = ctx.measureText(watermarkText);
      let posX = canvas.width - metrics.width - 40;
      let posY = canvas.height - 40;

      if (positionPreset === 'bottom-left') {
        posX = 40;
        posY = canvas.height - 40;
      } else if (positionPreset === 'top-right') {
        posX = canvas.width - metrics.width - 40;
        posY = fontSize + 40;
      } else if (positionPreset === 'center') {
        posX = (canvas.width - metrics.width) / 2;
        posY = canvas.height / 2;
      }

      ctx.fillText(watermarkText, posX, posY);
    }

    ctx.restore();
  };

  useEffect(() => {
    renderWatermark();
  }, [watermarkText, fontSize, opacity, textColor, isTiled, positionPreset]);

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `Watermarked_${imageName}`;
      a.click();

      saveWork({
        id: `wm-work-${Date.now()}`,
        title: `Watermarked_${imageName}`,
        type: 'image',
        blobUrl: url,
        thumbnailUrl: url,
        createdAt: Date.now(),
        fileSizeBytes: blob.size,
        resolution: `${canvas.width}x${canvas.height}`,
      });

      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setImageName(file.name);
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
              <span>Watermark Shield & Stamp</span>
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Anti-Theft
              </span>
            </h1>
            <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
              Add signature branding and copyright watermarks to protect your media
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

          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Save Watermarked Photo</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Canvas Viewport (Col 8) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl min-h-[420px] max-h-[580px] flex items-center justify-center p-2 select-none overflow-auto">
            <canvas ref={canvasRef} className="max-h-[540px] max-w-full object-contain rounded shadow-md" />
          </div>
        </div>

        {/* Right Settings Inspector (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Watermark Customization
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Text Signature</label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Font Size</span>
                <span className="font-mono text-emerald-400">{fontSize}px</span>
              </div>
              <input
                type="range"
                min={16}
                max={90}
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Opacity</span>
                <span className="font-mono text-emerald-400">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-semibold">Tiled Anti-Theft Pattern</span>
                <button
                  onClick={() => setIsTiled(!isTiled)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    isTiled ? 'bg-emerald-600' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                      isTiled ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {!isTiled && (
                <div className="grid grid-cols-2 gap-1.5 pt-2">
                  {(['bottom-right', 'top-right', 'center', 'bottom-left'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setPositionPreset(pos)}
                      className={`p-2 rounded-lg border text-[11px] font-semibold cursor-pointer capitalize ${
                        positionPreset === pos
                          ? 'bg-emerald-600/20 border-emerald-500 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      {pos.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
