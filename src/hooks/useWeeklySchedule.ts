import { useCallback } from 'react';
import { useFirestoreOrLocal } from './useFirestoreOrLocal';
import { defaultSchedule } from '../data/defaultSchedule';
import type { WeeklySchedule, DayOfWeek } from '../types';

export function useWeeklySchedule() {
  const [schedule, setSchedule] = useFirestoreOrLocal<WeeklySchedule>(
    'repwise_weekly_schedule',
    'weeklySchedule',
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
