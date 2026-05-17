import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../../src/firebase';
import { useAuth } from '../../src/context/AuthContext';
import { MONO, MONO_BOLD } from '../../src/utils/fonts';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [cooldown, setCooldown] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    if (cooldown || !auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setSent(true);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 60_000);
    } catch {
      // silently ignore — user likely hit rate limit
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logoLetter}>R</Text>
      </View>

      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.body}>
        We sent a verification link to your email address. Click the link, then come back and sign in.
      </Text>

      {sent && (
        <Text style={styles.successText}>Verification email resent.</Text>
      )}

      <TouchableOpacity
        style={[styles.btn, cooldown && styles.btnDisabled]}
        onPress={handleResend}
        disabled={cooldown}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>
          {cooldown ? 'Resend in 60s' : 'Resend email'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleLogout}>
        <Text style={styles.linkText}>← Back to sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F0E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#5BD1A0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoLetter: { color: '#0B1A14', fontSize: 26, fontFamily: MONO_BOLD },
  title: { color: '#E6F1ED', fontSize: 22, fontFamily: MONO_BOLD, textAlign: 'center' },
  body: {
    color: '#9CB0AA',
    fontFamily: MONO,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  successText: { color: '#5BD1A0', fontFamily: MONO, fontSize: 12 },
  btn: {
    width: '100%',
    backgroundColor: '#5BD1A0',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#0B1A14', fontFamily: MONO_BOLD, fontSize: 15 },
  linkText: { color: '#5A6663', fontFamily: MONO, fontSize: 13 },
});
