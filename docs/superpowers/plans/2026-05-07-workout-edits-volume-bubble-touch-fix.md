# Workout Template Editing, Weekly Sets Bubble & Body Diagram Touch Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add edit-in-place support for custom workout templates (assign sheet + profile), make the Weekly Sets body map show a floating Ring bubble on tap, and fix SVG touch events not firing on mobile.

**Architecture:** No new dependencies. `EditWorkoutSheet` is a self-contained modal component shared by `workout.tsx` and `profile.tsx`. The volume tooltip mirrors the existing recovery tooltip pattern already in `progress.tsx`. The body diagram fix is two surgical changes: remove `overflow: 'hidden'` (clips Android SVG touch areas) and add `collapsable={false}` (prevents Android view flattening from dropping SVG `onPress`), plus an `onStartShouldSetResponder` guard in `progress.tsx` to prevent the parent `ScrollView` from consuming the gesture.

**Tech Stack:** React Native 0.81.5, Expo SDK 54, TypeScript strict (zero `any`), AsyncStorage via existing hooks, `react-native-body-highlighter` + `react-native-svg` 15.12.1

---

## File Map

| File | Change |
|---|---|
| `src/components/EditWorkoutSheet.tsx` | CREATE — shared full-screen modal for editing a custom workout name + exercises |
| `src/components/BodyDiagram.tsx` | MODIFY — remove `overflow: 'hidden'`, add `collapsable={false}` |
| `app/(tabs)/progress.tsx` | MODIFY — add `onStartShouldSetResponder` wrapper + volume tooltip state + bubble render |
| `app/(tabs)/workout.tsx` | MODIFY — add `✏` pencil button on custom rows, wire `EditWorkoutSheet` |
| `app/(tabs)/profile.tsx` | MODIFY — add "My Workouts" manage section, wire `EditWorkoutSheet` |

---

### Task 1: Fix Body Diagram Touch Events (BodyDiagram.tsx)

**Files:**
- Modify: `src/components/BodyDiagram.tsx`

- [ ] **Step 1: Remove `overflow: 'hidden'` and add `collapsable={false}`**

Open `src/components/BodyDiagram.tsx`. Change the two `<View style={styles.bodyWrapper}>` elements to:

```tsx
<View style={styles.bodyWrapper} collapsable={false}>
```

(Both the front and back body wrappers get this prop.)

Then update the `bodyWrapper` style:

```ts
bodyWrapper: {
  alignItems: 'center',
  // overflow: 'hidden' removed — it clips touch areas for SVG paths on Android
},
```

Full file after changes:

```tsx
import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Body from 'react-native-body-highlighter';
import type { ExtendedBodyPart } from 'react-native-body-highlighter';

interface BodyDiagramProps {
  data: ExtendedBodyPart[];
  onMusclePress: (slug: string) => void;
}

const BODY_BASE_WIDTH = 155;
const TOTAL_INSETS = 112;

export function BodyDiagram({ data, onMusclePress }: BodyDiagramProps) {
  const { width } = useWindowDimensions();
  const halfWidth = (width - TOTAL_INSETS) / 2;
  const scale = Math.min(halfWidth / BODY_BASE_WIDTH, 2.2);

  return (
    <View style={styles.wrapper}>
      <View style={styles.bodyWrapper} collapsable={false}>
        <Body
          data={data}
          side="front"
          gender="male"
          scale={scale}
          border="#2C2C2C"
          defaultFill="#2A2A2A"
          onBodyPartPress={(part) => part.slug && onMusclePress(part.slug)}
        />
      </View>
      <View style={styles.bodyWrapper} collapsable={false}>
        <Body
          data={data}
          side="back"
          gender="male"
          scale={scale}
          border="#2C2C2C"
          defaultFill="#2A2A2A"
          onBodyPartPress={(part) => part.slug && onMusclePress(part.slug)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bodyWrapper: {
    alignItems: 'center',
  },
});
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

---

### Task 2: Fix ScrollView Stealing Body Diagram Touches (progress.tsx)

**Files:**
- Modify: `app/(tabs)/progress.tsx`

- [ ] **Step 1: Wrap BodyDiagram in gesture-intercepting View**

In `progress.tsx`, find the `<View style={{ position: 'relative' }}>` that wraps `<BodyDiagram>`. Add a `View` with `onStartShouldSetResponder` directly around `<BodyDiagram>`:

```tsx
<View style={{ position: 'relative' }}>
  <View onStartShouldSetResponder={() => true}>
    <BodyDiagram
      data={bodyMode === 'recovery' ? recovery.getBodyData() : volumeBodyData}
      onMusclePress={bodyMode === 'recovery' ? handleRecoveryPress : handleVolumePress}
    />
  </View>
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
  {/* volume bubble added in Task 3 */}
