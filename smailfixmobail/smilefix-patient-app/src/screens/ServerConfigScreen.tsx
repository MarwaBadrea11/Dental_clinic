// ─────────────────────────────────────────────
// ServerConfigScreen
// Shown once on first launch (or after an IP reset).
// Lets the user enter the backend laptop IP so the
// APK can reach the local server over Wi-Fi.
// ─────────────────────────────────────────────
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../hooks/useTheme';
import Text from '../components/Text';

// ── Timing constants ───────────────────────────
const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IN_OUT   = Easing.bezier(0.65, 0, 0.35, 1);
const EASE_BACK     = Easing.bezier(0.34, 1.56, 0.64, 1);

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ServerConfig'>;
};

// ── IP validation ──────────────────────────────
function isValidIp(value: string): boolean {
  // Accept bare IPv4: 192.168.1.100
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  // Or full URL starting with http:// or https://
  const url  = /^https?:\/\/.+/i;
  return ipv4.test(value.trim()) || url.test(value.trim());
}

// ── Stagger wrapper ────────────────────────────
function FadeIn({
  delay,
  children,
  style,
}: {
  delay: number;
  children: React.ReactNode;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 500, delay,
        easing: EASE_OUT_EXPO, useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: 0, duration: 540, delay,
        easing: EASE_OUT_EXPO, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY: slideY }] }]}>
      {children}
    </Animated.View>
  );
}

