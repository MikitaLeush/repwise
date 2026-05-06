import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

function WorkoutIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M6 4v16M18 4v16M3 8h4M17 8h4M3 16h4M17 16h4M8 10h8M8 14h8" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

function ExercisesIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={3} rx={1.5} stroke={color} strokeWidth={1.6}/>
      <Rect x={3} y={10.5} width={18} height={3} rx={1.5} stroke={color} strokeWidth={1.6}/>
      <Rect x={3} y={17} width={18} height={3} rx={1.5} stroke={color} strokeWidth={1.6}/>
    </Svg>
  );
}

function ProgressIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M3 20h18M5 20v-5h3v5M10 20V9h3v11M15 20V4h4v16" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.7}/>
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth={1.7} strokeLinecap="round"/>
    </Svg>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="workout"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#C8FF00',
        tabBarInactiveTintColor: '#444444',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {/* Hide the old recovery index route from the tab bar */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color }) => <WorkoutIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
          tabBarIcon: ({ color }) => <ExercisesIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <ProgressIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#111111',
    borderTopColor: '#222222',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
