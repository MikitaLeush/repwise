import { useAsyncStorage } from './useAsyncStorage';
import { seedWorkoutPlans } from '../data/workoutPlans';
import type { WorkoutPlan } from '../types';

export function useWorkoutPlans() {
  const [plans] = useAsyncStorage<WorkoutPlan[]>('repwise_workout_plans', seedWorkoutPlans);
  return { plans };
}
