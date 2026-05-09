import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  Modal,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { ScrollView } from '../../src/utils/ScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useApp } from '../../src/context/AppContext';
import { getExerciseName } from '../../src/data/exercises';
import { BodyDiagram } from '../../src/components/BodyDiagram';
import { SwipeTabWrapper } from '../../src/components/SwipeTabWrapper';
import { ALL_MUSCLE_SLUGS } from '../../src/hooks/useMuscleRecovery';
import { Ring } from '../../src/components/Ring';
import { PageHeader } from '../../src/components/PageHeader';
import { RECOVERY_LABELS, RECOVERY_DURATION_MS, RecoveryStatus } from '../../src/data/recovery';
import { todayISO, formatShortDate } from '../../src/utils/dateUtils';
import { MONO, MONO_BOLD } from '../../src/utils/fonts';
import {
  computeWeeklySetsPerMuscle,
  buildVolumeBodyData,
  slugToDisplayMuscle,
  getVolumeColor,
  getVolumeZone,
} from '../../src/utils/volumeMapping';
import type { VolumeZone } from '../../src/utils/volumeMapping';

function volumeStatusText(zone: VolumeZone): string {
  switch (zone) {
    case 'none':        return 'No sets logged this week';
    case 'low':         return 'Below minimum effective volume';
    case 'approaching': return 'Approaching target — keep going';
    case 'low-target':  return 'In target zone — on track';
    case 'high-target': return 'High volume — approaching MRV';
    case 'over':        return 'Over MRV — prioritize recovery';
  }
}
import type { WorkoutSession, BodyweightLog, WeightUnit } from '../../src/types';

const ACCENT = '#5BD1A0';
const BG = '#0B0F0E';
const CARD = '#11181A';
const BORDER = '#1f2825';

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

const BAR_COLORS = [ACCENT, '#3D8A6A', '#3D8A6A', '#275A46', '#275A46', '#1f2825', '#1f2825', '#1f2825'];


const SORT_LABELS: Record<'name' | 'recovery' | 'sets' | 'group', string> = {
  name: 'Name', recovery: 'Recov', sets: 'Sets', group: 'Group',
};

const UPPER_MUSCLES = new Set([
  'abs', 'biceps', 'chest', 'deltoids', 'forearm',
  'lower-back', 'obliques', 'trapezius', 'triceps', 'upper-back',
]);

interface BarItem { value: number; label: string; frontColor: string }

function computeWeeklyVolumes(sessions: WorkoutSession[], unit: WeightUnit): BarItem[] {
  const today = new Date();
  const items: BarItem[] = [];
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
    items.push({ value: Math.round(volume), label: `${mon.getMonth() + 1}/${mon.getDate()}`, frontColor: BAR_COLORS[weeksAgo] ?? '#1f2825' });
  }
  return items;
}

interface PR { exerciseId: string; weight: number; reps: number | null; unit: WeightUnit }

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

interface DailyBWPoint { date: string; avg: number }

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
    .map(([date, vals]) => ({ date, avg: +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) }));
}

// ─── Component ────────────────────────────────────────────────────────────────

const AXIS_TEXT = { color: '#5A6663', fontSize: 10 };

type BodyMode = 'recovery' | 'volume';

