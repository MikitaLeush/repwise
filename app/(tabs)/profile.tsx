import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../../src/context/AppContext';
import { TIME_MULTIPLIERS } from '../../src/hooks/useDevSettings';
import { PageHeader } from '../../src/components/PageHeader';
import { MONO, MONO_BOLD } from '../../src/utils/fonts';

const ACCENT = '#5BD1A0';
const ACCENT_DEEP = '#13352A';
const BG = '#0B0F0E';
const CARD = '#11181A';
const BORDER = '#1f2825';

// ─── Training reference data ──────────────────────────────────────────────────

const RPE_ROWS = [
  { rpe: '10',  rir: '0',   feel: 'Max effort — nothing left' },
  { rpe: '9.5', rir: '0',   feel: 'Could barely do 1 more' },
  { rpe: '9',   rir: '1',   feel: '1 rep in reserve' },
  { rpe: '8',   rir: '2',   feel: '2 reps in reserve  ← most working sets' },
  { rpe: '7',   rir: '3',   feel: '3 reps in reserve' },
  { rpe: '6',   rir: '4–5', feel: 'Light — warm-up territory' },
];

const VOLUME_ROWS = [
  { muscle: 'Chest',       mev: '8–10',  mav: '12–20', mrv: '20–22' },
  { muscle: 'Back',        mev: '8–10',  mav: '12–20', mrv: '20–25' },
  { muscle: 'Quads',       mev: '8–10',  mav: '12–18', mrv: '18–22' },
  { muscle: 'Hamstrings',  mev: '6–8',   mav: '10–16', mrv: '16–20' },
  { muscle: 'Glutes',      mev: '4–6',   mav: '8–14',  mrv: '14–20' },
  { muscle: 'Side Delts',  mev: '8–10',  mav: '14–22', mrv: '22–28' },
  { muscle: 'Rear Delts',  mev: '6–8',   mav: '10–16', mrv: '16–22' },
  { muscle: 'Front Delts', mev: '0–4',   mav: '4–8',   mrv: '8–12'  },
  { muscle: 'Biceps',      mev: '6–8',   mav: '10–16', mrv: '16–22' },
  { muscle: 'Triceps',     mev: '6–8',   mav: '10–16', mrv: '16–18' },
  { muscle: 'Calves',      mev: '6–8',   mav: '10–16', mrv: '16–20' },
  { muscle: 'Abs',         mev: '4–6',   mav: '8–14',  mrv: '14–18' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileTab() {
  const { unit, devSettings } = useApp();

  function handleWipeData() {
    Alert.alert(
      'Erase All Data',
      'This permanently deletes all sessions, bodyweight logs, and schedule data. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Everything',
          style: 'destructive',
          onPress: () =>
            AsyncStorage.clear().then(() =>
              Alert.alert('Done', 'All data erased. Please restart the app.')
            ),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageHeader title="Profile" sub="Settings & preferences" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── User card ── */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={[styles.avatarText, { fontFamily: MONO_BOLD }]}>RW</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Repwise User</Text>
            <Text style={[styles.userSub, { fontFamily: MONO }]}>
              {unit.unit.toUpperCase()} · PPL Program
            </Text>
          </View>
        </View>

        {/* ── Unit preference ── */}
        <SectionHeader title="Units" />
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Weight unit</Text>
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, unit.unit === 'kg' && styles.toggleBtnActive]}
                onPress={() => unit.unit !== 'kg' && unit.toggleUnit()}
              >
                <Text style={[styles.toggleText, { fontFamily: MONO_BOLD }, unit.unit === 'kg' && styles.toggleTextActive]}>kg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, unit.unit === 'lb' && styles.toggleBtnActive]}
                onPress={() => unit.unit !== 'lb' && unit.toggleUnit()}
              >
                <Text style={[styles.toggleText, { fontFamily: MONO_BOLD }, unit.unit === 'lb' && styles.toggleTextActive]}>lb</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── RPE guide ── */}
        <SectionHeader title="RPE / RIR Guide" sub="Reps in reserve scale for effort" />
        <View style={styles.card}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHead, styles.colRPE, { fontFamily: MONO_BOLD }]}>RPE</Text>
            <Text style={[styles.tableHead, styles.colRIR, { fontFamily: MONO_BOLD }]}>RIR</Text>
            <Text style={[styles.tableHead, styles.colFeel, { fontFamily: MONO_BOLD }]}>FEEL</Text>
          </View>
          {RPE_ROWS.map((r, i) => (
            <View key={r.rpe} style={[styles.tableRow, i < RPE_ROWS.length - 1 && styles.tableRowBorder]}>
              <Text style={[styles.tableCell, styles.cellAccent, styles.colRPE, { fontFamily: MONO_BOLD }]}>{r.rpe}</Text>
              <Text style={[styles.tableCell, styles.colRIR, { fontFamily: MONO }]}>{r.rir}</Text>
              <Text style={[styles.tableCell, styles.colFeel]}>{r.feel}</Text>
            </View>
          ))}
          <Text style={styles.refNote}>
            Effective hypertrophy sets: 0–3 RIR. Train most sets at RPE 7–8.
          </Text>
        </View>

        {/* ── Volume landmarks ── */}
        <SectionHeader title="Volume Landmarks" sub="Sets per week for each muscle" />
        <View style={styles.card}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHead, styles.colMuscle, { fontFamily: MONO_BOLD }]}>MUSCLE</Text>
            <Text style={[styles.tableHead, styles.colVol, { fontFamily: MONO_BOLD }]}>MEV</Text>
            <Text style={[styles.tableHead, styles.colVol, { fontFamily: MONO_BOLD }]}>MAV</Text>
            <Text style={[styles.tableHead, styles.colVol, { fontFamily: MONO_BOLD }]}>MRV</Text>
          </View>
          {VOLUME_ROWS.map((r, i) => (
            <View key={r.muscle} style={[styles.tableRow, i < VOLUME_ROWS.length - 1 && styles.tableRowBorder]}>
              <Text style={[styles.tableCell, styles.colMuscle]}>{r.muscle}</Text>
              <Text style={[styles.tableCell, styles.colVol, { fontFamily: MONO }]}>{r.mev}</Text>
              <Text style={[styles.tableCell, styles.colVol, styles.cellAccent, { fontFamily: MONO_BOLD }]}>{r.mav}</Text>
              <Text style={[styles.tableCell, styles.colVol, { fontFamily: MONO }]}>{r.mrv}</Text>
            </View>
          ))}
          <Text style={styles.refNote}>
            MEV = Minimum Effective Volume · MAV = Maximum Adaptive Volume · MRV = Maximum Recoverable Volume
          </Text>
        </View>

        {/* ── Developer ── */}
        <SectionHeader title="Developer" sub="Testing tools — not for production use" />
        <View style={styles.card}>
          <Text style={styles.rowLabel}>Recovery Time Speed</Text>
          <Text style={styles.devNote}>
            Multiplies elapsed time so recovery progresses faster. 100× = 48 hrs recovers in ~29 min.
          </Text>
          <View style={styles.speedRow}>
            {TIME_MULTIPLIERS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.speedBtn, devSettings.timeMultiplier === m && styles.speedBtnActive]}
                onPress={() => devSettings.setTimeMultiplier(m)}
              >
                <Text style={[styles.speedText, { fontFamily: MONO_BOLD }, devSettings.timeMultiplier === m && styles.speedTextActive]}>
                  {m}×
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Danger zone ── */}
        <SectionHeader title="Data" />
        <View style={styles.card}>
          <TouchableOpacity style={styles.wipeBtn} onPress={handleWipeData}>
            <Text style={styles.wipeBtnText}>Erase All Data</Text>
          </TouchableOpacity>
          <Text style={styles.wipeNote}>Permanently deletes all sessions and logs.</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {sub ? <Text style={[styles.sectionSub, { fontFamily: MONO }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  // User card
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: CARD, borderRadius: 18, padding: 18, marginTop: 8,
    borderWidth: 1, borderColor: BORDER,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: ACCENT_DEEP, borderWidth: 2, borderColor: ACCENT + '55',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: ACCENT, fontSize: 18, fontWeight: '800' },
  userInfo: { flex: 1 },
  userName: { color: '#E6F1ED', fontSize: 17, fontWeight: '700' },
  userSub: { color: '#7E8A86', fontSize: 12, marginTop: 3 },

  sectionHead: { marginTop: 22, marginBottom: 10 },
  sectionTitle: { color: '#E6F1ED', fontSize: 16, fontWeight: '700' },
  sectionSub: { color: '#5A6663', fontSize: 11, marginTop: 2 },

  card: {
    backgroundColor: CARD, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER,
  },

  // Unit toggle
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { color: '#9CB0AA', fontSize: 15 },
  toggle: { flexDirection: 'row', backgroundColor: BG, borderRadius: 10, padding: 3, gap: 3 },
  toggleBtn: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: ACCENT },
  toggleText: { color: '#5A6663', fontSize: 14, fontWeight: '600' },
  toggleTextActive: { color: '#0B1A14' },

  // Tables
  tableHeader: { flexDirection: 'row', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableHead: { color: '#5A6663', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 9 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  tableCell: { color: '#7E8A86', fontSize: 13 },
  cellAccent: { color: ACCENT, fontWeight: '600' },
  colRPE: { width: 44 },
  colRIR: { width: 44 },
  colFeel: { flex: 1 },
  colMuscle: { flex: 1 },
  colVol: { width: 54, textAlign: 'center' },
  refNote: { color: '#3A4541', fontSize: 11, marginTop: 12, lineHeight: 16 },

  // Developer
  devNote: { color: '#5A6663', fontSize: 12, marginTop: 4, marginBottom: 14, lineHeight: 17 },
  speedRow: { flexDirection: 'row', gap: 8 },
  speedBtn: {
    flex: 1, backgroundColor: BG, borderRadius: 8, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1, borderColor: BORDER,
  },
  speedBtnActive: { backgroundColor: ACCENT + '20', borderColor: ACCENT },
  speedText: { color: '#5A6663', fontSize: 14, fontWeight: '600' },
  speedTextActive: { color: ACCENT },

  // Danger zone
  wipeBtn: { borderWidth: 1, borderColor: '#5A1A1A', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  wipeBtnText: { color: '#CC3333', fontSize: 15, fontWeight: '600' },
  wipeNote: { color: '#3A4541', fontSize: 12, textAlign: 'center', marginTop: 8 },
});
