import React, { createContext, useContext } from 'react';
import { useSession } from '../hooks/useSession';
import { useWeeklySchedule } from '../hooks/useWeeklySchedule';
import { useUnitPreference } from '../hooks/useUnitPreference';
import { useBodyweightLog } from '../hooks/useBodyweightLog';
import { useCustomWorkouts } from '../hooks/useCustomWorkouts';
import { useWorkoutPlans } from '../hooks/useWorkoutPlans';
import { useMuscleRecovery } from '../hooks/useMuscleRecovery';
import { useDevSettings } from '../hooks/useDevSettings';
import { useExerciseFavorites } from '../hooks/useExerciseFavorites';
import { useVolumeTargets } from '../hooks/useVolumeTargets';
import { useWorkingWeights } from '../hooks/useWorkingWeights';
import { useAuth } from './AuthContext';

type AppContextValue = {
  session: ReturnType<typeof useSession>;
  schedule: ReturnType<typeof useWeeklySchedule>;
  unit: ReturnType<typeof useUnitPreference>;
  bodyweight: ReturnType<typeof useBodyweightLog>;
  customWorkouts: ReturnType<typeof useCustomWorkouts>;
  plans: ReturnType<typeof useWorkoutPlans>;
  recovery: ReturnType<typeof useMuscleRecovery>;
  devSettings: ReturnType<typeof useDevSettings>;
  exerciseFavorites: ReturnType<typeof useExerciseFavorites>;
  volumeTargets: ReturnType<typeof useVolumeTargets>;
  workingWeights: ReturnType<typeof useWorkingWeights>;
  auth: ReturnType<typeof useAuth>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const devSettings = useDevSettings();
  const value: AppContextValue = {
    session: useSession(),
    schedule: useWeeklySchedule(),
    unit: useUnitPreference(),
    bodyweight: useBodyweightLog(),
    customWorkouts: useCustomWorkouts(),
    plans: useWorkoutPlans(),
    recovery: useMuscleRecovery(devSettings.timeMultiplier),
    devSettings,
    exerciseFavorites: useExerciseFavorites(),
    volumeTargets: useVolumeTargets(),
    workingWeights: useWorkingWeights(),
    auth: useAuth(),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
