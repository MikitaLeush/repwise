import type { ExerciseDefinition } from '../types';

export const exercises: ExerciseDefinition[] = [
  // Push Day 1
  { id: 'ex_p1_01', name: 'Incline DB Press (30°)', muscleGroups: ['chest', 'shoulders', 'triceps'], equipment: 'dumbbell', notes: 'Retract scapulae, 2-sec eccentric, full stretch at bottom', isCustom: false },
  { id: 'ex_p1_02', name: 'Flat Barbell Bench Press', muscleGroups: ['chest', 'triceps'], equipment: 'barbell', notes: 'Controlled descent, full ROM to chest, moderate-wide grip', isCustom: false },
  { id: 'ex_p1_03', name: 'Low-to-High Cable Fly', muscleGroups: ['chest'], equipment: 'cable', notes: 'Squeeze at top, 2-sec stretch at bottom', isCustom: false },
  { id: 'ex_p1_04', name: 'Seated DB Overhead Press', muscleGroups: ['shoulders', 'triceps'], equipment: 'dumbbell', notes: "Slight arc path, don't lock out aggressively", isCustom: false },
  { id: 'ex_p1_05', name: 'Cable Lateral Raise (behind body)', muscleGroups: ['shoulders'], equipment: 'cable', notes: 'Cable crosses behind body. Pinky higher than thumb, control eccentric', isCustom: false },
  { id: 'ex_p1_06', name: 'Cable Overhead Triceps Extension', muscleGroups: ['triceps'], equipment: 'cable', notes: 'Deep stretch behind head, full extension', isCustom: false },

  // Pull Day 1
  { id: 'ex_pu1_01', name: 'Pull-ups (pronated, weighted)', muscleGroups: ['back', 'biceps'], equipment: 'bodyweight', notes: 'Full dead-hang at bottom, 3-sec negative', isCustom: false },
  { id: 'ex_pu1_02', name: 'Chest-Supported Row', muscleGroups: ['back'], equipment: 'machine', notes: 'Full scapular protraction at bottom, squeeze at top', isCustom: false },
  { id: 'ex_pu1_03', name: 'Seated Cable Row (neutral grip)', muscleGroups: ['back'], equipment: 'cable', notes: 'No excessive lean, pause at peak contraction', isCustom: false },
  { id: 'ex_pu1_04', name: 'Face Pull with External Rotation', muscleGroups: ['shoulders', 'back'], equipment: 'cable', notes: 'Pull to ears, rotate outward at end', isCustom: false },
  { id: 'ex_pu1_05', name: 'Incline DB Curl (45°)', muscleGroups: ['biceps'], equipment: 'dumbbell', notes: 'Arms hang behind torso, full stretch, 3-sec eccentric', isCustom: false },
  { id: 'ex_pu1_06', name: 'Hammer Curl', muscleGroups: ['biceps'], equipment: 'dumbbell', notes: 'Neutral grip, targets brachialis beneath the biceps', isCustom: false },

  // Legs Day 1
  { id: 'ex_l1_01', name: 'Barbell Back Squat (high bar)', muscleGroups: ['quads', 'glutes'], equipment: 'barbell', notes: 'ATG or parallel minimum, heels elevated if needed, brace hard', isCustom: false },
  { id: 'ex_l1_02', name: 'Leg Press (feet low & narrow)', muscleGroups: ['quads'], equipment: 'machine', notes: 'Full depth, push through balls of feet', isCustom: false },
  { id: 'ex_l1_03', name: 'Leg Extension', muscleGroups: ['quads'], equipment: 'machine', notes: '3-sec eccentric, pause at top, lengthened partials on last set', isCustom: false },
  { id: 'ex_l1_04', name: 'Seated Leg Curl', muscleGroups: ['hamstrings'], equipment: 'machine', notes: 'Lean forward slightly, full stretch at top, 3-sec negative', isCustom: false },
  { id: 'ex_l1_05', name: 'Standing Calf Raise (off block)', muscleGroups: ['calves'], equipment: 'machine', notes: '2-sec pause at full dorsiflexion, no bouncing, full contraction', isCustom: false },
  { id: 'ex_l1_06', name: 'Cable Crunch', muscleGroups: ['core'], equipment: 'cable', notes: 'Flex spine not hips, control eccentric', isCustom: false },

  // Push Day 2
  { id: 'ex_p2_01', name: 'Flat DB Bench Press', muscleGroups: ['chest', 'triceps'], equipment: 'dumbbell', notes: 'Greater ROM than barbell, deep stretch at bottom', isCustom: false },
  { id: 'ex_p2_02', name: 'Weighted Dips (forward lean)', muscleGroups: ['chest', 'triceps'], equipment: 'bodyweight', notes: '15–30° lean, elbows to ~90°, deep stretch', isCustom: false },
  { id: 'ex_p2_03', name: 'Incline Cable Fly (30°)', muscleGroups: ['chest'], equipment: 'cable', notes: '2-sec pause at full stretch, slow eccentric', isCustom: false },
  { id: 'ex_p2_04', name: 'Machine Lateral Raise', muscleGroups: ['shoulders'], equipment: 'machine', notes: 'Smooth arc, slight pause at top', isCustom: false },
  { id: 'ex_p2_05', name: 'Cable Lateral Raise (lengthened partials)', muscleGroups: ['shoulders'], equipment: 'cable', notes: 'Lengthened partials on final set', isCustom: false },
  { id: 'ex_p2_06', name: 'Skull Crusher (EZ-bar)', muscleGroups: ['triceps'], equipment: 'barbell', notes: 'Lower to forehead, full stretch, elbows slightly back', isCustom: false },

  // Pull Day 2
  { id: 'ex_pu2_01', name: 'Bent-Over Barbell Row (overhand)', muscleGroups: ['back', 'biceps'], equipment: 'barbell', notes: '45° torso, row to lower chest, squeeze shoulder blades down and back', isCustom: false },
  { id: 'ex_pu2_02', name: 'Lat Pulldown (pronated, medium)', muscleGroups: ['back'], equipment: 'cable', notes: '10–15° lean back, full stretch at top, pull to upper chest', isCustom: false },
  { id: 'ex_pu2_03', name: 'Single-Arm DB Row', muscleGroups: ['back'], equipment: 'dumbbell', notes: 'Full protraction at bottom, row to hip', isCustom: false },
  { id: 'ex_pu2_04', name: 'Machine Reverse Fly', muscleGroups: ['shoulders', 'back'], equipment: 'machine', notes: 'Squeeze rear delts, control eccentric', isCustom: false },
  { id: 'ex_pu2_05', name: 'Preacher Curl (EZ-bar)', muscleGroups: ['biceps'], equipment: 'barbell', notes: 'Focus on bottom 2/3 of ROM, controlled negative', isCustom: false },
  { id: 'ex_pu2_06', name: 'Reverse Curl', muscleGroups: ['biceps'], equipment: 'barbell', notes: 'Pronated grip, targets brachialis and forearms', isCustom: false },

  // Legs Day 2
  { id: 'ex_l2_01', name: 'Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes'], equipment: 'barbell', notes: '3–4 sec eccentric, maximal hamstring stretch at bottom', isCustom: false },
  { id: 'ex_l2_02', name: 'Hack Squat (moderate stance)', muscleGroups: ['quads', 'glutes'], equipment: 'machine', notes: 'Full depth, constant quad tension', isCustom: false },
  { id: 'ex_l2_03', name: 'Bulgarian Split Squat', muscleGroups: ['quads', 'glutes', 'hamstrings'], equipment: 'dumbbell', notes: 'Elevate front foot on plate, upright torso, deep stretch', isCustom: false },
  { id: 'ex_l2_04', name: 'Hip Thrust', muscleGroups: ['glutes', 'hamstrings'], equipment: 'barbell', notes: 'Posterior pelvic tilt at top, 2-sec squeeze at lockout', isCustom: false },
  { id: 'ex_l2_05', name: 'Seated Leg Curl (hamstring emphasis)', muscleGroups: ['hamstrings'], equipment: 'machine', notes: 'Lean forward, full stretch, lengthened partials on last set', isCustom: false },
  { id: 'ex_l2_06', name: 'Seated Calf Raise', muscleGroups: ['calves'], equipment: 'machine', notes: '2-sec pause at full dorsiflexion, no bouncing. Targets soleus', isCustom: false },
  { id: 'ex_l2_07', name: 'Hanging Leg Raise (with PPT)', muscleGroups: ['core'], equipment: 'bodyweight', notes: "Curl pelvis toward ribcage — don't just swing legs", isCustom: false },
];

const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

export function getExercise(id: string): ExerciseDefinition | undefined {
  return exerciseMap.get(id);
}

export function getExerciseName(id: string): string {
  return exerciseMap.get(id)?.name ?? id;
}
