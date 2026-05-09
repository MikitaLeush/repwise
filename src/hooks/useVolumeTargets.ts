import { useCallback } from 'react';
import { useAsyncStorage } from './useAsyncStorage';
import type { MuscleVolumeTarget } from '../types';

export const VOLUME_MUSCLES = [
  'Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core',
] as const;

export type VolumeMuscle = (typeof VOLUME_MUSCLES)[number];

export const DEFAULT_VOLUME_TARGETS: MuscleVolumeTarget[] = [
  { muscle: 'Chest',      targetSets: 16 },
  { muscle: 'Back',       targetSets: 16 },
  { muscle: 'Shoulders',  targetSets: 16 },
  { muscle: 'Triceps',    targetSets: 13 },
  { muscle: 'Biceps',     targetSets: 13 },
  { muscle: 'Quads',      targetSets: 15 },
  { muscle: 'Hamstrings', targetSets: 13 },
  { muscle: 'Glutes',     targetSets: 11 },
  { muscle: 'Calves',     targetSets: 13 },
  { muscle: 'Core',       targetSets: 11 },
];

export type LandmarkMode = 'MEV' | 'MAV' | 'MRV';

// MEV/MAV/MRV reference ranges per muscle (from hypertrophy research)
export const VOLUME_REFERENCE: Record<string, { mev: string; mav: string; mrv: string }> = {
  Chest:      { mev: '8–10',  mav: '12–20', mrv: '20–22' },
  Back:       { mev: '8–10',  mav: '12–20', mrv: '20–25' },
  Shoulders:  { mev: '8–10',  mav: '14–22', mrv: '22–28' },
  Triceps:    { mev: '6–8',   mav: '10–14', mrv: '16–18' },
  Biceps:     { mev: '6–8',   mav: '10–14', mrv: '16–22' },
  Quads:      { mev: '8–10',  mav: '12–16', mrv: '18–22' },
  Hamstrings: { mev: '6–8',   mav: '10–14', mrv: '16–20' },
  Glutes:     { mev: '4–6',   mav: '8–12',  mrv: '14–20' },
  Calves:     { mev: '6–8',   mav: '10–14', mrv: '16–20' },
  Core:       { mev: '4–6',   mav: '8–12',  mrv: '14–18' },
};

// Numeric midpoints used when auto-applying a landmark mode as the target
export const LANDMARK_TARGETS: Record<LandmarkMode, Record<string, number>> = {
  MEV: { Chest: 9,  Back: 9,  Shoulders: 9,  Triceps: 7,  Biceps: 7,  Quads: 9,  Hamstrings: 7,  Glutes: 5,  Calves: 7,  Core: 5  },
  MAV: { Chest: 16, Back: 16, Shoulders: 18, Triceps: 12, Biceps: 12, Quads: 14, Hamstrings: 12, Glutes: 10, Calves: 12, Core: 10 },
  MRV: { Chest: 21, Back: 22, Shoulders: 25, Triceps: 17, Biceps: 19, Quads: 20, Hamstrings: 18, Glutes: 17, Calves: 18, Core: 16 },
};

export function useVolumeTargets() {
  const [targets, setTargets, loading] = useAsyncStorage<MuscleVolumeTarget[]>(
    'repwise_volume_targets',
    DEFAULT_VOLUME_TARGETS
  );

  const setTarget = useCallback(
    (muscle: string, targetSets: number) => {
      const clamped = Math.max(0, Math.min(40, targetSets));
      setTargets((prev) =>
        prev.map((t) => (t.muscle === muscle ? { ...t, targetSets: clamped } : t))
      );
    },
    [setTargets]
  );

  return { targets, setTarget, loading };
}
