'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, isPlaceholder, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getMyFamilyId } from '../lib/family-id';

export interface GalleryPhoto {
  id: string;
  url: string;
  caption: string;
  date: string;
  storagePath?: string;
  uploadedBy?: string;
}

export function useGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user && !isPlaceholder) return;
    if (isPlaceholder) return;

    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPhotos(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GalleryPhoto)));
    });
    return () => unsubscribe();
  }, [user]);

  const uploadPhoto = useCallback(async (file: File, caption: string) => {
    if (isPlaceholder) return;
    setUploading(true);
    try {
      const photoId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const storagePath = `gallery/${photoId}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      await addDoc(collection(db, 'gallery'), {
        url,
        caption,
        date: dateStr,
        storagePath,
        uploadedBy: user?.email ?? '',
        familyId: await getMyFamilyId(),
        createdAt: serverTimestamp(),
      });
    } finally {
      setUploading(false);
    }
  }, [user]);

  const deletePhoto = useCallback(async (photo: GalleryPhoto) => {
    if (isPlaceholder) return;
    await deleteDoc(doc(db, 'gallery', photo.id));
    if (photo.storagePath) {
      try { await deleteObject(ref(storage, photo.storagePath)); } catch {}
    }
  }, []);

  return { photos, uploading, uploadPhoto, deletePhoto };
}
