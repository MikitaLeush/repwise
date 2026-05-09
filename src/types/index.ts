export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'triceps'
  | 'biceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'smith';

export type WorkoutType =
  | 'Push1'
  | 'Push2'
  | 'Pull1'
  | 'Pull2'
  | 'Legs1'
  | 'Legs2'
  | 'Rest';

export const PPL_WORKOUT_TYPES = new Set<string>([
  'Push1', 'Push2', 'Pull1', 'Pull2', 'Legs1', 'Legs2', 'Rest',
]);

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type WeightUnit = 'kg' | 'lb';

// ─── Exercise Library ───────────────────────────────────────────────────────

export interface ExerciseDefinition {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  equipment: Equipment;
  notes?: string;
  imageUrl?: string;
  isCustom: boolean;
}

// ─── ExerciseDB ─────────────────────────────────────────────────────────────

export interface ExerciseDBEntry {
  id: string;
  name: string;
  bodyParts: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  equipments: string[];
  instructions: string[];
  gifUrl: string;
  gifUrl2?: string;
}

// ─── Workout Plans ─────────────────────────────────────────────────────────

export interface PlannedSet {
  setNumber: number;
  targetReps: string;
  targetRpe?: number;
}

export interface PlannedExercise {
  exerciseId: string;
  order: number;
  sets: PlannedSet[];
  notes?: string;
}

export interface WorkoutPlan {
  id: WorkoutType;
  label: string;
  exercises: PlannedExercise[];
}

// Common shape accepted by session creation (WorkoutPlan and CustomWorkout both satisfy this)
export interface WorkoutBlueprint {
  id: string;
  label: string;
  exercises: PlannedExercise[];
}

// ─── Custom Workouts ────────────────────────────────────────────────────────

export interface CustomWorkout {
  id: string;
  name: string;
  exercises: PlannedExercise[];
}

// ─── Weekly Schedule ───────────────────────────────────────────────────────

// string value is either a WorkoutType ('Push1' etc.) or a custom workout UUID
export type WeeklySchedule = Record<DayOfWeek, string>;

// ─── Body Weight Tracking ──────────────────────────────────────────────────

export interface BodyweightLog {
  id: string;
  date: string;
  weightKg: number;
}

// ─── Session Logging ───────────────────────────────────────────────────────

export interface LoggedSet {
  setNumber: number;
  actualReps: number | null;
  actualWeight: number | null;
  unit: WeightUnit;
  completed: boolean;
  rpe?: number;
  skipped: boolean;
}

export interface LoggedExercise {
  exerciseId: string;
  order: number;
  sets: LoggedSet[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  workoutType: string;
  exercises: LoggedExercise[];
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

// ─── Volume Targets ─────────────────────────────────────────────────────────
export interface MuscleVolumeTarget {
  muscle: string;
  targetSets: number;
}

// ─── Working Weights ─────────────────────────────────────────────────────────
export interface WorkingWeightEntry {
  weight: number;
  unit: WeightUnit;
}
export type WorkingWeightMap = Record<string, WorkingWeightEntry>;
