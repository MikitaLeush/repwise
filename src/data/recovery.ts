export type RecoveryStatus =
  | 'unset'
  | 'rested'
  | 'light'
  | 'moderate'
  | 'sore'
  | 'overtrained';

export const RECOVERY_CYCLE: RecoveryStatus[] = [
  'unset',
  'rested',
  'light',
  'moderate',
  'sore',
  'overtrained',
];

export const RECOVERY_COLORS: Record<RecoveryStatus, string> = {
  unset: '#3A3A3A',
  rested: '#4CAF50',
  light: '#8BC34A',
  moderate: '#FFC107',
  sore: '#FF5722',
  overtrained: '#F44336',
};

export const RECOVERY_LABELS: Record<RecoveryStatus, string> = {
  unset: 'Not tracked',
  rested: 'Fully rested',
  light: 'Lightly fatigued',
  moderate: 'Moderate fatigue',
  sore: 'Sore',
  overtrained: 'Overtrained',
};

// 48 hours in milliseconds
export const RECOVERY_DURATION_MS = 48 * 60 * 60 * 1000;

// Maps 0–100% recovery to a display status (for labels)
export function percentToStatus(pct: number): RecoveryStatus {
  if (pct >= 100) return 'rested';
  if (pct >= 75) return 'light';
  if (pct >= 50) return 'moderate';
  if (pct >= 25) return 'sore';
  return 'overtrained';
}

// Smooth color: 0% = red #FF3B30, 50% = yellow #FFD60A, 100% = green #30D158
export function percentToColor(pct: number): string {
  const t = Math.max(0, Math.min(100, pct)) / 100;
  let r: number, g: number, b: number;
  if (t <= 0.5) {
    const s = t * 2;
    r = 255;
    g = Math.round(59 + (214 - 59) * s);
    b = Math.round(48 + (10 - 48) * s);
  } else {
    const s = (t - 0.5) * 2;
    r = Math.round(255 + (48 - 255) * s);
    g = Math.round(214 + (209 - 214) * s);
    b = Math.round(10 + (88 - 10) * s);
  }
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
