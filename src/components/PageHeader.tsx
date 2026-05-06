import { View, Text, StyleSheet } from 'react-native';

interface PageHeaderProps {
  title: string;
}

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>R</Text>
      </View>
      <Text style={styles.brand}>Repwise</Text>
      <View style={styles.divider} />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  logoBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#C8FF00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#0F0F0F', fontWeight: '900', fontSize: 15 },
  brand: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  divider: { width: 1, height: 16, backgroundColor: '#333333', marginHorizontal: 4 },
  title: { color: '#C8FF00', fontSize: 18, fontWeight: '600', letterSpacing: -0.3 },
});
