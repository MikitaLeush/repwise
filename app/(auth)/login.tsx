import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  type AuthError,
} from 'firebase/auth';
import { auth } from '../../src/firebase';
import { useAuth } from '../../src/context/AuthContext';
import { MONO, MONO_BOLD } from '../../src/utils/fonts';

const ERROR_MAP: Record<string, string> = {
  'auth/user-not-found':         'Invalid email or password.',
  'auth/wrong-password':         'Invalid email or password.',
  'auth/invalid-credential':     'Invalid email or password.',
  'auth/too-many-requests':      'Too many attempts. Try again later.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/user-disabled':          'This account has been disabled.',
};

function mapError(err: AuthError): string {
  return ERROR_MAP[err.code] ?? 'Something went wrong. Try again.';
}

export default function LoginScreen() {
  const router = useRouter();
  const { setIsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(false);

  async function handleSignIn() {
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!cred.user.emailVerified) {
        setError('Please verify your email before signing in.');
        await auth.signOut();
        setLoading(false);
        return;
      }
      await setIsGuest(false);
      router.replace('/(tabs)/workout');
    } catch (err) {
      setError(mapError(err as AuthError));
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email above, then tap Forgot password.');
      return;
    }
    if (resetCooldown) return;
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      setError('');
      setResetCooldown(true);
      setTimeout(() => setResetCooldown(false), 60_000);
    } catch {
      setError('Could not send reset email. Check the address and try again.');
    }
  }

  async function handleGuest() {
    await setIsGuest(true);
    router.replace('/(tabs)/workout');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoBlock}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>R</Text>
          </View>
          <Text style={styles.appName}>Repwise</Text>
          <Text style={styles.tagline}>TRACK YOUR GAINS</Text>
        </View>

        {/* Inputs */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#3A4541"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="next"
        />

        <View style={styles.pwRow}>
          <TextInput
            style={[styles.input, styles.pwInput]}
            placeholder="Password"
            placeholderTextColor="#3A4541"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleSignIn}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPw((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.eyeText}>{showPw ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        {/* Feedback */}
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {resetSent && <Text style={styles.successText}>Reset email sent — check your inbox.</Text>}

        {/* Sign In */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#0B1A14" />
            : <Text style={styles.btnText}>Sign In</Text>
          }
        </TouchableOpacity>

        {/* Forgot + Signup */}
        <TouchableOpacity onPress={handleForgotPassword} disabled={resetCooldown}>
          <Text style={[styles.linkText, resetCooldown && styles.linkDisabled]}>
            Forgot password?
          </Text>
        </TouchableOpacity>

        <Text style={styles.mutedText}>
          No account?{' '}
          <Text
            style={styles.accentLink}
            onPress={() => router.push('/(auth)/signup')}
          >
            Sign up
          </Text>
        </Text>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Guest */}
        <TouchableOpacity onPress={handleGuest}>
          <Text style={styles.guestText}>Continue as guest →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0B0F0E' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
    gap: 12,
  },
  logoBlock: { alignItems: 'center', marginBottom: 20, gap: 8 },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#5BD1A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: { color: '#0B1A14', fontSize: 26, fontFamily: MONO_BOLD },
  appName: { color: '#E6F1ED', fontSize: 22, fontFamily: MONO_BOLD, letterSpacing: -0.4 },
  tagline: { color: '#5A6663', fontSize: 10, fontFamily: MONO, letterSpacing: 1.5 },
  input: {
    width: '100%',
    backgroundColor: '#11181A',
    borderWidth: 1,
    borderColor: '#1f2825',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#E6F1ED',
    fontFamily: MONO,
    fontSize: 14,
  },
  pwRow: { width: '100%', position: 'relative' },
  pwInput: { paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },
  eyeText: { fontSize: 16 },
  errorText: { color: '#FF6B6B', fontFamily: MONO, fontSize: 12, alignSelf: 'flex-start' },
  successText: { color: '#5BD1A0', fontFamily: MONO, fontSize: 12, alignSelf: 'flex-start' },
  btn: {
    width: '100%',
    backgroundColor: '#5BD1A0',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#0B1A14', fontFamily: MONO_BOLD, fontSize: 15 },
  linkText: { color: '#5A6663', fontFamily: MONO, fontSize: 12 },
  linkDisabled: { opacity: 0.4 },
  mutedText: { color: '#5A6663', fontFamily: MONO, fontSize: 12 },
  accentLink: { color: '#5BD1A0', fontFamily: MONO_BOLD },
  divider: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1f2825' },
  dividerText: { color: '#3A4541', fontFamily: MONO, fontSize: 11, marginHorizontal: 12 },
  guestText: { color: '#9CB0AA', fontFamily: MONO, fontSize: 13 },
});
