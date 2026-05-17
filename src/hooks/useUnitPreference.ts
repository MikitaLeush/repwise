import { useFirestoreOrLocal } from './useFirestoreOrLocal';
import type { WeightUnit } from '../types';

export function useUnitPreference() {
  const [unit, setUnit] = useFirestoreOrLocal<WeightUnit>('repwise_unit_preference', 'unitPref', 'kg');
  const toggleUnit = () => setUnit((u) => (u === 'kg' ? 'lb' : 'kg'));
  return { unit, toggleUnit };
}
