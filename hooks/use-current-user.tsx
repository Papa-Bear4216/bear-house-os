'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser } from '../lib/familyos';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

type CurrentUserContextType = {
  currentUser: AppUser | null;
  setCurrentUser: (id: string) => void;
};

const CurrentUserContext = createContext<CurrentUserContextType>({
  currentUser: null,
  setCurrentUser: () => {},
});

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [viewingUser, setViewingUser] = useState<AppUser | null>(null);
  const [viewingId, setViewingIdState] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const stored = localStorage.getItem('viewing_user_id');
        setViewingIdState(stored || user.uid);
      } else {
        setViewingIdState(null);
        setViewingUser(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!viewingId) return;
    const docRef = doc(db, 'users', viewingId);
    const unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setViewingUser({ ...docSnap.data(), id: docSnap.id } as AppUser);
      } else {
        // Fall back to main authenticated user if document not found
        const mainUid = auth.currentUser?.uid;
        if (mainUid && viewingId !== mainUid) {
          setViewingIdState(mainUid);
        }
      }
    }, (err) => {
      console.error("Firestore user sub error:", err);
    });
    return () => unsubscribeDoc();
  }, [viewingId]);

  const setCurrentUser = (id: string) => {
    setViewingIdState(id);
    localStorage.setItem('viewing_user_id', id);
  };

  return (
    <CurrentUserContext.Provider value={{ currentUser: viewingUser, setCurrentUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export const useCurrentUser = () => useContext(CurrentUserContext);
