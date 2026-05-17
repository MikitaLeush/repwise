import { useFirestoreOrLocal } from './useFirestoreOrLocal';

export const TIME_MULTIPLIERS = [1, 10, 100, 1000] as const;
export type TimeMultiplier = (typeof TIME_MULTIPLIERS)[number];

export function useDevSettings() {
  const [timeMultiplier, setTimeMultiplier] = useFirestoreOrLocal<TimeMultiplier>(
    'repwise_dev_time_multiplier',
    'devSettings',
    1
  );
  return { timeMultiplier, setTimeMultiplier };
}
