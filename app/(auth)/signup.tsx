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
  createUserWithEmailAndPassword,
  sendEmailVerification,
  type AuthError,
} from 'firebase/auth';
import { auth } from '../../src/firebase';
import { MONO, MONO_BOLD } from '../../src/utils/fonts';

const ERROR_MAP: Record<string, string> = {
  'auth/email-already-in-use':   'An account with this email already exists.',
  'auth/invalid-email':          'Enter a valid email address.',
  'auth/weak-password':          'Password must be at least 8 characters.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/too-many-requests':      'Too many attempts. Try again later.',
};

function mapError(err: AuthError): string {
  return ERROR_MAP[err.code] ?? 'Something went wrong. Try again.';
}

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(cred.user);
      await auth.signOut();
      router.replace('/(auth)/verify-email');
    } catch (err) {
      setError(mapError(err as AuthError));
      setLoading(false);
    }
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
        <View style={styles.logoBlock}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>R</Text>
          </View>
          <Text style={styles.appName}>Create Account</Text>
          <Text style={styles.tagline}>REPWISE</Text>
        </View>

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
            placeholder="Password (min 8 characters)"
            placeholderTextColor="#3A4541"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            returnKeyType="next"
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPw((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.eyeText}>{showPw ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor="#3A4541"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showPw}
          returnKeyType="done"
          onSubmitEditing={handleSignUp}
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#0B1A14" />
            : <Text style={styles.btnText}>Create Account</Text>
          }
        </TouchableOpacity>

        <Text style={styles.mutedText}>
          Have an account?{' '}
          <Text style={styles.accentLink} onPress={() => router.back()}>
            Sign in
          </Text>
        </Text>
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
  mutedText: { color: '#5A6663', fontFamily: MONO, fontSize: 12 },
  accentLink: { color: '#5BD1A0', fontFamily: MONO_BOLD },
});
