import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useExerciseDB } from '../../src/hooks/useExerciseDB';
import { useApp } from '../../src/context/AppContext';
import { isoToDayOfWeek, todayISO } from '../../src/utils/dateUtils';
import Svg, { Path } from 'react-native-svg';

function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 5l-7 7 7 7" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function capitalize(s: string): string {
  return s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById } = useExerciseDB();
  const { session: sessionHook, schedule, unit } = useApp();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const exercise = getById(id ?? '');

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Exercise not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const imgWidth = (width - 32 - 8) / 2; // two images side by side with gap
  const hasSecondImage = !!exercise.gifUrl2;

  function handleAddToWorkout() {
    // Navigate to today's workout — the exercise picker there can add it
    const today = todayISO();
    router.push(`/workout/${today}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Images row */}
        <View style={styles.imagesRow}>
          {/* Back button overlay */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <BackIcon />
          </TouchableOpacity>

          {hasSecondImage ? (
            // Two images side by side
            <>
              <View style={[styles.imgBox, { width: imgWidth }]}>
                <Image
                  source={{ uri: exercise.gifUrl }}
                  style={{ width: imgWidth, height: imgWidth }}
                  contentFit="contain"
                  recyclingKey={`${exercise.id}_1`}
                />
                <Text style={styles.imgLabel}>Start</Text>
              </View>
              <View style={[styles.imgBox, { width: imgWidth }]}>
                <Image
                  source={{ uri: exercise.gifUrl2 }}
                  style={{ width: imgWidth, height: imgWidth }}
                  contentFit="contain"
                  recyclingKey={`${exercise.id}_2`}
                />
                <Text style={styles.imgLabel}>Contracted</Text>
              </View>
            </>
          ) : (
            // Single image centered
            <View style={[styles.imgBoxSingle, { height: Math.min(width, 380) }]}>
              <Image
                source={{ uri: exercise.gifUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                recyclingKey={exercise.id}
              />
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.name}>{capitalize(exercise.name)}</Text>

          {/* Primary muscles */}
          <View style={styles.tagsRow}>
            {exercise.targetMuscles.map((m) => (
              <View key={m} style={styles.muscleTag}>
                <Text style={styles.muscleTagText}>{capitalize(m)}</Text>
              </View>
            ))}
            {exercise.secondaryMuscles.map((m) => (
              <View key={m} style={[styles.muscleTag, styles.secondaryTag]}>
                <Text style={[styles.muscleTagText, styles.secondaryTagText]}>{capitalize(m)}</Text>
              </View>
            ))}
          </View>

          {/* Equipment + body parts */}
          <View style={styles.tagsRow}>
            {exercise.equipments.map((eq) => (
              <View key={eq} style={styles.equipTag}>
                <Text style={styles.equipTagText}>{capitalize(eq)}</Text>
              </View>
            ))}
            {exercise.bodyParts.map((bp) => (
              <View key={bp} style={styles.bodyPartTag}>
                <Text style={styles.bodyPartTagText}>{capitalize(bp)}</Text>
              </View>
            ))}
          </View>

          {/* Instructions */}
          {exercise.instructions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              {exercise.instructions.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Add to Workout button */}
          <TouchableOpacity style={styles.addButton} activeOpacity={0.85} onPress={handleAddToWorkout}>
            <Text style={styles.addButtonText}>Add to Today's Workout</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFoundText: { color: '#666666', fontSize: 16 },
  backBtn: { backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#C8FF00', fontWeight: '600' },

  imagesRow: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    position: 'relative',
    flexWrap: 'wrap',
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    backgroundColor: '#00000088',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  imgBox: {
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    paddingBottom: 4,
  },
  imgLabel: { color: '#555555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  imgBoxSingle: { flex: 1, position: 'relative' },

  content: { padding: 16, gap: 12 },

  name: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', letterSpacing: -0.3, lineHeight: 28 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  muscleTag: {
    backgroundColor: '#C8FF0018', borderWidth: 1, borderColor: '#C8FF0040',
    borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3,
  },
  muscleTagText: { color: '#C8FF00', fontSize: 12, fontWeight: '600' },
  secondaryTag: { backgroundColor: '#FFFFFF0C', borderColor: '#FFFFFF20' },
  secondaryTagText: { color: '#AAAAAA' },
  equipTag: { backgroundColor: '#2A2A2A', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3 },
  equipTagText: { color: '#888888', fontSize: 12, fontWeight: '500' },
  bodyPartTag: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333333', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3 },
  bodyPartTagText: { color: '#666666', fontSize: 12 },

  section: { gap: 10, marginTop: 4 },
  sectionTitle: { color: '#666666', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNumber: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#C8FF0020',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNumberText: { color: '#C8FF00', fontSize: 11, fontWeight: '700' },
  stepText: { color: '#CCCCCC', fontSize: 14, lineHeight: 21, flex: 1 },

  addButton: {
    backgroundColor: '#C8FF00', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  addButtonText: { color: '#0F0F0F', fontSize: 15, fontWeight: '700' },
});
