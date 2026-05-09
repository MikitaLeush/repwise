# Changelog

## [0.3.0] — 2026-05-09

### Progress Tab — Muscle Status overhaul

- **Weekly Sets mode** — body diagram now colours muscles by volume zone (None → Low → Approaching → Target → Peak → Over MRV), backed by per-muscle set targets from `useVolumeTargets`
- **Volume targets** — per-muscle MEV/MAV/MRV presets (hypertrophy research values); fully configurable via the Profile tab under Volume Landmarks
- **Full-screen diagram** — double-tap anywhere on the diagram box to expand; swipe down or press × to close
- **Tab swipe locked** while expanded so accidental horizontal swipes don't navigate away
- **Expanded modal layout** — single side (Front/Back toggle), scrollable muscle list with bar chart, sort controls below diagram
- **Sort by 2×2 grid** — Name / Recovery / Sets / Group; replaces the hidden expandable chip; Group puts upper-body muscles first (chest, deltoids, biceps, triceps, forearm, trapezius, upper-back, lower-back, abs, obliques), lower-body below
- Muscle list text size increased (11 → 13 px) for readability in expanded view

### Workout Session

- **EditWorkoutSheet** — new bottom sheet for editing exercises inline: reorder, remove, change set counts
- **Working weights** — last-used weight per exercise persisted across sessions via `repwise_working_weights`
- Platform-specific `ScrollView` wrappers (`ScrollView.ts` / `.native.ts` / `.web.ts`) fix web scrolling regression introduced in 0.2.0

### Architecture

- `SwipeTabWrapper` — horizontal swipe navigation between the four tabs; accepts `swipeEnabled` prop (ref-backed so PanResponder sees live value) to lock swipe during modal overlays
- `useVolumeTargets` hook — AsyncStorage key `repwise_volume_targets`; default evidence-based targets for 10 muscle groups
- `useWorkingWeights` hook — AsyncStorage key `repwise_working_weights`; weight + unit per exercise
- `volumeMapping.ts` — `computeWeeklySetsPerMuscle`, `buildVolumeBodyData`, `getVolumeZone`, `getVolumeColor`, `slugToDisplayMuscle`; shared between expanded modal and inline card
- `AppContext` wires `volumeTargets` and `workingWeights` into `useApp()`

### Bug fixes

- Gesture conflict on right-leg SVG muscles — replaced `Pressable.onPress` double-tap detection with bubbling `onTouchEnd` on a wrapper View; tap now registers anywhere on the diagram regardless of which SVG element captures it
- Modal swipe-down blocked by SVG — fixed by placing an `absoluteFill` transparent overlay above the Body component with `onStartShouldSetPanResponder: true`; drag handle at top of modal also retained as a second swipe zone

---

## [0.2.0] — 2026-05-06

### Bug Fixes
- **Hermes crash on `crypto.randomUUID()`** — `useBodyweightLog` and `useCustomWorkouts` both called `crypto.randomUUID()` which does not exist in the Hermes JS engine. Replaced with the `generateId()` Math.random UUID polyfill already used by `sessionUtils`. Fixes crashes when logging bodyweight or creating custom workouts on device.

### UX Changes
- **Long-press to reassign workout** — removed the "✎ Edit" button from the workout and rest day cards. Long-pressing either card now opens the assign-workout bottom sheet (same 400 ms delay as the week strip pills). Less visual clutter, same functionality.

### Typography
- **JetBrains Mono loaded at startup** via `@expo-google-fonts/jetbrains-mono` + `expo-font` plugin in `app.json`. Splash screen now waits for fonts before hiding.
- **`src/utils/fonts.ts`** — centralizes `MONO` / `MONO_BOLD` font family constants. All tab screens and shared components import from here instead of inlining the string.

### New Components
- **`src/components/Ring.tsx`** — reusable SVG ring / donut progress indicator. Used in the "This Week" workouts stat tile.

### Theme
- Tab bar: accent color changed from lime `#C8FF00` to green `#5BD1A0`; inactive tint `#3A4541`; background `rgba(11,15,14,0.96)`; border `#1f2825`.
- Theme color tokens extracted as named constants in each screen file for consistency.

### Internals
- `generateId()` in `src/utils/sessionUtils.ts` is now exported so all hooks can share the same UUID polyfill.
- `.gitignore`: added `uploads/` to exclude local prototype assets.

---

## [0.1.0] — 2026-05-05

Initial release. See README / CLAUDE.md for full feature list.
