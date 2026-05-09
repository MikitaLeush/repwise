import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Body from 'react-native-body-highlighter';
import type { ExtendedBodyPart } from 'react-native-body-highlighter';

interface BodyDiagramProps {
  data: ExtendedBodyPart[];
  onMusclePress: (slug: string) => void;
  expanded?: boolean;
  activeSide?: 'front' | 'back';
}

// Natural SVG width of the Body component at scale=1 (arms included)
const BODY_BASE_WIDTH = 155;
// scroll padding (16×2) + card padding (16×2) + gap (8) + arm overflow margin (24)
const TOTAL_INSETS = 112;

export function BodyDiagram({ data, onMusclePress, expanded = false, activeSide = 'front' }: BodyDiagramProps) {
  const { width } = useWindowDimensions();

  // Collapsed: each side gets half available width
  // Expanded: single side gets ~44% of card width (card = width - 32)
  const scale = expanded
    ? Math.min((width - 32) * 0.44 / BODY_BASE_WIDTH, 2.0)
    : Math.min((width - TOTAL_INSETS) / 2 / BODY_BASE_WIDTH, 2.2);

  if (expanded) {
    return (
      <View style={styles.wrapper} pointerEvents="box-none">
        <View style={styles.bodyWrapper} collapsable={false} pointerEvents="box-none">
          <Body
            data={data}
            side={activeSide}
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

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.bodyWrapper} collapsable={false} pointerEvents="box-none">
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
      <View style={styles.bodyWrapper} collapsable={false} pointerEvents="box-none">
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bodyWrapper: {
    alignItems: 'center',
  },
});
