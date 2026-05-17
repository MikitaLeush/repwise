import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';

const GUEST_KEY = 'repwise_is_guest';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  setIsGuest: (v: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [isGuest, setIsGuestState] = useState(false);
  const [guestLoaded, setGuestLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(GUEST_KEY).then((val) => {
      setIsGuestState(val === 'true');
      setGuestLoaded(true);
    });

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoaded(true);
    });

    return unsub;
  }, []);

  async function setIsGuest(v: boolean) {
    setIsGuestState(v);
    await AsyncStorage.setItem(GUEST_KEY, v ? 'true' : 'false');
  }

  async function logout() {
    await signOut(auth);
    await setIsGuest(false);
  }

  const loading = !authLoaded || !guestLoaded;

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, setIsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
