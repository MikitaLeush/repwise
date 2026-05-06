import { useMemo, useCallback } from 'react';
import { exerciseDB } from '../data/exercisedb';
import type { ExerciseDBEntry } from '../types';

export function useExerciseDB() {
  const search = useMemo(
    () =>
      (query: string): ExerciseDBEntry[] => {
        const q = query.toLowerCase().trim();
        if (!q) return exerciseDB;
        return exerciseDB.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.targetMuscles.some((m) => m.toLowerCase().includes(q)) ||
            e.bodyParts.some((p) => p.toLowerCase().includes(q))
        );
      },
    []
  );

  const byBodyPart = useCallback((part: string): ExerciseDBEntry[] => {
    if (!part || part === 'all') return exerciseDB;
    return exerciseDB.filter((e) =>
      e.bodyParts.some((p) => p.toLowerCase() === part.toLowerCase())
    );
  }, []);

  const byBodyPartAndQuery = useCallback(
    (part: string, query: string): ExerciseDBEntry[] => {
      let results = part && part !== 'all' ? byBodyPart(part) : exerciseDB;
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        results = results.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.targetMuscles.some((m) => m.toLowerCase().includes(q))
        );
      }
      return [...results].sort((a, b) => a.name.localeCompare(b.name));
    },
    [byBodyPart]
  );

  const getById = useCallback(
    (id: string): ExerciseDBEntry | undefined => exerciseDB.find((e) => e.id === id),
    []
  );

  return { search, byBodyPart, byBodyPartAndQuery, getById, total: exerciseDB.length };
}
