import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  RECOVERY_COLORS,
  RECOVERY_LABELS,
  RECOVERY_CYCLE,
  RECOVERY_DURATION_MS,
  type RecoveryStatus,
} from '../data/recovery';

function formatMuscleLabel(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTimeRemaining(pct: number): string {
  if (pct >= 100) return 'Fully recovered';
  const msRemaining = RECOVERY_DURATION_MS * (1 - pct / 100);
  const h = Math.floor(msRemaining / 3_600_000);
  const m = Math.floor((msRemaining % 3_600_000) / 60_000);
  return `${h}h ${m}m until fully recovered`;
}

interface RecoveryInfoProps {
  lastTapped: string | null;
  getStatus: (slug: string) => RecoveryStatus;
  getRecoveryPercent: (slug: string) => number;
  onResetAll: () => void;
}

export function RecoveryInfo({
  lastTapped,
  getStatus,
  getRecoveryPercent,
  onResetAll,
}: RecoveryInfoProps) {
  const tappedStatus = lastTapped ? getStatus(lastTapped) : null;
  const tappedPct = lastTapped ? Math.round(getRecoveryPercent(lastTapped)) : null;

  return (
    <View style={styles.container}>
      {/* Last tapped muscle status */}
      <View style={styles.section}>
        {lastTapped && tappedStatus !== null && tappedPct !== null ? (
          <>
            <View style={styles.muscleRow}>
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: RECOVERY_COLORS[tappedStatus] },
                ]}
              />
              <View style={styles.muscleTextGroup}>
                <Text style={styles.muscleName}>
                  {formatMuscleLabel(lastTapped)}
                </Text>
                <Text style={styles.muscleStatus}>
                  {RECOVERY_LABELS[tappedStatus]}
                </Text>
              </View>
              <Text style={styles.pctText}>{tappedPct}%</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${tappedPct}%` as `${number}%`,
                    backgroundColor: RECOVERY_COLORS[tappedStatus],
                  },
                ]}
              />
            </View>
            <Text style={styles.timeRemaining}>
              {formatTimeRemaining(tappedPct)}
            </Text>
          </>
        ) : (
          <Text style={styles.placeholder}>
            Tap a muscle to mark it as trained
          </Text>
        )}
      </View>

      {/* Color legend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recovery Scale</Text>
        <View style={styles.legendGrid}>
          {RECOVERY_CYCLE.filter((s) => s !== 'unset').map((status) => (
            <View key={status} style={styles.legendRow}>
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: RECOVERY_COLORS[status] },
                ]}
              />
              <Text style={styles.legendLabel}>{RECOVERY_LABELS[status]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Reset button */}
      <TouchableOpacity
        style={styles.resetButton}
        onPress={onResetAll}
        activeOpacity={0.7}
      >
        <Text style={styles.resetButtonText}>Reset All</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#666666',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  muscleTextGroup: {
    flex: 1,
  },
  muscleName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  muscleStatus: {
    color: '#777777',
    fontSize: 12,
    marginTop: 1,
  },
  pctText: {
    color: '#AAAAAA',
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 4,
  },
  timeRemaining: {
    color: '#666666',
    fontSize: 12,
  },
  placeholder: {
    color: '#444444',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  legendGrid: {
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendLabel: {
    color: '#BBBBBB',
    fontSize: 13,
  },
  resetButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  resetButtonText: {
    color: '#FF5722',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
