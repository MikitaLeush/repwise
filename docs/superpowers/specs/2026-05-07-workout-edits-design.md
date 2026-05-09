# Design: Workout Template Editing, Weekly Sets Bubble, Body Diagram Touch Fix

**Date:** 2026-05-07  
**Status:** Approved

---

## 1. Edit Custom Workout Template

### Goal
Users can edit custom workout templates (exercises + name) from two entry points. Edits persist across all days assigned to that workout. In-session tweaks remain isolated to that session.

### Entry Points
- **Assign sheet** (`app/(tabs)/workout.tsx`): pencil icon `✏` on right side of each custom workout row. Tapping row text still assigns; tapping pencil opens edit.
- **Profile tab** (`app/(tabs)/profile.tsx`): new "Manage Workouts" section. Lists all custom workouts with exercise count. "Edit →" button opens same edit sheet.

### Edit Workout Sheet (shared modal state)
State: `editingWorkout: CustomWorkout | null`

UI:
- TextInput — workout name (pre-filled)
- FlatList of current template exercises — each row: exercise name + `−` remove button
- `+ Add Exercise` button → same exercise picker (FlatList + search, pulls from pplExercises + exerciseDB)
- `Save` → `customWorkouts.updateWorkout(id, { name, exercises })` → close
- `Cancel` → discard, close

### Data Flow
- `CustomWorkout.exercises: PlannedExercise[]` — template
- `WorkoutSession.exercises: LoggedExercise[]` — session (built from template at session creation)
- Editing template does NOT mutate existing sessions — already isolated by design
- `updateWorkout` already exists in `useCustomWorkouts` hook

### Files Changed
- `app/(tabs)/workout.tsx` — edit pencil on custom row, new edit modal states
- `app/(tabs)/profile.tsx` — "Manage Workouts" section + edit modal
- Both share the same edit sheet pattern (duplicate local modal, same logic)

---

## 2. Weekly Sets Floating Bubble

### Goal
Tapping a muscle in Volume mode shows a floating bubble (identical pattern to recovery tooltip) with a Ring circle + info. Consistent UX across both body modes.

### Behavior
- Tap muscle in Volume mode → floating bubble appears over diagram (centered top)
- Ring: `sets / target` ratio (0–100%). No target → 0% fill
- Bubble content: Ring + muscle name + zone status text
- Auto-dismiss: 2.5s (same `tooltipTimerRef` pattern already used for recovery)
- Below-diagram detail panel still updates on tap (sets/target bar + numbers)

### Implementation
Add `volumeTooltip` state alongside existing `muscleTooltip`:
```ts
const [volumeTooltip, setVolumeTooltip] = useState<{
  slug: string; sets: number; target: number; color: string; zone: VolumeZone;
} | null>(null);
const volumeTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

`handleVolumePress` populates both `selectedVolumeMuscle` (existing) and `volumeTooltip` (new).

Render the bubble (same `bubbleAnchor` / `muscleBubble` styles) when `volumeTooltip !== null && bodyMode === 'volume'`.

Ring pct = `target > 0 ? Math.min(Math.round((sets / target) * 100), 100) : 0`

### Files Changed
- `app/(tabs)/progress.tsx`

---

## 3. Body Diagram Mobile Touch Fix

### Root Causes
1. `overflow: 'hidden'` on `bodyWrapper` clips Android touch areas at visual boundary — SVG path `onPress` events near edges silently dropped
2. Android view flattening optimization can collapse intermediate Views, dropping SVG's react-native-svg touch bindings
3. Parent `ScrollView` may consume gesture before SVG `onPress` fires

### Fixes (all three applied)
**`src/components/BodyDiagram.tsx`:**
- Remove `overflow: 'hidden'` from `bodyWrapper` style
- Add `collapsable={false}` to each `bodyWrapper` View

**`app/(tabs)/progress.tsx`:**
- Wrap `<BodyDiagram>` in a `View` with `onStartShouldSetResponder={() => true}` — signals to ScrollView's gesture system that this region handles its own touches, preventing scroll from eating the tap

### Files Changed
- `src/components/BodyDiagram.tsx`
- `app/(tabs)/progress.tsx`

---

## Constraints
- No new dependencies
- TypeScript strict — no `any`
- All IDs via `generateId()`
- Theme: dark only, accent `#5BD1A0` (workout screen) / `#C8FF00` is profile accent (check existing profile styles)
