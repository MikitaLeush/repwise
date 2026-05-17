import { useFirestoreOrLocal } from './useFirestoreOrLocal';
import { seedWorkoutPlans } from '../data/workoutPlans';
import type { WorkoutPlan } from '../types';

export function useWorkoutPlans() {
  const [plans] = useFirestoreOrLocal<WorkoutPlan[]>('repwise_workout_plans', 'workoutPlans', seedWorkoutPlans);
  return { plans };
}
