import React, { useState } from 'react';
import { 
  FolderClock, 
  Trash2, 
  Download, 
  Play, 
  Image as ImageIcon, 
  Video, 
  ArrowLeft,
  X,
  ExternalLink
} from 'lucide-react';
import { ProcessedWork } from '../types';
import { deleteWork, clearAllWorks } from '../utils/worksStorage';

interface MyWorksViewProps {
  works: ProcessedWork[];
  onRefreshWorks: () => void;
  onBack: () => void;
}

export const MyWorksView: React.FC<MyWorksViewProps> = ({
  works,
  onRefreshWorks,
  onBack,
}) => {
  const [selectedWork, setSelectedWork] = useState<ProcessedWork | null>(null);

  const handleDelete = (id: string) => {
    deleteWork(id);
    onRefreshWorks();
    if (selectedWork?.id === id) {
      setSelectedWork(null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all saved projects from history?')) {
      clearAllWorks();
      onRefreshWorks();
      setSelectedWork(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
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
              <span>My Works & Project History</span>
              <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                {works.length} Files
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Access and download your previously rendered videos and photos
            </p>
          </div>
        </div>

        {works.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-800/60 hover:bg-red-900/60 text-xs font-semibold text-red-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Grid of works */}
      {works.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto">
            <FolderClock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-300">No Exported Works Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Videos and photos you remove watermarks from will automatically be archived here for instant review and download.
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all cursor-pointer"
          >
            Start Cleaning Media
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {works.map((work) => (
            <div
              key={work.id}
              className="group bg-slate-900 rounded-2xl border border-slate-800 hover:border-indigo-500/50 p-3 transition-all flex flex-col justify-between space-y-3"
            >
              {/* Thumbnail / Media Container */}
              <div
                onClick={() => setSelectedWork(work)}
                className="relative rounded-xl overflow-hidden aspect-video bg-black/60 flex items-center justify-center cursor-pointer group-hover:ring-1 group-hover:ring-indigo-500/50"
              >
                {work.type === 'video' ? (
                  <video
                    src={work.blobUrl}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <img
                    src={work.blobUrl}
                    alt={work.title}
                    className="w-full h-full object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                    {work.type === 'video' ? (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                  </div>
                </div>

                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-bold text-white flex items-center gap-1">
                  {work.type === 'video' ? <Video className="w-3 h-3 text-indigo-400" /> : <ImageIcon className="w-3 h-3 text-cyan-400" />}
                  <span>{work.resolution}</span>
                </div>
              </div>

              {/* Info */}
              <div>
                <h4 className="text-xs font-bold text-white truncate" title={work.title}>
                  {work.title}
                </h4>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>{(work.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                  <span>{new Date(work.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <a
                  href={work.blobUrl}
                  download={work.title}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                <button
                  onClick={() => handleDelete(work.id)}
                  className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Preview Modal */}
      {selectedWork && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedWork(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white truncate pr-10">
              {selectedWork.title}
            </h3>

            <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              {selectedWork.type === 'video' ? (
                <video
                  src={selectedWork.blobUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={selectedWork.blobUrl}
                  alt={selectedWork.title}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                {(selectedWork.fileSizeBytes / 1024 / 1024).toFixed(2)} MB · {selectedWork.resolution}
              </span>

              <a
                href={selectedWork.blobUrl}
                download={selectedWork.title}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