</View>
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

---

### Task 3: Weekly Sets Floating Bubble (progress.tsx)

**Files:**
- Modify: `app/(tabs)/progress.tsx`

- [ ] **Step 1: Add volumeTooltip state and ref**

In `progress.tsx`, after the existing `tooltipTimerRef` ref declaration, add:

```ts
const [volumeTooltip, setVolumeTooltip] = useState<{
  muscle: string; sets: number; target: number; color: string; zone: VolumeZone;
} | null>(null);
const volumeTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

(`VolumeZone` is already imported from `../../src/utils/volumeMapping`.)

- [ ] **Step 2: Replace handleVolumePress to populate tooltip**

Replace the existing `handleVolumePress` function:

```ts
function handleVolumePress(slug: string) {
  const muscle = slugToDisplayMuscle(slug);
  setSelectedVolumeMuscle(muscle);
  const sets = weeklySets[muscle] ?? 0;
  const target = volumeTargets.targets.find((t) => t.muscle === muscle)?.targetSets ?? 0;
  const color = getVolumeColor(sets, target);
  const zone = getVolumeZone(sets, target);
  setVolumeTooltip({ muscle, sets, target, color, zone });
  if (volumeTooltipTimerRef.current) clearTimeout(volumeTooltipTimerRef.current);
  volumeTooltipTimerRef.current = setTimeout(() => setVolumeTooltip(null), 2500);
}
```

- [ ] **Step 3: Render volume bubble in the relative-position wrapper**

Inside `<View style={{ position: 'relative' }}>`, after the recovery bubble block, add the volume bubble:

```tsx
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
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

---

### Task 4: Create EditWorkoutSheet Component

**Files:**
- Create: `src/components/EditWorkoutSheet.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

---

### Task 5: Wire Edit Button into Assign Sheet (workout.tsx)

**Files:**
- Modify: `app/(tabs)/workout.tsx`

- [ ] **Step 1: Add imports**

At the top of `workout.tsx`, add:

```tsx
import { EditWorkoutSheet } from '../../src/components/EditWorkoutSheet';
import type { CustomWorkout, PlannedExercise } from '../../src/types';
```

Update the existing type import to include `PlannedExercise` (it currently imports `DayOfWeek, WorkoutSession, WeightUnit`):

```tsx
import type { DayOfWeek, WorkoutSession, WeightUnit, CustomWorkout, PlannedExercise } from '../../src/types';
```

- [ ] **Step 2: Add editingWorkout state**

After `const [showCreateModal, setShowCreateModal] = useState(false);`, add:

```ts
const [editingWorkout, setEditingWorkout] = useState<CustomWorkout | null>(null);
```

- [ ] **Step 3: Add handleSaveWorkout**

After `handleCreateWorkout`, add:

```ts
function handleSaveWorkout(id: string, name: string, exercises: PlannedExercise[]) {
  customWorkouts.updateWorkout(id, { name, exercises });
  setEditingWorkout(null);
}
```

- [ ] **Step 4: Update the custom workout rows in the assign modal**

Find this block inside the assign modal (inside `customWorkouts.workouts.map((w) => { ... })`):

```tsx
<TouchableOpacity
  key={w.id}
  style={[styles.option, selected && styles.optionSelected]}
  onPress={() => handleAssign(w.id)}
>
  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{w.name}</Text>
  {selected && <Text style={[styles.checkmark, { fontFamily: MONO_BOLD }]}>✓</Text>}
</TouchableOpacity>
```

Replace with:

```tsx
<View key={w.id} style={[styles.option, selected && styles.optionSelected]}>
  <TouchableOpacity style={{ flex: 1 }} onPress={() => handleAssign(w.id)}>
    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{w.name}</Text>
  </TouchableOpacity>
  {selected && <Text style={[styles.checkmark, { fontFamily: MONO_BOLD }]}>✓</Text>}
  <TouchableOpacity
    hitSlop={10}
    onPress={() => {
      setEditDay(null);
      setEditDayISO(null);
      setEditingWorkout(w);
    }}
  >
    <Text style={[styles.editIcon, { fontFamily: MONO }]}>✏</Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 5: Add editIcon style**

In the `StyleSheet.create({...})` at the bottom, add:

```ts
editIcon: { color: '#5A6663', fontSize: 16, paddingLeft: 10 },
```

- [ ] **Step 6: Render EditWorkoutSheet**

After the closing `</Modal>` of the create-custom-workout modal (the last `</Modal>` before `</SafeAreaView>`), add:

