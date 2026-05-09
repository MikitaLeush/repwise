import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { ScrollView } from '../utils/ScrollView';
import { BodyDiagram } from '../components/BodyDiagram';
import { RecoveryInfo } from '../components/RecoveryInfo';
import { useMuscleRecovery } from '../hooks/useMuscleRecovery';

export function RecoveryScreen() {
  const {
    markAsTrained,
    getBodyData,
    getAutoStatus,
    getRecoveryPercent,
    resetAll,
    lastTapped,
  } = useMuscleRecovery();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Recovery Status</Text>
          <Text style={styles.subtitle}>Tap a muscle to mark it as trained</Text>
        </View>

        <View style={styles.card}>
          <BodyDiagram
            data={getBodyData()}
            onMusclePress={markAsTrained}
          />
        </View>

        <RecoveryInfo
          lastTapped={lastTapped}
          getStatus={getAutoStatus}
          getRecoveryPercent={getRecoveryPercent}
          onResetAll={resetAll}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#555555',
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 32,
  },
});
