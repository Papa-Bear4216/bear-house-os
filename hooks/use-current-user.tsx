'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser, USERS } from '../lib/familyos';

type CurrentUserContextType = {
  currentUser: AppUser | null;
  setCurrentUser: (id: string) => void;
};

const CurrentUserContext = createContext<CurrentUserContextType>({
  currentUser: null,
  setCurrentUser: () => {},
});

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [currentUserId, setCurrentUserIdState] = useState<string>('1');

  useEffect(() => {
    const stored = localStorage.getItem('current_user_id');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setCurrentUserIdState(stored);
  }, []);

  const setCurrentUser = (id: string) => {
    setCurrentUserIdState(id);
    localStorage.setItem('current_user_id', id);
  };

  const currentUser = USERS.find(u => u.id === currentUserId) || null;

  return (
    <CurrentUserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export const useCurrentUser = () => useContext(CurrentUserContext);
