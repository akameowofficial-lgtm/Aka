export type WatermarkMode = 'inpaint' | 'blur' | 'mosaic' | 'clone';

export interface WatermarkBox {
  id: string;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  width: number; // percentage 0 - 100
  height: number; // percentage 0 - 100
  mode: WatermarkMode;
  startTime: number; // seconds
  endTime: number; // seconds
  label: string;
  isProtected?: boolean;
}

export type BrushToolType = 'brush' | 'box' | 'eraser' | 'protect';

export interface BrushStroke {
  points: { x: number; y: number }[];
  size: number;
  isEraser: boolean;
  isProtected: boolean;
}

export type AppTab = 
  | 'home' 
  | 'video_remover' 
  | 'image_remover' 
  | 'subtitle_remover' 
  | 'add_watermark' 
  | 'video_crop'
  | 'my_works';

export interface ProcessedWork {
  id: string;
  title: string;
  type: 'video' | 'image';
  blobUrl: string;
  thumbnailUrl: string;
  createdAt: number;
  fileSizeBytes: number;
  duration?: number;
  resolution: string;
}

export interface SampleMedia {
  id: string;
  title: string;
  type: 'video' | 'image';
  description: string;
  duration?: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  defaultBoxes: Omit<WatermarkBox, 'id'>[];
  generatorType: 'tiktok' | 'movie_sub' | 'city_stock' | 'travel_stamp' | 'product_badge';
}
