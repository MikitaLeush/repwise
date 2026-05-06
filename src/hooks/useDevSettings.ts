import { useAsyncStorage } from './useAsyncStorage';

export const TIME_MULTIPLIERS = [1, 10, 100, 1000] as const;
export type TimeMultiplier = (typeof TIME_MULTIPLIERS)[number];

export function useDevSettings() {
  const [timeMultiplier, setTimeMultiplier] = useAsyncStorage<TimeMultiplier>(
    'repwise_dev_time_multiplier',
    1
  );
  return { timeMultiplier, setTimeMultiplier };
}
