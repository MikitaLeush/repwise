import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { ExerciseDBEntry } from '../types';

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface ExerciseCardProps {
  exercise: ExerciseDBEntry;
  onPress: () => void;
  onLongPress?: () => void;
  isFavorite?: boolean;
}

export function ExerciseCard({ exercise, onPress, onLongPress, isFavorite }: ExerciseCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.75}
    >
      <View style={styles.gifWrap}>
        <Image
          source={{ uri: exercise.gifUrl }}
          style={styles.gif}
          contentFit="cover"
          placeholder={require('../../assets/icon.png')}
          transition={200}
          recyclingKey={exercise.id}
        />
        {isFavorite && (
          <Text style={styles.favStar}>★</Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {capitalize(exercise.name)}
        </Text>

        <View style={styles.tags}>
          {exercise.targetMuscles.slice(0, 2).map((m) => (
            <View key={m} style={styles.muscleTag}>
              <Text style={styles.muscleTagText}>{capitalize(m)}</Text>
            </View>
          ))}
          {exercise.equipments.slice(0, 1).map((eq) => (
            <View key={eq} style={[styles.muscleTag, styles.equipTag]}>
              <Text style={[styles.muscleTagText, styles.equipTagText]}>
                {capitalize(eq)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 5,
    overflow: 'hidden',
    alignItems: 'center',
  },
  gifWrap: {
    width: 90,
    height: 90,
    flexShrink: 0,
    position: 'relative',
  },
  gif: {
    width: 90,
    height: 90,
    backgroundColor: '#222222',
  },
  favStar: {
    position: 'absolute',
    top: 4,
    right: 4,
    color: '#FFD700',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  info: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  muscleTag: {
    backgroundColor: '#C8FF0020',
    borderColor: '#C8FF0040',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  muscleTagText: {
    color: '#C8FF00',
    fontSize: 10,
    fontWeight: '600',
  },
  equipTag: {
    backgroundColor: '#333333',
    borderColor: '#444444',
  },
  equipTagText: {
    color: '#888888',
  },
});
