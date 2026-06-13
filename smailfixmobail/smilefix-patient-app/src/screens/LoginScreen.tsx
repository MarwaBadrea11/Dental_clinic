// ─────────────────────────────────────────────
// Login Screen — Elite Premium Redesign
// Cinematic staggered entrance · Neon glow fields
// Deep dark canvas · Organic spring shake
// ─────────────────────────────────────────────
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StatusBar,
  ActivityIndicator,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../hooks/useTheme';
import { login, fetchMyPatient, adaptPatient, ApiRequestError } from '../services';
import Text from '../components/Text';
import type { AppColors } from '../theme/colors';

const { width } = Dimensions.get('window');

// ── Cinematic easing curves ────────────────────────────────────────────────
const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);   // fast-in, graceful decel
const EASE_IN_OUT   = Easing.bezier(0.65, 0, 0.35, 1);  // symmetric smooth
const EASE_BACK_OUT = Easing.bezier(0.34, 1.56, 0.64, 1); // slight overshoot

// ── Stagger timing ─────────────────────────────────────────────────────────
const STAGGER = 70; // ms between each element

// ── Stagger wrapper ────────────────────────────────────────────────────────
function StaggerItem({
  index,
  children,
  style,
}: {
  index: number;
  children: React.ReactNode;
  style?: object;
}) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    const delay = index * STAGGER + 100;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 520, delay,
        easing: EASE_OUT_EXPO, useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 560, delay,
        easing: EASE_OUT_EXPO, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ── Premium input field ────────────────────────────────────────────────────
