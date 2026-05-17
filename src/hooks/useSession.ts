import { useCallback } from 'react';
import { useFirestoreOrLocal } from './useFirestoreOrLocal';
import type { WorkoutSession, LoggedSet, LoggedExercise, WeightUnit } from '../types';

export function useSession() {
  const [sessions, setSessions] = useFirestoreOrLocal<WorkoutSession[]>(
    'repwise_sessions',
    'sessions',
    []
  );

  const saveSession = useCallback(
    (session: WorkoutSession) => {
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === session.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = session;
          return next;
        }
        return [...prev, session];
      });
    },
    [setSessions]
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    },
    [setSessions]
  );

  const completeSession = useCallback(
    (id: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, completedAt: new Date().toISOString() } : s
        )
      );
    },
    [setSessions]
  );

  const uncompleteSession = useCallback(
    (id: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, completedAt: undefined } : s
        )
      );
    },
    [setSessions]
  );

  const updateSet = useCallback(
    (
      sessionId: string,
      exerciseId: string,
      setNumber: number,
      updates: Partial<LoggedSet>
    ) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            exercises: s.exercises.map((ex) => {
              if (ex.exerciseId !== exerciseId) return ex;
              return {
                ...ex,
                sets: ex.sets.map((set) =>
                  set.setNumber === setNumber ? { ...set, ...updates } : set
                ),
              };
            }),
          };
        })
      );
    },
    [setSessions]
  );

  const addSet = useCallback(
    (sessionId: string, exerciseId: string, currentUnit: WeightUnit) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            exercises: s.exercises.map((ex) => {
              if (ex.exerciseId !== exerciseId) return ex;
              const lastSet = ex.sets[ex.sets.length - 1];
              const newSet: LoggedSet = {
                setNumber: lastSet ? lastSet.setNumber + 1 : 1,
                actualReps: lastSet?.actualReps ?? null,
                actualWeight: lastSet?.actualWeight ?? null,
                unit: lastSet?.unit ?? currentUnit,
                completed: false,
                skipped: false,
              };
              return { ...ex, sets: [...ex.sets, newSet] };
            }),
          };
        })
      );
    },
    [setSessions]
  );

  const removeSet = useCallback(
    (sessionId: string, exerciseId: string, setNumber: number) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            exercises: s.exercises.map((ex) => {
              if (ex.exerciseId !== exerciseId) return ex;
              const filtered = ex.sets.filter((set) => set.setNumber !== setNumber);
              return {
                ...ex,
                sets: filtered.map((set, i) => ({ ...set, setNumber: i + 1 })),
              };
            }),
          };
        })
      );
    },
    [setSessions]
  );

  const addExerciseToSession = useCallback(
    (sessionId: string, exerciseId: string, setsCount: number, currentUnit: WeightUnit) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const maxOrder = s.exercises.length > 0
            ? Math.max(...s.exercises.map((e) => e.order))
            : 0;
          const newExercise: LoggedExercise = {
            exerciseId,
            order: maxOrder + 1,
            sets: Array.from({ length: setsCount }, (_, i) => ({
              setNumber: i + 1,
              actualReps: null,
              actualWeight: null,
              unit: currentUnit,
              completed: false,
              skipped: false,
            })),
          };
          return { ...s, exercises: [...s.exercises, newExercise] };
        })
      );
    },
    [setSessions]
  );

  const removeExerciseFromSession = useCallback(
    (sessionId: string, exerciseId: string) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            exercises: s.exercises.filter((ex) => ex.exerciseId !== exerciseId),
          };
        })
      );
    },
    [setSessions]
  );

  const getLastWeight = useCallback(
    (exerciseId: string): { weight: number; unit: WeightUnit } | null => {
      for (let i = sessions.length - 1; i >= 0; i--) {
        const ex = sessions[i].exercises.find((e) => e.exerciseId === exerciseId);
        if (ex) {
          const completed = ex.sets.find(
            (s) => s.completed && s.actualWeight !== null
          );
          if (completed && completed.actualWeight !== null) {
            return { weight: completed.actualWeight, unit: completed.unit };
          }
        }
      }
      return null;
    },
    [sessions]
  );

  const getLastReps = useCallback(
    (exerciseId: string): number | null => {
      for (let i = sessions.length - 1; i >= 0; i--) {
        const ex = sessions[i].exercises.find((e) => e.exerciseId === exerciseId);
        if (ex) {
          const completed = ex.sets.find((s) => s.completed && s.actualReps !== null);
          if (completed && completed.actualReps !== null) {
            return completed.actualReps;
          }
        }
      }
      return null;
    },
    [sessions]
  );

  return {
    sessions,
    saveSession,
    deleteSession,
    completeSession,
    uncompleteSession,
    updateSet,
    addSet,
    removeSet,
    addExerciseToSession,
    removeExerciseFromSession,
    getLastWeight,
    getLastReps,
  };
}
