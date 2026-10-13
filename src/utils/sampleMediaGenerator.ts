import { SampleMedia } from '../types';

export const SAMPLE_ITEMS: SampleMedia[] = [
  {
    id: 'sample-tiktok',
    title: 'Shorts Dance Clip (Watermark & Handle)',
    type: 'video',
    description: 'Vertical 9:16 clip featuring bouncing username watermark & platform corner logo.',
    duration: 5,
    aspectRatio: '9:16',
    generatorType: 'tiktok',
    defaultBoxes: [
      {
        x: 6,
        y: 8,
        width: 32,
        height: 6,
        mode: 'inpaint',
        startTime: 0,
        endTime: 5,
        label: 'Corner Handle',
      },
      {
        x: 62,
        y: 82,
        width: 32,
        height: 6,
        mode: 'inpaint',
        startTime: 0,
        endTime: 5,
        label: 'Bottom Watermark',
      },
    ],
  },
  {
    id: 'sample-movie',
    title: 'Cinematic Movie (Subtitles & Channel Bug)',
    type: 'video',
    description: 'Widescreen 16:9 cinematic shot with hardcoded subtitles and network logo bug.',
    duration: 6,
    aspectRatio: '16:9',
    generatorType: 'movie_sub',
    defaultBoxes: [
      {
        x: 15,
        y: 84,
        width: 70,
        height: 9,
        mode: 'inpaint',
        startTime: 0,
        endTime: 6,
        label: 'Hardcoded Subtitles',
      },
      {
        x: 82,
        y: 6,
        width: 14,
        height: 7,
        mode: 'inpaint',
        startTime: 0,
        endTime: 6,
        label: 'Channel Bug',
      },
    ],
  },
  {
    id: 'sample-city',
    title: 'Drone Stock Footage (Central Watermark)',
    type: 'video',
    description: 'Aerial cityscape with prominent diagonal stock agency preview watermark.',
    duration: 5,
    aspectRatio: '16:9',
    generatorType: 'city_stock',
    defaultBoxes: [
      {
        x: 18,
        y: 38,
        width: 64,
        height: 24,
        mode: 'inpaint',
        startTime: 0,
        endTime: 5,
        label: 'Stock Center Stamp',
      },
    ],
  },
  {
    id: 'sample-travel-img',
    title: 'Travel Landscape (Date & Copyright Stamp)',
    type: 'image',
    description: 'High-res mountain lake landscape with red digital date stamp and copyright text.',
    aspectRatio: '16:9',
    generatorType: 'travel_stamp',
    defaultBoxes: [
      {
        x: 68,
        y: 88,
        width: 28,
        height: 8,
        mode: 'inpaint',
        startTime: 0,
        endTime: 0,
        label: 'Date & Copyright',
      },
    ],
  },
  {
    id: 'sample-product-img',
    title: 'Product Studio Shot (Price Tag Overlay)',
    type: 'image',
    description: 'Studio product photo with unwanted promotional badge & discount sticker.',
    aspectRatio: '1:1',
    generatorType: 'product_badge',
    defaultBoxes: [
      {
        x: 10,
        y: 12,
        width: 32,
        height: 18,
        mode: 'inpaint',
        startTime: 0,
        endTime: 0,
        label: 'Promo Discount Badge',
      },
    ],
  },
];

// Video blob cache
const videoBlobCache: Record<string, string> = {};
const imageCache: Record<string, string> = {};

/**
 * Procedurally generates real video Blob URLs using HTML5 Canvas & MediaRecorder.
 */
