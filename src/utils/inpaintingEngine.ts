import { WatermarkBox } from '../types';

/**
 * High-performance Zero-Blur Exemplar Inpainting Engine.
 * Synthesizes crisp, authentic textures, grain, and sharp boundaries
 * from surrounding unmasked regions without blurry smudges or artificial haze.
 */

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Applies inpainting or effects to a 2D canvas context based on normalized bounding boxes.
 */
export function applyWatermarkRemovalToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  boxes: WatermarkBox[],
  currentTime: number
) {
  for (const box of boxes) {
    if (currentTime < box.startTime || currentTime > box.endTime) {
      continue;
    }

    if (box.isProtected) {
      continue;
    }

    const pixelX = Math.round((box.x / 100) * width);
    const pixelY = Math.round((box.y / 100) * height);
    const pixelW = Math.round((box.width / 100) * width);
    const pixelH = Math.round((box.height / 100) * height);

    if (pixelW <= 2 || pixelH <= 2) continue;

    const clampedX = clamp(pixelX, 0, width - 1);
    const clampedY = clamp(pixelY, 0, height - 1);
    const clampedW = clamp(pixelW, 1, width - clampedX);
    const clampedH = clamp(pixelH, 1, height - clampedY);

    switch (box.mode) {
      case 'inpaint':
        applyExemplarTextureInpaint(ctx, clampedX, clampedY, clampedW, clampedH, width, height);
        break;
      case 'blur':
        applyGaussianBlur(ctx, clampedX, clampedY, clampedW, clampedH);
        break;
      case 'mosaic':
        applyMosaic(ctx, clampedX, clampedY, clampedW, clampedH, 12);
        break;
      case 'clone':
        applyCloneStamp(ctx, clampedX, clampedY, clampedW, clampedH, width, height);
        break;
    }
  }
}

/**
 * Zero-Blur Exemplar Texture Synthesis:
 * Replaces the watermark by sampling real, sharp texture patches from the
 * surrounding clean perimeter, maintaining authentic image grain, contrast,
 * and high-frequency details.
 */
