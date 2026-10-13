# MarkClear - AI Video & Photo Watermark Remover

> Open-source clone of **MarkClear: AI Video Watermark Remover** (`com.xiaoxu.spqsy` by Xiaoxu Technology). 100% free with no paywalls, zero-blur inpainting, and high-speed 4K export.

[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-3.8%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)

---

## 🚀 Key Features

* **AI Video Watermark Remover**:
  * **1-Click AI Auto Detection**: Automatically scans video frames using Gemini 3.8 Flash & Computer Vision to detect TikTok/Reels handles, platform watermarks, and corner bugs.
  * **Zero-Blur Exemplar Inpainting**: Synthesizes genuine texture patches from surrounding clean areas, eliminating artificial blur and smudging.
  * **Interactive Bounding Boxes**: Multi-box targeting with 8 resize handles and position snaps (Top-Left, Top-Right, Subtitle, Bottom-Right).
  * **Keyframe Time Intervals**: Set start & end timestamps so watermarks are only cleaned when active.
  * **Split-Screen Compare**: Real-time slider comparing original vs. AI-cleaned video.
  * **Fast 4K / 1080p Export**: High-speed stream recording without seek lag or browser crashes.

* **AI Photo Watermark Remover**:
  * **Magic Brush**: Freehand highlighter brush with radius slider (8px–90px).
  * **AI 1-Click Auto Clean**: Detects and erases date stamps, copyright text, and stickers in one click.
  * **Protected Area Brush**: Safeguards faces, subjects, and logos from modification.
  * **Gemini Generative Inpainting**: Server-side AI background restoration.
  * **Hold to Compare**: Instant toggle to view original image.

* **AI Subtitle Remover**:
  * Dedicated video subtitle ribbon eraser with auto-snapping to bottom banners (80%–95%), lower-thirds, and top captions.

* **Video Crop & Trim Studio**:
  * Standard aspect ratios (9:16 Shorts/TikTok, 16:9 YouTube, 1:1 Feed, 4:5, Free crop).
  * Fast video time trimmer for clipping unwanted margins.

* **Watermark Shield & Stamp**:
  * Add custom text branding, opacity, and anti-theft diagonal tiled patterns.

* **My Works Gallery**:
  * Persistent archive of exported media with instant preview, resolution badges, and direct downloads.

---

## 🛠️ Tech Stack

* **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti
* **Backend**: Express (Node.js/tsx) mounted with Vite dev middleware
* **AI Engine**: `@google/genai` (Gemini 3.8 Flash for detection, Gemini 3.1 Flash Lite Image for generative clean)
* **Processing**: HTML5 Canvas Stream, MediaRecorder, Exemplar Texture Synthesis Engine

---

## 💻 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/markclear-watermark-remover.git
cd markclear-watermark-remover
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your Google Gemini API key if you want to use the server-side AI features:
```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

### 4. Start the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production
```bash
npm run build
npm start
```

---

## 📤 Publishing to GitHub

### Method 1: Directly from Google AI Studio UI (Recommended)
1. In the top-right corner of the **Google AI Studio Build** interface, look for the **Share / Export** menu.
2. Select **"Export to GitHub"** or **"Push to GitHub"**.
3. Authorize your GitHub account, choose or create a new repository (e.g. `markclear-watermark-remover`), and confirm.
4. AI Studio will automatically push all files and commit history directly to your repository!

### Method 2: Via Git Command Line
```bash
# 1. Initialize git if not already done
git init

# 2. Stage all files
git add .

# 3. Create initial commit
git commit -m "feat: MarkClear AI Video & Photo Watermark Remover clone"

# 4. Link your remote GitHub repository
git remote add origin https://github.com/<your-username>/markclear-watermark-remover.git

# 5. Push to main branch
git branch -M main
git push -u origin main
```

---

## 📄 License

This project is licensed under the Apache-2.0 License.
