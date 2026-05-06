// Maps exercisedb body part names to react-native-body-highlighter slugs
export const BODY_PART_TO_SLUG: Record<string, string> = {
  'back':       'upper-back',
  'lower back': 'lower-back',
  'upper arms': 'biceps',
  'lower arms': 'forearm',
  'shoulders':  'deltoids',
  'upper legs': 'quadriceps',
  'lower legs': 'calves',
  'chest':      'chest',
  'waist':      'abs',
  'glutes':     'gluteal',
  'neck':       'trapezius',
  'cardio':     'abs',
};

// Body part display labels for filter chips
export const BODY_PARTS = [
  'back',
  'cardio',
  'chest',
  'lower arms',
  'lower back',
  'lower legs',
  'neck',
  'shoulders',
  'upper arms',
  'upper legs',
  'waist',
] as const;

export type BodyPart = (typeof BODY_PARTS)[number];