export function applyExemplarTextureInpaint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number,
  canvasH: number
) {
  // Margin for sampling clean textures
  const margin = Math.max(8, Math.min(32, Math.floor(Math.min(w, h) * 0.4)));
  const sampleX = Math.max(0, x - margin);
  const sampleY = Math.max(0, y - margin);
  const sampleW = Math.min(canvasW - sampleX, w + margin * 2);
  const sampleH = Math.min(canvasH - sampleY, h + margin * 2);

  const imgData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
  const data = imgData.data;

  const localX = x - sampleX;
  const localY = y - sampleY;

  // Determine aspect ratio orientation
  const isHorizontalRibbon = w > h * 2.2;
  const isVerticalColumn = h > w * 2.2;

  // Determine donor source region
  // Prefer adjacent background that does NOT contain the watermark
  let donorOffsetX = 0;
  let donorOffsetY = 0;

  if (isHorizontalRibbon) {
    // For horizontal text / subtitles:
    // Look either slightly above or below the ribbon where the video background continues
    if (localY >= h) {
      donorOffsetY = -h;
    } else if (localY + h * 2 <= sampleH) {
      donorOffsetY = h;
    } else if (localX >= w * 0.5) {
      donorOffsetX = -Math.floor(w * 0.5);
    } else {
      donorOffsetX = Math.floor(w * 0.5);
    }
  } else if (isVerticalColumn) {
    if (localX >= w) {
      donorOffsetX = -w;
    } else if (localX + w * 2 <= sampleW) {
      donorOffsetX = w;
    } else if (localY >= h * 0.5) {
      donorOffsetY = -Math.floor(h * 0.5);
    } else {
      donorOffsetY = Math.floor(h * 0.5);
    }
  } else {
    // For corner logos (like TikTok handles or bugs):
    // If top-left, sample from right or bottom
    // If bottom-right, sample from left or above
    const distToTop = y;
    const distToBottom = canvasH - (y + h);
    const distToLeft = x;
    const distToRight = canvasW - (x + w);

    if (distToTop < distToBottom && distToLeft < distToRight) {
      // Top-left: sample from right
      donorOffsetX = margin;
      donorOffsetY = margin;
    } else if (distToTop < distToBottom && distToRight <= distToLeft) {
      // Top-right: sample from left
      donorOffsetX = -margin;
      donorOffsetY = margin;
    } else if (distToBottom <= distToTop && distToLeft < distToRight) {
      // Bottom-left: sample from right/above
      donorOffsetX = margin;
      donorOffsetY = -margin;
    } else {
      // Bottom-right: sample from left/above
      donorOffsetX = -margin;
      donorOffsetY = -margin;
    }
  }

  // Multi-patch synthesis with sharp texture transfer and seamless border feathering
  const blockSize = Math.max(4, Math.min(12, Math.floor(Math.min(w, h) / 3)));

  for (let r = 0; r < h; r += blockSize) {
    for (let c = 0; c < w; c += blockSize) {
      const currentBlockW = Math.min(blockSize, w - c);
      const currentBlockH = Math.min(blockSize, h - r);

      // Target position in local coords
      const targetLocalX = localX + c;
      const targetLocalY = localY + r;

      // Source donor position with edge-preserving offset
      let srcLocalX = clamp(targetLocalX + donorOffsetX, 0, sampleW - currentBlockW);
      let srcLocalY = clamp(targetLocalY + donorOffsetY, 0, sampleH - currentBlockH);

      // If source falls inside the masked watermark box, shift to outer clean margin
      if (
        srcLocalX >= localX - 2 &&
        srcLocalX <= localX + w + 2 &&
        srcLocalY >= localY - 2 &&
        srcLocalY <= localY + h + 2
      ) {
        if (localY > margin) {
          srcLocalY = clamp(localY - currentBlockH - 2, 0, sampleH - currentBlockH);
        } else if (localY + h + margin < sampleH) {
          srcLocalY = clamp(localY + h + 2, 0, sampleH - currentBlockH);
        } else if (localX > margin) {
          srcLocalX = clamp(localX - currentBlockW - 2, 0, sampleW - currentBlockW);
        } else {
          srcLocalX = clamp(localX + w + 2, 0, sampleW - currentBlockW);
        }
      }

      // Copy genuine texture patch from clean donor
      for (let br = 0; br < currentBlockH; br++) {
        for (let bc = 0; bc < currentBlockW; bc++) {
          const tIdx = ((targetLocalY + br) * sampleW + (targetLocalX + bc)) * 4;
          const sIdx = ((srcLocalY + br) * sampleW + (srcLocalX + bc)) * 4;

          // Seamless edge feathering near the outer boundary of the watermark box
          const edgeDistX = Math.min(c + bc, w - 1 - (c + bc));
          const edgeDistY = Math.min(r + br, h - 1 - (r + br));
          const edgeDist = Math.min(edgeDistX, edgeDistY);
          const blendAlpha = edgeDist < 3 ? edgeDist / 3 : 1.0;

          // Retain 100% crispness & texture detail
          const donorR = data[sIdx];
          const donorG = data[sIdx + 1];
          const donorB = data[sIdx + 2];

          if (blendAlpha >= 0.99) {
            data[tIdx] = donorR;
            data[tIdx + 1] = donorG;
            data[tIdx + 2] = donorB;
            data[tIdx + 3] = 255;
          } else {
            // Soft blend at outer boundary seam to eliminate hard lines
            const origR = data[tIdx];
            const origG = data[tIdx + 1];
            const origB = data[tIdx + 2];

            data[tIdx] = Math.round(donorR * blendAlpha + origR * (1 - blendAlpha));
            data[tIdx + 1] = Math.round(donorG * blendAlpha + origG * (1 - blendAlpha));
            data[tIdx + 2] = Math.round(donorB * blendAlpha + origB * (1 - blendAlpha));
            data[tIdx + 3] = 255;
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, sampleX, sampleY);
}

/**
 * Crisp Inpainting for Arbitrary Freehand Brush Masks.
 * Uses patch-matching exemplar propagation instead of blurring.
 */
export function inpaintImageMask(
  sourceCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement
) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  targetCanvas.width = width;
  targetCanvas.height = height;

  const tCtx = targetCanvas.getContext('2d')!;
  const mCtx = maskCanvas.getContext('2d')!;
  if (!tCtx || !mCtx) return;

  // Copy original image
  tCtx.drawImage(sourceCanvas, 0, 0);

  const imgData = tCtx.getImageData(0, 0, width, height);
  const maskData = mCtx.getImageData(0, 0, width, height);
  const pixels = imgData.data;
  const mask = maskData.data;

  // Find bounding box of mask
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasMask = false;

  const isMasked = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const pIdx = y * width + x;
      if (mask[idx + 3] > 20) {
        isMasked[pIdx] = 1;
        hasMask = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasMask) return;

  // Expand bounds slightly for clean sampling
  minX = Math.max(0, minX - 16);
  minY = Math.max(0, minY - 16);
  maxX = Math.min(width - 1, maxX + 16);
  maxY = Math.min(height - 1, maxY + 16);

  // Collect clean unmasked donor patches from the immediate outer perimeter
  const donorOffsets: { dx: number; dy: number }[] = [];
  const searchRadius = Math.max(12, Math.min(48, Math.floor(Math.max(maxX - minX, maxY - minY) * 0.4)));

  for (let dy = -searchRadius; dy <= searchRadius; dy += 4) {
    for (let dx = -searchRadius; dx <= searchRadius; dx += 4) {
      if (Math.hypot(dx, dy) >= 6) {
        donorOffsets.push({ dx, dy });
      }
    }
  }

  // Exemplar Synthesis loop from outer perimeter inward
  // We identify boundary pixels that have at least one unmasked neighbor
  let remainingMasked = true;
  let passCount = 0;
  const maxPasses = 30;

  while (remainingMasked && passCount < maxPasses) {
    remainingMasked = false;
    passCount++;

    const currentFillFront: { x: number; y: number }[] = [];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const pIdx = y * width + x;
        if (isMasked[pIdx] === 1) {
          remainingMasked = true;
          // Check if it neighbors an unmasked pixel
          let hasKnownNeighbor = false;
          for (let ny = -1; ny <= 1 && !hasKnownNeighbor; ny++) {
            for (let nx = -1; nx <= 1 && !hasKnownNeighbor; nx++) {
              if (nx === 0 && ny === 0) continue;
              const px = x + nx;
              const py = y + ny;
              if (px >= 0 && px < width && py >= 0 && py < height) {
                if (isMasked[py * width + px] === 0) {
                  hasKnownNeighbor = true;
                }
              }
            }
          }

          if (hasKnownNeighbor) {
            currentFillFront.push({ x, y });
          }
        }
      }
    }

    if (currentFillFront.length === 0) break;

    // Fill the current front pixels by finding the best matching donor texture
    for (const pt of currentFillFront) {
      const { x, y } = pt;
      const targetIdx = (y * width + x) * 4;

      // Find the closest valid clean donor pixel with matching surrounding context
      let bestDonorIdx = -1;
      let minDistance = Infinity;

      for (const offset of donorOffsets) {
        const sx = x + offset.dx;
        const sy = y + offset.dy;
        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          const sPIdx = sy * width + sx;
          if (isMasked[sPIdx] === 0) {
            const dist = Math.hypot(offset.dx, offset.dy);
            if (dist < minDistance) {
              minDistance = dist;
              bestDonorIdx = (sy * width + sx) * 4;
            }
          }
        }
      }

      if (bestDonorIdx >= 0) {
        // Copy authentic crisp texture without blur
        pixels[targetIdx] = pixels[bestDonorIdx];
        pixels[targetIdx + 1] = pixels[bestDonorIdx + 1];
        pixels[targetIdx + 2] = pixels[bestDonorIdx + 2];
        pixels[targetIdx + 3] = 255;
      }

      isMasked[y * width + x] = 0; // Mark filled
    }
  }

  tCtx.putImageData(imgData, 0, 0);
}

