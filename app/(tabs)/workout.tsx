import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { isToday, isPast, formatShortDate } from '../../src/utils/dateUtils';
import { MONO, MONO_BOLD } from '../../src/utils/fonts';
import { Ring } from '../../src/components/Ring';
import { exercises as pplExercises } from '../../src/data/exercises';
import type { DayOfWeek, WorkoutSession } from '../../src/types';

function getExerciseChipName(id: string): string {
  const ex = pplExercises.find((e) => e.id === id);
  if (ex) {
    // Take first 2-3 significant words, skip parenthetical
    const clean = ex.name.replace(/\s*\(.*?\)/g, '').trim();
    const words = clean.split(' ');
    return words.slice(0, 3).join(' ');
  }
  return id.replace('ex_', '').replace(/_/g, ' ');
}

function getNextDays(count: number): string[] {
  const days: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  }
  return days;
}

function isoDayOfWeek(iso: string): DayOfWeek {
  const DAY: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = new Date(iso + 'T00:00:00');
  return DAY[d.getDay()];
}

function isoDowLabel(iso: string): string {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = new Date(iso + 'T00:00:00');
  return labels[d.getDay()];
}

const DAY_FULL: Record<DayOfWeek, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

const WORKOUT_OPTIONS = ['Push1', 'Push2', 'Pull1', 'Pull2', 'Legs1', 'Legs2', 'Rest'];
const OPTION_LABELS: Record<string, string> = {
  Push1: 'Push Day 1', Push2: 'Push Day 2', Pull1: 'Pull Day 1',
  Pull2: 'Pull Day 2', Legs1: 'Legs Day 1', Legs2: 'Legs Day 2', Rest: 'Rest Day',
};

function getDotColor(workoutId: string): string {
  if (workoutId === 'Rest') return 'transparent';
  if (workoutId.startsWith('Pull')) return '#7DB8F1';
  return '#5BD1A0';
}

function getThisWeekRange(): { monISO: string; sunISO: string } {
  const today = new Date();
  const dow = today.getDay();
  const daysToMon = dow === 0 ? 6 : dow - 1;
  const mon = new Date(today);
  mon.setDate(today.getDate() - daysToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    monISO: mon.toISOString().slice(0, 10),
    sunISO: sun.toISOString().slice(0, 10),
  };
}

function computeWeekStats(
  sessions: WorkoutSession[],
  weekDays: string[],
  schedule: Record<DayOfWeek, string>
): { done: number; total: number; volume: number } {
  const { monISO, sunISO } = getThisWeekRange();
  let done = 0;
  let total = 0;
  let volume = 0;

  // Count non-rest days this week as total
  for (const iso of weekDays) {
    if (iso < monISO || iso > sunISO) continue;
    const dow = isoDayOfWeek(iso);
    if (schedule[dow] !== 'Rest') total++;
  }

  for (const s of sessions) {
    if (s.date < monISO || s.date > sunISO) continue;
    const hasCompleted = s.exercises.some((e) => e.sets.some((set) => set.completed));
    if (hasCompleted) done++;
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (set.completed && set.actualWeight !== null && set.actualReps !== null) {
          volume += set.actualWeight * set.actualReps;
        }
      }
    }
  }

  return { done, total, volume };
}

