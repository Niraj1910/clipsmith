import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { VideoDto } from '@clipper/shared/dto';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(sec?: number): string {
  if (!sec || sec <= 0) return '0s';
  const rounded = Math.round(sec);
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function LibraryPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  // Video list query (no polling)
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ['videos', 1, 20],
    queryFn: () => api.listVideos(1, 20),
  });

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a video file to upload');
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      await api.uploadVideo(file, title, (progress) => {
        setUploadProgress(progress);
      });

      // Clear form
      setFile(null);
      setTitle('');
      setUploadProgress(0);

      // Invalidate videos list to refresh
      await queryClient.invalidateQueries({ queryKey: ['videos'] });
    } catch (err) {
      if (err instanceof ApiError) {
        setUploadError(err.message);
      } else {
        setUploadError('Failed to upload video. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              Clipper
            </span>
            <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
              v0.1.0
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-300">
              <span className="text-slate-400">Account:</span>
              <span className="font-medium text-white">{user?.email}</span>
            </div>

            <div className="px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-semibold">
              {user?.credits ?? 0} Credits
            </div>

            <Link
              to="/status"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition"
            >
              System Status
            </Link>

            <button
              onClick={() => logout()}
              className="text-xs bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 px-3 py-1.5 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Upload Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">Upload Long Video</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              MP4, MOV, or WebM up to 2 GB and 60 minutes.
            </p>
          </div>

          {uploadError && (
            <div className="mb-4 p-3.5 rounded-lg bg-red-950/70 border border-red-800 text-sm text-red-200">
              {uploadError}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Select Video File (.mp4, .mov, .webm)
                </label>
                <input
                  type="file"
                  accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-indigo-400 hover:file:bg-slate-700 cursor-pointer bg-slate-950 border border-slate-800 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isUploading}
                  placeholder="Leave empty to use original filename"
                  maxLength={200}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-500"
                />
              </div>
            </div>

            {isUploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Uploading to server...</span>
                  <span className="font-semibold text-indigo-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-2 transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUploading || !file}
                className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Upload Video'}
              </button>
            </div>
          </form>
        </section>

        {/* Video Library List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Your Videos</h2>
            <span className="text-xs text-slate-400">
              {videosData?.total ?? 0} {videosData?.total === 1 ? 'video' : 'videos'}
            </span>
          </div>

          {videosLoading ? (
            <div className="p-12 text-center text-sm text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
              Loading library...
            </div>
          ) : !videosData || videosData.items.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <p className="text-sm font-medium text-slate-300">No videos uploaded yet</p>
              <p className="text-xs text-slate-500">
                Upload your first MP4, MOV, or WebM video using the form above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {videosData.items.map((video: VideoDto) => (
                <div
                  key={video.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-semibold text-white text-sm">
                        {video.title || video.originalFilename || 'Untitled Video'}
                      </h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 uppercase tracking-wider">
                        {video.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span>{formatDuration(video.durationSec)}</span>
                      <span>•</span>
                      <span>{formatBytes(video.sizeBytes)}</span>
                      {video.originalFilename && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px]" title={video.originalFilename}>
                            {video.originalFilename}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-400">
                    Uploaded {new Date(video.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
