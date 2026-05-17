import { useState, useCallback, useEffect } from 'react';
import type { ExtendedBodyPart } from 'react-native-body-highlighter';
import {
  RECOVERY_DURATION_MS,
  percentToStatus,
  percentToColor,
} from '../data/recovery';
import { useFirestoreOrLocal } from './useFirestoreOrLocal';

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

const DEFAULT_TRAINED_AT: Partial<Record<string, number>> = {};

export function useMuscleRecovery(timeMultiplier: number = 1) {
  const [trainedAt, setTrainedAt] = useFirestoreOrLocal<Partial<Record<string, number>>>(
    '@muscle_recovery_trained_at',
    'muscleRecovery',
    DEFAULT_TRAINED_AT,
  );
  const [now, setNow] = useState(() => Date.now());
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

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
      if (trainedAt[slug] === undefined) return percentToColor(100);
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

  const selectMuscle = useCallback((slug: string) => {
    setSelectedMuscle(slug);
  }, []);

  const markAsTrained = useCallback((slug: string) => {
    const ts = Date.now();
    setNow(ts);
    setTrainedAt((prev) => ({ ...prev, [slug]: ts }));
  }, [setTrainedAt]);

  const resetAll = useCallback(() => {
    setTrainedAt(DEFAULT_TRAINED_AT);
    setSelectedMuscle(null);
  }, [setTrainedAt]);

  return {
    markAsTrained,
    selectMuscle,
    selectedMuscle,
    getColor,
    getBodyData,
    getRecoveryPercent,
    getAutoStatus,
    resetAll,
    lastTapped: selectedMuscle,
  };
}
