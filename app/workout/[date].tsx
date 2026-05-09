import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import {
  buildBlankSession,
  countCompletedSets,
  countTotalSets,
} from '../../src/utils/sessionUtils';
import { isoToDayOfWeek, formatDisplayDate } from '../../src/utils/dateUtils';
import { getExercise, exercises as pplExercises } from '../../src/data/exercises';
import { exerciseDB } from '../../src/data/exercisedb';
import { Ring } from '../../src/components/Ring';
import { MONO, MONO_BOLD } from '../../src/utils/fonts';
import type { WorkoutSession, LoggedSet, LoggedExercise, WorkoutBlueprint, MuscleGroup, WeightUnit } from '../../src/types';

const MUSCLE_TO_SLUG: Partial<Record<MuscleGroup, string>> = {
  chest: 'chest', back: 'upper-back', shoulders: 'deltoids', triceps: 'triceps',
  biceps: 'biceps', quads: 'quadriceps', hamstrings: 'hamstrings',
  glutes: 'gluteal', calves: 'calves', core: 'abs',
};

const ACCENT = '#5BD1A0';
const ACCENT_DEEP = '#13352A';
const BG = '#0B0F0E';
const CARD = '#11181A';
const BORDER = '#1f2825';

type InputState = { weight: string; reps: string };
function inputKey(exerciseId: string, setNumber: number) { return `${exerciseId}:${setNumber}`; }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

