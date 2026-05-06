import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useApp } from '../../src/context/AppContext';
import { getExerciseName } from '../../src/data/exercises';
import { BodyDiagram } from '../../src/components/BodyDiagram';
import { PageHeader } from '../../src/components/PageHeader';
import { RECOVERY_LABELS, RECOVERY_DURATION_MS } from '../../src/data/recovery';
import { todayISO, formatShortDate } from '../../src/utils/dateUtils';
import type { WorkoutSession, BodyweightLog, WeightUnit } from '../../src/types';

// ─── Recovery helpers ─────────────────────────────────────────────────────────

function formatMuscleLabel(slug: string): string {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatTimeRemaining(pct: number): string {
  if (pct >= 100) return '';
  const msRemaining = RECOVERY_DURATION_MS * (1 - pct / 100);
  const h = Math.floor(msRemaining / 3_600_000);
  const m = Math.floor((msRemaining % 3_600_000) / 60_000);
  if (h === 0) return `${m}m until recovered`;
  return `${h}h ${m}m until recovered`;
}

// ─── Volume / PRs helpers ──────────────────────────────────────────────────────

function normalizeWeight(w: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return w;
  return to === 'kg' ? w / 2.20462 : w * 2.20462;
}

// 3-tier colour palette: current week → recent past → older past
const BAR_COLORS = ['#C8FF00', '#88AA00', '#88AA00', '#556600', '#556600', '#3A3A3A', '#3A3A3A', '#3A3A3A'];

interface BarItem {
  value: number;
  label: string;
  frontColor: string;
}

function computeWeeklyVolumes(sessions: WorkoutSession[], unit: WeightUnit): BarItem[] {
  const today = new Date();
  const items: BarItem[] = [];

  // weeksAgo=0 = current week (leftmost bar)
  for (let weeksAgo = 0; weeksAgo <= 7; weeksAgo++) {
    const dow = today.getDay();
    const daysToMon = dow === 0 ? 6 : dow - 1;
    const mon = new Date(today);
    mon.setDate(today.getDate() - daysToMon - weeksAgo * 7);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    const monISO = mon.toISOString().slice(0, 10);
    const sunISO = sun.toISOString().slice(0, 10);

    let volume = 0;
    for (const s of sessions) {
      if (s.date < monISO || s.date > sunISO) continue;
      for (const ex of s.exercises) {
        for (const set of ex.sets) {
          if (set.completed && set.actualWeight !== null && set.actualReps !== null) {
            volume += normalizeWeight(set.actualWeight, set.unit, unit) * set.actualReps;
          }
        }
      }
    }

    items.push({
      value: Math.round(volume),
      label: `${mon.getMonth() + 1}/${mon.getDate()}`,
      frontColor: BAR_COLORS[weeksAgo] ?? '#3A3A3A',
    });
  }

  return items;
}

interface PR {
  exerciseId: string;
  weight: number;
  reps: number | null;
  unit: WeightUnit;
}

function computePRs(sessions: WorkoutSession[], unit: WeightUnit): PR[] {
  const best = new Map<string, PR>();
  for (const s of sessions) {
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (!set.completed || set.actualWeight === null) continue;
        const w = +normalizeWeight(set.actualWeight, set.unit, unit).toFixed(1);
        const existing = best.get(ex.exerciseId);
        if (!existing || w > existing.weight) {
          best.set(ex.exerciseId, { exerciseId: ex.exerciseId, weight: w, reps: set.actualReps, unit });
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight);
}

interface DailyBWPoint {
  date: string;
  avg: number;
}

function computeBWDailyAverages(logs: BodyweightLog[], unit: WeightUnit): DailyBWPoint[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffISO = cutoff.toISOString().slice(0, 10);

  const byDate = new Map<string, number[]>();
  for (const l of logs) {
    if (l.date < cutoffISO) continue;
    const val = unit === 'kg' ? +l.weightKg.toFixed(1) : +(l.weightKg * 2.20462).toFixed(1);
    const existing = byDate.get(l.date);
    if (existing) existing.push(val);
    else byDate.set(l.date, [val]);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      avg: +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1),
    }));
}

