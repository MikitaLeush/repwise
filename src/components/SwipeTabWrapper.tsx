import React, { useRef } from 'react';
import { View, PanResponder } from 'react-native';
import { useRouter } from 'expo-router';

const TAB_ROUTES = ['workout', 'exercises', 'progress', 'profile'] as const;
type TabRoute = typeof TAB_ROUTES[number];

interface SwipeTabWrapperProps {
  route: TabRoute;
  children: React.ReactNode;
  swipeEnabled?: boolean;
}

export function SwipeTabWrapper({ route, children, swipeEnabled = true }: SwipeTabWrapperProps) {
  const router = useRouter();
  const idx = TAB_ROUTES.indexOf(route);
  const swipeEnabledRef = useRef(swipeEnabled);
  swipeEnabledRef.current = swipeEnabled;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        swipeEnabledRef.current &&
        Math.abs(gs.dx) > 25 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2.5,
      onPanResponderRelease: (_, gs) => {
        if (!swipeEnabledRef.current) return;
        if (gs.dx < -80 && idx < TAB_ROUTES.length - 1) {
          router.navigate(`/(tabs)/${TAB_ROUTES[idx + 1]}`);
        } else if (gs.dx > 80 && idx > 0) {
          router.navigate(`/(tabs)/${TAB_ROUTES[idx - 1]}`);
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...pan.panHandlers}>
      {children}
    </View>
  );
}