export default function ServerConfigScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const setBackendIp = useAppStore((s) => s.setBackendIp);

  const [ip, setIp]           = useState('');
  const [error, setError]     = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus]   = useState<'idle' | 'success' | 'error'>('idle');

  // Shake animation for errors
  const shakeX   = useRef(new Animated.Value(0)).current;
  // Orb pulse
  const orbScale = useRef(new Animated.Value(1)).current;
  // Input focus glow
  const focusAnim = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState(false);

  // Orb slow pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.18, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1.00, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const onFocus = useCallback(() => {
    setFocused(true);
    Animated.timing(focusAnim, { toValue: 1, duration: 280, easing: EASE_OUT_EXPO, useNativeDriver: false }).start();
  }, []);

  const onBlur = useCallback(() => {
    setFocused(false);
    Animated.timing(focusAnim, { toValue: 0, duration: 220, easing: EASE_IN_OUT, useNativeDriver: false }).start();
  }, []);

  const borderColor = focusAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      error ? colors.error + 'aa' : (isDark ? 'rgba(97,190,197,0.18)' : 'rgba(0,105,111,0.20)'),
      error ? colors.error        : (isDark ? 'rgba(97,190,197,0.80)' : 'rgba(0,105,111,0.70)'),
    ],
  });

  const inputBg = focusAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      isDark ? 'rgba(97,190,197,0.07)'  : 'rgba(0,105,111,0.04)',
    ],
  });

  function shake() {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 12,  duration: 65,  easing: EASE_BACK, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 65,  easing: EASE_BACK, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6,   duration: 55,  easing: EASE_BACK, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -3,  duration: 55,  easing: EASE_BACK, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 45,  easing: EASE_IN_OUT, useNativeDriver: true }),
    ]).start();
  }

  async function handleConnect() {
    setError('');
    setStatus('idle');

    const trimmed = ip.trim();
    if (!trimmed) {
      setError('يرجى إدخال عنوان IP  /  Please enter an IP address.');
      shake();
      return;
    }
    if (!isValidIp(trimmed)) {
      setError('صيغة غير صالحة. مثال: 192.168.1.100  /  Invalid format. Example: 192.168.1.100');
      shake();
      return;
    }

    setTesting(true);

    // Build the full URL to test
    const testUrl = trimmed.startsWith('http')
      ? `${trimmed.replace(/\/$/, '')}/api/v1/health`
      : `http://${trimmed}:3000/api/v1/health`;

    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 8000);
      const res        = await fetch(testUrl, { signal: controller.signal });
      clearTimeout(timeout);

      // Accept any 2xx or 404 — 404 still means the server is reachable
      if (res.status < 500) {
        setStatus('success');
        await setBackendIp(trimmed);
        // Small delay so user sees the success state before navigating
        setTimeout(() => navigation.replace('Welcome'), 800);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      setStatus('error');
      if (err?.name === 'AbortError') {
        setError('انتهت مهلة الاتصال — تأكد من صحة IP وأن الجهازين على نفس الشبكة.\nConnection timed out — check the IP and that both devices are on the same Wi-Fi.');
      } else {
        setError(`تعذّر الاتصال بالخادم.\nCould not reach the server.\n(${err?.message ?? 'Network error'})`);
      }
      shake();
    } finally {
      setTesting(false);
    }
  }

  const bgColors: readonly [string, string, string] = isDark
    ? ['#060b10', '#0a1520', '#060e14']
    : ['#e6f3f6', '#eef7f8', '#e8f2f4'];

  const statusColor = status === 'success' ? colors.success : status === 'error' ? colors.error : colors.teal;

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Background */}
      <LinearGradient colors={bgColors} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFillObject} />

      {/* Orbs */}
      <Animated.View style={[styles.orb, styles.orbTR, {
        backgroundColor: isDark ? 'rgba(97,190,197,0.09)' : 'rgba(97,190,197,0.18)',
        transform: [{ scale: orbScale }],
      }]} />
      <Animated.View style={[styles.orb, styles.orbBL, {
        backgroundColor: isDark ? 'rgba(30,89,121,0.11)' : 'rgba(121,213,220,0.16)',
        transform: [{ scale: orbScale }],
      }]} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Logo ── */}
            <FadeIn delay={80} style={styles.logoRow}>
              <View style={[styles.logoCircle, {
                backgroundColor: isDark ? 'rgba(97,190,197,0.15)' : colors.teal,
                borderColor:     isDark ? 'rgba(97,190,197,0.40)' : 'rgba(255,255,255,0.50)',
                shadowColor:     colors.teal,
              }]}>
                <LinearGradient
                  colors={isDark
                    ? ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.02)']
                    : ['rgba(255,255,255,0.50)', 'rgba(255,255,255,0.02)']}
                  start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={[styles.logoLetters, { color: isDark ? colors.teal : '#fff' }]}>SF</Text>
              </View>
              <Text style={[styles.logoBrand, { color: isDark ? colors.blue : '#1e5979' }]}>SmileFix</Text>
            </FadeIn>

            {/* ── Title ── */}
            <FadeIn delay={160}>
              <Text style={[styles.title, { color: isDark ? '#e6edf3' : '#1e5979' }]}>
                {'إعداد الخادم\nServer Setup'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSub }]}>
                {'أدخل عنوان IP للحاسوب المشغِّل للخادم والمتصل بنفس شبكة Wi-Fi\n\nEnter the local IP address of the laptop running the backend server (must be on the same Wi-Fi network).'}
              </Text>
            </FadeIn>

            {/* ── Info card ── */}
            <FadeIn delay={240}>
              <View style={[styles.infoCard, {
                backgroundColor: isDark ? 'rgba(97,190,197,0.07)' : 'rgba(97,190,197,0.10)',
                borderColor:     isDark ? 'rgba(97,190,197,0.22)' : 'rgba(0,105,111,0.18)',
              }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.teal} style={{ marginTop: 1 }} />
                <Text style={[styles.infoText, { color: isDark ? '#c0d8dc' : colors.primary }]}>
                  {'على Windows: افتح CMD واكتب  ipconfig  ثم ابحث عن "IPv4 Address".\n\nOn Windows: open CMD → ipconfig → look for "IPv4 Address".\nExample: 192.168.1.100'}
                </Text>
              </View>
            </FadeIn>

            {/* ── Error banner ── */}
            {error ? (
              <Animated.View style={[styles.errorBanner, {
                backgroundColor: isDark ? 'rgba(186,26,26,0.15)' : 'rgba(255,218,214,0.75)',
                borderColor:     colors.error + '50',
                transform:       [{ translateX: shakeX }],
              }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} style={{ flexShrink: 0, marginTop: 1 }} />
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </Animated.View>
            ) : null}

            {/* ── Input ── */}
            <FadeIn delay={320}>
              <Text style={[styles.inputLabel, { color: focused ? (isDark ? colors.teal : colors.primary) : colors.textSub }]}>
                {'IP ADDRESS / عنوان IP'}
              </Text>

              <Animated.View style={[styles.shakeWrap, { transform: [{ translateX: shakeX }] }]}>
                <Animated.View style={[styles.inputRow, {
                  backgroundColor: inputBg,
                  borderColor,
                }]}>
                  <Ionicons
                    name="server-outline"
                    size={18}
                    color={focused ? (isDark ? colors.teal : colors.primary) : colors.textSub}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="192.168.1.100"
                    placeholderTextColor={isDark ? 'rgba(139,148,158,0.45)' : 'rgba(62,73,74,0.38)'}
                    value={ip}
                    onChangeText={(v) => { setIp(v); setError(''); setStatus('idle'); }}
                    keyboardType="decimal-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleConnect}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    editable={!testing}
                  />
                  {/* Status indicator dot */}
                  {status !== 'idle' && (
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  )}
                </Animated.View>
              </Animated.View>
            </FadeIn>

            {/* ── Connect button ── */}
            <FadeIn delay={400}>
              <TouchableOpacity
                onPress={handleConnect}
                disabled={testing}
                activeOpacity={0.86}
                style={[styles.btnWrap, testing && { opacity: 0.60 }, { shadowColor: colors.teal }]}
              >
                <LinearGradient
                  colors={['#00818a', '#00696f', '#004f54']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnGradient}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.00)']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
                  />
                  {testing ? (
                    <View style={styles.btnInner}>
                      <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 10 }} />
                      <Text style={styles.btnText}>{'جارٍ الاتصال… / Connecting…'}</Text>
                    </View>
                  ) : status === 'success' ? (
                    <View style={styles.btnInner}>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.btnText}>{'تم الاتصال! / Connected!'}</Text>
                    </View>
                  ) : (
                    <Text style={styles.btnText}>{'اتصال وحفظ  /  Connect & Save'}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </FadeIn>

            {/* ── Help note ── */}
            <FadeIn delay={480}>
              <Text style={[styles.helpNote, { color: colors.textSub }]}>
                {'يمكنك تغيير هذا الإعداد لاحقاً من صفحة الملف الشخصي.\nYou can change this setting later from the Profile screen.'}
              </Text>
            </FadeIn>

          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#060b10' },
  flex:  { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 52,
  },

  // Orbs
  orb:   { position: 'absolute', borderRadius: 9999 },
  orbTR: { width: 300, height: 300, top: -80, right: -70 },
  orbBL: { width: 220, height: 220, bottom: 100, left: -60 },

  // Logo
  logoRow: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 1.5,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.42, shadowRadius: 26, elevation: 10,
  },
  logoLetters: { fontSize: 30, fontFamily: 'Manrope_700Bold', letterSpacing: 1.5 },
  logoBrand:   { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.4 },

  // Titles
  title: {
    fontSize: 26, fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.6, marginBottom: 10, textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 13, fontFamily: 'Inter_400Regular',
    lineHeight: 22, marginBottom: 20, textAlign: 'center',
  },

  // Info card
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 14, borderWidth: 1,
    padding: 14, marginBottom: 18,
  },
  infoText: {
    flex: 1, fontSize: 12,
    fontFamily: 'Inter_400Regular', lineHeight: 19,
  },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 9,
    borderRadius: 13, borderWidth: 1,
    padding: 13, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },

  // Input
  inputLabel: {
    fontSize: 10, fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.3, textTransform: 'uppercase',
    marginBottom: 8,
  },
  shakeWrap: {},
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 15, borderWidth: 1.5,
    paddingHorizontal: 16, minHeight: 56,
    marginBottom: 22,
  },
  input: {
    flex: 1, fontSize: 16,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 14,
    letterSpacing: 0.4,
  },
  statusDot: {
    width: 10, height: 10, borderRadius: 5, marginLeft: 8,
  },

  // Button
  btnWrap: {
    borderRadius: 16, overflow: 'hidden',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40, shadowRadius: 22, elevation: 8,
  },
  btnGradient: {
    height: 58, alignItems: 'center',
    justifyContent: 'center', borderRadius: 16,
  },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  btnText: {
    fontSize: 16, color: '#ffffff',
    fontWeight: '700', fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },

  // Help note
  helpNote: {
    fontSize: 11, fontFamily: 'Inter_400Regular',
    textAlign: 'center', lineHeight: 18,
  },
});