export async function getSampleVideoUrl(generatorType: 'tiktok' | 'movie_sub' | 'city_stock'): Promise<string> {
  if (videoBlobCache[generatorType]) {
    return videoBlobCache[generatorType];
  }

  const canvas = document.createElement('canvas');
  let width = 720;
  let height = 1280;

  if (generatorType === 'movie_sub' || generatorType === 'city_stock') {
    width = 1280;
    height = 720;
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(30);
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = ''; // fallback
    }
  }

  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<string>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      videoBlobCache[generatorType] = url;
      resolve(url);
    };
  });

  recorder.start();

  const totalFrames = 30 * 4; // 4 seconds at 30 fps
  let frame = 0;

  const renderFrame = () => {
    const t = frame / 30; // seconds

    ctx.clearRect(0, 0, width, height);

    if (generatorType === 'tiktok') {
      // Background gradient animation
      const grad = ctx.createLinearGradient(0, 0, width, height);
      const hue1 = (t * 40) % 360;
      const hue2 = (hue1 + 90) % 360;
      grad.addColorStop(0, `hsl(${hue1}, 65%, 20%)`);
      grad.addColorStop(1, `hsl(${hue2}, 70%, 12%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Animated colorful waves / silhouettes
      ctx.save();
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.fillStyle = `hsla(${(hue1 + i * 50) % 360}, 80%, 55%, 0.35)`;
        const waveY = height * 0.5 + Math.sin(t * 3 + i) * 120;
        ctx.arc(width * 0.5 + Math.cos(t * 2 + i) * 100, waveY, 180 + i * 30, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Street silhouette / performer graphic
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(width * 0.5, height * 0.72, 140, 260, 0, 0, Math.PI * 2);
      ctx.fill();

      // Realistic TikTok style watermarks
      // Top corner watermark
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('♫ @tiktok_creator', width * 0.08, height * 0.12);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(width * 0.08, height * 0.13, 60, 3);
      ctx.restore();

      // Bottom corner watermark
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('@tiktok_creator', width * 0.65, height * 0.85);
      ctx.fillStyle = '#ec4899';
      ctx.fillText('TikTok', width * 0.65, height * 0.88);
      ctx.restore();

    } else if (generatorType === 'movie_sub') {
      // Moody cinematic mountain scenery
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.4, '#334155');
      grad.addColorStop(0.8, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Mountains
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.6);
      ctx.lineTo(width * 0.35, height * 0.35);
      ctx.lineTo(width * 0.7, height * 0.65);
      ctx.lineTo(width, height * 0.45);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fill();

      // Animated mist
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      const mistOffset = (t * 40) % width;
      ctx.fillRect(mistOffset - width, height * 0.5, width * 2, 80);

      // Channel bug watermark top-right
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('HBO • HD', width * 0.84, height * 0.1);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.strokeRect(width * 0.83, height * 0.06, 140, 42);
      ctx.restore();

      // Hardcoded subtitles at bottom
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(width * 0.16, height * 0.85, width * 0.68, 54);
      ctx.fillStyle = '#fef08a'; // Film yellow subtitle
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('The truth lies inside what we cannot see.', width * 0.5, height * 0.9);
      ctx.restore();

    } else if (generatorType === 'city_stock') {
      // Twilight aerial city
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#020617');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // City buildings grid
      for (let i = 0; i < 24; i++) {
        const bW = 40 + (i % 5) * 15;
        const bH = 180 + ((i * 73) % 240);
        const bX = (i * 55) % width;
        const bY = height - bH;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(bX, bY, bW, bH);
        ctx.strokeStyle = '#1e293b';
        ctx.strokeRect(bX, bY, bW, bH);

        // Windows
        ctx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#38bdf8';
        for (let wy = bY + 20; wy < height - 20; wy += 30) {
          if ((wy + i * 10 + Math.floor(t * 2)) % 3 === 0) {
            ctx.fillRect(bX + 8, wy, 8, 12);
          }
        }
      }

      // Large diagonal stock watermark
      ctx.save();
      ctx.translate(width * 0.5, height * 0.5);
      ctx.rotate(-Math.PI / 12);
      ctx.font = 'bold 44px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 4;
      ctx.textAlign = 'center';
      ctx.strokeText('STOCK AGENCY PREVIEW • 4K', 0, 0);
      ctx.fillText('STOCK AGENCY PREVIEW • 4K', 0, 0);
      ctx.restore();
    }

    frame++;
    if (frame < totalFrames) {
      setTimeout(renderFrame, 1000 / 30);
    } else {
      recorder.stop();
    }
  };

  renderFrame();
  return recordingPromise;
}

/**
 * Generates sample image URLs using Canvas.
 */
export function getSampleImageUrl(generatorType: 'travel_stamp' | 'product_badge'): string {
  if (imageCache[generatorType]) {
    return imageCache[generatorType];
  }

  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = generatorType === 'travel_stamp' ? 675 : 1200;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (generatorType === 'travel_stamp') {
    // Beautiful sunset lake landscape
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.6);
    skyGrad.addColorStop(0, '#f97316');
    skyGrad.addColorStop(0.4, '#fb923c');
    skyGrad.addColorStop(0.7, '#f43f5e');
    skyGrad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height * 0.6);

    // Sun
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.45, 70, 0, Math.PI * 2);
    ctx.fill();

    // Mountains
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.6);
    ctx.lineTo(width * 0.25, height * 0.35);
    ctx.lineTo(width * 0.55, height * 0.6);
    ctx.lineTo(width * 0.85, height * 0.38);
    ctx.lineTo(width, height * 0.6);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    // Lake reflection
    const waterGrad = ctx.createLinearGradient(0, height * 0.6, 0, height);
    waterGrad.addColorStop(0, '#4338ca');
    waterGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, height * 0.6, width, height * 0.4);

    // Watermark 1: Red Digital Date Stamp
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 32px "JetBrains Mono", monospace';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText('’26 09 18', width * 0.72, height * 0.92);

    // Watermark 2: Copyright stamp
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '22px sans-serif';
    ctx.fillText('© 2026 NATURE_STUDIO. ALL RIGHTS RESERVED', width * 0.66, height * 0.96);

  } else {
    // Studio Product Photo
    const bgGrad = ctx.createRadialGradient(width * 0.5, height * 0.5, 50, width * 0.5, height * 0.5, width * 0.7);
    bgGrad.addColorStop(0, '#334155');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Pedestal
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 0.75, 340, 100, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sleek Camera / Headphone Gadget Graphic
    ctx.fillStyle = '#020617';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(width * 0.32, height * 0.38, 360, 260, 36);
    ctx.fill();
    ctx.stroke();

    // Lens
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.51, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Big Unwanted Promo Discount Sticker Watermark
    ctx.save();
    ctx.translate(width * 0.22, height * 0.2);
    ctx.rotate(-0.15);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(-120, -60, 260, 110, 20);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SALE -50%', 10, -10);
    ctx.font = '20px sans-serif';
    ctx.fillText('LIMITED TIME OFFER', 10, 24);
    ctx.restore();
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  imageCache[generatorType] = dataUrl;
  return dataUrl;
}
