import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { VideoWatermarkStudio } from './components/VideoWatermarkStudio';
import { ImageWatermarkStudio } from './components/ImageWatermarkStudio';
import { SubtitleRemoverStudio } from './components/SubtitleRemoverStudio';
import { VideoCropStudio } from './components/VideoCropStudio';
import { AddWatermarkStudio } from './components/AddWatermarkStudio';
import { MyWorksView } from './components/MyWorksView';
import { SettingsModal } from './components/SettingsModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AppTab, SampleMedia, ProcessedWork, WatermarkBox } from './types';
import { getSavedWorks } from './utils/worksStorage';
import { getSampleVideoUrl, getSampleImageUrl } from './utils/sampleMediaGenerator';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [savedWorks, setSavedWorks] = useState<ProcessedWork[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMobileLayout, setIsMobileLayout] = useState<boolean>(false);
  const [isLoadingSample, setIsLoadingSample] = useState<boolean>(false);

  // Active media loaded into studios
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('');
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [initialBoxes, setInitialBoxes] = useState<Omit<WatermarkBox, 'id'>[]>([]);

  // Load saved works on mount
  const refreshWorks = () => {
    setSavedWorks(getSavedWorks());
  };

  useEffect(() => {
    refreshWorks();

    // Pre-initialize a default sample clip so Video Studio is always ready instantly
    getSampleVideoUrl('tiktok').then((url) => {
      setCurrentVideoUrl(url);
    });
    setCurrentImageUrl(getSampleImageUrl('travel_stamp'));
  }, []);

  // Handle sample selection from Home
  const handleLoadSample = async (sample: SampleMedia) => {
    setIsLoadingSample(true);
    try {
      if (sample.type === 'video') {
        const url = await getSampleVideoUrl(
          sample.generatorType as 'tiktok' | 'movie_sub' | 'city_stock'
        );
        setCurrentVideoUrl(url);
        setInitialBoxes(sample.defaultBoxes);

        if (sample.generatorType === 'movie_sub') {
          setActiveTab('subtitle_remover');
        } else {
          setActiveTab('video_remover');
        }
      } else {
        const url = getSampleImageUrl(
          sample.generatorType as 'travel_stamp' | 'product_badge'
        );
        setCurrentImageUrl(url);
        setActiveTab('image_remover');
      }
    } catch (e) {
      console.error('Failed to load sample:', e);
    } finally {
      setIsLoadingSample(false);
    }
  };

  // Handle direct file upload from Home
  const handleFileUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) {
      setCurrentVideoUrl(url);
      setInitialBoxes([
        {
          x: 10,
          y: 10,
          width: 30,
          height: 10,
          mode: 'inpaint',
          startTime: 0,
          endTime: 10,
          label: 'Watermark Zone 1',
        },
      ]);
      setActiveTab('video_remover');
    } else if (file.type.startsWith('image/')) {
      setCurrentImageUrl(url);
      setActiveTab('image_remover');
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isMobileLayout={isMobileLayout}
        onToggleMobileLayout={() => setIsMobileLayout(!isMobileLayout)}
        savedWorksCount={savedWorks.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 pt-6">
        {/* Device frame wrapper if mobile layout simulation is toggled on desktop */}
        <div
          className={
            isMobileLayout
              ? 'max-w-md mx-auto bg-slate-950 rounded-[40px] border-4 border-slate-800 p-4 shadow-2xl min-h-[750px] relative'
              : 'w-full'
          }
        >
          {/* Sample loading indicator */}
          {isLoadingSample && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex items-center gap-3 shadow-2xl">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                <span className="text-sm font-semibold text-slate-200">
                  Preparing Sample Media Clip...
                </span>
              </div>
            </div>
          )}

          {/* Active View Router */}
          {activeTab === 'home' && (
            <HomeView
              onSelectTab={setActiveTab}
              onLoadSample={handleLoadSample}
              onFileUpload={handleFileUpload}
              recentWorksCount={savedWorks.length}
            />
          )}

          {activeTab === 'video_remover' && (
            <VideoWatermarkStudio
              initialVideoUrl={currentVideoUrl}
              initialBoxes={initialBoxes}
              onBack={() => setActiveTab('home')}
              onOpenMyWorks={() => {
                refreshWorks();
                setActiveTab('my_works');
              }}
            />
          )}

          {activeTab === 'image_remover' && (
            <ImageWatermarkStudio
              initialImageUrl={currentImageUrl}
              onBack={() => setActiveTab('home')}
              onOpenMyWorks={() => {
                refreshWorks();
                setActiveTab('my_works');
              }}
            />
          )}

          {activeTab === 'subtitle_remover' && (
            <SubtitleRemoverStudio
              initialVideoUrl={currentVideoUrl}
              onBack={() => setActiveTab('home')}
              onOpenMyWorks={() => {
                refreshWorks();
                setActiveTab('my_works');
              }}
            />
          )}

          {activeTab === 'video_crop' && (
            <VideoCropStudio
              initialVideoUrl={currentVideoUrl}
              onBack={() => setActiveTab('home')}
              onOpenMyWorks={() => {
                refreshWorks();
                setActiveTab('my_works');
              }}
            />
          )}

          {activeTab === 'add_watermark' && (
            <AddWatermarkStudio
              initialImageUrl={currentImageUrl}
              onBack={() => setActiveTab('home')}
              onOpenMyWorks={() => {
                refreshWorks();
                setActiveTab('my_works');
              }}
            />
          )}

          {activeTab === 'my_works' && (
            <MyWorksView
              works={savedWorks}
              onRefreshWorks={refreshWorks}
              onBack={() => setActiveTab('home')}
            />
          )}
        </div>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        savedWorksCount={savedWorks.length}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onRefreshWorks={refreshWorks}
      />
    </div>
  );
}
