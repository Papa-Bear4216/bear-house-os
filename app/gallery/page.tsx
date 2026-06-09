'use client';

import { useRef, useState } from 'react';
import { Image as ImageIcon, Plus, Trash2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useGallery } from '@/hooks/use-gallery';

export default function GalleryPage() {
  const { photos, uploading, uploadPhoto, deletePhoto } = useGallery();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    await uploadPhoto(pendingFile, caption.trim() || 'New photo');
    setPendingFile(null);
    setCaption('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 xl:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-end">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pink-100 text-pink-600 rounded-xl">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-900">Family Gallery</h1>
              <p className="text-slate-500 mt-1">Updates for Mommy while she&apos;s in California until Aug 5th ❤️</p>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Upload Photo
          </button>
        </header>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="sm:hidden w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          Upload Photo
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Caption modal */}
        {pendingFile && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
              <h2 className="font-semibold text-lg text-slate-900">Add a caption</h2>
              <p className="text-sm text-slate-500 truncate">{pendingFile.name}</p>
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUpload()}
                placeholder="What's happening? 🌟"
                autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setPendingFile(null); setCaption(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}

        {photos.length === 0 && !uploading && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <ImageIcon className="w-12 h-12 opacity-30" />
            <p className="font-medium">No photos yet — upload the first one!</p>
          </div>
        )}

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {photos.map(photo => (
            <div key={photo.id} className="break-inside-avoid relative group rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              <Image
                src={photo.url}
                alt={photo.caption}
                width={800}
                height={600}
                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pb-4 pt-20 px-4 flex flex-col justify-end">
                <p className="text-white font-medium drop-shadow-md">{photo.caption}</p>
                <p className="text-slate-300 text-xs mt-1 drop-shadow-md">{photo.date}</p>
              </div>
              {confirmDelete === photo.id ? (
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                  <button
                    onClick={() => { deletePhoto(photo); setConfirmDelete(null); }}
                    className="px-2 py-1 bg-red-600 text-white text-xs rounded-lg font-bold shadow"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="px-2 py-1 bg-white text-slate-700 text-xs rounded-lg font-bold shadow"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(photo.id)}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-white/80 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
