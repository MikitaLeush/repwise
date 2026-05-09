import type { MuscleGroup, WorkoutSession, MuscleVolumeTarget } from '../types';
import { exercises as pplExercises } from '../data/exercises';
import { exerciseDB } from '../data/exercisedb';
import type { ExtendedBodyPart } from 'react-native-body-highlighter';

// Display muscle → body-highlighter slugs
export const MUSCLE_TO_SLUGS: Record<string, readonly string[]> = {
  Chest:      ['chest'],
  Back:       ['upper-back', 'lower-back'],
  Shoulders:  ['deltoids', 'trapezius'],
  Triceps:    ['triceps'],
  Biceps:     ['biceps'],
  Quads:      ['quadriceps'],
  Hamstrings: ['hamstring'],
  Glutes:     ['gluteal'],
  Calves:     ['calves'],
  Core:       ['abs', 'obliques'],
};

// All body-highlighter muscular slugs (same list as ALL_MUSCLE_SLUGS in useMuscleRecovery)
const ALL_SLUGS = [
  'abs', 'adductors', 'biceps', 'calves', 'chest', 'deltoids', 'forearm',
  'gluteal', 'hamstring', 'lower-back', 'obliques', 'quadriceps',
  'tibialis', 'trapezius', 'triceps', 'upper-back',
] as const;

// Build reverse map: slug → display muscle (first muscle entry wins)
const SLUG_TO_MUSCLE: Partial<Record<string, string>> = {};
for (const [muscle, slugs] of Object.entries(MUSCLE_TO_SLUGS)) {
  for (const slug of slugs) {
    if (!SLUG_TO_MUSCLE[slug]) SLUG_TO_MUSCLE[slug] = muscle;
  }
}

export function slugToDisplayMuscle(slug: string): string | null {
  return SLUG_TO_MUSCLE[slug] ?? null;
}

// exercises.ts MuscleGroup → display muscle
const PPL_TO_DISPLAY: Record<MuscleGroup, string> = {
  chest:      'Chest',
  back:       'Back',
  shoulders:  'Shoulders',
  triceps:    'Triceps',
  biceps:     'Biceps',
  quads:      'Quads',
  hamstrings: 'Hamstrings',
  glutes:     'Glutes',
  calves:     'Calves',
  core:       'Core',
};

// exercisedb targetMuscles → display muscle
const DB_TARGET_TO_DISPLAY: Record<string, string> = {
  abs:        'Core',
  biceps:     'Biceps',
  calves:     'Calves',
  chest:      'Chest',
  pectorals:  'Chest',
  delts:      'Shoulders',
  glutes:     'Glutes',
  hamstrings: 'Hamstrings',
  lats:       'Back',
  quads:      'Quads',
  shoulders:  'Shoulders',
  triceps:    'Triceps',
};

const pplMap = new Map(pplExercises.map((e) => [e.id, e]));
const dbMap = new Map(exerciseDB.map((e) => [e.id, e]));

function getDisplayMuscles(exerciseId: string): string[] {
  const ppl = pplMap.get(exerciseId);
  if (ppl) {
    return [...new Set(
      ppl.muscleGroups.map((mg) => PPL_TO_DISPLAY[mg]).filter((m): m is string => Boolean(m))
    )];
  }
  const db = dbMap.get(exerciseId);
  if (db) {
    return [...new Set(
      db.targetMuscles.map((tm) => DB_TARGET_TO_DISPLAY[tm]).filter((m): m is string => Boolean(m))
    )];
  }
  return [];
}

// Count completed sets per display muscle for the current calendar week (Mon–Sun)
export function computeWeeklySetsPerMuscle(sessions: WorkoutSession[]): Record<string, number> {
  const today = new Date();
  const dow = today.getDay();
  const daysToMon = dow === 0 ? 6 : dow - 1;
  const mon = new Date(today);
  mon.setDate(today.getDate() - daysToMon);
  mon.setHours(0, 0, 0, 0);
  const monISO = mon.toISOString().slice(0, 10);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const sunISO = sun.toISOString().slice(0, 10);

  const counts: Record<string, number> = {};
  for (const session of sessions) {
    if (session.date < monISO || session.date > sunISO) continue;
    for (const ex of session.exercises) {
      const done = ex.sets.filter((s) => s.completed).length;
      if (done === 0) continue;
      for (const muscle of getDisplayMuscles(ex.exerciseId)) {
        counts[muscle] = (counts[muscle] ?? 0) + done;
      }
    }
  }
  return counts;
}

export type VolumeZone = 'none' | 'low' | 'approaching' | 'low-target' | 'high-target' | 'over';

export function getVolumeZone(actualSets: number, targetSets: number): VolumeZone {
  if (actualSets === 0) return 'none';
  if (!targetSets) return 'low';
  const ratio = actualSets / targetSets;
  if (ratio < 0.5) return 'low';
  if (ratio < 1.0) return 'approaching';
  if (ratio < 1.15) return 'low-target';
  if (ratio < 1.3) return 'high-target';
  return 'over';
}

export function getVolumeColor(actualSets: number, targetSets: number): string {
  switch (getVolumeZone(actualSets, targetSets)) {
    case 'none':        return '#2A2A2A';
    case 'low':         return '#8B6914';
    case 'approaching': return '#4A7ED9';  // blue — distinct from green target
    case 'low-target':  return '#4AB87A';  // soft green — just entered zone
    case 'high-target': return '#5BD1A0';  // bright teal — well into zone
    case 'over':        return '#E07B39';
  }
}

export function buildVolumeBodyData(
  setsPerMuscle: Record<string, number>,
  targets: MuscleVolumeTarget[]
): ExtendedBodyPart[] {
  const targetMap = new Map(targets.map((t) => [t.muscle, t.targetSets]));

  return ALL_SLUGS.map((slug) => {
    const muscle = SLUG_TO_MUSCLE[slug];
    const color = muscle
      ? getVolumeColor(setsPerMuscle[muscle] ?? 0, targetMap.get(muscle) ?? 0)
      : '#2A2A2A';
    // Cast slug to satisfy react-native-body-highlighter's Slug union type
    return { slug, color } as ExtendedBodyPart;
  });
}