function computeStreak(sessions: WorkoutSession[]): number {
  const sessionDates = new Set(
    sessions
      .filter((s) => s.exercises.some((e) => e.sets.some((set) => set.completed)))
      .map((s) => s.date)
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(today);

  while (true) {
    const iso = check.toISOString().slice(0, 10);
    if (sessionDates.has(iso)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function WorkoutTab() {
  const router = useRouter();
  const { schedule, plans, customWorkouts, session: sessionHook } = useApp();

  const [now, setNow] = useState(new Date());
  const days = useMemo(() => getNextDays(7), []);
  const todayISO = days[0];
  const [selectedIso, setSelectedIso] = useState(todayISO);
  const [editDay, setEditDay] = useState<DayOfWeek | null>(null);
  const [editDayISO, setEditDayISO] = useState<string | null>(null);
  const [pendingDay, setPendingDay] = useState<DayOfWeek | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const dateString = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  function getWorkoutLabel(workoutId: string): string {
    if (workoutId === 'Rest') return 'Rest Day';
    const plan = plans.plans.find((p) => p.id === workoutId);
    if (plan) return plan.label;
    const custom = customWorkouts.workouts.find((w) => w.id === workoutId);
    if (custom) return custom.name;
    return OPTION_LABELS[workoutId] ?? workoutId;
  }

  function getPlanExerciseNames(workoutId: string): string[] {
    if (workoutId === 'Rest') return [];
    const plan = plans.plans.find((p) => p.id === workoutId);
    if (plan) return plan.exercises.slice(0, 5).map((e) => e.exerciseId);
    const custom = customWorkouts.workouts.find((w) => w.id === workoutId);
    if (custom) return custom.exercises.slice(0, 5).map((e) => e.exerciseId);
    return [];
  }

  function getExerciseLabelShort(id: string): string {
    // Try PPL plans first
    for (const p of plans.plans) {
      const ex = p.exercises.find((e) => e.exerciseId === id);
      if (ex) {
        // ID like ex_p1_01 — derive short label
        return id.replace('ex_', '').replace(/_/g, ' ');
      }
    }
    return id.slice(0, 14);
  }

  function openAssignModal(iso: string) {
    const dow = isoDayOfWeek(iso);
    setEditDay(dow);
    setEditDayISO(iso);
  }

  function handleAssign(workoutId: string) {
    if (editDay) schedule.assignWorkout(editDay, workoutId);
    setEditDay(null);
    setEditDayISO(null);
  }

  function openCreateModal() {
    setPendingDay(editDay);
    setEditDay(null);
    setEditDayISO(null);
    setShowCreateModal(true);
  }

  function handleCreateWorkout() {
    const name = newWorkoutName.trim();
    if (!name) return;
    const id = customWorkouts.createWorkout(name, []);
    if (pendingDay) schedule.assignWorkout(pendingDay, id);
    setNewWorkoutName('');
    setShowCreateModal(false);
    setPendingDay(null);
  }

  // Stats
  const weekStats = useMemo(
    () => computeWeekStats(sessionHook.sessions, days, schedule.schedule),
    [sessionHook.sessions, days, schedule.schedule]
  );
  const streak = useMemo(() => computeStreak(sessionHook.sessions), [sessionHook.sessions]);

  const recentSessions = useMemo(() => {
    return [...sessionHook.sessions]
      .filter((s) => s.exercises.some((e) => e.sets.some((set) => set.completed)))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
  }, [sessionHook.sessions]);

  // Selected day data
  const selDow = isoDayOfWeek(selectedIso);
  const selWorkoutId = schedule.schedule[selDow];
  const selIsRest = selWorkoutId === 'Rest';
  const selLabel = getWorkoutLabel(selWorkoutId);
  const selIsToday = selectedIso === todayISO;
  const selIsPast = isPast(selectedIso) && !selIsToday;
  const selExerciseIds = getPlanExerciseNames(selWorkoutId);
  const selPlan = selIsRest ? null : (plans.plans.find((p) => p.id === selWorkoutId) ?? null);

  const volFormatted = weekStats.volume >= 1000
    ? `${(weekStats.volume / 1000).toFixed(1)}k`
    : `${Math.round(weekStats.volume)}`;

  const weekDonePct = weekStats.total > 0 ? (weekStats.done / weekStats.total) * 100 : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Text style={[styles.logoText, { fontFamily: MONO_BOLD }]}>R</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Today</Text>
            <Text style={[styles.headerDate, { fontFamily: MONO }]}>{dateString}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.timeText, { fontFamily: MONO_BOLD }]}>{timeString}</Text>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={[styles.liveText, { fontFamily: MONO }]}>LIVE</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Week strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripContent}
          style={styles.strip}
        >
          {days.map((iso) => {
            const dow = isoDayOfWeek(iso);
            const workoutId = schedule.schedule[dow];
            const isSel = iso === selectedIso;
            const isToday_ = isToday(iso);
            const isPast_ = isPast(iso) && !isToday_;
            const dotColor = getDotColor(workoutId);

            return (
              <Pressable
                key={iso}
                style={[
                  styles.pill,
                  isSel && styles.pillSelected,
                  !isSel && isToday_ && styles.pillToday,
                  isPast_ && !isSel && styles.pillPast,
                ]}
                onPress={() => setSelectedIso(iso)}
                onLongPress={() => openAssignModal(iso)}
                delayLongPress={400}
              >
                <Text style={[styles.pillDow, isSel && styles.pillTextSel, { fontFamily: MONO_BOLD }]}>
                  {isoDowLabel(iso)}
                </Text>
                <Text style={[styles.pillDate, isSel && styles.pillTextSel, { fontFamily: MONO_BOLD }]}>
                  {parseInt(iso.slice(8), 10)}
                </Text>
                <View style={[styles.pillDot, { backgroundColor: isSel ? '#0B1A14' : dotColor }]} />
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Big day card ── */}
        <View style={styles.dayCardWrap}>
          {selIsRest ? (
            <Pressable style={styles.restCard} onLongPress={() => openAssignModal(selectedIso)} delayLongPress={400}>
              <View style={styles.restCardTop}>
                <Text style={[styles.dayStatusLabel, { fontFamily: MONO_BOLD }]}>
                  {selIsToday ? '● TODAY' : DAY_FULL[selDow].toUpperCase()}
                </Text>
                <Text style={styles.dayTitle}>Rest Day</Text>
              </View>
              <View style={styles.restCenter}>
                <Text style={styles.restEmoji}>🌙</Text>
                <Text style={styles.restHint}>No training today. Recover well.</Text>
              </View>
            </Pressable>
          ) : (
            <Pressable style={styles.workoutCard} onLongPress={() => openAssignModal(selectedIso)} delayLongPress={400}>
              <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                  <Text style={[styles.dayStatusLabel, { fontFamily: MONO_BOLD }]}>
                    {selIsToday ? '● TODAY' : DAY_FULL[selDow].toUpperCase()}
                  </Text>
                  <Text style={styles.dayTitle}>{selLabel}</Text>
                  {selPlan && (
                    <Text style={[styles.cardMeta, { fontFamily: MONO }]}>
                      {selPlan.exercises.length} exercises
                    </Text>
                  )}
                </View>
              </View>

              {/* Exercise chips */}
              {selPlan && selPlan.exercises.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  <View style={styles.chips}>
                    {selPlan.exercises.slice(0, 6).map((ex) => (
                      <View key={ex.exerciseId} style={styles.chip}>
                        <Text style={[styles.chipText, { fontFamily: MONO }]} numberOfLines={1}>
                          {getExerciseChipName(ex.exerciseId)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => router.push(`/workout/${selectedIso}`)}
                activeOpacity={0.85}
              >
                <Text style={[styles.startBtnText, { fontFamily: MONO_BOLD }]}>
                  {selIsToday ? 'Start Workout →' : selIsPast ? 'View Workout →' : 'Preview Plan →'}
                </Text>
              </TouchableOpacity>
            </Pressable>
          )}
        </View>

        {/* ── This Week stats ── */}
        <View style={styles.statsSectionHead}>
          <Text style={[styles.statsSectionTitle, { fontFamily: MONO_BOLD }]}>THIS WEEK</Text>
        </View>
        <View style={styles.statsRow}>
          {/* Workouts done with ring */}
          <View style={[styles.statTile, { flex: 1.2 }]}>
            <Text style={[styles.statLabel, { fontFamily: MONO }]}>WORKOUTS</Text>
            <View style={styles.statRingRow}>
              <Ring pct={weekDonePct} size={40} stroke={4} color="#5BD1A0" trackColor="#1f2825">
                <Text style={[styles.statRingInner, { fontFamily: MONO_BOLD }]}>{weekStats.done}</Text>
              </Ring>
              <View>
                <Text style={[styles.statValue, { fontFamily: MONO_BOLD }]}>{weekStats.done}</Text>
                <Text style={[styles.statSub, { fontFamily: MONO }]}>/ {weekStats.total} planned</Text>
              </View>
            </View>
          </View>

          {/* Volume */}
          <View style={[styles.statTile, { flex: 1 }]}>
            <Text style={[styles.statLabel, { fontFamily: MONO }]}>VOLUME</Text>
            <Text style={[styles.statValue, { fontFamily: MONO_BOLD }]}>{volFormatted}</Text>
            <Text style={[styles.statSub, { fontFamily: MONO }]}>kg total</Text>
          </View>

          {/* Streak */}
          <View style={[styles.statTile, { flex: 1 }]}>
            <Text style={[styles.statLabel, { fontFamily: MONO }]}>STREAK</Text>
            <Text style={[styles.statValue, { fontFamily: MONO_BOLD }]}>{streak}</Text>
            <Text style={[styles.statSub, { fontFamily: MONO }]}>days {streak > 0 ? '🔥' : '—'}</Text>
          </View>
        </View>

        {/* ── Recent ── */}
        {recentSessions.length > 0 && (
          <>
            <View style={styles.statsSectionHead}>
              <Text style={[styles.statsSectionTitle, { fontFamily: MONO_BOLD }]}>RECENT</Text>
            </View>
            {recentSessions.map((s) => {
              const vol = s.exercises.reduce((acc, ex) =>
                acc + ex.sets.reduce((a, set) =>
                  set.completed && set.actualWeight !== null && set.actualReps !== null
                    ? a + set.actualWeight * set.actualReps : a, 0), 0);
              const dow = isoDayOfWeek(s.date);
              const label = getWorkoutLabel(s.workoutType);
              const volStr = vol > 0 ? ` · ${vol >= 1000 ? `${(vol / 1000).toFixed(1)}k` : Math.round(vol)} kg` : '';
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.recentRow}
                  onPress={() => router.push(`/workout/${s.date}`)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.recentBadge, { backgroundColor: s.workoutType.startsWith('Pull') ? '#0F2235' : '#13352A' }]}>
                    <Text style={[styles.recentBadgeText, { fontFamily: MONO_BOLD, color: s.workoutType.startsWith('Pull') ? '#7DB8F1' : '#5BD1A0' }]}>
                      {s.workoutType.startsWith('Pull') ? 'L' : s.workoutType.startsWith('Push') ? 'P' : 'G'}
                    </Text>
                  </View>
                  <View style={styles.recentMid}>
                    <Text style={styles.recentLabel}>{label}</Text>
                    <Text style={[styles.recentSub, { fontFamily: MONO }]}>
                      {DAY_FULL[dow].slice(0, 3)} · {s.date.slice(5).replace('-', '/')}{volStr}
                    </Text>
                  </View>
                  <Text style={[styles.recentCheck, { fontFamily: MONO_BOLD }]}>✓</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Assign workout modal ── */}
      <Modal
        visible={editDay !== null}
        transparent
        animationType="slide"
        onRequestClose={() => { setEditDay(null); setEditDayISO(null); }}
      >
        <Pressable style={styles.backdrop} onPress={() => { setEditDay(null); setEditDayISO(null); }}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { fontFamily: MONO }]}>
              {editDay ? `${DAY_FULL[editDay].toUpperCase()} · ${editDayISO ? formatShortDate(editDayISO) : ''}` : ''}
            </Text>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {WORKOUT_OPTIONS.map((item) => {
                const selected = editDay ? schedule.schedule[editDay] === item : false;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => handleAssign(item)}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {OPTION_LABELS[item]}
                    </Text>
                    {selected && <Text style={[styles.checkmark, { fontFamily: MONO_BOLD }]}>✓</Text>}
                  </TouchableOpacity>
                );
              })}

              {customWorkouts.workouts.length > 0 && (
                <>
                  <Text style={[styles.dividerLabel, { fontFamily: MONO }]}>CUSTOM</Text>
                  {customWorkouts.workouts.map((w) => {
                    const selected = editDay ? schedule.schedule[editDay] === w.id : false;
                    return (
                      <TouchableOpacity
                        key={w.id}
                        style={[styles.option, selected && styles.optionSelected]}
                        onPress={() => handleAssign(w.id)}
                      >
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{w.name}</Text>
                        {selected && <Text style={[styles.checkmark, { fontFamily: MONO_BOLD }]}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              <TouchableOpacity style={styles.createNewBtn} onPress={openCreateModal}>
                <Text style={styles.createNewText}>+ Create New Workout</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Create custom workout modal ── */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowCreateModal(false); setPendingDay(null); }}
      >
        <Pressable style={styles.backdrop} onPress={() => { setShowCreateModal(false); setPendingDay(null); }}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New Workout</Text>
            <TextInput
              style={styles.createInput}
              value={newWorkoutName}
              onChangeText={setNewWorkoutName}
              placeholder="Workout name…"
              placeholderTextColor="#3A4541"
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleCreateWorkout}
            />
            <TouchableOpacity
              style={[styles.createConfirmBtn, !newWorkoutName.trim() && styles.createConfirmBtnDisabled]}
              disabled={!newWorkoutName.trim()}
              onPress={handleCreateWorkout}
            >
              <Text style={[styles.createConfirmText, { fontFamily: MONO_BOLD }]}>Create & Assign</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const ACCENT = '#5BD1A0';
const ACCENT_DEEP = '#13352A';
const BG = '#0B0F0E';
const CARD = '#11181A';
const BORDER = '#1f2825';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingBottom: 24 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: {
    width: 30, height: 30, borderRadius: 9, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#0B1A14', fontWeight: '900', fontSize: 17 },
  headerTitle: { color: '#E6F1ED', fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  headerDate: { color: '#5A6663', fontSize: 11, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  timeText: { color: ACCENT, fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  liveText: { color: '#3A4541', fontSize: 9, letterSpacing: 0.08 },

  // Week strip
  strip: { flexGrow: 0 },
  stripContent: { paddingHorizontal: 16, paddingBottom: 8, gap: 6 },
  pill: {
    width: 48, height: 70, borderRadius: 14,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8,
  },
  pillSelected: { backgroundColor: ACCENT, borderColor: ACCENT },
  pillToday: { borderColor: ACCENT + '88' },
  pillPast: { opacity: 0.5 },
  pillDow: { color: '#5A6663', fontSize: 10, fontWeight: '700', letterSpacing: 0.08, textTransform: 'uppercase' },
  pillDate: { color: '#E6F1ED', fontSize: 19, fontWeight: '800' },
  pillTextSel: { color: '#0B1A14' },
  pillDot: { width: 4, height: 4, borderRadius: 2 },

  // Day card
  dayCardWrap: { paddingHorizontal: 16, paddingTop: 10 },
  workoutCard: {
    borderRadius: 22, padding: 20, overflow: 'hidden', position: 'relative',
    backgroundColor: ACCENT_DEEP,
    borderWidth: 1, borderColor: ACCENT + '55',
  },
  cardGlow: {
    position: 'absolute', top: -50, right: -50, width: 200, height: 200,
    borderRadius: 100, backgroundColor: ACCENT,
    opacity: 0.12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  cardTopLeft: {},
  dayStatusLabel: {
    color: ACCENT, fontSize: 11, fontWeight: '700', letterSpacing: 0.14, textTransform: 'uppercase', marginBottom: 4,
  },
  dayTitle: { color: '#E6F1ED', fontSize: 28, fontWeight: '900', letterSpacing: -0.6 },
  cardMeta: { color: '#7E8A86', fontSize: 12, marginTop: 4 },

  chipsScroll: { marginBottom: 14 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: {
    backgroundColor: '#0B1A14', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5,
    borderWidth: 1, borderColor: BORDER,
  },
  chipText: { color: '#9CB0AA', fontSize: 11 },

  startBtn: {
    backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  startBtnText: { color: '#0B1A14', fontWeight: '800', fontSize: 15 },

  restCard: {
    borderRadius: 22, padding: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
  },
  restCardTop: { marginBottom: 16 },
  restCenter: { paddingVertical: 16, alignItems: 'center' },
  restEmoji: { fontSize: 40, marginBottom: 8 },
  restHint: { color: '#7E8A86', fontSize: 13 },

  // Stats
  statsSectionHead: {
    paddingHorizontal: 18, paddingTop: 22, paddingBottom: 8,
  },
  statsSectionTitle: { color: '#9CB0AA', fontSize: 11, fontWeight: '600', letterSpacing: 0.08 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  statTile: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 12, gap: 4,
  },
  statLabel: { color: '#5A6663', fontSize: 10, fontWeight: '600', letterSpacing: 0.08, textTransform: 'uppercase' },
  statValue: { color: '#E6F1ED', fontSize: 22, fontWeight: '800', marginTop: 2 },
  statSub: { color: '#5A6663', fontSize: 10 },
  statRingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statRingInner: { color: ACCENT, fontSize: 10, fontWeight: '700' },

  // Recent
  recentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 8, padding: 14,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14,
  },
  recentBadge: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  recentBadgeText: { fontSize: 15, fontWeight: '700' },
  recentMid: { flex: 1 },
  recentLabel: { color: '#E6F1ED', fontSize: 14, fontWeight: '600' },
  recentSub: { color: '#5A6663', fontSize: 11, marginTop: 2 },
  recentCheck: { color: ACCENT, fontSize: 14 },

  // Modal / sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 40, paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#3A4541', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { color: '#7E8A86', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, paddingHorizontal: 4 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  optionSelected: { backgroundColor: '#152218' },
  optionText: { color: '#9CB0AA', fontSize: 16 },
  optionTextSelected: { color: ACCENT, fontWeight: '600' },
  checkmark: { color: ACCENT, fontSize: 18 },
  dividerLabel: { color: '#5A6663', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  createNewBtn: { paddingVertical: 16, paddingHorizontal: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: BORDER },
  createNewText: { color: ACCENT, fontSize: 15, fontWeight: '600' },
  createInput: {
    backgroundColor: '#0B0F0E', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: '#E6F1ED', fontSize: 15, borderWidth: 1, borderColor: BORDER, marginBottom: 14,
  },
  createConfirmBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  createConfirmBtnDisabled: { backgroundColor: '#1f2825' },
  createConfirmText: { color: '#0B1A14', fontSize: 15, fontWeight: '700' },
});
