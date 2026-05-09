import { useCallback } from 'react';
import { useAsyncStorage } from './useAsyncStorage';
import type { WeightUnit, WorkingWeightEntry, WorkingWeightMap } from '../types';

export function useWorkingWeights() {
  const [weights, setWeights] = useAsyncStorage<WorkingWeightMap>(
    'repwise_working_weights',
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
