import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Body from 'react-native-body-highlighter';
import type { ExtendedBodyPart } from 'react-native-body-highlighter';

interface BodyDiagramProps {
  data: ExtendedBodyPart[];
  onMusclePress: (slug: string) => void;
}

// Natural SVG width of the Body component at scale=1
const BODY_BASE_WIDTH = 150;

export function BodyDiagram({ data, onMusclePress }: BodyDiagramProps) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const useSideBySide = isLandscape || isTablet;

  const PADDING = 32;
  const GAP = 16;
  const availableWidth = useSideBySide
    ? (width - PADDING * 2 - GAP) / 2
    : width - PADDING;

  const scale = Math.min(availableWidth / BODY_BASE_WIDTH, 2.2);

  return (
    <View style={[styles.wrapper, useSideBySide ? styles.row : styles.column]}>
      <View style={styles.bodyWrapper}>
        <Body
          data={data}
          side="front"
          gender="male"
          scale={scale}
          border="#2C2C2C"
          defaultFill="#2A2A2A"
          onBodyPartPress={(part) => part.slug && onMusclePress(part.slug)}
        />
      </View>
      <View style={styles.bodyWrapper}>
        <Body
          data={data}
          side="back"
          gender="male"
          scale={scale}
          border="#2C2C2C"
          defaultFill="#2A2A2A"
          onBodyPartPress={(part) => part.slug && onMusclePress(part.slug)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flexDirection: 'column',
    gap: 24,
  },
  bodyWrapper: {
    alignItems: 'center',
  },
});
