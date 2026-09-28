# Repwise

A workout tracker for strength training that runs on the web and on Android/iOS from a single Expo codebase.

**Live demo:** [repwise-jade.vercel.app](https://repwise-jade.vercel.app)

<!-- Add a screenshot or GIF here: drag an image into the GitHub editor and it will insert the link -->
<!-- ![Repwise progress tab](docs/screenshot.png) -->

## What it does

- **Log workouts.** Start a session from a plan or a custom workout, then log sets, reps and weight. The app remembers the last weight you used for each exercise.
- **Weekly schedule.** Assign workouts and rest days to the week and long-press a day to reassign it.
- **Muscle status body map.** An interactive front/back body diagram colors each muscle by its weekly training volume, from *none* through *target* to *over MRV*. It also has a view based on recovery.
- **Volume landmarks.** Per-muscle MEV / MAV / MRV set targets, preset from hypertrophy research values and editable in the profile tab.
- **Progress and bodyweight.** Charts for bodyweight and training history.
- **Exercise library** with favorites.

## Tech stack

| | |
|---|---|
| App | React Native 0.81, Expo SDK 54, Expo Router (file-based routing) |
| Web | react-native-web (the same code runs in the browser) |
| Data | Firebase Auth + Firestore, falling back to AsyncStorage when you're offline or signed out |
| UI | react-native-svg, react-native-body-highlighter, react-native-gifted-charts, gesture-handler |
| Language | TypeScript |

## Design notes

- **One codebase, two targets.** Where web and native behave differently (for example scrolling), the app uses platform-specific files (`ScrollView.web.ts` / `.native.ts`) rather than runtime `if` checks.
- **Firestore-or-local storage.** The `useFirestoreOrLocal` hook gives every feature one storage interface. It syncs to Firestore when a user is signed in and uses local AsyncStorage when nobody is, so the app works without an account.
- **State lives in hooks.** Each feature has its own hook (`useSession`, `useVolumeTargets`, `useMuscleRecovery`, `useWorkingWeights`, …), and `AppContext` puts them together behind a single `useApp()`.
- **Volume math is kept separate from the UI.** `volumeMapping.ts` turns logged sets into per-muscle weekly volume and zones, and both the inline card and the full-screen diagram use it.

## Project structure

```
app/            Expo Router screens: (auth), (tabs)/{index,workout,exercises,progress,profile}
src/components  shared UI (body diagram, progress ring, bottom sheets)
src/hooks       per-feature state + persistence
src/context     AppContext / useApp()
src/utils       volume mapping, session utils, fonts
src/firebase.ts Firebase init
```

## Running locally

```bash
npm install
cp .env.example .env     # fill in your Firebase web config
npm run web              # browser
npm run android          # or scan the QR code with Expo Go
```

The app still runs without Firebase credentials, in local-only mode.

## Roadmap

- Cloud sync conflict handling between devices
- Plate calculator and rest timer
- Tests for the volume/recovery math

See [CHANGELOG.md](CHANGELOG.md) for release history (currently v0.3.0).
