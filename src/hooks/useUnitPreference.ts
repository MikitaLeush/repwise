import { useAsyncStorage } from './useAsyncStorage';
import type { WeightUnit } from '../types';

export function useUnitPreference() {
  const [unit, setUnit] = useAsyncStorage<WeightUnit>('repwise_unit_preference', 'kg');
  const toggleUnit = () => setUnit((u) => (u === 'kg' ? 'lb' : 'kg'));
  return { unit, toggleUnit };
}
