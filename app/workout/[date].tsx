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
import type { WorkoutSession, LoggedSet, WorkoutBlueprint, MuscleGroup } from '../../src/types';

const MUSCLE_TO_SLUG: Partial<Record<MuscleGroup, string>> = {
  chest: 'chest', back: 'upper-back', shoulders: 'deltoids', triceps: 'triceps',
  biceps: 'biceps', quads: 'quadriceps', hamstrings: 'hamstrings',
  glutes: 'gluteal', calves: 'calves', core: 'abs',
};

type InputState = { weight: string; reps: string };
function inputKey(exerciseId: string, setNumber: number) { return `${exerciseId}:${setNumber}`; }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

export default function DailyWorkoutScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date: string }>();
  const date = Array.isArray(dateParam) ? dateParam[0] : (dateParam ?? '');
  const { session: sessionHook, unit, recovery, plans, schedule, customWorkouts } = useApp();

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
  // Which exercise is open in the detail modal
  const [detailExId, setDetailExId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!plan || initializedRef.current) return;
    initializedRef.current = true;
    const existing = sessionHook.sessions.find((s) => s.date === date && s.workoutType === plan.id);
    const session = existing ?? buildBlankSession(date, plan, unit.unit, sessionHook.getLastWeight);
    if (!existing) sessionHook.saveSession(session);
    setActiveSession(session);

    const initInputs: Record<string, InputState> = {};
    for (const ex of session.exercises) {
      for (const s of ex.sets) {
        initInputs[inputKey(ex.exerciseId, s.setNumber)] = {
          weight: s.actualWeight !== null ? String(s.actualWeight) : '',
          reps: s.actualReps !== null ? String(s.actualReps) : '',
        };
      }
    }
    setInputs(initInputs);
  }, [plan?.id]);

  // Exercise picker list
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

  // Returns the best summary weight×reps for the exercise (from last set with data)
  function getExSummary(exerciseId: string): string {
    const ex = activeSession?.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) return '';
    // Find the input with weight+reps or last logged set
    for (let i = ex.sets.length - 1; i >= 0; i--) {
      const key = inputKey(exerciseId, ex.sets[i].setNumber);
      const inp = inputs[key];
      if (inp?.weight && inp?.reps) return `${inp.weight} ${unit.unit} × ${inp.reps}`;
      const s = ex.sets[i];
      if (s.actualWeight !== null && s.actualReps !== null) return `${s.actualWeight} ${unit.unit} × ${s.actualReps}`;
    }
    const planned = plan?.exercises.find((pe) => pe.exerciseId === exerciseId);
    if (planned?.sets[0]) return planned.sets[0].targetReps + ' reps';
    return '';
  }

  // ── TAP: complete the next uncompleted set ─────────────────────────────────
  function handleExTap(exerciseId: string) {
    if (!activeSession || !!activeSession.completedAt) return;
    const ex = activeSession.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) return;
    const nextSet = ex.sets.find((s) => !s.completed);
    if (!nextSet) return; // all done already
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
    sessionHook.updateSet(activeSession.id, exerciseId, setNumber, { actualWeight, actualReps });
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
          if (detailExId === exerciseId) setDetailExId(null);
        },
      },
    ]);
  }

  function handlePickExercise(exerciseId: string) {
    if (!activeSession) return;
    const DEFAULT_SETS = 3;
    sessionHook.addExerciseToSession(activeSession.id, exerciseId, DEFAULT_SETS, unit.unit);
    const newExercise = {
      exerciseId, order: activeSession.exercises.length + 1,
      sets: Array.from({ length: DEFAULT_SETS }, (_, i) => ({
        setNumber: i + 1, actualReps: null, actualWeight: null,
        unit: unit.unit, completed: false, skipped: false,
      })),
    };
    setActiveSession((prev) => prev ? { ...prev, exercises: [...prev.exercises, newExercise] } : prev);
    const newInputs: Record<string, InputState> = {};
    for (let i = 1; i <= DEFAULT_SETS; i++) newInputs[inputKey(exerciseId, i)] = { weight: '', reps: '' };
    setInputs((prev) => ({ ...prev, ...newInputs }));
    setShowPicker(false); setPickerQuery('');
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

  // The exercise whose detail modal is open
  const detailEx = activeSession?.exercises.find((e) => e.exerciseId === detailExId) ?? null;

  if (isRest) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="Rest Day" date={date} onBack={() => router.back()} />
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
        <Header title="Workout" date={date} onBack={() => router.back()} />
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
        <Header title={plan.label} date={date} onBack={() => router.back()} />

        {activeSession && (
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{doneSets}/{totalSets} sets</Text>
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>✓ Workout Complete</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {(activeSession?.exercises ?? []).map((ex) => {
            const name = getExerciseName(ex.exerciseId);
            const doneSetsEx = ex.sets.filter((s) => s.completed).length;
            const totalSetsEx = ex.sets.length;
            const allExDone = doneSetsEx === totalSetsEx && totalSetsEx > 0;
            const summary = getExSummary(ex.exerciseId);

            return (
              <Pressable
                key={ex.exerciseId}
                style={[styles.exCard, allExDone && styles.exCardDone]}
                onPress={() => handleExTap(ex.exerciseId)}
                onLongPress={() => setDetailExId(ex.exerciseId)}
                delayLongPress={350}
              >
                <View style={styles.exLeft}>
                  {/* Progress ring: circle with done/total */}
                  <View style={styles.progressCircle}>
                    <Text style={styles.progressCircleText}>{doneSetsEx}</Text>
                    <Text style={styles.progressCircleDen}>/{totalSetsEx}</Text>
                  </View>
                </View>

                <View style={styles.exMid}>
                  <Text style={[styles.exName, allExDone && styles.exNameDone]} numberOfLines={2}>{name}</Text>
                  {summary ? <Text style={styles.exSummary}>{summary}</Text> : null}
                </View>

                <View style={styles.exRight}>
                  {allExDone
                    ? <Text style={styles.exDoneCheck}>✓</Text>
                    : <Text style={styles.tapHint}>Tap</Text>
                  }
                </View>
              </Pressable>
            );
          })}

          {!isCompleted && activeSession && (
            <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setShowPicker(true)}>
              <Text style={styles.addExerciseText}>+ Add Exercise</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {!isCompleted && activeSession && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.finishBtn, !allDone && styles.finishBtnPartial]}
              onPress={handleFinish}
            >
              <Text style={styles.finishBtnText}>
                {allDone ? 'Finish Workout' : `Finish Early  (${doneSets}/${totalSets})`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Detail modal (long press): all sets with inputs ── */}
      <Modal visible={detailExId !== null} animationType="slide" transparent onRequestClose={() => setDetailExId(null)}>
        <Pressable style={styles.detailBackdrop} onPress={() => setDetailExId(null)}>
          <Pressable style={styles.detailSheet} onPress={() => {}}>
            <View style={styles.detailHandle} />
            {detailEx && (() => {
              const name = getExerciseName(detailEx.exerciseId);
              const def = getExercise(detailEx.exerciseId);
              return (
                <>
                  <View style={styles.detailTitleRow}>
                    <Text style={styles.detailTitle} numberOfLines={2}>{name}</Text>
                    <TouchableOpacity onPress={() => handleRemoveExercise(detailEx.exerciseId, name)} hitSlop={8}>
                      <Text style={styles.detailRemove}>Remove</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Set header */}
                  <View style={styles.setHeaderRow}>
                    <Text style={[styles.setHeaderCell, { width: 28 }]}>Set</Text>
                    <Text style={[styles.setHeaderCell, { flex: 1 }]}>{unit.unit}</Text>
                    <Text style={[styles.setHeaderCell, { flex: 1 }]}>Reps</Text>
                    <View style={{ width: 36 }} />
                    {!isCompleted && <View style={{ width: 24 }} />}
                  </View>

                  <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                    {detailEx.sets.map((s) => {
                      const key = inputKey(detailEx.exerciseId, s.setNumber);
                      const inp = inputs[key] ?? { weight: '', reps: '' };
                      return (
                        <View key={s.setNumber} style={[styles.setRow, s.completed && styles.setRowDone]}>
                          <Text style={[styles.setNumText, { width: 28 }]}>{s.setNumber}</Text>

                          <TextInput
                            style={[styles.setInput, { flex: 1 }, isCompleted && styles.inputDisabled]}
                            value={inp.weight}
                            onChangeText={(v) => handleWeightChange(detailEx.exerciseId, s.setNumber, v)}
                            onBlur={() => flushInput(detailEx.exerciseId, s.setNumber)}
                            keyboardType="decimal-pad" placeholder="—" placeholderTextColor="#444444"
                            editable={!isCompleted}
                          />

                          <TextInput
                            style={[styles.setInput, { flex: 1 }, isCompleted && styles.inputDisabled]}
                            value={inp.reps}
                            onChangeText={(v) => handleRepsChange(detailEx.exerciseId, s.setNumber, v)}
                            onBlur={() => flushInput(detailEx.exerciseId, s.setNumber)}
                            keyboardType="number-pad" placeholder="—" placeholderTextColor="#444444"
                            editable={!isCompleted}
                          />

                          <TouchableOpacity
                            style={[styles.checkBtn, { width: 36, marginLeft: 8 }, s.completed && styles.checkBtnDone]}
                            onPress={() => toggleSetComplete(detailEx.exerciseId, s.setNumber, s.completed)}
                            disabled={isCompleted}
                          >
                            <Text style={[styles.checkBtnText, s.completed && { color: '#C8FF00' }]}>
                              {s.completed ? '✓' : '○'}
                            </Text>
                          </TouchableOpacity>

                          {!isCompleted && (
                            <TouchableOpacity
                              style={{ width: 24, alignItems: 'center' }}
                              onPress={() => handleRemoveSet(detailEx.exerciseId, s.setNumber)}
                              hitSlop={8}
                            >
                              <Text style={{ color: '#555555', fontSize: 18, fontWeight: '300' }}>−</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>

                  {!isCompleted && (
                    <TouchableOpacity style={styles.addSetBtn} onPress={() => handleAddSet(detailEx.exerciseId)}>
                      <Text style={styles.addSetText}>+ Add Set</Text>
                    </TouchableOpacity>
                  )}

                  {def?.notes ? <Text style={styles.exerciseNote}>{def.notes}</Text> : null}
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Exercise picker modal ── */}
      <Modal visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <SafeAreaView style={styles.pickerSafe} edges={['top']}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Add Exercise</Text>
            <TouchableOpacity onPress={() => { setShowPicker(false); setPickerQuery(''); }}>
              <Text style={styles.pickerClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerSearchRow}>
            <TextInput
              style={styles.pickerSearch} value={pickerQuery} onChangeText={setPickerQuery}
              placeholder="Search exercises…" placeholderTextColor="#555555"
              autoCorrect={false} autoCapitalize="none" autoFocus
            />
          </View>
          <FlatList
            data={pickerExercises} keyExtractor={(item) => item.id}
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

function Header({ title, date, onBack }: { title: string; date: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.headerDate}>{formatDisplayDate(date)}</Text>
      </View>
      <View style={styles.backBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  backBtn: { width: 40, alignItems: 'center' },
  backArrow: { color: '#C8FF00', fontSize: 24, fontWeight: '300' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  headerDate: { color: '#666666', fontSize: 12, marginTop: 1 },

  progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  progressTrack: { flex: 1, height: 4, backgroundColor: '#2A2A2A', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#C8FF00', borderRadius: 2 },
  progressLabel: { color: '#666666', fontSize: 12, minWidth: 52, textAlign: 'right' },

  completedBanner: {
    marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1A2E00',
    borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#3A5A00',
  },
  completedText: { color: '#C8FF00', fontSize: 14, fontWeight: '600' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  // Exercise cards — tap-to-complete style
  exCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A',
    borderRadius: 14, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: '#2C2C2C', gap: 12,
  },
  exCardDone: { borderColor: '#3A5A00', backgroundColor: '#111F00' },
  exLeft: {},
  progressCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#252525',
    borderWidth: 2, borderColor: '#3A3A3A', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row',
  },
  progressCircleText: { color: '#C8FF00', fontSize: 15, fontWeight: '700' },
  progressCircleDen: { color: '#555555', fontSize: 11, marginTop: 3 },
  exMid: { flex: 1 },
  exName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', lineHeight: 20 },
  exNameDone: { color: '#6A9900' },
  exSummary: { color: '#888888', fontSize: 12, marginTop: 3 },
  exRight: { alignItems: 'center', minWidth: 32 },
  exDoneCheck: { color: '#C8FF00', fontSize: 22, fontWeight: '700' },
  tapHint: { color: '#3A3A3A', fontSize: 11, fontWeight: '500' },

  addExerciseBtn: {
    marginTop: 4, marginBottom: 8, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#2A2A2A', borderStyle: 'dashed', alignItems: 'center',
  },
  addExerciseText: { color: '#C8FF00', fontSize: 14, fontWeight: '600' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 24, backgroundColor: '#0F0F0F',
    borderTopWidth: 1, borderTopColor: '#1E1E1E',
  },
  finishBtn: { backgroundColor: '#C8FF00', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  finishBtnPartial: { backgroundColor: '#3A3A3A' },
  finishBtnText: { color: '#0F0F0F', fontSize: 16, fontWeight: '700' },

  centeredContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  restEmoji: { fontSize: 48, marginBottom: 16 },
  infoTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  infoSub: { color: '#555555', fontSize: 14, textAlign: 'center' },

  // Detail modal
  detailBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  detailSheet: {
    backgroundColor: '#1A1A1A', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12,
  },
  detailHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#444444', alignSelf: 'center', marginBottom: 16 },
  detailTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  detailTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', flex: 1, marginRight: 12 },
  detailRemove: { color: '#FF5722', fontSize: 13, paddingTop: 2 },

  setHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  setHeaderCell: { color: '#555555', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  setRowDone: { opacity: 0.6 },
  setNumText: { color: '#888888', fontSize: 14, textAlign: 'center' },
  setInput: {
    backgroundColor: '#242424', borderRadius: 8, height: 40,
    color: '#FFFFFF', fontSize: 15, textAlign: 'center', borderWidth: 1, borderColor: '#333333',
  },
  inputDisabled: { color: '#666666' },
  checkBtn: {
    height: 36, borderRadius: 18, backgroundColor: '#252525',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#3A3A3A',
  },
  checkBtnDone: { backgroundColor: '#1A3000', borderColor: '#C8FF00' },
  checkBtnText: { color: '#555555', fontSize: 16 },

  addSetBtn: {
    marginTop: 12, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#2A2A2A', borderStyle: 'dashed', alignItems: 'center',
  },
  addSetText: { color: '#555555', fontSize: 13, fontWeight: '500' },
  exerciseNote: { color: '#555555', fontSize: 12, marginTop: 12, fontStyle: 'italic', lineHeight: 17 },

  // Exercise picker
  pickerSafe: { flex: 1, backgroundColor: '#0F0F0F' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  pickerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  pickerClose: { color: '#555555', fontSize: 18, padding: 4 },
  pickerSearchRow: { paddingHorizontal: 16, paddingBottom: 12 },
  pickerSearch: {
    backgroundColor: '#1A1A1A', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#2A2A2A',
  },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 14 },
  pickerItemText: { color: '#CCCCCC', fontSize: 15 },
  pickerSep: { height: 1, backgroundColor: '#1E1E1E', marginHorizontal: 16 },
});
