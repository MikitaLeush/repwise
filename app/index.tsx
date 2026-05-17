import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
  const { user, loading, isGuest } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#5BD1A0" />
      </View>
    );
  }

  if (user?.emailVerified) return <Redirect href="/(tabs)/workout" />;
  if (isGuest) return <Redirect href="/(tabs)/workout" />;
  if (user && !user.emailVerified) return <Redirect href="/(auth)/verify-email" />;
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0B0F0E', alignItems: 'center', justifyContent: 'center' },
});
