import type { WorkoutBlueprint, WorkoutSession, WeightUnit } from '../types';

export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function parseTargetReps(target: string): number | null {
  const m = target.match(/\d+/);
  return m ? parseInt(m[0]) : null;
}

export function buildBlankSession(
  date: string,
  blueprint: WorkoutBlueprint,
  unit: WeightUnit = 'kg',
  getLastWeight?: (exerciseId: string) => { weight: number; unit: WeightUnit } | null,
  getLastReps?: (exerciseId: string) => number | null
): WorkoutSession {
  return {
    id: generateId(),
    date,
    workoutType: blueprint.id,
    startedAt: new Date().toISOString(),
    exercises: blueprint.exercises.map((pe) => {
      const lastWeight = getLastWeight ? getLastWeight(pe.exerciseId) : null;
      let prefillWeight: number | null = null;
      if (lastWeight) {
        prefillWeight = lastWeight.unit === unit
          ? lastWeight.weight
          : unit === 'kg'
            ? +(lastWeight.weight / 2.20462).toFixed(2)
            : +(lastWeight.weight * 2.20462).toFixed(1);
      }
      const prefillReps = getLastReps ? (getLastReps(pe.exerciseId) ?? parseTargetReps(pe.sets[0]?.targetReps ?? '')) : parseTargetReps(pe.sets[0]?.targetReps ?? '');
      return {
        exerciseId: pe.exerciseId,
        order: pe.order,
        notes: '',
        sets: pe.sets.map((ps) => ({
          setNumber: ps.setNumber,
          actualReps: prefillReps,
          actualWeight: prefillWeight,
          unit,
          completed: false,
          skipped: false,
        })),
      };
    }),
  };
}

export function countTotalSets(session: WorkoutSession): number {
  return session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}

export function countCompletedSets(session: WorkoutSession): number {
  return session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );
}

export function isSessionComplete(session: WorkoutSession): boolean {
  return !!session.completedAt;
}
