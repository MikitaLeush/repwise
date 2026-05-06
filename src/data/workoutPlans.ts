import type { WorkoutPlan } from '../types';

export const seedWorkoutPlans: WorkoutPlan[] = [
  {
    id: 'Push1',
    label: 'Push Day 1',
    exercises: [
      { exerciseId: 'ex_p1_01', order: 1, sets: [{ setNumber: 1, targetReps: '8–10', targetRpe: 7 }, { setNumber: 2, targetReps: '8–10', targetRpe: 8 }, { setNumber: 3, targetReps: '8–10', targetRpe: 8 }], notes: 'Retract scapulae, 2-sec eccentric, full stretch at bottom' },
      { exerciseId: 'ex_p1_02', order: 2, sets: [{ setNumber: 1, targetReps: '6–8', targetRpe: 8 }, { setNumber: 2, targetReps: '6–8', targetRpe: 8 }, { setNumber: 3, targetReps: '6–8', targetRpe: 9 }], notes: 'Controlled descent, full ROM to chest, moderate-wide grip' },
      { exerciseId: 'ex_p1_03', order: 3, sets: [{ setNumber: 1, targetReps: '12–15', targetRpe: 8 }, { setNumber: 2, targetReps: '12–15', targetRpe: 8 }, { setNumber: 3, targetReps: '12–15', targetRpe: 9 }], notes: 'Squeeze at top, 2-sec stretch at bottom' },
      { exerciseId: 'ex_p1_04', order: 4, sets: [{ setNumber: 1, targetReps: '8–10', targetRpe: 7 }, { setNumber: 2, targetReps: '8–10', targetRpe: 8 }, { setNumber: 3, targetReps: '8–10', targetRpe: 8 }], notes: "Slight arc path, don't lock out aggressively" },
      { exerciseId: 'ex_p1_05', order: 5, sets: [{ setNumber: 1, targetReps: '12–15', targetRpe: 8 }, { setNumber: 2, targetReps: '12–15', targetRpe: 9 }, { setNumber: 3, targetReps: '12–15', targetRpe: 9 }], notes: 'Cable behind body. Pinky higher than thumb' },
      { exerciseId: 'ex_p1_06', order: 6, sets: [{ setNumber: 1, targetReps: '10–12', targetRpe: 8 }, { setNumber: 2, targetReps: '10–12', targetRpe: 8 }, { setNumber: 3, targetReps: '10–12', targetRpe: 9 }], notes: 'Deep stretch behind head, full extension' },
    ],
  },
  {
    id: 'Pull1',
    label: 'Pull Day 1',
    exercises: [
      { exerciseId: 'ex_pu1_01', order: 1, sets: [{ setNumber: 1, targetReps: '6–8', targetRpe: 8 }, { setNumber: 2, targetReps: '6–8', targetRpe: 8 }, { setNumber: 3, targetReps: '6–8', targetRpe: 9 }], notes: 'Full dead-hang at bottom, 3-sec negative' },
      { exerciseId: 'ex_pu1_02', order: 2, sets: [{ setNumber: 1, targetReps: '8–10', targetRpe: 7 }, { setNumber: 2, targetReps: '8–10', targetRpe: 8 }, { setNumber: 3, targetReps: '8–10', targetRpe: 8 }], notes: 'Full scapular protraction at bottom, squeeze at top' },
      { exerciseId: 'ex_pu1_03', order: 3, sets: [{ setNumber: 1, targetReps: '10–12', targetRpe: 8 }, { setNumber: 2, targetReps: '10–12', targetRpe: 8 }, { setNumber: 3, targetReps: '10–12', targetRpe: 9 }], notes: 'No excessive lean, pause at peak contraction' },
      { exerciseId: 'ex_pu1_04', order: 4, sets: [{ setNumber: 1, targetReps: '15–20', targetRpe: 7 }, { setNumber: 2, targetReps: '15–20', targetRpe: 8 }, { setNumber: 3, targetReps: '15–20', targetRpe: 8 }], notes: 'Pull to ears, rotate outward at end' },
      { exerciseId: 'ex_pu1_05', order: 5, sets: [{ setNumber: 1, targetReps: '10–12', targetRpe: 8 }, { setNumber: 2, targetReps: '10–12', targetRpe: 9 }, { setNumber: 3, targetReps: '10–12', targetRpe: 9 }], notes: 'Arms hang behind torso, full stretch, 3-sec eccentric' },
      { exerciseId: 'ex_pu1_06', order: 6, sets: [{ setNumber: 1, targetReps: '10–12', targetRpe: 8 }, { setNumber: 2, targetReps: '10–12', targetRpe: 9 }], notes: 'Neutral grip, squeeze brachialis' },
    ],
  },
  {
    id: 'Legs1',
    label: 'Legs Day 1',
    exercises: [
      { exerciseId: 'ex_l1_01', order: 1, sets: [{ setNumber: 1, targetReps: '6–8', targetRpe: 7 }, { setNumber: 2, targetReps: '6–8', targetRpe: 8 }, { setNumber: 3, targetReps: '6–8', targetRpe: 9 }, { setNumber: 4, targetReps: '6–8', targetRpe: 9 }], notes: 'ATG or parallel minimum, heels elevated, brace hard' },
      { exerciseId: 'ex_l1_02', order: 2, sets: [{ setNumber: 1, targetReps: '10–12', targetRpe: 7 }, { setNumber: 2, targetReps: '10–12', targetRpe: 8 }, { setNumber: 3, targetReps: '10–12', targetRpe: 9 }], notes: 'Full depth, feet low and narrow' },
      { exerciseId: 'ex_l1_03', order: 3, sets: [{ setNumber: 1, targetReps: '12–15', targetRpe: 8 }, { setNumber: 2, targetReps: '12–15', targetRpe: 9 }, { setNumber: 3, targetReps: '12–15', targetRpe: 10 }], notes: '3-sec eccentric, pause at top, lengthened partials on last set' },
      { exerciseId: 'ex_l1_04', order: 4, sets: [{ setNumber: 1, targetReps: '10–12', targetRpe: 8 }, { setNumber: 2, targetReps: '10–12', targetRpe: 8 }, { setNumber: 3, targetReps: '10–12', targetRpe: 9 }], notes: 'Lean forward slightly, full stretch at top, 3-sec negative' },
      { exerciseId: 'ex_l1_05', order: 5, sets: [{ setNumber: 1, targetReps: '8–12', targetRpe: 8 }, { setNumber: 2, targetReps: '8–12', targetRpe: 9 }, { setNumber: 3, targetReps: '8–12', targetRpe: 9 }, { setNumber: 4, targetReps: '8–12', targetRpe: 9 }], notes: '2-sec pause at full dorsiflexion, no bouncing' },
      { exerciseId: 'ex_l1_06', order: 6, sets: [{ setNumber: 1, targetReps: '10–15', targetRpe: 8 }, { setNumber: 2, targetReps: '10–15', targetRpe: 8 }, { setNumber: 3, targetReps: '10–15', targetRpe: 9 }], notes: 'Flex spine not hips, control eccentric' },
    ],
  },
  {
    id: 'Push2',
    label: 'Push Day 2',
    exercises: [
      { exerciseId: 'ex_p2_01', order: 1, sets: [{ setNumber: 1, targetReps: '8–10', targetRpe: 7 }, { setNumber: 2, targetReps: '8–10', targetRpe: 8 }, { setNumber: 3, targetReps: '8–10', targetRpe: 8 }], notes: 'Greater ROM than barbell, deep stretch at bottom' },
      { exerciseId: 'ex_p2_02', order: 2, sets: [{ setNumber: 1, targetReps: '8–10', targetRpe: 8 }, { setNumber: 2, targetReps: '8–10', targetRpe: 8 }, { setNumber: 3, targetReps: '8–10', targetRpe: 9 }], notes: '15–30° lean, elbows to ~90°, deep stretch' },
      { exerciseId: 'ex_p2_03', order: 3, sets: [{ setNumber: 1, targetReps: '12–15', targetRpe: 8 }, { setNumber: 2, targetReps: '12–15', targetRpe: 9 }, { setNumber: 3, targetReps: '12–15', targetRpe: 9 }], notes: '2-sec pause at full stretch, slow eccentric' },
      { exerciseId: 'ex_p2_04', order: 4, sets: [{ setNumber: 1, targetReps: '12–15', targetRpe: 8 }, { setNumber: 2, targetReps: '12–15', targetRpe: 9 }, { setNumber: 3, targetReps: '12–15', targetRpe: 9 }], notes: 'Smooth arc, slight pause at top' },
      { exerciseId: 'ex_p2_05', order: 5, sets: [{ setNumber: 1, targetReps: '15–20', targetRpe: 8 }, { setNumber: 2, targetReps: '15–20', targetRpe: 9 }, { setNumber: 3, targetReps: '15–20', targetRpe: 10 }], notes: 'Lengthened partials on final set' },
      { exerciseId: 'ex_p2_06', order: 6, sets: [{ setNumber: 1, targetReps: '10–12', targetRpe: 8 }, { setNumber: 2, targetReps: '10–12', targetRpe: 8 }, { setNumber: 3, targetReps: '10–12', targetRpe: 9 }], notes: 'Lower to forehead, full stretch, elbows slightly back' },
    ],
  },
  {
    id: 'Pull2',
    label: 'Pull Day 2',
    exercises: [
      { exerciseId: 'ex_pu2_01', order: 1, sets: [{ setNumber: 1, targetReps: '6–8', targetRpe: 8 }, { setNumber: 2, targetReps: '6–8', targetRpe: 8 }, { setNumber: 3, targetReps: '6–8', targetRpe: 9 }], notes: '45° torso, row to lower chest, squeeze shoulder blades' },
      { exerciseId: 'ex_pu2_02', order: 2, sets: [{ setNumber: 1, targetReps: '10–12', targetRpe: 7 }, { setNumber: 2, targetReps: '10–12', targetRpe: 8 }, { setNumber: 3, targetReps: '10–12', targetRpe: 8 }], notes: '10–15° lean back, full stretch at top' },
      { exerciseId: 'ex_pu2_03', order: 3, sets: [{ setNumber: 1, targetReps: '8–10', targetRpe: 8 }, { setNumber: 2, targetReps: '8–10', targetRpe: 8 }, { setNumber: 3, targetReps: '8–10', targetRpe: 9 }], notes: 'Full protraction at bottom, row to hip' },
      { exerciseId: 'ex_pu2_04', order: 4, sets: [{ setNumber: 1, targetReps: '12–15', targetRpe: 8 }, { setNumber: 2, targetReps: '12–15', targetRpe: 9 }, { setNumber: 3, targetReps: '12–15', targetRpe: 9 }], notes: 'Squeeze rear delts, control eccentric' },
      { exerciseId: 'ex_pu2_05', order: 5, sets: [{ setNumber: 1, targetReps: '10–12', targetRpe: 8 }, { setNumber: 2, targetReps: '10–12', targetRpe: 9 }, { setNumber: 3, targetReps: '10–12', targetRpe: 9 }], notes: 'Focus on bottom 2/3 of ROM, controlled negative' },
      { exerciseId: 'ex_pu2_06', order: 6, sets: [{ setNumber: 1, targetReps: '12–15', targetRpe: 8 }, { setNumber: 2, targetReps: '12–15', targetRpe: 9 }], notes: 'Pronated grip, targets brachialis and forearms' },
    ],
  },
  {
    id: 'Legs2',
    label: 'Legs Day 2',
    exercises: [
      { exerciseId: 'ex_l2_01', order: 1, sets: [{ setNumber: 1, targetReps: '8–10', targetRpe: 7 }, { setNumber: 2, targetReps: '8–10', targetRpe: 8 }, { setNumber: 3, targetReps: '8–10', targetRpe: 8 }], notes: '3–4 sec eccentric, maximal hamstring stretch at bottom' },
      { exerciseId: 'ex_l2_02', order: 2, sets: [{ setNumber: 1, targetReps: '10–12', targetRpe: 7 }, { setNumber: 2, targetReps: '10–12', targetRpe: 8 }, { setNumber: 3, targetReps: '10–12', targetRpe: 9 }], notes: 'Full depth, constant quad tension' },
      { exerciseId: 'ex_l2_03', order: 3, sets: [{ setNumber: 1, targetReps: '8–10/leg', targetRpe: 8 }, { setNumber: 2, targetReps: '8–10/leg', targetRpe: 8 }, { setNumber: 3, targetReps: '8–10/leg', targetRpe: 9 }], notes: 'Upright torso, deep stretch, front foot elevated' },
      { exerciseId: 'ex_l2_04', order: 4, sets: [{ setNumber: 1, targetReps: '10–12', targetRpe: 7 }, { setNumber: 2, targetReps: '10–12', targetRpe: 8 }, { setNumber: 3, targetReps: '10–12', targetRpe: 9 }], notes: 'Posterior pelvic tilt at top, 2-sec squeeze at lockout' },
      { exerciseId: 'ex_l2_05', order: 5, sets: [{ setNumber: 1, targetReps: '12–15', targetRpe: 8 }, { setNumber: 2, targetReps: '12–15', targetRpe: 9 }, { setNumber: 3, targetReps: '12–15', targetRpe: 10 }], notes: 'Lean forward, full stretch, lengthened partials on last set' },
      { exerciseId: 'ex_l2_06', order: 6, sets: [{ setNumber: 1, targetReps: '12–15', targetRpe: 8 }, { setNumber: 2, targetReps: '12–15', targetRpe: 9 }, { setNumber: 3, targetReps: '12–15', targetRpe: 9 }], notes: '2-sec pause at full dorsiflexion, no bouncing. Targets soleus' },
      { exerciseId: 'ex_l2_07', order: 7, sets: [{ setNumber: 1, targetReps: '10–15', targetRpe: 8 }, { setNumber: 2, targetReps: '10–15', targetRpe: 8 }, { setNumber: 3, targetReps: '10–15', targetRpe: 9 }], notes: "Curl pelvis toward ribcage — don't just swing legs" },
    ],
  },
];
