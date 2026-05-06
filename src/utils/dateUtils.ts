import type { DayOfWeek } from '../types';

const DAY_NAMES: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isoToDate(iso: string): Date {
  return new Date(iso + 'T00:00:00');
}

export function isoToDayOfWeek(iso: string): DayOfWeek {
  return DAY_NAMES[isoToDate(iso).getDay()];
}

export function formatDisplayDate(iso: string): string {
  return isoToDate(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(iso: string): string {
  return isoToDate(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function isoDateForWeekday(day: DayOfWeek): string {
  const today = new Date();
  const todayDow = today.getDay();
  const targetDow = DAY_NAMES.indexOf(day);
  const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const dayOffset = targetDow === 0 ? 6 : targetDow - 1;
  const target = new Date(monday);
  target.setDate(monday.getDate() + dayOffset);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
}

export function isToday(iso: string): boolean {
  return iso === todayISO();
}

export function isPast(iso: string): boolean {
  return iso < todayISO();
}
