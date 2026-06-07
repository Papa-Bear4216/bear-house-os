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
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(null);

  // Always follow the authenticated Firebase user — clear any stale UserSwitcher localStorage
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Clear legacy viewing_user_id override so we always load the real profile
        localStorage.removeItem('viewing_user_id');
        setViewingId(user.uid);
      } else {
        setViewingId(null);
        setCurrentUserState(null);
      }
    });
    return unsub;
  }, []);

  // Subscribe to the Firestore user document
  useEffect(() => {
    if (!viewingId) return;
    const unsub = onSnapshot(doc(db, 'users', viewingId), (snap) => {
      if (snap.exists()) {
        setCurrentUserState({ ...snap.data(), id: snap.id } as AppUser);
      } else {
        setCurrentUserState(null);
      }
    }, (err) => {
      console.error('useCurrentUser Firestore error:', err);
    });
    return unsub;
  }, [viewingId]);

  const setCurrentUser = (id: string) => {
    setViewingId(id);
  };

  return (
    <CurrentUserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export const useCurrentUser = () => useContext(CurrentUserContext);
