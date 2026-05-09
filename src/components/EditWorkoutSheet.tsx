import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getExercise, exercises as pplExercises } from '../data/exercises';
import { exerciseDB } from '../data/exercisedb';
import { MONO, MONO_BOLD } from '../utils/fonts';
import type { CustomWorkout, PlannedExercise } from '../types';

const ACCENT = '#5BD1A0';
const BG = '#0B0F0E';
const CARD = '#11181A';
const BORDER = '#1f2825';

function resolveExerciseName(id: string): string {
  const ppl = getExercise(id);
  if (ppl) return ppl.name;
  const db = exerciseDB.find((e) => e.id === id);
  if (db) return db.name.charAt(0).toUpperCase() + db.name.slice(1);
  return id;
}

interface Props {
  visible: boolean;
  workout: CustomWorkout | null;
  onClose: () => void;
  onSave: (id: string, name: string, exercises: PlannedExercise[]) => void;
}

export function EditWorkoutSheet({ visible, workout, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<PlannedExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');

  useEffect(() => {
    if (workout) {
      setName(workout.name);
      setExercises(workout.exercises);
    }
  }, [workout?.id]);

  const pickerExercises = useMemo(() => {
    const q = pickerQuery.toLowerCase().trim();
    const ppl = pplExercises
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .map((e) => ({ id: e.id, name: e.name }));
    const db = exerciseDB
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .map((e) => ({ id: e.id, name: e.name.charAt(0).toUpperCase() + e.name.slice(1) }));
    const seen = new Set(ppl.map((e) => e.id));
    return [...ppl, ...db.filter((e) => !seen.has(e.id))].slice(0, 100);
  }, [pickerQuery]);

  function handleAddExercise(exerciseId: string) {
    if (exercises.some((e) => e.exerciseId === exerciseId)) return;
    const newEx: PlannedExercise = {
      exerciseId,
      order: exercises.length + 1,
      sets: [
        { setNumber: 1, targetReps: '8-12' },
        { setNumber: 2, targetReps: '8-12' },
        { setNumber: 3, targetReps: '8-12' },
      ],
    };
    setExercises((prev) => [...prev, newEx]);
    setShowPicker(false);
    setPickerQuery('');
  }

  function handleRemoveExercise(exerciseId: string) {
    setExercises((prev) =>
      prev
        .filter((e) => e.exerciseId !== exerciseId)
        .map((e, i) => ({ ...e, order: i + 1 }))
    );
  }

  function handleSave() {
    if (!workout || !name.trim()) return;
    onSave(workout.id, name.trim(), exercises);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={[s.cancel, { fontFamily: MONO }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[s.title, { fontFamily: MONO_BOLD }]}>Edit Workout</Text>
          <TouchableOpacity onPress={handleSave} disabled={!name.trim()} hitSlop={12}>
            <Text style={[s.save, { fontFamily: MONO_BOLD }, !name.trim() && s.saveDim]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[s.fieldLabel, { fontFamily: MONO }]}>NAME</Text>
          <TextInput
            style={s.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Workout name…"
            placeholderTextColor="#3A4541"
            autoCapitalize="words"
            returnKeyType="done"
          />

          <Text style={[s.fieldLabel, { fontFamily: MONO }]}>EXERCISES</Text>
          {exercises.length === 0 && (
            <Text style={s.emptyHint}>No exercises — tap below to add</Text>
          )}
          {exercises.map((ex) => (
            <View key={ex.exerciseId} style={s.exRow}>
              <Text style={s.exName} numberOfLines={1}>
                {resolveExerciseName(ex.exerciseId)}
              </Text>
              <Text style={[s.exMeta, { fontFamily: MONO }]}>{ex.sets.length} sets</Text>
              <TouchableOpacity onPress={() => handleRemoveExercise(ex.exerciseId)} hitSlop={10}>
                <Text style={[s.removeBtn, { fontFamily: MONO }]}>−</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={s.addBtn} onPress={() => setShowPicker(true)}>
            <Text style={[s.addBtnText, { fontFamily: MONO }]}>+ Add Exercise</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Nested exercise picker */}
        <Modal visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.pickerHeader}>
              <Text style={[s.title, { fontFamily: MONO_BOLD }]}>Add Exercise</Text>
              <TouchableOpacity onPress={() => { setShowPicker(false); setPickerQuery(''); }}>
                <Text style={[s.cancel, { fontFamily: MONO }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={s.searchRow}>
              <TextInput
                style={s.searchInput}
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
                <TouchableOpacity style={s.pickerItem} onPress={() => handleAddExercise(item.id)}>
                  <Text style={s.pickerItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={s.sep} />}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  cancel: { color: '#5A6663', fontSize: 15 },
  save: { color: ACCENT, fontSize: 15, fontWeight: '700' },
  saveDim: { opacity: 0.4 },
  title: { color: '#E6F1ED', fontSize: 17, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  fieldLabel: {
    color: '#5A6663', fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginTop: 22, marginBottom: 8,
  },
  nameInput: {
    backgroundColor: CARD, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12,
    color: '#E6F1ED', fontSize: 15, borderWidth: 1, borderColor: BORDER,
  },
  emptyHint: { color: '#3A4541', fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
  exRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: CARD, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: BORDER, marginBottom: 6,
  },
  exName: { color: '#9CB0AA', fontSize: 14, flex: 1 },
  exMeta: { color: '#5A6663', fontSize: 12 },
  removeBtn: { color: '#5A6663', fontSize: 22, fontWeight: '300', lineHeight: 24, width: 24, textAlign: 'center' },
  addBtn: {
    marginTop: 10, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', alignItems: 'center',
  },
  addBtnText: { color: ACCENT, fontSize: 14, fontWeight: '600' },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  searchRow: { paddingHorizontal: 16, paddingBottom: 12 },
  searchInput: {
    backgroundColor: CARD, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    color: '#E6F1ED', fontSize: 15, borderWidth: 1, borderColor: BORDER,
  },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 14 },
  pickerItemText: { color: '#9CB0AA', fontSize: 15 },
  sep: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },
});
