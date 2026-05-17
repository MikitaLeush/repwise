import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export function useFirestoreOrLocal<T>(
  asyncKey: string,
  firestoreDoc: string,
  defaultValue: T,
): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defaultRef = useRef(defaultValue);

  useEffect(() => {
    setLoading(true);
    if (uid) {
      const docRef = doc(db, 'users', uid, 'data', firestoreDoc);
      const unsub = onSnapshot(docRef, (snap) => {
        setValue(snap.exists() ? (snap.data() as { value: T }).value : defaultRef.current);
        setLoading(false);
      });
      return unsub;
    } else {
      AsyncStorage.getItem(asyncKey).then((raw) => {
        if (raw !== null) {
          try {
            setValue(JSON.parse(raw) as T);
          } catch {
            setValue(defaultRef.current);
          }
        } else {
          setValue(defaultRef.current);
        }
        setLoading(false);
      });
    }
  }, [uid, asyncKey, firestoreDoc]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        if (uid) {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            setDoc(doc(db, 'users', uid, 'data', firestoreDoc), { value: resolved });
          }, 400);
        } else {
          AsyncStorage.setItem(asyncKey, JSON.stringify(resolved)).catch(() => {});
        }
        return resolved;
      });
    },
    [uid, asyncKey, firestoreDoc],
  );

  return [value, set, loading];
}
