import { useState, useEffect } from 'react';
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
import type { DayOfWeek } from '../../src/types';

// Compute next N ISO dates starting from today
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

const DAY_FULL: Record<DayOfWeek, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

const WORKOUT_OPTIONS = ['Push1', 'Push2', 'Pull1', 'Pull2', 'Legs1', 'Legs2', 'Rest'];
const OPTION_LABELS: Record<string, string> = {
  Push1: 'Push Day 1', Push2: 'Push Day 2', Pull1: 'Pull Day 1',
  Pull2: 'Pull Day 2', Legs1: 'Legs Day 1', Legs2: 'Legs Day 2', Rest: 'Rest Day',
};

export default function WorkoutTab() {
  const router = useRouter();
  const { schedule, plans, customWorkouts } = useApp();

  const [now, setNow] = useState(new Date());
  const [editDay, setEditDay] = useState<DayOfWeek | null>(null);
  const [editDayISO, setEditDayISO] = useState<string | null>(null);
  const [pendingDay, setPendingDay] = useState<DayOfWeek | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState('');

  // Update clock every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const days = getNextDays(7);

  const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateString = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  function getWorkoutLabel(workoutId: string): string {
    if (workoutId === 'Rest') return 'Rest Day';
    const plan = plans.plans.find((p) => p.id === workoutId);
    if (plan) return plan.label;
    const custom = customWorkouts.workouts.find((w) => w.id === workoutId);
    if (custom) return custom.name;
    return OPTION_LABELS[workoutId] ?? workoutId;
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header with date/time ── */}
      <View style={styles.header}>
        <View>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>R</Text>
            </View>
            <Text style={styles.brandName}>Repwise</Text>
          </View>
          <Text style={styles.dateText}>{dateString}</Text>
        </View>
        <Text style={styles.timeText}>{timeString}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {days.map((iso) => {
          const dow = isoDayOfWeek(iso);
          const workoutId = schedule.schedule[dow];
          const today = isToday(iso);
          const past = isPast(iso);
          const isRest = workoutId === 'Rest';

          return (
            <Pressable
              key={iso}
              style={[styles.dayCard, today && styles.dayCardToday, past && styles.dayCardPast]}
              onPress={() => router.push(`/workout/${iso}`)}
              onLongPress={() => openAssignModal(iso)}
              delayLongPress={400}
            >
              <View style={styles.dayLeft}>
                <View style={styles.dayNameRow}>
                  {today && <View style={styles.todayDot} />}
                  <Text style={[styles.dayName, today && styles.dayNameToday, past && styles.dayNamePast]}>
                    {today ? 'Today' : DAY_FULL[dow]}
                  </Text>
                </View>
                <Text style={[styles.dayDate, past && styles.dayDatePast]}>{formatShortDate(iso)}</Text>
              </View>

              <View style={styles.dayRight}>
                <Text
                  style={[styles.workoutLabel, isRest && styles.restLabel, past && styles.workoutLabelPast]}
                  numberOfLines={1}
                >
                  {getWorkoutLabel(workoutId)}
                </Text>
                <Text style={styles.holdHint}>Hold to change</Text>
              </View>
            </Pressable>
          );
        })}
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
            <Text style={styles.sheetTitle}>
              {editDay
                ? `${DAY_FULL[editDay]} · ${editDayISO ? formatShortDate(editDayISO) : ''}`
                : ''}
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
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}

              {customWorkouts.workouts.length > 0 && (
                <>
                  <Text style={styles.dividerLabel}>Custom Workouts</Text>
                  {customWorkouts.workouts.map((w) => {
                    const selected = editDay ? schedule.schedule[editDay] === w.id : false;
                    return (
                      <TouchableOpacity
                        key={w.id}
                        style={[styles.option, selected && styles.optionSelected]}
                        onPress={() => handleAssign(w.id)}
                      >
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {w.name}
                        </Text>
                        {selected && <Text style={styles.checkmark}>✓</Text>}
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
        <Pressable
          style={styles.backdrop}
          onPress={() => { setShowCreateModal(false); setPendingDay(null); }}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New Workout</Text>
            <TextInput
              style={styles.createInput}
              value={newWorkoutName}
              onChangeText={setNewWorkoutName}
              placeholder="Workout name…"
              placeholderTextColor="#444444"
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
              <Text style={styles.createConfirmText}>Create & Assign</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  logoBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#C8FF00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#0F0F0F', fontWeight: '900', fontSize: 16 },
  brandName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  dateText: { color: '#555555', fontSize: 13, fontWeight: '400' },
  timeText: { color: '#C8FF00', fontSize: 22, fontWeight: '700', marginTop: 6 },

  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },

  dayCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  dayCardToday: { borderColor: '#C8FF00' },
  dayCardPast: { opacity: 0.55 },

  dayLeft: { flex: 1 },
  dayNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#C8FF00' },
  dayName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  dayNameToday: { color: '#C8FF00' },
  dayNamePast: { color: '#555555' },
  dayDate: { color: '#666666', fontSize: 13, marginTop: 2 },
  dayDatePast: { color: '#444444' },

  dayRight: { alignItems: 'flex-end', maxWidth: '45%' },
  workoutLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '500', textAlign: 'right' },
  workoutLabelPast: { color: '#666666' },
  restLabel: { color: '#555555' },
  holdHint: { color: '#3A3A3A', fontSize: 11, marginTop: 2 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#444444',
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: {
    color: '#888888', fontSize: 13, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 12, paddingHorizontal: 4,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4,
  },
  optionSelected: { backgroundColor: '#252525' },
  optionText: { color: '#CCCCCC', fontSize: 16 },
  optionTextSelected: { color: '#C8FF00', fontWeight: '600' },
  checkmark: { color: '#C8FF00', fontSize: 18, fontWeight: '700' },

  dividerLabel: {
    color: '#555555', fontSize: 11, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.6, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4,
  },
  createNewBtn: {
    paddingVertical: 16, paddingHorizontal: 12, marginTop: 8,
    borderTopWidth: 1, borderTopColor: '#2A2A2A',
  },
  createNewText: { color: '#C8FF00', fontSize: 15, fontWeight: '600' },

  createInput: {
    backgroundColor: '#242424', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#333333', marginBottom: 14,
  },
  createConfirmBtn: {
    backgroundColor: '#C8FF00', borderRadius: 12, paddingVertical: 15, alignItems: 'center',
  },
  createConfirmBtnDisabled: { backgroundColor: '#3A3A3A' },
  createConfirmText: { color: '#0F0F0F', fontSize: 15, fontWeight: '700' },
});
