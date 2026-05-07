import { View, Text, StyleSheet } from 'react-native';
import { MONO, MONO_BOLD } from '../utils/fonts';

interface PageHeaderProps {
  title: string;
  sub?: string;
}

export function PageHeader({ title, sub }: PageHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.logoBox}>
        <Text style={[styles.logoText, { fontFamily: MONO_BOLD }]}>R</Text>
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        {sub ? <Text style={[styles.sub, { fontFamily: MONO }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 12,
  },
  logoBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#5BD1A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#0B1A14',
    fontWeight: '900',
    fontSize: 17,
  },
  titleBlock: { flex: 1 },
  title: {
    color: '#E6F1ED',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sub: {
    color: '#5A6663',
    fontSize: 11,
    marginTop: 2,
  },
});
