# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Repwise v0.1.0** — Expo (React Native) fitness tracking app. Targets iOS, Android, and Expo Web from one codebase.

Disk path: `d:\Work\claude\repwise\`
A sibling Vite/Capacitor prototype lives at `d:\Work\claude\fitnessApp\` — separate project, kept for reference only.

---

## Stack

| Layer | Library | Version |
|---|---|---|
| Framework | Expo SDK | ~54.0.33 |
| UI | React Native | 0.81.5 |
| Language | TypeScript | ~5.9.2 (strict, zero `any`) |
| Navigation | Expo Router (file-based) | ~6.0.23 |
| Storage | AsyncStorage | 2.2.0 |
| Charts | react-native-gifted-charts | ^1.4.76 |
| Charts gradient | expo-linear-gradient | ~15.0.8 |
| Body SVG | react-native-body-highlighter + react-native-svg | ^3.2.0 / 15.12.1 |
| Image/GIF | expo-image | ~3.0.11 |
| Safe area | react-native-safe-area-context | ~5.6.0 |

## Dev Commands

```bash
npm start            # Metro bundler → press a/i/w for Android/iOS/Web
npm run web          # Web on localhost:8081
npm run android      # Android emulator/device
npm run ios          # iOS simulator (macOS only)
npx tsc --noEmit     # Type-check — zero errors expected
```

**Expo Go** (fastest testing): `npm start` → scan QR with Expo Go app. No build step.

---

## File Structure

```
repwise/
├── app/
│   ├── _layout.tsx              Root Stack + SafeAreaProvider + AppProvider
│   ├── (tabs)/
│   │   ├── _layout.tsx          Tab bar (bg #111111, active #C8FF00)
│   │   ├── workout.tsx          Workout tab — waterfall schedule
│   │   ├── exercises.tsx        Exercise library tab
│   │   ├── progress.tsx         Progress/charts tab
│   │   └── profile.tsx          Profile + settings tab
│   ├── exercise/[id].tsx        Exercise detail (images + instructions)
│   └── workout/[date].tsx       Daily workout session screen
├── src/
│   ├── components/
│   │   ├── BodyDiagram.tsx      SVG muscle diagram wrapper
│   │   ├── ExerciseCard.tsx     Exercise list card (image + tags)
│   │   ├── PageHeader.tsx       Shared Repwise logo + page title header
│   │   └── RecoveryInfo.tsx     Recovery status display
│   ├── context/
│   │   └── AppContext.tsx       Single useApp() provider composing all hooks
│   ├── data/
│   │   ├── exercisedb.ts        261 exercises (25 animated GIFs + 236 static)
│   │   ├── exercises.ts         37 PPL plan exercises (ex_p1_01 … ex_l2_07)
│   │   ├── muscleMapping.ts     exercisedb body-part → body-highlighter slug
│   │   ├── recovery.ts          Recovery duration, color, status constants
│   │   ├── workoutPlans.ts      Default Push/Pull/Legs plan templates
│   │   └── defaultSchedule.ts  Mon=Push1 … seed schedule
│   ├── hooks/
│   │   ├── useAsyncStorage.ts   Base [value, setValue, loading] hook
│   │   ├── useBodyweightLog.ts  repwise_bodyweight_logs
│   │   ├── useCustomWorkouts.ts repwise_custom_workouts
│   │   ├── useDevSettings.ts    repwise_dev_settings (time multiplier)
│   │   ├── useExerciseDB.ts     In-memory search/filter over exercisedb.ts
│   │   ├── useExerciseFavorites.ts repwise_exercise_favorites
│   │   ├── useMuscleRecovery.ts @muscle_recovery_trained_at
│   │   ├── useSession.ts        repwise_sessions
│   │   ├── useUnitPreference.ts repwise_unit_preference
│   │   ├── useWeeklySchedule.ts repwise_weekly_schedule
│   │   └── useWorkoutPlans.ts   repwise_workout_plans
│   ├── screens/
│   │   ├── ExerciseLibraryScreen.tsx
│   │   └── RecoveryScreen.tsx
│   ├── types/
│   │   └── index.ts             Single source of truth for all interfaces
│   └── utils/
│       ├── dateUtils.ts         ISO date helpers
│       └── sessionUtils.ts      buildBlankSession, countSets, etc.
└── scripts/
    ├── dedup-exercisedb.mjs     Re-fetches wger.de data (run to refresh exercises)
    └── fetch-exercisedb.mjs     Fetches raw exercisedb OSS data
```

---

## What Is Built — v0.1.0

### Tab 1: Workout
- **Waterfall schedule** — today at top, next 6 days below; past days dimmed
- **Live clock** — current date + time in the header
- **Tap day** → opens daily workout session screen
- **Long-press day** → bottom sheet to reassign workout type (PPL or custom)
- **Custom workouts** — "Create New Workout" in the assign sheet; custom names appear alongside PPL options

### Tab 2: Exercises
- **261 unique exercises** with at least one image each
  - 25 animated GIFs from exercisedb.dev CDN
  - 236 static anatomical diagrams from wger.de
- Search by name/muscle, body-part filter chips
- **Favorites** — long-press card → "Add to Favorites" (shown first with ★ indicator)
- **Hide** — long-press card → "Hide Exercise" (excluded from default view)
- "Show Hidden" toggle chip to see hidden exercises
- Tapping card → Exercise Detail screen

### Exercise Detail (`app/exercise/[id].tsx`)
- **Two images side by side** (Start + Contracted) when both are available
- Muscle + equipment tags
- Numbered instructions
- **"Add to Today's Workout"** — navigates to today's session where the exercise can be added

### Tab 3: Progress
- **Recovery body map** — all muscles green at rest, red after training, gradient recovery over 48 h
- **Weekly Volume bar chart** — 8 weeks, current week leftmost in lime (#C8FF00), older bars in olive/dark gradient
- **Bodyweight log + line chart** — groups multiple same-day entries into daily averages; x-axis date labels; collapsible log list
- **Personal Records** — searchable by exercise name, sortable by weight or name

### Daily Workout (`app/workout/[date].tsx`)
- Exercises shown as **tap-to-complete cards**: progress circle (done/total), name, weight×reps summary
- **Single tap** → marks next uncompleted set as done
- **Long press** → detail sheet with all sets, weight/reps inputs, add/remove set buttons
- Long-press exercise header in detail sheet → remove exercise
- **"+ Add Exercise"** → searchable picker combining PPL exercises + exerciseDB
- **Custom workout support** — days assigned to custom workouts load their exercises correctly
- Muscle auto-marking on "Finish Workout"

### Tab 4: Profile
- kg / lb unit toggle
- RPE guide + volume landmarks reference table
- Dev time-speed toggle (1× / 10× / 100× / 1000×) for testing recovery
- Data wipe (AsyncStorage.clear with confirmation)

### Branding
- Every tab shows the Repwise logo (lime `R` block) + page name via `PageHeader` component

---

## Architecture

### Global State — `useApp()`

`src/context/AppContext.tsx` composes every domain hook. **All screens use `useApp()` — never import individual hooks directly.**

```ts
const {
  session,            // useSession
  schedule,           // useWeeklySchedule
  unit,               // useUnitPreference
  bodyweight,         // useBodyweightLog
  customWorkouts,     // useCustomWorkouts
  plans,              // useWorkoutPlans (PPL plans)
  recovery,           // useMuscleRecovery
  devSettings,        // useDevSettings
  exerciseFavorites,  // useExerciseFavorites
} = useApp();
```

### Storage Pattern

`useAsyncStorage<T>(key, defaultValue)` returns `[value, setValue, loading]`.

All keys: `repwise_*` (exception: `@muscle_recovery_trained_at` for the recovery hook).

### useSession — key methods

```ts
saveSession(session)
completeSession(id)
updateSet(sessionId, exerciseId, setNumber, updates)
addSet(sessionId, exerciseId, unit)
removeSet(sessionId, exerciseId, setNumber)      // renumbers remaining sets
addExerciseToSession(sessionId, exerciseId, setsCount, unit)
removeExerciseFromSession(sessionId, exerciseId)
getLastWeight(exerciseId)  // → { weight, unit } | null
```

### Exercise Data

Two separate exercise datasets:

| File | Count | IDs | Images |
|---|---|---|---|
| `src/data/exercisedb.ts` | 261 | `03lzqwk`, `wger_123`, … | GIF or static PNG |
| `src/data/exercises.ts` | 37 | `ex_p1_01` … `ex_l2_07` | None (text-only PPL) |

`exercisedb.ts` is generated by `scripts/dedup-exercisedb.mjs` — re-run to refresh:
```bash
node scripts/dedup-exercisedb.mjs
```
No API key required. Sources: oss.exercisedb.dev (25 GIFs) + wger.de (236 images).

`ExerciseDBEntry` shape:
```ts
{ id, name, bodyParts[], targetMuscles[], secondaryMuscles[], equipments[], instructions[], gifUrl, gifUrl2? }
```

`exercises.ts` shape (`ExerciseDefinition`):
```ts
{ id, name, muscleGroups: MuscleGroup[], equipment, notes?, isCustom }
```

### Recovery Muscle Slugs (gotchas)

- `ALL_MUSCLE_SLUGS` = exactly 16 muscular slugs in `useMuscleRecovery.ts`
- Decorative SVG parts (`hair`, `head`, `hands`, `feet`, `ankles`, `knees`, `neck`) are excluded — they use `defaultFill`
- Hyphens in slugs: `lower-back`, `upper-back` — store exactly as-is
- `abductors` does NOT exist in the library; outer hip = `adductors`

---

## Theme

Dark only.

| Token | Value |
|---|---|
| Background | `#0F0F0F` |
| Card | `#1A1A1A` |
| Accent (lime) | `#C8FF00` |
| Border | `#2C2C2C` |
| Muted text | `#555555`–`#888888` |
| Inactive | `#444444` |
| Body SVG fill | `#2A2A2A` |

---

## Constraints

- **No new dependencies** without `npx expo install` (native) or `npm install` (pure JS)
- **No `any` type** — TypeScript strict mode enforced
- **All IDs** via `crypto.randomUUID()`
- **All dates** as ISO strings (`"2026-05-04"`), never `Date` objects in storage
- **Every screen** wrapped in `<SafeAreaView edges={['top']}>` from `react-native-safe-area-context`
- **No secrets in code** — no API keys, no `.env` files committed. See `.gitignore`.

---

## Security Notes

- No backend, no auth tokens, no user accounts — everything is local AsyncStorage
- The exercise data scripts (`scripts/`) call free public APIs (no key needed):
  - `https://oss.exercisedb.dev/api/v1/exercises` — exercisedb OSS, no auth
  - `https://wger.de/api/v2/exerciseinfo/` — wger.de open fitness API, no auth
- The app itself makes zero network requests at runtime (all data is bundled or cached GIF CDN URLs)

---

## What To Build Next (Post-0.1)

- [ ] Custom workout exercise picker in the create-workout flow (currently creates empty custom workout)
- [ ] Exercise detail "Add to Workout" picker — let user choose which day/session (currently goes to today only)
- [ ] Streak / weekly goal tracking
- [ ] Push notifications for scheduled workouts
- [ ] Export sessions to CSV / share
- [ ] Proper app icon + splash screen (replace Expo defaults)
- [ ] EAS Build pipeline for App Store / Play Store submissions