export default function ProgressTab() {
  const { width: winWidth } = useWindowDimensions();
  const { session: sessionHook, bodyweight, unit, recovery, volumeTargets } = useApp();
  const [bwInput, setBwInput] = useState('');
  const [showBwLog, setShowBwLog] = useState(false);
  const [prSearch, setPrSearch] = useState('');
  const [prSort, setPrSort] = useState<'weight' | 'name'>('weight');
  const [bodyMode, setBodyMode] = useState<BodyMode>('recovery');
  const [diagramExpanded, setDiagramExpanded] = useState(false);
  const [expandedSide, setExpandedSide] = useState<'front' | 'back'>('front');
  const [muscleSort, setMuscleSort] = useState<'name' | 'recovery' | 'sets' | 'group'>('name');
  const [selectedVolumeMuscle, setSelectedVolumeMuscle] = useState<string | null>(null);
  const [muscleTooltip, setMuscleTooltip] = useState<{
    slug: string; pct: number; color: string; status: RecoveryStatus;
  } | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);
  const touchStartRef = useRef<{x: number; y: number} | null>(null);
  const [volumeTooltip, setVolumeTooltip] = useState<{
    muscle: string; sets: number; target: number; color: string; zone: VolumeZone;
  } | null>(null);
  const volumeTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const modalClosePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 15 && Math.abs(gs.dy) > Math.abs(gs.dx) * 2,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80) setDiagramExpanded(false);
      },
    })
  ).current;

  const diagramClosePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 50) setDiagramExpanded(false);
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      if (volumeTooltipTimerRef.current) clearTimeout(volumeTooltipTimerRef.current);
    };
  }, []);

  const chartWidth = winWidth - 80;
  const leftColWidth = Math.round((winWidth - 32) * 0.44) + 16;

  const barData = useMemo(
    () => computeWeeklyVolumes(sessionHook.sessions, unit.unit),
    [sessionHook.sessions, unit.unit]
  );

  const dailyBWPoints = useMemo(
    () => computeBWDailyAverages(bodyweight.logs, unit.unit),
    [bodyweight.logs, unit.unit]
  );

  const lineData = useMemo(
    () => dailyBWPoints.map((p, i) => ({
      value: p.avg,
      label: i % 5 === 0 ? `${parseInt(p.date.slice(5, 7))}/${parseInt(p.date.slice(8))}` : '',
    })),
    [dailyBWPoints]
  );

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

  const weeklySets = useMemo(
    () => computeWeeklySetsPerMuscle(sessionHook.sessions),
    [sessionHook.sessions]
  );

  const volumeBodyData = useMemo(
    () => buildVolumeBodyData(weeklySets, volumeTargets.targets),
    [weeklySets, volumeTargets.targets]
  );

  const sortedMuscles = useMemo(() => {
    return [...ALL_MUSCLE_SLUGS]
      .map((slug) => {
        const recoveryPct = recovery.getRecoveryPercent(slug);
        const displayMuscle = slugToDisplayMuscle(slug);
        const sets = displayMuscle !== null ? (weeklySets[displayMuscle] ?? 0) : 0;
        const target = displayMuscle !== null
          ? (volumeTargets.targets.find((t) => t.muscle === displayMuscle)?.targetSets ?? 0)
          : 0;
        const zone = getVolumeZone(sets, target);
        return { slug, recoveryPct, sets, target, zone };
      })
      .sort((a, b) => {
        switch (muscleSort) {
          case 'name': return a.slug.localeCompare(b.slug);
          case 'recovery': return a.recoveryPct - b.recoveryPct;
          case 'sets': return b.sets - a.sets;
          case 'group': {
            const aU = UPPER_MUSCLES.has(a.slug) ? 0 : 1;
            const bU = UPPER_MUSCLES.has(b.slug) ? 0 : 1;
            return aU !== bU ? aU - bU : a.slug.localeCompare(b.slug);
          }
        }
      });
  }, [muscleSort, recovery, weeklySets, volumeTargets.targets]);

  function countDiagramTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setDiagramExpanded(true);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }

  function handleVolumePress(slug: string) {
    const muscle = slugToDisplayMuscle(slug);
    setSelectedVolumeMuscle(muscle);
    if (muscle === null) return;
    const sets = weeklySets[muscle] ?? 0;
    const target = volumeTargets.targets.find((t) => t.muscle === muscle)?.targetSets ?? 0;
    const color = getVolumeColor(sets, target);
    const zone = getVolumeZone(sets, target);
    setVolumeTooltip({ muscle, sets, target, color, zone });
    if (volumeTooltipTimerRef.current) clearTimeout(volumeTooltipTimerRef.current);
    volumeTooltipTimerRef.current = setTimeout(() => setVolumeTooltip(null), 2500);
  }

  function handleRecoveryPress(slug: string) {
    recovery.selectMuscle(slug);
    const pct = Math.round(recovery.getRecoveryPercent(slug));
    const color = recovery.getColor(slug);
    const status = recovery.getAutoStatus(slug);
    setMuscleTooltip({ slug, pct, color, status });
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => setMuscleTooltip(null), 2500);
  }

  const sel = recovery.selectedMuscle;
  const selPct = sel ? Math.round(recovery.getRecoveryPercent(sel)) : null;
  const selColor = sel ? recovery.getColor(sel) : null;
  const selStatus = sel ? recovery.getAutoStatus(sel) : null;

  const volMuscle = selectedVolumeMuscle;
  const volActual = volMuscle !== null ? (weeklySets[volMuscle] ?? 0) : null;
  const volTarget = volMuscle !== null
    ? (volumeTargets.targets.find((t) => t.muscle === volMuscle)?.targetSets ?? 0)
    : null;
  const volRatio = volActual !== null && volTarget ? volActual / volTarget : null;
  const volColor = volActual !== null ? getVolumeColor(volActual, volTarget ?? 0) : null;
  const volZone = volActual !== null ? getVolumeZone(volActual, volTarget ?? 0) : null;

  // Hero stats
  const thisWeekVol = barData[0]?.value ?? 0;
  const thisWeekVolStr = thisWeekVol >= 1000 ? `${(thisWeekVol / 1000).toFixed(1)}k` : `${thisWeekVol}`;
  const latestBW = dailyBWPoints.length > 0 ? dailyBWPoints[dailyBWPoints.length - 1].avg : null;
  const prCount = prs.length;

  return (
    <SwipeTabWrapper route="progress" swipeEnabled={!diagramExpanded}>
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageHeader title="Progress" sub="Last 30 days" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero stats row ── */}
        <View style={styles.heroRow}>
          <View style={styles.heroTile}>
            <Text style={[styles.heroLabel, { fontFamily: MONO }]}>THIS WK</Text>
            <Text style={[styles.heroValue, { fontFamily: MONO_BOLD }]}>{thisWeekVolStr}</Text>
            <Text style={[styles.heroSub, { fontFamily: MONO }]}>{unit.unit} vol</Text>
          </View>
          <View style={styles.heroTile}>
            <Text style={[styles.heroLabel, { fontFamily: MONO }]}>BODY</Text>
            <Text style={[styles.heroValue, { fontFamily: MONO_BOLD }]}>{latestBW !== null ? latestBW.toFixed(1) : '—'}</Text>
            <Text style={[styles.heroSub, { fontFamily: MONO }]}>{unit.unit}</Text>
          </View>
          <View style={styles.heroTile}>
            <Text style={[styles.heroLabel, { fontFamily: MONO }]}>PRs</Text>
            <Text style={[styles.heroValue, { fontFamily: MONO_BOLD }]}>{prCount}</Text>
            <Text style={[styles.heroSub, { fontFamily: MONO }]}>exercises</Text>
          </View>
        </View>

        {/* ── Muscle Status ── */}
        <SectionHeader
          title="Muscle Status"
          sub={bodyMode === 'recovery' ? 'Tap a muscle' : 'Sets this week vs target'}
        />
        <View style={[styles.card, { overflow: 'visible' }]}>
          {/* Mode toggle */}
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeBtn, bodyMode === 'recovery' && styles.modeBtnActive]}
              onPress={() => setBodyMode('recovery')}
            >
              <Text style={[styles.modeBtnText, { fontFamily: MONO_BOLD }, bodyMode === 'recovery' && styles.modeBtnTextActive]}>
                Recovery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, bodyMode === 'volume' && styles.modeBtnActive]}
              onPress={() => setBodyMode('volume')}
            >
              <Text style={[styles.modeBtnText, { fontFamily: MONO_BOLD }, bodyMode === 'volume' && styles.modeBtnTextActive]}>
                Weekly Sets
              </Text>
            </TouchableOpacity>
          </View>

          <View
            onTouchStart={(e) => { touchStartRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; }}
            onTouchEnd={(e) => {
              if (!touchStartRef.current) return;
              const dx = Math.abs(e.nativeEvent.pageX - touchStartRef.current.x);
              const dy = Math.abs(e.nativeEvent.pageY - touchStartRef.current.y);
              touchStartRef.current = null;
              if (dx < 10 && dy < 10) countDiagramTap();
            }}
          >
            <View style={{ position: 'relative' }}>
              <BodyDiagram
                data={bodyMode === 'recovery' ? recovery.getBodyData() : volumeBodyData}
                onMusclePress={bodyMode === 'recovery' ? handleRecoveryPress : handleVolumePress}
              />
              {muscleTooltip && bodyMode === 'recovery' && (
                <View style={styles.bubbleAnchor} pointerEvents="none">
                  <View style={styles.muscleBubble}>
                    <Ring pct={muscleTooltip.pct} size={40} stroke={4} color={muscleTooltip.color} trackColor="#2A2A2A">
                      <Text style={[styles.bubblePct, { fontFamily: MONO_BOLD }]}>{muscleTooltip.pct}</Text>
                    </Ring>
                    <View style={{ marginLeft: 10, flexShrink: 1 }}>
                      <Text style={[styles.bubbleName, { fontFamily: MONO_BOLD }]} numberOfLines={1}>
                        {formatMuscleLabel(muscleTooltip.slug)}
                      </Text>
                      <Text style={[styles.bubbleStatus, { fontFamily: MONO, color: muscleTooltip.color }]}>
                        {RECOVERY_LABELS[muscleTooltip.status]}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              {volumeTooltip && bodyMode === 'volume' && (() => {
                const pct = volumeTooltip.target > 0
                  ? Math.min(Math.round((volumeTooltip.sets / volumeTooltip.target) * 100), 100)
                  : 0;
                return (
                  <View style={styles.bubbleAnchor} pointerEvents="none">
                    <View style={styles.muscleBubble}>
                      <Ring pct={pct} size={40} stroke={4} color={volumeTooltip.color} trackColor="#2A2A2A">
                        <Text style={[styles.bubblePct, { fontFamily: MONO_BOLD }]}>
                          {volumeTooltip.target > 0 ? `${pct}%` : String(volumeTooltip.sets)}
                        </Text>
                      </Ring>
                      <View style={{ marginLeft: 10, flexShrink: 1 }}>
                        <Text style={[styles.bubbleName, { fontFamily: MONO_BOLD }]} numberOfLines={1}>
                          {volumeTooltip.muscle}
                        </Text>
                        <Text style={[styles.bubbleStatus, { fontFamily: MONO, color: volumeTooltip.color }]}>
                          {volumeTooltip.target > 0
                            ? `${volumeTooltip.sets} / ${volumeTooltip.target} sets`
                            : `${volumeTooltip.sets} sets · no target`}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })()}
            </View>
          </View>

          {bodyMode === 'recovery' ? (
            <>
              {sel && selPct !== null && selColor && selStatus ? (
                <View style={styles.recoveryDetail}>
                  <View style={styles.recoveryRow}>
                    <View style={[styles.dot, { backgroundColor: selColor }]} />
                    <Text style={styles.recoveryName}>{formatMuscleLabel(sel)}</Text>
                    <Text style={[styles.recoveryPct, { fontFamily: MONO_BOLD }]}>{selPct}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${selPct}%` as `${number}%`, backgroundColor: selColor }]} />
                  </View>
                  <Text style={[styles.recoveryStatus, { fontFamily: MONO }]}>
                    {RECOVERY_LABELS[selStatus]}
                    {selPct < 100 ? `  ·  ${formatTimeRemaining(selPct)}` : ''}
                  </Text>
                </View>
              ) : (
                <Text style={styles.recoveryHint}>Tap a muscle to see its recovery status</Text>
              )}
            </>
          ) : (
            <>
              {volMuscle !== null && volActual !== null && volColor !== null && volZone !== null ? (
                <View style={styles.recoveryDetail}>
                  <View style={styles.recoveryRow}>
                    <View style={[styles.dot, { backgroundColor: volColor }]} />
                    <Text style={styles.recoveryName}>{volMuscle}</Text>
                    <Text style={[styles.recoveryPct, { fontFamily: MONO_BOLD }]}>
                      {volTarget ? `${volActual} / ${volTarget}` : `${volActual} sets`}
                    </Text>
                  </View>
                  {volTarget ? (
                    <View style={styles.progressTrack}>
                      <View style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(Math.round((volActual / volTarget) * 100), 100)}%` as `${number}%`,
                          backgroundColor: volColor,
                        },
                      ]} />
                    </View>
                  ) : null}
                  <Text style={[styles.recoveryStatus, { fontFamily: MONO }]}>
                    {volTarget ? volumeStatusText(volZone) : 'No target set — tap legend to configure'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.recoveryHint}>Tap a muscle to see weekly set count</Text>
              )}
              <View style={styles.volLegend}>
                <LegendDot color="#2A2A2A" label="None" />
                <LegendDot color="#8B6914" label="Low" />
                <LegendDot color="#4A7ED9" label="Approaching" />
                <LegendDot color="#4AB87A" label="Target" />
                <LegendDot color="#5BD1A0" label="Peak" />
                <LegendDot color="#E07B39" label="Over" />
              </View>
            </>
          )}
          <TouchableOpacity style={styles.expandBtn} onPress={() => setDiagramExpanded(true)}>
            <Text style={styles.expandBtnText}>View Full Screen  ↗</Text>
          </TouchableOpacity>
        </View>

        {/* ── Full-screen muscle status modal ── */}
        <Modal visible={diagramExpanded} animationType="slide" statusBarTranslucent onRequestClose={() => setDiagramExpanded(false)}>
          <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
            {/* Drag handle — swipe down to close */}
            <View style={styles.dragHandleWrap} {...modalClosePan.panHandlers}>
              <View style={styles.dragHandle} />
            </View>

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.modeToggleRow, { flex: 1, marginBottom: 0 }]}>
                <TouchableOpacity
                  style={[styles.modeBtn, bodyMode === 'recovery' && styles.modeBtnActive]}
                  onPress={() => setBodyMode('recovery')}
                >
                  <Text style={[styles.modeBtnText, { fontFamily: MONO_BOLD }, bodyMode === 'recovery' && styles.modeBtnTextActive]}>
                    Recovery
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, bodyMode === 'volume' && styles.modeBtnActive]}
                  onPress={() => setBodyMode('volume')}
                >
                  <Text style={[styles.modeBtnText, { fontFamily: MONO_BOLD }, bodyMode === 'volume' && styles.modeBtnTextActive]}>
                    Volume
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setDiagramExpanded(false)} hitSlop={12} style={styles.expandCloseBtn}>
                <Text style={styles.expandCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Two-column body */}
            <View style={styles.modalBody}>
              {/* Left: diagram + sort + Front/Back toggle */}
              <View style={[styles.modalDiagramCol, { width: leftColWidth }]}>
                <View style={{ position: 'relative' }}>
                  <BodyDiagram
                    data={bodyMode === 'recovery' ? recovery.getBodyData() : volumeBodyData}
                    onMusclePress={bodyMode === 'recovery' ? handleRecoveryPress : handleVolumePress}
                    expanded
                    activeSide={expandedSide}
                  />
                  <View style={StyleSheet.absoluteFill} {...diagramClosePan.panHandlers} />
                </View>

                {/* Sort by — 2×2 grid */}
                <View style={styles.sortSection}>
                  <Text style={[styles.sortSectionLabel, { fontFamily: MONO }]}>Sort by</Text>
                  <View style={styles.sortGrid}>
                    {(['name', 'recovery', 'sets', 'group'] as const).map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.sortGridBtn, muscleSort === opt && styles.sortGridBtnActive]}
                        onPress={() => setMuscleSort(opt)}
                      >
                        <Text style={[styles.sortGridBtnText, { fontFamily: MONO }, muscleSort === opt && styles.sortGridBtnTextActive]}>
                          {SORT_LABELS[opt]}{muscleSort === opt ? ' ✓' : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.modeToggleRow, { marginTop: 10, marginBottom: 0 }]}>
                  <TouchableOpacity
                    style={[styles.modeBtn, expandedSide === 'front' && styles.modeBtnActive]}
                    onPress={() => setExpandedSide('front')}
                  >
                    <Text style={[styles.modeBtnText, { fontFamily: MONO_BOLD }, expandedSide === 'front' && styles.modeBtnTextActive]}>
                      Front
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeBtn, expandedSide === 'back' && styles.modeBtnActive]}
                    onPress={() => setExpandedSide('back')}
                  >
                    <Text style={[styles.modeBtnText, { fontFamily: MONO_BOLD }, expandedSide === 'back' && styles.modeBtnTextActive]}>
                      Back
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.expandedDivider} />

              {/* Right: muscle list only */}
              <View style={{ flex: 1 }}>
                {/* Muscle list */}
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {sortedMuscles.map((m) => (
                    <MuscleRow
                      key={m.slug}
                      slug={m.slug}
                      bodyMode={bodyMode}
                      recoveryPct={Math.round(m.recoveryPct)}
                      recoveryColor={recovery.getColor(m.slug)}
                      sets={m.sets}
                      target={m.target}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

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

        {/* ── Bodyweight ── */}
        <SectionHeader title="Bodyweight" sub={`Log & last 30 days · ${unit.unit}`} />
        <View style={styles.card}>
          <View style={styles.bwInputRow}>
            <TextInput
              style={styles.bwInput}
              value={bwInput}
              onChangeText={setBwInput}
              placeholder={`Today's weight (${unit.unit})`}
              placeholderTextColor="#3A4541"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleAddBW}
            />
            <TouchableOpacity style={styles.bwAddBtn} onPress={handleAddBW}>
              <Text style={[styles.bwAddText, { fontFamily: MONO_BOLD }]}>Log</Text>
            </TouchableOpacity>
          </View>

          {recentLogs.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <TouchableOpacity style={styles.bwToggleRow} onPress={() => setShowBwLog((v) => !v)}>
                <Text style={[styles.bwToggleText, { fontFamily: MONO }]}>
                  {showBwLog ? 'Hide entries' : `Show entries (${recentLogs.length})`}
                </Text>
              </TouchableOpacity>
              {showBwLog && (
                <View style={{ marginTop: 6 }}>
                  {recentLogs.map((log, i) => {
                    const display = unit.unit === 'kg' ? log.weightKg.toFixed(1) : (log.weightKg * 2.20462).toFixed(1);
                    return (
                      <View key={log.id} style={[styles.bwLogRow, i < recentLogs.length - 1 && styles.bwLogBorder]}>
                        <Text style={[styles.bwLogDate, { fontFamily: MONO }]}>{formatShortDate(log.date)}</Text>
                        <View style={styles.bwLogRight}>
                          <Text style={[styles.bwLogValue, { fontFamily: MONO_BOLD }]}>{display} {unit.unit}</Text>
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

          {hasBW ? (
            <View style={{ marginTop: recentLogs.length > 0 ? 16 : 0, overflow: 'hidden' }}>
              <LineChart
                data={lineData}
                color={ACCENT}
                thickness={2}
                areaChart
                startFillColor={ACCENT}
                endFillColor="transparent"
                startOpacity={0.2}
                endOpacity={0}
                curved
                dataPointsColor={ACCENT}
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
                placeholderTextColor="#3A4541"
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
              <View key={pr.exerciseId} style={[styles.prRow, i < filteredPrs.length - 1 && styles.prBorder]}>
                <Text style={styles.prName} numberOfLines={1}>{getExerciseName(pr.exerciseId)}</Text>
                <Text style={[styles.prValue, { fontFamily: MONO_BOLD }]}>
                  {pr.weight} {pr.unit}{pr.reps !== null ? ` × ${pr.reps}` : ''}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
    </SwipeTabWrapper>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {sub ? <Text style={[styles.sectionSub, { fontFamily: MONO }]}>{sub}</Text> : null}
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color, borderWidth: color === '#2A2A2A' ? 1 : 0, borderColor: '#444' }]} />
      <Text style={[styles.legendLabel, { fontFamily: MONO }]}>{label}</Text>
    </View>
  );
}

function VolumeBar({ sets, target }: { sets: number; target: number }) {
  const scale = target > 0 ? target * 1.5 : Math.max(sets + 2, 8);
  const fillPct = Math.min((sets / scale) * 100, 100);
  const barColor = getVolumeColor(sets, target);

  const ticks = target > 0
    ? [target * 0.5, target, target * 1.15, target * 1.3]
        .filter((v) => v < scale)
        .map((v) => (v / scale) * 100)
    : [];

  return (
    <View style={{ position: 'relative' }}>
      <View style={styles.muscleBarTrack}>
        <View style={[styles.muscleBarFill, { width: `${fillPct}%` as `${number}%`, backgroundColor: barColor }]} />
      </View>
      {ticks.map((pct, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: `${pct}%` as `${number}%`,
            top: -2,
            height: 9,
            width: 2,
            backgroundColor: BG,
          }}
        />
      ))}
    </View>
  );
}

interface MuscleRowProps {
  slug: string;
  bodyMode: BodyMode;
  recoveryPct: number;
  recoveryColor: string;
  sets: number;
  target: number;
}

function MuscleRow({ slug, bodyMode, recoveryPct, recoveryColor, sets, target }: MuscleRowProps) {
  const label = formatMuscleLabel(slug);
  const barColor = bodyMode === 'recovery' ? recoveryColor : getVolumeColor(sets, target);
  const valueLabel = bodyMode === 'recovery'
    ? `${recoveryPct}%`
    : target > 0 ? `${sets}/${target}` : `${sets}s`;

  return (
    <View style={styles.muscleRow}>
      <View style={styles.muscleRowHeader}>
        <View style={[styles.muscleRowDot, { backgroundColor: barColor }]} />
        <Text style={[styles.muscleRowName, { fontFamily: MONO }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.muscleRowValue, { fontFamily: MONO_BOLD, color: barColor }]}>{valueLabel}</Text>
      </View>
      {bodyMode === 'recovery' ? (
        <View style={{ position: 'relative' }}>
          <View style={styles.muscleBarTrack}>
            <View style={[styles.muscleBarFill, { width: `${recoveryPct}%` as `${number}%`, backgroundColor: recoveryColor }]} />
          </View>
        </View>
      ) : (
        <VolumeBar sets={sets} target={target} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  // Hero stats
  heroRow: { flexDirection: 'row', gap: 8, paddingTop: 8, paddingBottom: 4 },
  heroTile: {
    flex: 1, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12,
  },
  heroLabel: { color: '#5A6663', fontSize: 10, fontWeight: '600', letterSpacing: 0.08, textTransform: 'uppercase' },
  heroValue: { color: '#E6F1ED', fontSize: 22, fontWeight: '800', marginTop: 4 },
  heroSub: { color: '#5A6663', fontSize: 10, marginTop: 2 },

  sectionHead: { marginTop: 22, marginBottom: 10 },
  sectionTitle: { color: '#E6F1ED', fontSize: 16, fontWeight: '700' },
  sectionSub: { color: '#5A6663', fontSize: 11, marginTop: 2 },

  card: {
    backgroundColor: CARD, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },

  // Mode toggle
  modeToggleRow: {
    flexDirection: 'row', backgroundColor: BG, borderRadius: 10,
    padding: 3, gap: 3, marginBottom: 12,
  },
  modeBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  modeBtnActive: { backgroundColor: ACCENT },
  modeBtnText: { color: '#5A6663', fontSize: 13, fontWeight: '600' },
  modeBtnTextActive: { color: '#0B1A14' },

  // Volume legend
  volLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: '#5A6663', fontSize: 10 },

  // Recovery
  recoveryDetail: { marginTop: 16, gap: 8 },
  recoveryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  recoveryName: { color: '#E6F1ED', fontSize: 15, fontWeight: '600', flex: 1 },
  recoveryPct: { color: '#9CB0AA', fontSize: 18, fontWeight: '700' },
  progressTrack: { height: 5, backgroundColor: BORDER, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, minWidth: 4 },
  recoveryStatus: { color: '#5A6663', fontSize: 11, marginTop: 2 },
  recoveryHint: { color: '#3A4541', fontSize: 13, textAlign: 'center', marginTop: 14, fontStyle: 'italic' },


  bubbleAnchor: { position: 'absolute', top: 16, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  muscleBubble: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1A16',
    borderRadius: 14, padding: 10, borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10,
    maxWidth: 180,
  },
  bubblePct: { color: '#E6F1ED', fontSize: 10, fontWeight: '700' },
  bubbleName: { color: '#E6F1ED', fontSize: 13, fontWeight: '700' },
  bubbleStatus: { fontSize: 10, marginTop: 2 },

  // BW log
  bwInputRow: { flexDirection: 'row', gap: 10 },
  bwInput: {
    flex: 1, backgroundColor: BG, borderRadius: 11, height: 44,
    paddingHorizontal: 14, color: '#E6F1ED', fontSize: 15, borderWidth: 1, borderColor: BORDER,
  },
  bwAddBtn: { backgroundColor: ACCENT, borderRadius: 11, paddingHorizontal: 20, justifyContent: 'center' },
  bwAddText: { color: '#0B1A14', fontWeight: '700', fontSize: 14 },
  bwToggleRow: { paddingVertical: 8, alignItems: 'center' },
  bwToggleText: { color: '#5A6663', fontSize: 12, fontWeight: '500' },
  bwLogRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9 },
  bwLogBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  bwLogDate: { color: '#7E8A86', fontSize: 13 },
  bwLogRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bwLogValue: { color: '#9CB0AA', fontSize: 14, fontWeight: '500' },
  bwLogDelete: { color: '#3A4541', fontSize: 14 },

  // PRs
  prSearchInput: {
    backgroundColor: BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
    color: '#E6F1ED', fontSize: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 10,
  },
  prSortRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  sortChip: { backgroundColor: BG, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: BORDER },
  sortChipActive: { backgroundColor: ACCENT + '22', borderColor: ACCENT },
  sortChipText: { color: '#5A6663', fontSize: 13, fontWeight: '500' },
  sortChipTextActive: { color: ACCENT, fontWeight: '600' },
  prRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  prBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  prName: { color: '#9CB0AA', fontSize: 14, flex: 1, marginRight: 12 },
  prValue: { color: ACCENT, fontSize: 14, fontWeight: '600' },

  chartEmpty: { color: '#3A4541', fontSize: 12, textAlign: 'center', marginTop: 8 },
  empty: { paddingVertical: 28, alignItems: 'center' },
  emptyText: { color: '#3A4541', fontSize: 13, textAlign: 'center' },

  // Expand button in collapsed card
  expandBtn: {
    marginTop: 14, borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, paddingVertical: 9, alignItems: 'center',
  },
  expandBtnText: { color: ACCENT, fontSize: 13, fontWeight: '600' },

  // Drag handle for modal swipe-down
  dragHandleWrap: { alignItems: 'center', paddingVertical: 10 },
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#3A4541' },

  // Modal
  modalSafe: { flex: 1, backgroundColor: BG },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  modalBody: {
    flex: 1, flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12,
  },
  modalDiagramCol: {
    alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16,
  },

  // Close + divider
  expandCloseBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  expandCloseBtnText: { color: '#9CB0AA', fontSize: 14, fontWeight: '700' },
  expandedDivider: { width: 1, backgroundColor: BORDER, marginHorizontal: 10, alignSelf: 'stretch' },

  // Sort by section — 2×2 grid
  sortSection: { marginTop: 10, width: '100%' },
  sortSectionLabel: { color: '#5A6663', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.08, marginBottom: 6 },
  sortGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  sortGridBtn: { width: '47%', paddingVertical: 6, borderRadius: 7, alignItems: 'center', borderWidth: 1, borderColor: BORDER, backgroundColor: BG },
  sortGridBtnActive: { borderColor: ACCENT, backgroundColor: ACCENT + '22' },
  sortGridBtnText: { color: '#5A6663', fontSize: 12 },
  sortGridBtnTextActive: { color: ACCENT, fontWeight: '600' as const },

  // Muscle list rows — two-line layout
  muscleRow: { paddingVertical: 6 },
  muscleRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  muscleRowDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  muscleRowName: { flex: 1, color: '#9CB0AA', fontSize: 13 },
  muscleRowValue: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  muscleBarTrack: { height: 5, backgroundColor: BORDER, borderRadius: 3, overflow: 'hidden' },
  muscleBarFill: { height: '100%', borderRadius: 3, minWidth: 2 },
});