// ─── Component ────────────────────────────────────────────────────────────────

const AXIS_TEXT = { color: '#555555', fontSize: 10 };

export default function ProgressTab() {
  const { width: winWidth } = useWindowDimensions();
  const { session: sessionHook, bodyweight, unit, recovery } = useApp();
  const [bwInput, setBwInput] = useState('');
  const [showBwLog, setShowBwLog] = useState(false);
  const [prSearch, setPrSearch] = useState('');
  const [prSort, setPrSort] = useState<'weight' | 'name'>('weight');

  const chartWidth = winWidth - 80;

  // Volume chart
  const barData = useMemo(
    () => computeWeeklyVolumes(sessionHook.sessions, unit.unit),
    [sessionHook.sessions, unit.unit]
  );

  // Bodyweight chart — daily averages
  const dailyBWPoints = useMemo(
    () => computeBWDailyAverages(bodyweight.logs, unit.unit),
    [bodyweight.logs, unit.unit]
  );

  const lineData = useMemo(
    () =>
      dailyBWPoints.map((p, i) => ({
        value: p.avg,
        label:
          i % 5 === 0
            ? `${parseInt(p.date.slice(5, 7))}/${parseInt(p.date.slice(8))}`
            : '',
      })),
    [dailyBWPoints]
  );

  // PRs
  const prs = useMemo(
    () => computePRs(sessionHook.sessions, unit.unit),
    [sessionHook.sessions, unit.unit]
  );

  const filteredPrs = useMemo(() => {
    let list = prs.filter((pr) =>
      getExerciseName(pr.exerciseId).toLowerCase().includes(prSearch.toLowerCase())
    );
    if (prSort === 'name') {
      list = [...list].sort((a, b) =>
        getExerciseName(a.exerciseId).localeCompare(getExerciseName(b.exerciseId))
      );
    }
    return list;
  }, [prs, prSearch, prSort]);

  const { maxBar, hasVolume } = useMemo(() => {
    const max = Math.max(...barData.map((b) => b.value), 0);
    const hasVol = max > 0;
    const rounded = hasVol ? Math.ceil((max * 1.3) / 500) * 500 : 5000;
    return { maxBar: Math.max(rounded, 1000), hasVolume: hasVol };
  }, [barData]);

  const hasBW = dailyBWPoints.length >= 2;

  // Bodyweight log
  const recentLogs = useMemo(
    () => [...bodyweight.logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [bodyweight.logs]
  );

  function handleAddBW() {
    const val = parseFloat(bwInput);
    if (!val || val <= 0 || val > 500) return;
    const kg = unit.unit === 'kg' ? val : val / 2.20462;
    bodyweight.addLog(+kg.toFixed(2), todayISO());
    setBwInput('');
  }

  // Recovery — selected muscle info
  const sel = recovery.selectedMuscle;
  const selPct = sel ? Math.round(recovery.getRecoveryPercent(sel)) : null;
  const selColor = sel ? recovery.getColor(sel) : null;
  const selStatus = sel ? recovery.getAutoStatus(sel) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageHeader title="Progress" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Recovery ── */}
        <SectionHeader title="Recovery Status" sub="Tap a muscle to see its status" />
        <View style={styles.card}>
          <BodyDiagram
            data={recovery.getBodyData()}
            onMusclePress={recovery.selectMuscle}
          />

          {sel && selPct !== null && selColor && selStatus ? (
            <View style={styles.recoveryDetail}>
              <View style={styles.recoveryRow}>
                <View style={[styles.dot, { backgroundColor: selColor }]} />
                <Text style={styles.recoveryName}>{formatMuscleLabel(sel)}</Text>
                <Text style={styles.recoveryPct}>{selPct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${selPct}%` as `${number}%`, backgroundColor: selColor },
                  ]}
                />
              </View>
              <Text style={styles.recoveryStatus}>
                {RECOVERY_LABELS[selStatus]}
                {selPct < 100 ? `  ·  ${formatTimeRemaining(selPct)}` : ''}
              </Text>
            </View>
          ) : (
            <Text style={styles.recoveryHint}>
              {sel ? '' : 'Tap a muscle to see its recovery status'}
            </Text>
          )}

          <TouchableOpacity style={styles.resetAllBtn} onPress={recovery.resetAll}>
            <Text style={styles.resetAllText}>Reset All</Text>
          </TouchableOpacity>
        </View>

        {/* ── Weekly Volume ── */}
        <SectionHeader title="Weekly Volume" sub={`Last 8 weeks (newest left) · ${unit.unit}`} />
        <View style={styles.card}>
          <BarChart
            data={barData}
            barWidth={Math.max(Math.floor(chartWidth / 9), 20)}
            spacing={4}
            maxValue={maxBar}
            noOfSections={4}
            width={chartWidth}
            height={220}
            xAxisThickness={0}
            yAxisThickness={0}
            hideRules
            yAxisTextStyle={AXIS_TEXT}
            xAxisLabelTextStyle={{ ...AXIS_TEXT, marginTop: 4 }}
          />
          {!hasVolume && (
            <Text style={styles.chartEmpty}>
              Complete sets with weight to see your weekly volume
            </Text>
          )}
        </View>

        {/* ── Bodyweight Log ── */}
        <SectionHeader title="Bodyweight" sub={`Log & last 30 days · ${unit.unit}`} />
        <View style={styles.card}>
          {/* Input */}
          <View style={styles.bwInputRow}>
            <TextInput
              style={styles.bwInput}
              value={bwInput}
              onChangeText={setBwInput}
              placeholder={`Today's weight (${unit.unit})`}
              placeholderTextColor="#444444"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleAddBW}
            />
            <TouchableOpacity style={styles.bwAddBtn} onPress={handleAddBW}>
              <Text style={styles.bwAddText}>Log</Text>
            </TouchableOpacity>
          </View>

          {/* Collapsible log entries */}
          {recentLogs.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <TouchableOpacity
                style={styles.bwToggleRow}
                onPress={() => setShowBwLog((v) => !v)}
              >
                <Text style={styles.bwToggleText}>
                  {showBwLog ? 'Hide entries' : `Show entries (${recentLogs.length})`}
                </Text>
              </TouchableOpacity>
              {showBwLog && (
                <View style={{ marginTop: 6 }}>
                  {recentLogs.map((log, i) => {
                    const display =
                      unit.unit === 'kg'
                        ? log.weightKg.toFixed(1)
                        : (log.weightKg * 2.20462).toFixed(1);
                    return (
                      <View
                        key={log.id}
                        style={[styles.bwLogRow, i < recentLogs.length - 1 && styles.bwLogBorder]}
                      >
                        <Text style={styles.bwLogDate}>{formatShortDate(log.date)}</Text>
                        <View style={styles.bwLogRight}>
                          <Text style={styles.bwLogValue}>
                            {display} {unit.unit}
                          </Text>
                          <TouchableOpacity onPress={() => bodyweight.deleteLog(log.id)} hitSlop={8}>
                            <Text style={styles.bwLogDelete}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Chart */}
          {hasBW ? (
            <View style={{ marginTop: recentLogs.length > 0 ? 16 : 0, overflow: 'hidden' }}>
              <LineChart
                data={lineData}
                color="#C8FF00"
                thickness={2}
                areaChart
                startFillColor="#C8FF00"
                endFillColor="transparent"
                startOpacity={0.2}
                endOpacity={0}
                curved
                dataPointsColor="#C8FF00"
                dataPointsRadius={lineData.length > 14 ? 0 : 3}
                width={chartWidth}
                height={140}
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={AXIS_TEXT}
                xAxisLabelTextStyle={{ ...AXIS_TEXT, marginTop: 4 }}
                hideRules
              />
            </View>
          ) : (
            <EmptyState
              text={
                bodyweight.logs.length === 0
                  ? 'Log your bodyweight above to see a chart.'
                  : 'Need at least 2 entries to draw a chart.'
              }
            />
          )}
        </View>

        {/* ── Personal Records ── */}
        <SectionHeader title="Personal Records" sub="Best weight per exercise" />
        <View style={styles.card}>
          {prs.length > 0 && (
            <>
              <TextInput
                style={styles.prSearchInput}
                value={prSearch}
                onChangeText={setPrSearch}
                placeholder="Search exercises…"
                placeholderTextColor="#444444"
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              <View style={styles.prSortRow}>
                <TouchableOpacity
                  style={[styles.sortChip, prSort === 'weight' && styles.sortChipActive]}
                  onPress={() => setPrSort('weight')}
                >
                  <Text style={[styles.sortChipText, prSort === 'weight' && styles.sortChipTextActive]}>
                    By Weight
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortChip, prSort === 'name' && styles.sortChipActive]}
                  onPress={() => setPrSort('name')}
                >
                  <Text style={[styles.sortChipText, prSort === 'name' && styles.sortChipTextActive]}>
                    By Name
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          {prs.length === 0 ? (
            <EmptyState text="Complete sets with weight to see your PRs." />
          ) : filteredPrs.length === 0 ? (
            <EmptyState text="No matching exercises." />
          ) : (
            filteredPrs.map((pr, i) => (
              <View
                key={pr.exerciseId}
                style={[styles.prRow, i < filteredPrs.length - 1 && styles.prBorder]}
              >
                <Text style={styles.prName} numberOfLines={1}>
                  {getExerciseName(pr.exerciseId)}
                </Text>
                <Text style={styles.prValue}>
                  {pr.weight} {pr.unit}
                  {pr.reps !== null ? ` × ${pr.reps}` : ''}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  sectionHead: { marginTop: 22, marginBottom: 10 },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  sectionSub: { color: '#555555', fontSize: 12, marginTop: 2 },

  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    overflow: 'hidden',
  },

  // Recovery
  recoveryDetail: { marginTop: 16, gap: 8 },
  recoveryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  recoveryName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', flex: 1 },
  recoveryPct: { color: '#AAAAAA', fontSize: 18, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: '#2A2A2A', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, minWidth: 4 },
  recoveryStatus: { color: '#666666', fontSize: 12 },
  recoveryHint: { color: '#444444', fontSize: 13, textAlign: 'center', marginTop: 14, fontStyle: 'italic' },
  resetAllBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resetAllText: { color: '#FF5722', fontSize: 13, fontWeight: '600' },

  // Bodyweight log
  bwInputRow: { flexDirection: 'row', gap: 10 },
  bwInput: {
    flex: 1,
    backgroundColor: '#242424',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  bwAddBtn: {
    backgroundColor: '#C8FF00',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  bwAddText: { color: '#0F0F0F', fontWeight: '700', fontSize: 14 },
  bwToggleRow: { paddingVertical: 8, alignItems: 'center' },
  bwToggleText: { color: '#555555', fontSize: 13, fontWeight: '500' },
  bwLogRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9 },
  bwLogBorder: { borderBottomWidth: 1, borderBottomColor: '#252525' },
  bwLogDate: { color: '#888888', fontSize: 13 },
  bwLogRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bwLogValue: { color: '#CCCCCC', fontSize: 14, fontWeight: '500' },
  bwLogDelete: { color: '#444444', fontSize: 14 },

  // PRs
  prSearchInput: {
    backgroundColor: '#242424',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 10,
  },
  prSortRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  sortChip: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sortChipActive: { backgroundColor: '#C8FF0015', borderColor: '#C8FF00' },
  sortChipText: { color: '#666666', fontSize: 13, fontWeight: '500' },
  sortChipTextActive: { color: '#C8FF00', fontWeight: '600' },
  prRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11 },
  prBorder: { borderBottomWidth: 1, borderBottomColor: '#252525' },
  prName: { color: '#CCCCCC', fontSize: 14, flex: 1, marginRight: 12 },
  prValue: { color: '#C8FF00', fontSize: 14, fontWeight: '600' },

  chartEmpty: { color: '#444444', fontSize: 12, textAlign: 'center', marginTop: 8 },
  empty: { paddingVertical: 28, alignItems: 'center' },
  emptyText: { color: '#444444', fontSize: 13, textAlign: 'center' },
});
