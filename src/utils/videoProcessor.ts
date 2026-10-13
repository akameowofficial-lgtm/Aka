import { WatermarkBox } from '../types';
import { applyWatermarkRemovalToCanvas } from './inpaintingEngine';

export interface ExportProgress {
  percent: number;
  currentSecond: number;
  totalDuration: number;
  status: string;
}

/**
 * Ultra-Fast & Crash-Proof Video Export Engine.
 * Uses real-time stream playback capture with high-efficiency hardware canvas rendering.
 * Eliminates video seeking deadlocks and browser crashes.
 */
export async function exportCleanVideo(
  videoSourceUrl: string,
  boxes: WatermarkBox[],
  targetResolution: '720p' | '1080p' | '4k' | 'original',
  onProgress: (p: ExportProgress) => void
): Promise<{ blob: Blob; url: string; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    let isCompleted = false;
    let animId: number | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (animId) cancelAnimationFrame(animId);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    video.onloadedmetadata = async () => {
      try {
        const duration = Math.max(1, video.duration || 5);
        let exportW = video.videoWidth || 1280;
        let exportH = video.videoHeight || 720;

        const isLandscape = exportW >= exportH;

        if (targetResolution === '4k') {
          // Safe high-efficiency QHD / 4K stream
          exportW = isLandscape ? 2560 : 1440;
          exportH = isLandscape ? 1440 : 2560;
        } else if (targetResolution === '1080p') {
          exportW = isLandscape ? 1920 : 1080;
          exportH = isLandscape ? 1080 : 1920;
        } else if (targetResolution === '720p') {
          exportW = isLandscape ? 1280 : 720;
          exportH = isLandscape ? 720 : 1280;
        }

        const canvas = document.createElement('canvas');
        canvas.width = exportW;
        canvas.height = exportH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

        const fps = 30;
        const stream = canvas.captureStream(fps);

        // Detect optimal supported video codec
        let mimeType = 'video/webm;codecs=vp9,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8,opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'video/mp4';
              if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = '';
              }
            }
          }
        }

        const recorderOptions: MediaRecorderOptions = {};
        if (mimeType) recorderOptions.mimeType = mimeType;
        recorderOptions.videoBitsPerSecond = targetResolution === '4k' ? 12000000 : 6000000;

        const recorder = new MediaRecorder(stream, recorderOptions);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          if (isCompleted) return;
          isCompleted = true;
          cleanup();

          const finalBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
          const url = URL.createObjectURL(finalBlob);

          onProgress({
            percent: 100,
            currentSecond: Math.round(duration * 10) / 10,
            totalDuration: Math.round(duration * 10) / 10,
            status: 'Export complete!',
          });

          resolve({
            blob: finalBlob,
            url,
            sizeBytes: finalBlob.size,
          });
        };

        recorder.onerror = (e) => {
          cleanup();
          reject(new Error('MediaRecorder encountered an error'));
        };

        // Start recorder
        recorder.start(100); // 100ms slice for smooth chunk collection

        // Set video to start and play
        video.currentTime = 0;
        video.playbackRate = 1.0;

        await video.play().catch((err) => {
          console.warn('Video auto-play error, continuing anyway:', err);
        });

        const startTime = performance.now();

        // Safety fallback timeout to prevent hanging forever
        fallbackTimeout = setTimeout(() => {
          if (!isCompleted && recorder.state === 'recording') {
            console.log('Export safety timeout reached, finalizing video...');
            recorder.stop();
          }
        }, (duration + 4) * 1000);

        // Continuous render loop without seek lock
        const renderLoop = () => {
          if (isCompleted) return;

          const currentSec = video.currentTime;
          const isFinished = video.ended || currentSec >= duration - 0.05;

          // Draw base frame
          ctx.drawImage(video, 0, 0, exportW, exportH);

          // Apply clean zero-blur watermark inpainting
          applyWatermarkRemovalToCanvas(ctx, exportW, exportH, boxes, currentSec);

          const percent = Math.min(99, Math.round((currentSec / duration) * 100));
          onProgress({
            percent,
            currentSecond: Math.round(currentSec * 10) / 10,
            totalDuration: Math.round(duration * 10) / 10,
            status: `Fast AI rendering: ${percent}% completed`,
          });

          if (isFinished) {
            onProgress({
              percent: 99,
              currentSecond: Math.round(duration * 10) / 10,
              totalDuration: Math.round(duration * 10) / 10,
              status: 'Finalizing clean video stream...',
            });

            if (recorder.state === 'recording') {
              recorder.stop();
            }
            return;
          }

          animId = requestAnimationFrame(renderLoop);
        };

        renderLoop();
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = (err) => {
      cleanup();
      reject(new Error('Failed to load video source for export'));
    };

    video.src = videoSourceUrl;
  });
}