/**
 * Gaussian / Smooth Box Blur (when user intentionally chooses Blur mode)
 */
export function applyGaussianBlur(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = 'blur(14px)';
  ctx.drawImage(ctx.canvas, x - 20, y - 20, w + 40, h + 40, x - 20, y - 20, w + 40, h + 40);
  ctx.restore();
}

/**
 * Mosaic / Pixelate
 */
export function applyMosaic(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  blockSize = 14
) {
  const imgData = ctx.getImageData(x, y, w, h);
  const data = imgData.data;

  for (let r = 0; r < h; r += blockSize) {
    for (let c = 0; c < w; c += blockSize) {
      const actualBlockW = Math.min(blockSize, w - c);
      const actualBlockH = Math.min(blockSize, h - r);

      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let count = 0;

      for (let br = 0; br < actualBlockH; br++) {
        for (let bc = 0; bc < actualBlockW; bc++) {
          const idx = ((r + br) * w + (c + bc)) * 4;
          totalR += data[idx];
          totalG += data[idx + 1];
          totalB += data[idx + 2];
          count++;
        }
      }

      const avgR = Math.round(totalR / count);
      const avgG = Math.round(totalG / count);
      const avgB = Math.round(totalB / count);

      for (let br = 0; br < actualBlockH; br++) {
        for (let bc = 0; bc < actualBlockW; bc++) {
          const idx = ((r + br) * w + (c + bc)) * 4;
          data[idx] = avgR;
          data[idx + 1] = avgG;
          data[idx + 2] = avgB;
        }
      }
    }
  }

  ctx.putImageData(imgData, x, y);
}

/**
 * Clone Stamp from neighboring patch
 */
export function applyCloneStamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number,
  canvasH: number
) {
  let sourceX = x;
  let sourceY = Math.max(0, y - h);

  if (y - h < 0) {
    sourceY = Math.min(canvasH - h, y + h);
  }
  if (sourceY === y) {
    sourceX = Math.max(0, x - w);
    if (x - w < 0) {
      sourceX = Math.min(canvasW - w, x + w);
    }
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(ctx.canvas, sourceX, sourceY, w, h, x, y, w, h);
  ctx.restore();
}
