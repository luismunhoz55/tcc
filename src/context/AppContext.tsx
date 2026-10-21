import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { Session } from '@/services/auth';
import { subscribeToSession } from '@/services/auth';

const AppContext = createContext<Session>({ user: null, loading: true });

export function AppProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session>({ user: null, loading: true });

  useEffect(() => subscribeToSession(setSession), []);

  return <AppContext.Provider value={session}>{children}</AppContext.Provider>;
}

export function useSession() {
  return useContext(AppContext);
}
