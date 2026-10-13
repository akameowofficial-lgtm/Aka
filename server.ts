import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));

// Server-side Gemini AI client initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * AI Auto-Detection of watermarks, subtitles, logos, and stamps.
 * Analyzes frame with Gemini 3.8 Flash to return normalized bounding coordinates.
 */
app.post('/api/ai/auto-detect', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 data' });
    }

    // Clean data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: `Analyze this image/video frame carefully. Detect ALL unwanted watermarks, platform logos, creator handles, TikTok/Reels user tags, hardcoded subtitles/captions, date stamps, and copyright marks.
Return each detected watermark as a bounding box with coordinates in percentage (0 to 100) from top-left:
- x: horizontal start percentage (0 - 100)
- y: vertical start percentage (0 - 100)
- width: width percentage (1 - 100)
- height: height percentage (1 - 100)
- label: descriptive name (e.g. "TikTok Handle", "Bottom Subtitle", "Channel Logo", "Date Stamp")
- type: category ("handle", "logo", "subtitle", "stamp", "watermark")`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedWatermarks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.NUMBER, description: 'Percentage from left 0 - 100' },
                  y: { type: Type.NUMBER, description: 'Percentage from top 0 - 100' },
                  width: { type: Type.NUMBER, description: 'Width in percentage 0 - 100' },
                  height: { type: Type.NUMBER, description: 'Height in percentage 0 - 100' },
                  label: { type: Type.STRING, description: 'Human readable label' },
                  type: { type: Type.STRING, description: 'watermark type' },
                },
                required: ['x', 'y', 'width', 'height', 'label', 'type'],
              },
            },
          },
          required: ['detectedWatermarks'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"detectedWatermarks":[]}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in AI auto-detection:', error);
    // Fallback gracefully so frontend can apply local computer vision detector
    res.status(500).json({ error: error.message || 'AI detection failed' });
  }
});

/**
 * AI Generative Inpainting for Photos:
 * Uses Gemini image editing to clean and reconstruct pristine background.
 */
app.post('/api/ai/clean-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', prompt = 'Remove all watermarks, logos, text overlays, and stamps. Restore and reconstruct the clean, pristine natural background with sharp texture.' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    let cleanedImageUrl = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          cleanedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (cleanedImageUrl) {
      res.json({ cleanedImageUrl });
    } else {
      res.status(500).json({ error: 'No cleaned image part returned by model' });
    }
  } catch (error: any) {
    console.error('Error in AI image clean:', error);
    res.status(500).json({ error: error.message || 'AI image clean failed' });
  }
});

// Mount Vite or static server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MarkClear full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