```tsx
<EditWorkoutSheet
  visible={editingWorkout !== null}
  workout={editingWorkout}
  onClose={() => setEditingWorkout(null)}
  onSave={handleSaveWorkout}
/>
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

---

### Task 6: Manage Workouts in Profile Tab (profile.tsx)

**Files:**
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Add imports and extend useApp destructure**

At the top of `profile.tsx`, add:

```tsx
import { EditWorkoutSheet } from '../../src/components/EditWorkoutSheet';
import type { CustomWorkout, PlannedExercise } from '../../src/types';
```

Change the `useApp()` line from:

```ts
const { unit, devSettings, volumeTargets } = useApp();
```

to:

```ts
const { unit, devSettings, volumeTargets, customWorkouts } = useApp();
```

- [ ] **Step 2: Add editingWorkout state**

After `const [landmark, setLandmark] = useState<LandmarkMode>('MAV');`, add:

```ts
const [editingWorkout, setEditingWorkout] = useState<CustomWorkout | null>(null);
```

- [ ] **Step 3: Add handleSaveWorkout**

After `handleWipeData`, add:

```ts
function handleSaveWorkout(id: string, name: string, exercises: PlannedExercise[]) {
  customWorkouts.updateWorkout(id, { name, exercises });
  setEditingWorkout(null);
}
```

- [ ] **Step 4: Add "My Workouts" section in JSX**

After the closing `</View>` of the Units card (the card containing the kg/lb toggle), insert:

```tsx
{customWorkouts.workouts.length > 0 && (
  <>
    <SectionHeader title="My Workouts" sub="Edit custom workout templates" />
    <View style={styles.card}>
      {customWorkouts.workouts.map((w, i) => (
        <View
          key={w.id}
          style={[
            styles.manageRow,
            i < customWorkouts.workouts.length - 1 && styles.manageRowBorder,
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.manageName}>{w.name}</Text>
            <Text style={[styles.manageMeta, { fontFamily: MONO }]}>
              {w.exercises.length} exercise{w.exercises.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.manageEditBtn}
            onPress={() => setEditingWorkout(w)}
          >
            <Text style={[styles.manageEditText, { fontFamily: MONO_BOLD }]}>Edit →</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  </>
)}
```

- [ ] **Step 5: Add styles**

In `StyleSheet.create({...})`, add:

```ts
manageRow: {
  flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
},
manageRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
manageName: { color: '#E6F1ED', fontSize: 15, fontWeight: '600' },
manageMeta: { color: '#5A6663', fontSize: 12, marginTop: 2 },
manageEditBtn: {
  backgroundColor: BG, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
  borderWidth: 1, borderColor: BORDER,
},
manageEditText: { color: ACCENT, fontSize: 13, fontWeight: '600' },
```

- [ ] **Step 6: Render EditWorkoutSheet**

Before the closing `</SafeAreaView>` at the bottom of the component return, add:

```tsx
<EditWorkoutSheet
  visible={editingWorkout !== null}
  workout={editingWorkout}
  onClose={() => setEditingWorkout(null)}
  onSave={handleSaveWorkout}
/>
```

- [ ] **Step 7: Final type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

---

## Self-Review

### Spec Coverage
- ✅ Edit custom workout — pencil in assign sheet (Task 5) + "My Workouts" in profile (Task 6)
- ✅ Template edits save across days — `updateWorkout` mutates `CustomWorkout.exercises` in AsyncStorage
- ✅ In-session tweaks stay isolated — sessions use `LoggedExercise[]` built at session creation; template change doesn't touch them
- ✅ No delete button — not added anywhere
- ✅ Weekly sets floating bubble with Ring + auto-dismiss (Task 3)
- ✅ Body diagram `overflow: 'hidden'` removed (Task 1)
- ✅ `collapsable={false}` added (Task 1)
- ✅ `onStartShouldSetResponder` ScrollView guard (Task 2)

### Placeholder Scan
No TBDs, TODOs, or "implement later" language — all steps contain complete code.

### Type Consistency
- `PlannedExercise` imported from `../../src/types` in every file that constructs one
- `CustomWorkout` shape (`id`, `name`, `exercises`) used consistently across Tasks 4–6
- `onSave(id: string, name: string, exercises: PlannedExercise[])` matches `handleSaveWorkout` in both `workout.tsx` and `profile.tsx`
- `updateWorkout(id, { name, exercises })` matches the existing `useCustomWorkouts` hook signature exactly
- `VolumeZone` type in `volumeTooltip` state matches the import already present in `progress.tsx`
- `resolveExerciseName` (Task 4) is a local private function — not exported, not referenced elsewhere
