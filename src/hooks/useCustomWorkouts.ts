import { useCallback } from 'react';
import { useAsyncStorage } from './useAsyncStorage';
import type { CustomWorkout, PlannedExercise } from '../types';

export function useCustomWorkouts() {
  const [workouts, setWorkouts] = useAsyncStorage<CustomWorkout[]>(
    'repwise_custom_workouts',
    []
  );

  const createWorkout = useCallback(
    (name: string, exercises: PlannedExercise[]): string => {
      const id = crypto.randomUUID();
      setWorkouts((prev) => [...prev, { id, name, exercises }]);
      return id;
    },
    [setWorkouts]
  );

  const updateWorkout = useCallback(
    (id: string, updates: Partial<Omit<CustomWorkout, 'id'>>) => {
      setWorkouts((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
      );
    },
    [setWorkouts]
  );

  const deleteWorkout = useCallback(
    (id: string) => {
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
    },
    [setWorkouts]
  );

  return { workouts, createWorkout, updateWorkout, deleteWorkout };
}
