import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ExtendedBodyPart } from 'react-native-body-highlighter';
import {
  RECOVERY_DURATION_MS,
  percentToStatus,
  percentToColor,
} from '../data/recovery';

// Only muscular slugs — excludes decorative parts (hair, head, hands, feet, ankles, knees, neck)
export const ALL_MUSCLE_SLUGS = [
  'abs',
  'adductors',
  'biceps',
  'calves',
  'chest',
  'deltoids',
  'forearm',
  'gluteal',
  'hamstring',
  'lower-back',
  'obliques',
  'quadriceps',
  'tibialis',
  'trapezius',
  'triceps',
  'upper-back',
] as const;

export type MuscleSlug = (typeof ALL_MUSCLE_SLUGS)[number];

const STORAGE_KEY = '@muscle_recovery_trained_at';

export function useMuscleRecovery(timeMultiplier: number = 1) {
  const [trainedAt, setTrainedAt] = useState<Partial<Record<string, number>>>({});
  const [now, setNow] = useState(() => Date.now());
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<Record<string, number>>;
          setTrainedAt(parsed);
        } catch {
          // corrupt storage — start fresh
        }
      }
      loadedRef.current = true;
    });
  }, []);

  // Tick every 10 seconds; when multiplier is high, tick every second
  useEffect(() => {
    const interval = timeMultiplier >= 100 ? 1_000 : 10_000;
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [timeMultiplier]);

  const getRecoveryPercent = useCallback(
    (slug: string): number => {
      const ts = trainedAt[slug];
      if (ts === undefined) return 100;
      const elapsed = (now - ts) * timeMultiplier;
      return Math.min((elapsed / RECOVERY_DURATION_MS) * 100, 100);
    },
    [trainedAt, now, timeMultiplier]
  );

  const getAutoStatus = useCallback(
    (slug: string) => percentToStatus(getRecoveryPercent(slug)),
    [getRecoveryPercent]
  );

  const getColor = useCallback(
    (slug: string): string => {
      if (trainedAt[slug] === undefined) return percentToColor(100); // never trained = fully recovered
      return percentToColor(getRecoveryPercent(slug));
    },
    [trainedAt, getRecoveryPercent]
  );

  const getBodyData = useCallback((): ExtendedBodyPart[] => {
    return ALL_MUSCLE_SLUGS.map((slug) => ({
      slug,
      color: getColor(slug),
    }));
  }, [getColor]);

  // Tap to select a muscle for status display — does NOT mark as trained
  const selectMuscle = useCallback((slug: string) => {
    setSelectedMuscle(slug);
  }, []);

  // Called only from workout completion flow
  const markAsTrained = useCallback((slug: string) => {
    const ts = Date.now();
    setNow(ts);
    setTrainedAt((prev) => {
      const next = { ...prev, [slug]: ts };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setTrainedAt({});
    setSelectedMuscle(null);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    markAsTrained,
    selectMuscle,
    selectedMuscle,
    getColor,
    getBodyData,
    getRecoveryPercent,
    getAutoStatus,
    resetAll,
    lastTapped: selectedMuscle, // kept for RecoveryInfo backward compat
  };
}
