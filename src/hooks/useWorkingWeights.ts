import { useCallback } from 'react';
import { useFirestoreOrLocal } from './useFirestoreOrLocal';
import type { WeightUnit, WorkingWeightEntry, WorkingWeightMap } from '../types';

export function useWorkingWeights() {
  const [weights, setWeights] = useFirestoreOrLocal<WorkingWeightMap>(
    'repwise_working_weights',
    'workingWeights',
    {}
  );

  const getWorkingWeight = useCallback(
    (exerciseId: string): WorkingWeightEntry | null => weights[exerciseId] ?? null,
    [weights]
  );

  const setWorkingWeight = useCallback(
    (exerciseId: string, weight: number, unit: WeightUnit) => {
      setWeights((prev) => ({ ...prev, [exerciseId]: { weight, unit } }));
    },
    [setWeights]
  );

  return { weights, getWorkingWeight, setWorkingWeight };
}
