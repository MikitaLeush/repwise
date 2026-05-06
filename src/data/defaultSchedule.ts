import type { WeeklySchedule } from '../types';

export const defaultSchedule: WeeklySchedule = {
  Mon: 'Push1',
  Tue: 'Pull1',
  Wed: 'Legs1',
  Thu: 'Push2',
  Fri: 'Pull2',
  Sat: 'Legs2',
  Sun: 'Rest',
};
