import { useCallback } from 'react';
import { useAsyncStorage } from './useAsyncStorage';
import { defaultSchedule } from '../data/defaultSchedule';
import type { WeeklySchedule, DayOfWeek } from '../types';

export function useWeeklySchedule() {
  const [schedule, setSchedule] = useAsyncStorage<WeeklySchedule>(
    'repwise_weekly_schedule',
    defaultSchedule
  );

  const assignWorkout = useCallback(
    (day: DayOfWeek, workoutId: string) => {
      setSchedule((prev) => ({ ...prev, [day]: workoutId }));
    },
    [setSchedule]
  );

  const resetSchedule = useCallback(() => {
    setSchedule(defaultSchedule);
  }, [setSchedule]);

  return { schedule, assignWorkout, resetSchedule };
}