function PremiumInput({
  label, placeholder, value, onChange,
  keyboardType, secure, rightIcon, leftIcon,
  error, isRTL, colors, isDark,
  onSubmit,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: 'default' | 'email-address';
  secure?: boolean;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ComponentProps<typeof Ionicons>['name'];
  error?: string;
  isRTL: boolean;
  colors: AppColors;
  isDark: boolean;
  onSubmit?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  const align  = isRTL ? 'right' as const : 'left' as const;
  const rowDir = isRTL ? 'row-reverse' as const : 'row' as const;

  const onFocus = useCallback(() => {
    setFocused(true);
    Animated.parallel([
      Animated.timing(focusAnim, { toValue: 1, duration: 300, easing: EASE_OUT_EXPO, useNativeDriver: false }),
      Animated.timing(glowAnim,  { toValue: 1, duration: 400, easing: EASE_OUT_EXPO, useNativeDriver: false }),
    ]).start();
  }, []);

  const onBlur = useCallback(() => {
    setFocused(false);
    Animated.parallel([
      Animated.timing(focusAnim, { toValue: 0, duration: 240, easing: EASE_IN_OUT, useNativeDriver: false }),
      Animated.timing(glowAnim,  { toValue: 0, duration: 320, easing: EASE_IN_OUT, useNativeDriver: false }),
    ]).start();
  }, []);

  const borderColor = focusAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      error ? colors.error + 'aa' : (isDark ? 'rgba(97,190,197,0.16)' : 'rgba(0,105,111,0.18)'),
      error ? colors.error        : (isDark ? 'rgba(97,190,197,0.80)' : 'rgba(0,105,111,0.70)'),
    ],
  });

  const bgColor = focusAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      isDark ? 'rgba(97,190,197,0.07)'  : 'rgba(0,105,111,0.05)',
    ],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, isDark ? 0.50 : 0.20],
  });

  return (
    <View style={{ marginBottom: 20 }}>
      {/* Label */}
      <Text style={{
        fontSize: 10, fontWeight: '700',
        fontFamily: 'Inter_600SemiBold',
        color: focused
          ? (isDark ? colors.teal : colors.primary)
          : colors.textSub,
        textAlign: align,
        letterSpacing: 1.3,
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        {label}
      </Text>

      {/* Glow halo */}
      <Animated.View style={{
        position: 'absolute',
        top: 22, bottom: -4, left: -4, right: -4,
        borderRadius: 18,
        shadowColor: error ? colors.error : colors.teal,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: glowOpacity,
        shadowRadius: 16,
        elevation: 0,
      }} />

      {/* Input row */}
      <Animated.View style={{
        flexDirection: rowDir,
        alignItems: 'center',
        backgroundColor: bgColor,
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor,
        paddingHorizontal: 16,
        minHeight: 56,
      }}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={17}
            color={focused
              ? (isDark ? colors.teal : colors.primary)
              : (error ? colors.error : colors.textSub)}
            style={{ marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }}
          />
        )}
        <TextInput
          style={{
            flex: 1,
            fontSize: 15,
            color: colors.text,
            textAlign: align,
            paddingVertical: 14,
            fontFamily: 'Inter_400Regular',
          }}
          placeholder={placeholder}
          placeholderTextColor={isDark ? 'rgba(139,148,158,0.50)' : 'rgba(62,73,74,0.42)'}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType ?? 'default'}
          secureTextEntry={secure}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={onFocus}
          onBlur={onBlur}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
        {rightIcon && (
          <View style={{ paddingLeft: isRTL ? 0 : 8, paddingRight: isRTL ? 8 : 0 }}>
            {rightIcon}
          </View>
        )}
      </Animated.View>

      {/* Error */}
      {error ? (
        <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 5, marginTop: 5 }}>
          <Ionicons name="alert-circle" size={12} color={colors.error} />
          <Text style={{ fontSize: 11, color: colors.error, textAlign: align, fontFamily: 'Inter_400Regular' }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const setAuthenticated   = useAppStore((s) => s.setAuthenticated);
  const { t, isRTL }       = useTranslation();
  const { colors, isDark } = useTheme();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [emailErr, setEmailErr]     = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [generalErr, setGeneralErr]   = useState('');

  // Shake animation for error feedback
  const shakeX = useRef(new Animated.Value(0)).current;

  // Orb slow pulse
  const orbScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.15, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1.00, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Cinematic shake — springy feel instead of rigid linear bounces
  function shake() {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 14,  duration: 70,  easing: EASE_BACK_OUT, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -11, duration: 70,  easing: EASE_BACK_OUT, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 7,   duration: 60,  easing: EASE_BACK_OUT, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -4,  duration: 60,  easing: EASE_BACK_OUT, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 50,  easing: EASE_IN_OUT,   useNativeDriver: true }),
    ]).start();
  }

  function validate(): boolean {
    let valid = true;
    if (!email.trim()) { setEmailErr(t('emailRequired'));   valid = false; }
    else if (!/\S+@\S+\.\S+/.test(email.trim())) { setEmailErr(t('invalidEmail')); valid = false; }
    if (!password) { setPasswordErr(t('passwordRequired')); valid = false; }
    if (!valid) shake();
    return valid;
  }

  async function handleLogin() {
    setEmailErr('');
    setPasswordErr('');
    setGeneralErr('');
    if (!validate()) return;

    setLoading(true);
    try {
      const result         = await login({ email: email.trim(), password });
      const backendPatient = await fetchMyPatient(result.accessToken);

      if (!backendPatient) {
        setGeneralErr(t('noPatientRecord'));
        setLoading(false);
        return;
      }

      const patient = adaptPatient(backendPatient, result.user.email);
      await setAuthenticated(patient, result.accessToken, result.refreshToken);
    } catch (err) {
      shake();
      if (err instanceof ApiRequestError) {
        if (err.status === 401 || err.status === 400) setGeneralErr(t('invalidCredentials'));
        else if (err.status === 429) setGeneralErr(t('tooManyRequests'));
        else if (err.status === 0)   setGeneralErr(t('networkError'));
        else setGeneralErr(err.body.message || t('loginFailed'));
      } else {
        setGeneralErr(t('networkError'));
      }
    } finally {
      setLoading(false);
    }
  }

  const align  = isRTL ? 'right' as const : 'left' as const;
  const rowDir = isRTL ? 'row-reverse' as const : 'row' as const;

  const bgColors: readonly [string, string, string] = isDark
    ? ['#060b10', '#0a1520', '#060e14']
    : ['#e6f3f6', '#eef7f8', '#e8f2f4'];

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Deep canvas gradient */}
      <LinearGradient colors={bgColors} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFillObject} />

      {/* Atmospheric pulsing orbs */}
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

            {/* ── Back button ── */}
            <StaggerItem index={0}>
              <TouchableOpacity
                style={[styles.backRow, { flexDirection: rowDir }]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isRTL ? 'arrow-forward-outline' : 'arrow-back-outline'}
                  size={18}
                  color={isDark ? colors.teal : colors.primary}
                />
                <Text style={[styles.backText, { color: isDark ? colors.teal : colors.primary }]}>
                  {t('back')}
                </Text>
              </TouchableOpacity>
            </StaggerItem>

            {/* ── Logo ── */}
            <StaggerItem index={1} style={styles.logoRow}>
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
              <Text style={[styles.logoBrand, { color: isDark ? colors.blue : '#1e5979' }]}>
                SmileFix
              </Text>
            </StaggerItem>

            {/* ── Title ── */}
            <StaggerItem index={2}>
              <Text style={[styles.title, { color: isDark ? '#e6edf3' : '#1e5979', textAlign: align }]}>
                {t('welcomeBack')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSub, textAlign: align }]}>
                {t('signInWithEmail')}
              </Text>
            </StaggerItem>

            {/* ── General error banner ── */}
            {generalErr ? (
              <StaggerItem index={3}>
                <Animated.View style={[styles.errorBanner, {
                  backgroundColor: isDark ? 'rgba(186,26,26,0.15)' : 'rgba(255,218,214,0.75)',
                  borderColor:     colors.error + '50',
                  flexDirection:   rowDir,
                  transform:       [{ translateX: shakeX }],
                }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={[styles.errorBannerText, { color: colors.error, textAlign: align }]}>
                    {generalErr}
                  </Text>
                </Animated.View>
              </StaggerItem>
            ) : null}

            {/* ── Email field ── */}
            <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
              <StaggerItem index={generalErr ? 4 : 3}>
                <PremiumInput
                  label={t('email')}
                  placeholder={t('emailPh')}
                  value={email}
                  onChange={(v) => { setEmail(v); setEmailErr(''); setGeneralErr(''); }}
                  keyboardType="email-address"
                  leftIcon="mail-outline"
                  error={emailErr}
                  isRTL={isRTL}
                  colors={colors}
                  isDark={isDark}
                />
              </StaggerItem>

              {/* ── Password field ── */}
              <StaggerItem index={generalErr ? 5 : 4}>
                <PremiumInput
                  label={t('password')}
                  placeholder={t('passwordPh')}
                  value={password}
                  onChange={(v) => { setPassword(v); setPasswordErr(''); setGeneralErr(''); }}
                  secure={!showPwd}
                  leftIcon="lock-closed-outline"
                  error={passwordErr}
                  isRTL={isRTL}
                  colors={colors}
                  isDark={isDark}
                  onSubmit={handleLogin}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPwd(!showPwd)} activeOpacity={0.7}>
                      <Ionicons
                        name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                        size={19}
                        color={colors.textSub}
                      />
                    </TouchableOpacity>
                  }
                />
              </StaggerItem>
            </Animated.View>

            {/* ── Login button ── */}
            <StaggerItem index={generalErr ? 6 : 5}>
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.86}
                style={[styles.btnWrap, loading && { opacity: 0.60 }, { shadowColor: colors.teal }]}
              >
                <LinearGradient
                  colors={['#00818a', '#00696f', '#004f54']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnGradient}
                >
                  {/* Shimmer overlay */}
                  <LinearGradient
                    colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.00)']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
                  />
                  {loading
                    ? <ActivityIndicator color="#ffffff" size="small" />
                    : <Text style={styles.btnText}>{t('login')}</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </StaggerItem>

            {/* ── Register link ── */}
            <StaggerItem index={generalErr ? 7 : 6}>
              <View style={[styles.regRow, { flexDirection: rowDir }]}>
                <Text style={[styles.regText, { color: colors.textSub }]}>
                  {`${t('newPatient')} `}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Register')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.regLink, { color: isDark ? colors.teal : colors.primary }]}>
                    {t('createAccountNow')}
                  </Text>
                </TouchableOpacity>
              </View>
            </StaggerItem>

          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Static styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#060b10' },
  flex:  { flex: 1 },
  scroll: { paddingHorizontal: 22, paddingBottom: 52, paddingTop: 0 },

  // Orbs
  orb:   { position: 'absolute', borderRadius: 9999 },
  orbTR: { width: 320, height: 320, top: -90, right: -80 },
  orbBL: { width: 230, height: 230, bottom: 130, left: -65 },

  // Back
  backRow: { alignItems: 'center', gap: 6, paddingVertical: 10 },
  backText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  // Logo
  logoRow: { alignItems: 'center', marginTop: 10, marginBottom: 22 },
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

  // Title
  title: {
    fontSize: 30, fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.7, marginBottom: 6,
  },
  subtitle: {
    fontSize: 14, fontFamily: 'Inter_400Regular',
    lineHeight: 22, marginBottom: 26,
  },

  // Error banner
  errorBanner: {
    alignItems: 'center', gap: 9,
    borderRadius: 13, borderWidth: 1,
    padding: 13, marginBottom: 18,
  },
  errorBannerText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },

  // Button
  btnWrap: {
    borderRadius: 16, overflow: 'hidden',
    marginTop: 4, marginBottom: 28,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40, shadowRadius: 22, elevation: 8,
  },
  btnGradient: {
    height: 58, alignItems: 'center',
    justifyContent: 'center', borderRadius: 16,
  },
  btnText: {
    fontSize: 17, color: '#ffffff',
    fontWeight: '700', fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },

  // Register link
  regRow: { justifyContent: 'center', alignItems: 'center' },
  regText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  regLink: {
    fontSize: 13, fontFamily: 'Inter_600SemiBold',
    fontWeight: '700', textDecorationLine: 'underline',
  },
});
