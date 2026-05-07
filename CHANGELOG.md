# Changelog

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