export default function DailyWorkoutScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date: string }>();
  const date = Array.isArray(dateParam) ? dateParam[0] : (dateParam ?? '');
  const { session: sessionHook, unit, recovery, plans, schedule, customWorkouts, workingWeights } = useApp();

  const dayOfWeek = isoToDayOfWeek(date);
  const workoutId = schedule.schedule[dayOfWeek];
  const isRest = workoutId === 'Rest';

  const plan = useMemo((): WorkoutBlueprint | null => {
    if (isRest) return null;
    const ppl = plans.plans.find((p) => p.id === workoutId);
    if (ppl) return ppl;
    const custom = customWorkouts.workouts.find((w) => w.id === workoutId);
    if (custom) return { id: custom.id, label: custom.name, exercises: custom.exercises };
    return null;
  }, [isRest, workoutId, plans.plans, customWorkouts.workouts]);

  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [inputs, setInputs] = useState<Record<string, InputState>>({});
  const [openExIds, setOpenExIds] = useState<Set<string>>(new Set());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!plan || initializedRef.current) return;
    initializedRef.current = true;
    const existing = sessionHook.sessions.find((s) => s.date === date && s.workoutType === plan.id);
    // Rebuild if session exists but has no exercises while the template does —
    // happens when user opens a day before adding exercises to the custom workout.
    const needsRebuild = existing
      && existing.exercises.length === 0
      && plan.exercises.length > 0;
    const session = (!existing || needsRebuild) ? buildBlankSession(
      date, plan, unit.unit,
      (id) => workingWeights.getWorkingWeight(id) ?? sessionHook.getLastWeight(id),
      sessionHook.getLastReps
    ) : existing;
    if (!existing || needsRebuild) sessionHook.saveSession(session);
    setActiveSession(session);

    const initInputs: Record<string, InputState> = {};
    for (const ex of session.exercises) {
      for (const s of ex.sets) {
        let displayWeight = '';
        if (s.actualWeight !== null) {
          if (s.unit === unit.unit) {
            displayWeight = String(s.actualWeight);
          } else {
            const factor = unit.unit === 'lb' ? 2.20462 : 1 / 2.20462;
            displayWeight = (s.actualWeight * factor).toFixed(1);
          }
        }
        initInputs[inputKey(ex.exerciseId, s.setNumber)] = {
          weight: displayWeight,
          reps: s.actualReps !== null ? String(s.actualReps) : '',
        };
      }
    }
    setInputs(initInputs);
  }, [plan?.id]);

  const prevUnitRef = useRef<WeightUnit>(unit.unit);
  useEffect(() => {
    const from = prevUnitRef.current;
    const to = unit.unit;
    prevUnitRef.current = to;
    if (from === to) return;
    const factor = to === 'lb' ? 2.20462 : 1 / 2.20462;
    setInputs((prev) => {
      const next: Record<string, InputState> = {};
      for (const [key, inp] of Object.entries(prev)) {
        const w = parseFloat(inp.weight);
        next[key] = {
          ...inp,
          weight: inp.weight.trim() === '' || isNaN(w) ? inp.weight : (w * factor).toFixed(1),
        };
      }
      return next;
    });
  }, [unit.unit]);

  const pickerExercises = useMemo(() => {
    const q = pickerQuery.toLowerCase().trim();
    const ppl = pplExercises.filter((e) => !q || e.name.toLowerCase().includes(q)).map((e) => ({ id: e.id, name: e.name }));
    const db = exerciseDB.filter((e) => !q || e.name.toLowerCase().includes(q)).map((e) => ({ id: e.id, name: capitalize(e.name) }));
    const seen = new Set(ppl.map((e) => e.id));
    return [...ppl, ...db.filter((e) => !seen.has(e.id))].slice(0, 100);
  }, [pickerQuery]);

  function getExerciseName(exerciseId: string): string {
    const pplDef = getExercise(exerciseId);
    if (pplDef) return pplDef.name;
    const dbEntry = exerciseDB.find((e) => e.id === exerciseId);
    if (dbEntry) return capitalize(dbEntry.name);
    return exerciseId;
  }

  function getNextSetHint(exerciseId: string): string | null {
    const ex = activeSession?.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) return null;
    const nextSet = ex.sets.find((s) => !s.completed);
    if (!nextSet) return null;
    const key = inputKey(exerciseId, nextSet.setNumber);
    const inp = inputs[key];
    if (inp?.weight && inp?.reps) return `NEXT: ${inp.weight} ${unit.unit} × ${inp.reps}`;
    if (nextSet.actualWeight !== null && nextSet.actualReps !== null)
      return `NEXT: ${nextSet.actualWeight} ${unit.unit} × ${nextSet.actualReps}`;
    return null;
  }

  function toggleExpand(id: string) {
    setOpenExIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExTap(exerciseId: string) {
    if (!activeSession || !!activeSession.completedAt) return;
    const ex = activeSession.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) return;
    const nextSet = ex.sets.find((s) => !s.completed);
    if (!nextSet) return;
    const key = inputKey(exerciseId, nextSet.setNumber);
    const inp = inputs[key] ?? { weight: '', reps: '' };
    if (!inp.weight.trim() || !inp.reps.trim()) {
      Alert.alert('Enter Weight & Reps', `Fill in weight and reps for set ${nextSet.setNumber} before marking it done.`);
      return;
    }
    const completedWeight = parseFloat(inp.weight) || 0;
    flushInput(exerciseId, nextSet.setNumber);
    if (completedWeight > 0) checkWorkingWeightUpdate(exerciseId, nextSet.setNumber, completedWeight);
    // Auto-fill next uncompleted set if its inputs are empty
    const nextNext = ex.sets.find((s) => s.setNumber > nextSet.setNumber && !s.completed);
    if (nextNext) {
      const nk = inputKey(exerciseId, nextNext.setNumber);
      setInputs((prev) => prev[nk]?.weight.trim() ? prev : { ...prev, [nk]: { weight: inp.weight, reps: inp.reps } });
    }
    toggleSetComplete(exerciseId, nextSet.setNumber, false);
  }

  function toggleSetComplete(exerciseId: string, setNumber: number, currentlyDone: boolean) {
    if (!activeSession || !!activeSession.completedAt) return;
    const completed = !currentlyDone;
    setActiveSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.exerciseId !== exerciseId ? ex
            : { ...ex, sets: ex.sets.map((s) => s.setNumber !== setNumber ? s : { ...s, completed }) }
        ),
      };
    });
    sessionHook.updateSet(activeSession.id, exerciseId, setNumber, { completed });
  }

  function handleWeightChange(exerciseId: string, setNumber: number, value: string) {
    const key = inputKey(exerciseId, setNumber);
    setInputs((prev) => ({ ...prev, [key]: { ...prev[key], weight: value } }));
  }

  function handleRepsChange(exerciseId: string, setNumber: number, value: string) {
    const key = inputKey(exerciseId, setNumber);
    setInputs((prev) => ({ ...prev, [key]: { ...prev[key], reps: value } }));
  }

  function flushInput(exerciseId: string, setNumber: number) {
    if (!activeSession) return;
    const key = inputKey(exerciseId, setNumber);
    const inp = inputs[key];
    if (!inp) return;
    const actualWeight = inp.weight.trim() === '' ? null : parseFloat(inp.weight) || null;
    const actualReps = inp.reps.trim() === '' ? null : parseInt(inp.reps, 10) || null;
    sessionHook.updateSet(activeSession.id, exerciseId, setNumber, { actualWeight, actualReps, unit: unit.unit });
  }

  function checkWorkingWeightUpdate(exerciseId: string, newlyCompletedSetNumber: number, completedWeight: number) {
    if (!activeSession) return;
    const ex = activeSession.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) return;

    const allCompleted = ex.sets
      .map((s) =>
        s.setNumber === newlyCompletedSetNumber
          ? { ...s, completed: true, actualWeight: completedWeight, unit: unit.unit }
          : s
      )
      .filter((s) => s.completed && s.actualWeight !== null)
      .sort((a, b) => a.setNumber - b.setNumber);

    if (allCompleted.length < 3) return;

    const last3 = allCompleted.slice(-3);
    const toDisplay = (w: number, fromUnit: WeightUnit) => {
      if (fromUnit === unit.unit) return w;
      return unit.unit === 'lb' ? w * 2.20462 : w / 2.20462;
    };
    const ww = workingWeights.getWorkingWeight(exerciseId);
    const wwInDisplay = ww ? toDisplay(ww.weight, ww.unit) : 0;
    const weightsInDisplay = last3.map((s) => toDisplay(s.actualWeight!, s.unit));

    if (weightsInDisplay.every((w) => w >= wwInDisplay)) {
      workingWeights.setWorkingWeight(exerciseId, completedWeight, unit.unit);
    }
  }

  function handleAddSet(exerciseId: string) {
    if (!activeSession) return;
    const ex = activeSession.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) return;
    const lastSet = ex.sets[ex.sets.length - 1];
    const nextSetNumber = lastSet ? lastSet.setNumber + 1 : 1;
    const newSet: LoggedSet = {
      setNumber: nextSetNumber,
      actualReps: lastSet?.actualReps ?? null,
      actualWeight: lastSet?.actualWeight ?? null,
      unit: lastSet?.unit ?? unit.unit,
      completed: false, skipped: false,
    };
    sessionHook.addSet(activeSession.id, exerciseId, unit.unit);
    setActiveSession((prev) => {
      if (!prev) return prev;
      return { ...prev, exercises: prev.exercises.map((e) => e.exerciseId !== exerciseId ? e : { ...e, sets: [...e.sets, newSet] }) };
    });
    setInputs((prev) => ({
      ...prev,
      [inputKey(exerciseId, nextSetNumber)]: {
        weight: newSet.actualWeight !== null ? String(newSet.actualWeight) : '',
        reps: newSet.actualReps !== null ? String(newSet.actualReps) : '',
      },
    }));
  }

  function handleRemoveSet(exerciseId: string, setNumber: number) {
    if (!activeSession) return;
    sessionHook.removeSet(activeSession.id, exerciseId, setNumber);
    setActiveSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((e) => {
          if (e.exerciseId !== exerciseId) return e;
          const filtered = e.sets.filter((s) => s.setNumber !== setNumber);
          return { ...e, sets: filtered.map((s, i) => ({ ...s, setNumber: i + 1 })) };
        }),
      };
    });
    setInputs((prev) => { const next = { ...prev }; delete next[inputKey(exerciseId, setNumber)]; return next; });
  }

  function handleRemoveExercise(exerciseId: string, name: string) {
    if (!activeSession || !!activeSession.completedAt) return;
    Alert.alert('Remove Exercise', `Remove "${name}" from this workout?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          sessionHook.removeExerciseFromSession(activeSession.id, exerciseId);
          setActiveSession((prev) => prev ? { ...prev, exercises: prev.exercises.filter((e) => e.exerciseId !== exerciseId) } : prev);
          setOpenExIds((prev) => { const next = new Set(prev); next.delete(exerciseId); return next; });
        },
      },
    ]);
  }

  function handlePickExercise(exerciseId: string) {
    if (!activeSession) return;
    if (activeSession.exercises.some((e) => e.exerciseId === exerciseId)) {
      Alert.alert('Already Added', 'This exercise is already in this workout.');
      return;
    }
    const DEFAULT_SETS = 3;

    const src = workingWeights.getWorkingWeight(exerciseId) ?? sessionHook.getLastWeight(exerciseId);
    let prefillWeight: number | null = null;
    if (src) {
      const { weight, unit: fromUnit } = src;
      prefillWeight = fromUnit === unit.unit ? weight
        : unit.unit === 'lb' ? parseFloat((weight * 2.20462).toFixed(1))
        : parseFloat((weight / 2.20462).toFixed(1));
    }
    const prefillReps = sessionHook.getLastReps(exerciseId);

    const newExercise: LoggedExercise = {
      exerciseId,
      order: activeSession.exercises.length + 1,
      sets: Array.from({ length: DEFAULT_SETS }, (_, i) => ({
        setNumber: i + 1,
        actualReps: prefillReps,
        actualWeight: prefillWeight,
        unit: unit.unit,
        completed: false,
        skipped: false,
      })),
    };
    const updatedSession = { ...activeSession, exercises: [...activeSession.exercises, newExercise] };
    sessionHook.saveSession(updatedSession);
    setActiveSession(updatedSession);

    const newInputs: Record<string, InputState> = {};
    for (let i = 1; i <= DEFAULT_SETS; i++) {
      newInputs[inputKey(exerciseId, i)] = {
        weight: prefillWeight !== null ? String(prefillWeight) : '',
        reps: prefillReps !== null ? String(prefillReps) : '',
      };
    }
    setInputs((prev) => ({ ...prev, ...newInputs }));
    setShowPicker(false);
    setPickerQuery('');
  }

  function handleFinish() {
    if (!activeSession) return;
    sessionHook.completeSession(activeSession.id);
    const slugsToMark = new Set<string>();
    for (const ex of activeSession.exercises) {
      const def = getExercise(ex.exerciseId);
      if (def) { for (const mg of def.muscleGroups) { const slug = MUSCLE_TO_SLUG[mg]; if (slug) slugsToMark.add(slug); } }
    }
    for (const slug of slugsToMark) recovery.markAsTrained(slug);
    router.back();
  }

  const isCompleted = !!activeSession?.completedAt;
  const totalSets = activeSession ? countTotalSets(activeSession) : 0;
  const doneSets = activeSession ? countCompletedSets(activeSession) : 0;
  const allDone = totalSets > 0 && doneSets === totalSets;
  const progressPct = totalSets > 0 ? (doneSets / totalSets) * 100 : 0;

  const totalVolume = useMemo(() => {
    if (!activeSession) return 0;
    return activeSession.exercises.reduce((acc, ex) =>
      acc + ex.sets.reduce((a, s) => {
        if (!s.completed) return a;
        const key = inputKey(ex.exerciseId, s.setNumber);
        const inp = inputs[key];
        const w = inp?.weight ? parseFloat(inp.weight) || 0 : s.actualWeight ?? 0;
        const r = inp?.reps ? parseInt(inp.reps) || 0 : s.actualReps ?? 0;
        return a + w * r;
      }, 0), 0);
  }, [activeSession, inputs]);

  if (isRest) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <WorkoutHeader title="Rest Day" date={date} onBack={() => router.back()} />
        <View style={styles.centeredContent}>
          <Text style={styles.restEmoji}>💤</Text>
          <Text style={styles.infoTitle}>Rest & Recover</Text>
          <Text style={styles.infoSub}>No workout scheduled. Enjoy the rest.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <WorkoutHeader title="Workout" date={date} onBack={() => router.back()} />
        <View style={styles.centeredContent}>
          <Text style={styles.infoTitle}>No plan found</Text>
          <Text style={styles.infoSub}>Go back and reassign this day.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ── Sticky header ── */}
        <WorkoutHeader title={plan.label} date={date} onBack={() => router.back()} />

        {/* ── Progress band ── */}
        {activeSession && (
          <View style={styles.progressBand}>
            <Ring pct={progressPct} size={56} stroke={5} color={ACCENT} trackColor={BORDER}>
              <View style={styles.ringInner}>
                <Text style={[styles.ringDone, { fontFamily: MONO_BOLD }]}>{doneSets}</Text>
                <Text style={[styles.ringTotal, { fontFamily: MONO }]}>/{totalSets}</Text>
              </View>
            </Ring>
            <View style={styles.progressBandRight}>
              <View style={styles.progressBandStats}>
                <View>
                  <Text style={[styles.bandStatLabel, { fontFamily: MONO }]}>VOLUME</Text>
                  <Text style={[styles.bandStatValue, { fontFamily: MONO_BOLD }]}>
                    {totalVolume > 0 ? (totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : Math.round(totalVolume).toString()) : '—'}
                    <Text style={[styles.bandStatUnit, { fontFamily: MONO }]}> {unit.unit}</Text>
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.bandStatLabel, { fontFamily: MONO }]}>SETS</Text>
                  <Text style={[styles.bandStatValue, { fontFamily: MONO_BOLD }]}>
                    {doneSets}/{totalSets}
                  </Text>
                </View>
              </View>
              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct}%` as `${number}%` }]} />
              </View>
            </View>
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedBanner}>
            <Text style={[styles.completedText, { fontFamily: MONO_BOLD }]}>✓ Workout Complete</Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {(activeSession?.exercises ?? []).map((ex) => {
            const name = getExerciseName(ex.exerciseId);
            const doneSetsEx = ex.sets.filter((s) => s.completed).length;
            const totalSetsEx = ex.sets.length;
            const allExDone = doneSetsEx === totalSetsEx && totalSetsEx > 0;
            const isOpen = openExIds.has(ex.exerciseId);
            const nextHint = getNextSetHint(ex.exerciseId);
            const pctEx = totalSetsEx > 0 ? (doneSetsEx / totalSetsEx) * 100 : 0;

            const nextSet = ex.sets.find((s) => !s.completed) ?? null;

            return (
              <View
                key={ex.exerciseId}
                style={[styles.exCard, allExDone && styles.exCardDone]}
              >
                {/* Card header row */}
                <Pressable
                  style={styles.exCardHeader}
                  onPress={() => handleExTap(ex.exerciseId)}
                  onLongPress={() => toggleExpand(ex.exerciseId)}
                  delayLongPress={400}
                >
                  <Ring pct={pctEx} size={44} stroke={4} color={ACCENT} trackColor={BORDER}>
                    <Text style={[styles.ringExText, { fontFamily: MONO_BOLD, color: allExDone ? ACCENT : '#E6F1ED' }]}>
                      {allExDone ? '✓' : `${doneSetsEx}/${totalSetsEx}`}
                    </Text>
                  </Ring>

                  <View style={styles.exMid}>
                    <Text style={[styles.exName, allExDone && styles.exNameDone]} numberOfLines={2}>{name}</Text>
                    {(() => {
                      const ww = workingWeights.getWorkingWeight(ex.exerciseId);
                      if (!ww) return null;
                      const displayWW = ww.unit === unit.unit ? ww.weight
                        : unit.unit === 'lb' ? parseFloat((ww.weight * 2.20462).toFixed(1))
                        : parseFloat((ww.weight / 2.20462).toFixed(1));
                      return (
                        <Text style={[styles.wwHint, { fontFamily: MONO }]}>WW {displayWW} {unit.unit}</Text>
                      );
                    })()}
                  </View>

                  {!allExDone && !isCompleted && nextSet ? (
                    <View style={styles.inlineInputRow}>
                      <TextInput
                        style={styles.inlineInput}
                        value={inputs[inputKey(ex.exerciseId, nextSet.setNumber)]?.weight ?? ''}
                        onChangeText={(v) => handleWeightChange(ex.exerciseId, nextSet.setNumber, v)}
                        onBlur={() => flushInput(ex.exerciseId, nextSet.setNumber)}
                        keyboardType="decimal-pad"
                        placeholder="wt"
                        placeholderTextColor="#3A4541"
                      />
                      <Text style={[styles.inlineX, { fontFamily: MONO }]}>×</Text>
                      <TextInput
                        style={[styles.inlineInput, { width: 44 }]}
                        value={inputs[inputKey(ex.exerciseId, nextSet.setNumber)]?.reps ?? ''}
                        onChangeText={(v) => handleRepsChange(ex.exerciseId, nextSet.setNumber, v)}
                        onBlur={() => flushInput(ex.exerciseId, nextSet.setNumber)}
                        keyboardType="number-pad"
                        placeholder="reps"
                        placeholderTextColor="#3A4541"
                      />
                    </View>
                  ) : null}
                </Pressable>

                {/* Inline set table */}
                {isOpen && (
                  <View style={styles.setTable}>
                    {/* Remove exercise row */}
                    {!isCompleted && (
                      <TouchableOpacity
                        style={styles.removeExRow}
                        onPress={() => handleRemoveExercise(ex.exerciseId, name)}
                      >
                        <Text style={[styles.removeExText, { fontFamily: MONO }]}>✕ Remove exercise</Text>
                      </TouchableOpacity>
                    )}
                    {/* Column headers */}
                    <View style={styles.setHeaderRow}>
                      <Text style={[styles.setHeaderCell, { width: 28, fontFamily: MONO }]}>SET</Text>
                      <Text style={[styles.setHeaderCell, { flex: 1, textAlign: 'center', fontFamily: MONO }]}>{unit.unit.toUpperCase()}</Text>
                      <Text style={[styles.setHeaderCell, { flex: 1, textAlign: 'center', fontFamily: MONO }]}>REPS</Text>
                      <View style={{ width: 36 }} />
                      {!isCompleted && <View style={{ width: 24 }} />}
                    </View>

                    {ex.sets.map((s) => {
                      const key = inputKey(ex.exerciseId, s.setNumber);
                      const inp = inputs[key] ?? { weight: '', reps: '' };
                      return (
                        <View key={s.setNumber} style={[styles.setRow, s.completed && styles.setRowDone]}>
                          <Text style={[styles.setNum, { fontFamily: MONO }]}>{s.setNumber}</Text>

                          <TextInput
                            style={[styles.setInput, { flex: 1 }, isCompleted && styles.inputDisabled]}
                            value={inp.weight}
                            onChangeText={(v) => handleWeightChange(ex.exerciseId, s.setNumber, v)}
                            onBlur={() => flushInput(ex.exerciseId, s.setNumber)}
                            keyboardType="decimal-pad"
                            placeholder="—"
                            placeholderTextColor="#3A4541"
                            editable={!isCompleted}
                          />

                          <TextInput
                            style={[styles.setInput, { flex: 1 }, isCompleted && styles.inputDisabled]}
                            value={inp.reps}
                            onChangeText={(v) => handleRepsChange(ex.exerciseId, s.setNumber, v)}
                            onBlur={() => flushInput(ex.exerciseId, s.setNumber)}
                            keyboardType="number-pad"
                            placeholder="—"
                            placeholderTextColor="#3A4541"
                            editable={!isCompleted}
                          />

                          <TouchableOpacity
                            style={[styles.checkBtn, s.completed && styles.checkBtnDone]}
                            onPress={() => {
                              if (!s.completed) {
                                flushInput(ex.exerciseId, s.setNumber);
                                const inp = inputs[inputKey(ex.exerciseId, s.setNumber)];
                                const w = inp?.weight ? parseFloat(inp.weight) || 0 : 0;
                                if (w > 0) checkWorkingWeightUpdate(ex.exerciseId, s.setNumber, w);
                                // Auto-fill next uncompleted set if empty
                                const nextSet = ex.sets.find((s2) => s2.setNumber > s.setNumber && !s2.completed);
                                if (nextSet && inp) {
                                  const nk = inputKey(ex.exerciseId, nextSet.setNumber);
                                  setInputs((prev) => prev[nk]?.weight.trim() ? prev : { ...prev, [nk]: { weight: inp.weight, reps: inp.reps } });
                                }
                              }
                              toggleSetComplete(ex.exerciseId, s.setNumber, s.completed);
                            }}
                            disabled={isCompleted}
                          >
                            <Text style={[styles.checkBtnText, s.completed && styles.checkBtnTextDone, { fontFamily: MONO_BOLD }]}>
                              {s.completed ? '✓' : ''}
                            </Text>
                          </TouchableOpacity>

                          {!isCompleted && (
                            <TouchableOpacity
                              style={styles.removeSetBtn}
                              onPress={() => handleRemoveSet(ex.exerciseId, s.setNumber)}
                              hitSlop={8}
                            >
                              <Text style={[styles.removeSetText, { fontFamily: MONO }]}>−</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}

                    {!isCompleted && (
                      <TouchableOpacity style={styles.addSetBtn} onPress={() => handleAddSet(ex.exerciseId)}>
                        <Text style={[styles.addSetText, { fontFamily: MONO }]}>+ Add Set</Text>
                      </TouchableOpacity>
                    )}

                    {(() => {
                      const def = getExercise(ex.exerciseId);
                      return def?.notes ? (
                        <Text style={styles.exerciseNote}>{def.notes}</Text>
                      ) : null;
                    })()}
                  </View>
                )}
              </View>
            );
          })}

          {!isCompleted && activeSession && (
            <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setShowPicker(true)}>
              <Text style={[styles.addExerciseText, { fontFamily: MONO }]}>+ Add Exercise</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {isCompleted && activeSession && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.reopenBtn}
              onPress={() => {
                sessionHook.uncompleteSession(activeSession.id);
                setActiveSession((prev) => prev ? { ...prev, completedAt: undefined } : prev);
              }}
            >
              <Text style={[styles.reopenBtnText, { fontFamily: MONO_BOLD }]}>
                ↩ Reopen Workout
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!isCompleted && activeSession && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.finishBtn,
                allDone && styles.finishBtnAllDone,
                !allDone && doneSets > 0 && styles.finishBtnPartial,
                doneSets === 0 && styles.finishBtnDisabled,
              ]}
              onPress={handleFinish}
              disabled={doneSets === 0}
            >
              <Text style={[
                styles.finishBtnText,
                { fontFamily: MONO_BOLD },
                allDone && styles.finishBtnTextDark,
                doneSets === 0 && styles.finishBtnTextDim,
              ]}>
                {allDone ? 'Finish Workout ✓' : `Finish Early · ${doneSets}/${totalSets}`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Exercise picker modal ── */}
      <Modal visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <SafeAreaView style={styles.pickerSafe} edges={['top']}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { fontFamily: MONO_BOLD }]}>Add Exercise</Text>
            <TouchableOpacity onPress={() => { setShowPicker(false); setPickerQuery(''); }}>
              <Text style={[styles.pickerClose, { fontFamily: MONO }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerSearchRow}>
            <TextInput
              style={styles.pickerSearch}
              value={pickerQuery}
              onChangeText={setPickerQuery}
              placeholder="Search exercises…"
              placeholderTextColor="#5A6663"
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus
            />
          </View>
          <FlatList
            data={pickerExercises}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerItem} onPress={() => handlePickExercise(item.id)}>
                <Text style={styles.pickerItemText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.pickerSep} />}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function WorkoutHeader({ title, date, onBack }: { title: string; date: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12}>
        <Text style={[styles.backArrow, { fontFamily: MONO_BOLD }]}>‹</Text>
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <Text style={[styles.headerDate, { fontFamily: MONO }]}>{formatDisplayDate(date)}</Text>
      </View>
      <View style={styles.backBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  backBtn: { width: 40, alignItems: 'center' },
  backArrow: { color: ACCENT, fontSize: 28, fontWeight: '300', lineHeight: 32 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#E6F1ED', fontSize: 18, fontWeight: '700' },
  headerDate: { color: '#5A6663', fontSize: 12, marginTop: 1 },

  // Progress band
  progressBand: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginBottom: 10, padding: 14,
    backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER,
  },
  ringInner: { flexDirection: 'row', alignItems: 'flex-end' },
  ringDone: { color: ACCENT, fontSize: 16, fontWeight: '800' },
  ringTotal: { color: '#5A6663', fontSize: 10, marginBottom: 2 },
  progressBandRight: { flex: 1 },
  progressBandStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  bandStatLabel: { color: '#5A6663', fontSize: 10, fontWeight: '600', letterSpacing: 0.08, textTransform: 'uppercase' },
  bandStatValue: { color: '#E6F1ED', fontSize: 18, fontWeight: '800', marginTop: 2 },
  bandStatUnit: { color: '#5A6663', fontSize: 11 },
  progressTrack: { height: 4, backgroundColor: BORDER, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 2 },

  completedBanner: {
    marginHorizontal: 16, marginBottom: 8, backgroundColor: '#152218',
    borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: ACCENT + '55',
  },
  completedText: { color: ACCENT, fontSize: 14, fontWeight: '600' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  // Exercise cards
  exCard: {
    backgroundColor: CARD, borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  exCardDone: { borderColor: ACCENT + '88', backgroundColor: ACCENT_DEEP },
  exCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  exMid: { flex: 1, minWidth: 0 },
  exName: { color: '#E6F1ED', fontSize: 15, fontWeight: '600', lineHeight: 20 },
  exNameDone: { color: '#A8EFCC' },
  wwHint: { color: '#3A7A58', fontSize: 10, marginTop: 2 },
  ringExText: { fontSize: 11, fontWeight: '700' },
  inlineInputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineInput: {
    width: 52, height: 36, backgroundColor: BG, borderRadius: 8,
    color: '#E6F1ED', fontSize: 13, textAlign: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  inlineX: { color: '#5A6663', fontSize: 12 },

  // Set table
  setTable: {
    paddingHorizontal: 14, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10,
  },
  setHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8, marginBottom: 4 },
  setHeaderCell: { color: '#5A6663', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.1 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  setRowDone: { opacity: 0.6 },
  setNum: { color: '#7E8A86', fontSize: 13, width: 28, textAlign: 'center' },
  setInput: {
    backgroundColor: BG, borderRadius: 8, height: 40,
    color: '#E6F1ED', fontSize: 15, textAlign: 'center', borderWidth: 1, borderColor: BORDER,
  },
  inputDisabled: { color: '#5A6663' },
  checkBtn: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  checkBtnDone: { backgroundColor: '#152218', borderColor: ACCENT },
  checkBtnText: { color: '#3A4541', fontSize: 14 },
  checkBtnTextDone: { color: ACCENT },
  removeSetBtn: { width: 24, alignItems: 'center' },
  removeSetText: { color: '#5A6663', fontSize: 20, fontWeight: '300', lineHeight: 24 },
  addSetBtn: {
    marginTop: 10, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', alignItems: 'center',
  },
  addSetText: { color: '#5A6663', fontSize: 13, fontWeight: '500' },
  exerciseNote: { color: '#5A6663', fontSize: 12, marginTop: 10, fontStyle: 'italic', lineHeight: 17 },
  removeExRow: {
    paddingVertical: 10, alignItems: 'center', marginBottom: 8,
    borderWidth: 1, borderColor: '#5A1A1A', borderRadius: 8,
  },
  removeExText: { color: '#CC4444', fontSize: 12, fontWeight: '600' },

  addExerciseBtn: {
    marginTop: 4, marginBottom: 8, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', alignItems: 'center',
  },
  addExerciseText: { color: ACCENT, fontSize: 14, fontWeight: '600' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 24,
    backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER,
  },
  finishBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  finishBtnAllDone: {
    backgroundColor: ACCENT,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  finishBtnPartial: { backgroundColor: ACCENT + '22', borderWidth: 1, borderColor: ACCENT + '55' },
  finishBtnDisabled: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  finishBtnText: { color: ACCENT, fontSize: 16, fontWeight: '700' },
  finishBtnTextDark: { color: '#0B1A14' },
  finishBtnTextDim: { color: '#3A4541' },

  reopenBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: BORDER, backgroundColor: CARD,
  },
  reopenBtnText: { color: '#9CB0AA', fontSize: 15, fontWeight: '600' },

  centeredContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  restEmoji: { fontSize: 48, marginBottom: 16 },
  infoTitle: { color: '#E6F1ED', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  infoSub: { color: '#5A6663', fontSize: 14, textAlign: 'center' },

  // Picker
  pickerSafe: { flex: 1, backgroundColor: BG },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  pickerTitle: { color: '#E6F1ED', fontSize: 18, fontWeight: '700' },
  pickerClose: { color: '#5A6663', fontSize: 18, padding: 4 },
  pickerSearchRow: { paddingHorizontal: 16, paddingBottom: 12 },
  pickerSearch: {
    backgroundColor: CARD, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    color: '#E6F1ED', fontSize: 15, borderWidth: 1, borderColor: BORDER,
  },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 14 },
  pickerItemText: { color: '#9CB0AA', fontSize: 15 },
  pickerSep: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },
});
