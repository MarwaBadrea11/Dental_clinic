// ─────────────────────────────────────────────
// Register Screen — Elite Premium Redesign
// Cinematic staggered animations · Neon glow
// Glassmorphism card · Deep dark canvas
// ─────────────────────────────────────────────
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import Text from '../components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/appStore';
import { register, login, fetchMyPatient, adaptPatient, ApiRequestError } from '../services';
import type { AppColors } from '../theme/colors';
import { DatePickerField } from '../components/DatePickerField';

const { width } = Dimensions.get('window');

// ── Cinematic easing — cubic-bezier approximation via Bezier ──────────────
// "Expo out" feel: fast start, graceful deceleration
const EASE_OUT_EXPO  = Easing.bezier(0.16, 1, 0.3, 1);
// "Back out" feel: tiny overshoot on settle
const EASE_BACK_OUT  = Easing.bezier(0.34, 1.56, 0.64, 1);
// Smooth in-out for progress bar
const EASE_IN_OUT    = Easing.bezier(0.65, 0, 0.35, 1);

// ── Stagger timing ──────────────────────────────────────────────────────────
const STAGGER_BASE = 60; // ms between each field appearing

// ── Phone validation ────────────────────────────────────────────────────────
function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '');
  if (!cleaned) return false;
  return /^\+?[1-9]\d{6,14}$/.test(cleaned) || /^\d{7,15}$/.test(cleaned);
}

// ── Animated stagger wrapper ────────────────────────────────────────────────
// Each child fades + slides up with a delay based on its index.
function StaggerItem({
  index,
  children,
  triggered,
}: {
  index: number;
  children: React.ReactNode;
  triggered: boolean;
}) {
  const opacity  = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    if (!triggered) return;
    const delay = index * STAGGER_BASE + 80;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 480,
        delay,
        easing: EASE_OUT_EXPO,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 520,
        delay,
        easing: EASE_OUT_EXPO,
        useNativeDriver: true,
      }),
    ]).start();
  }, [triggered]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ── Premium field component ─────────────────────────────────────────────────
type FieldConfig = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'numeric';
  secure?: boolean;
  maxLength?: number;
  error?: string;
  rightIcon?: React.ReactNode;
};

function PremiumField({
  label, placeholder, value, onChange,
  keyboardType, secure, maxLength, error, rightIcon,
  isRTL, colors, isDark,
}: FieldConfig & { isRTL: boolean; colors: AppColors; isDark: boolean }) {
  const [focused, setFocused] = useState(false);
  const focusAnim  = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;

  const align    = isRTL ? 'right' : 'left';
  const rowDir   = isRTL ? 'row-reverse' as const : 'row' as const;

  const handleFocus = useCallback(() => {
    setFocused(true);
    Animated.parallel([
      Animated.timing(focusAnim, { toValue: 1, duration: 280, easing: EASE_OUT_EXPO, useNativeDriver: false }),
      Animated.timing(glowAnim,  { toValue: 1, duration: 360, easing: EASE_OUT_EXPO, useNativeDriver: false }),
    ]).start();
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
    Animated.parallel([
      Animated.timing(focusAnim, { toValue: 0, duration: 220, easing: EASE_IN_OUT, useNativeDriver: false }),
      Animated.timing(glowAnim,  { toValue: 0, duration: 300, easing: EASE_IN_OUT, useNativeDriver: false }),
    ]).start();
  }, []);

  // Border color: idle → error/focus
  const borderColor = focusAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      error ? colors.error + 'aa' : (isDark ? 'rgba(97,190,197,0.18)' : 'rgba(0,105,111,0.20)'),
      error ? colors.error        : (isDark ? 'rgba(97,190,197,0.85)' : 'rgba(0,105,111,0.75)'),
    ],
  });

  // Background: dark glass lift on focus
  const bgColor = focusAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      isDark ? 'rgba(97,190,197,0.07)'  : 'rgba(0,105,111,0.05)',
    ],
  });

  // Outer glow radius (for shadow)
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isDark ? 0.45 : 0.18],
  });

  return (
    <View style={{ marginBottom: 18 }}>
      {/* Label */}
      <Text style={{
        fontSize: 10,
        fontWeight: '700',
        color: focused
          ? (isDark ? colors.teal : colors.primary)
          : colors.textSub,
        textAlign: align,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 7,
        fontFamily: 'Inter_600SemiBold',
      }}>
        {label}
      </Text>

      {/* Glow halo behind input */}
      <Animated.View style={{
        position: 'absolute',
        bottom: -3, left: -4, right: -4, top: 22,
        borderRadius: 18,
        shadowColor: error ? colors.error : colors.teal,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: glowOpacity,
        shadowRadius: 14,
        elevation: 0,
      }} />

      {/* Input container */}
      <Animated.View style={{
        flexDirection: rowDir,
        alignItems: 'center',
        backgroundColor: bgColor,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor,
        paddingHorizontal: 16,
        minHeight: 54,
      }}>
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
          placeholderTextColor={isDark ? 'rgba(139,148,158,0.55)' : 'rgba(62,73,74,0.45)'}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType ?? 'default'}
          secureTextEntry={secure}
          maxLength={maxLength}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {rightIcon && (
          <View style={{ paddingLeft: isRTL ? 0 : 10, paddingRight: isRTL ? 10 : 0 }}>
            {rightIcon}
          </View>
        )}
      </Animated.View>

      {/* Error message */}
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

// ── Main screen ─────────────────────────────────────────────────────────────
export default function RegisterScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { t, isRTL }       = useTranslation();
  const setAuthenticated   = useAppStore((s) => s.setAuthenticated);

  const [step, setStep]         = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone]       = useState('');
  const [email, setEmail]       = useState('');
  const [natId, setNatId]       = useState('');
  const [dob, setDob]           = useState('');
  const [gender, setGender]     = useState<'male' | 'female' | ''>('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPwd, setShowPwd]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Stagger trigger per step — flips to true when we enter a step
  const [step1Triggered, setStep1Triggered] = useState(false);
  const [step2Triggered, setStep2Triggered] = useState(false);

  // Header entrance animation
  const headerO = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;

  // Progress bar
  const progressAnim = useRef(new Animated.Value(0.5)).current;

  // Orb pulse
  const orbScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Header fades in
    Animated.parallel([
      Animated.timing(headerO, { toValue: 1, duration: 500, easing: EASE_OUT_EXPO, useNativeDriver: true }),
      Animated.timing(headerY, { toValue: 0, duration: 560, easing: EASE_OUT_EXPO, useNativeDriver: true }),
    ]).start();

    // Trigger stagger for step 1
    setStep1Triggered(true);

    // Orb slow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.12, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1.00, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const align = isRTL ? 'right' as const : 'left' as const;
  const rowDir = isRTL ? 'row-reverse' as const : 'row' as const;

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateStep1 = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = t('required');
    if (!validatePhone(phone)) e.phone = t('invalidPhone');
    if (!email.trim()) { e.email = t('emailRequired'); }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { e.email = t('invalidEmail'); }
    if (!natId || natId.length < 9) e.natId = t('invalidId');
    if (!gender) e.gender = t('required');
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      e.dob = isRTL ? 'تاريخ الميلاد غير صحيح' : 'Invalid date of birth';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = (): boolean => {
    const e: Record<string, string> = {};
    if (!password || password.length < 8) { e.password = t('pwdTooShort'); }
    else if (!/[A-Z]/.test(password))      { e.password = t('pwdNeedsUppercase'); }
    else if (!/[0-9]/.test(password))      { e.password = t('pwdNeedsNumber'); }
    else if (!/[^A-Za-z0-9]/.test(password)) { e.password = t('pwdNeedsSpecial'); }
    if (password !== confirm) e.confirm = t('pwdMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goToStep2 = () => {
    if (!validateStep1()) return;
    setStep(2);
    setStep2Triggered(true);
    Animated.timing(progressAnim, {
      toValue: 1, duration: 600,
      easing: EASE_IN_OUT, useNativeDriver: false,
    }).start();
  };

  const goToStep1 = () => {
    setStep(1);
    Animated.timing(progressAnim, {
      toValue: 0.5, duration: 420,
      easing: EASE_IN_OUT, useNativeDriver: false,
    }).start();
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    setGeneralError('');
    try {
      await register({
        username:      fullName.trim(),
        email:         email.trim(),
        password,
        role:          'PATIENT',
        phone:         phone.replace(/\s/g, ''),
        national_id:   natId,
        date_of_birth: dob || undefined,
        gender:        gender || undefined,
      });
      const result        = await login({ email: email.trim(), password });
      const backendPatient = await fetchMyPatient(result.accessToken);
      const patient = backendPatient
        ? adaptPatient(backendPatient, result.user.email)
        : {
            id: result.user.id, fullName: fullName.trim(),
            phone: phone.replace(/\s/g, ''), nationalId: natId,
            dateOfBirth: dob, gender: gender as 'male' | 'female',
            email: result.user.email,
          };
      await setAuthenticated(patient, result.accessToken, result.refreshToken);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 422) {
          const fields = err.body.details?.fields ?? [];
          const fe: Record<string, string> = {};
          for (const f of fields) {
            if (f.field === 'email')    fe.email    = f.message;
            if (f.field === 'password') fe.password = f.message;
            if (f.field === 'username') fe.fullName = f.message;
          }
          if (Object.keys(fe).length > 0) setErrors(p => ({ ...p, ...fe }));
          else setGeneralError(t('registerFailed'));
        } else if (err.status === 409) {
          setErrors(p => ({ ...p, email: t('emailAlreadyExists') }));
          goToStep1();
        } else if (err.status === 0) {
          setGeneralError(t('networkError'));
        } else {
          setGeneralError(err.body.message || t('registerFailed'));
        }
      } else {
        setGeneralError(t('networkError'));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Background colors ───────────────────────────────────────────────────────
  const bgTop: readonly [string, string, string] = isDark
    ? ['#060b10', '#0a1520', '#060e14']
    : ['#e6f3f6', '#eef7f8', '#e8f2f4'];

  const step1Fields: Omit<FieldConfig, 'rightIcon'>[] = [
    { label: t('fullName'),   placeholder: t('fullNamePh'),  value: fullName, onChange: v => { setFullName(v); setErrors(e => ({ ...e, fullName: '' })); }, error: errors.fullName },
    { label: isRTL ? 'رقم الهاتف' : 'Phone', placeholder: isRTL ? 'مثال: +966 5X XXX XXXX' : 'e.g. +966 5X XXX XXXX', value: phone, onChange: v => { setPhone(v); setErrors(e => ({ ...e, phone: '' })); }, keyboardType: 'phone-pad', error: errors.phone },
    { label: t('email'),      placeholder: t('emailPh'),     value: email,    onChange: v => { setEmail(v);    setErrors(e => ({ ...e, email:    '' })); }, keyboardType: 'email-address', error: errors.email },
    { label: t('nationalId'), placeholder: t('nationalIdPh'), value: natId,   onChange: v => { setNatId(v);   setErrors(e => ({ ...e, natId:    '' })); }, keyboardType: 'numeric', maxLength: 12, error: errors.natId },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Deep canvas gradient */}
      <LinearGradient colors={bgTop} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFillObject} />

      {/* Atmospheric orbs */}
      <Animated.View style={[styles.orb, styles.orbTop, {
        backgroundColor: isDark ? 'rgba(97,190,197,0.09)' : 'rgba(97,190,197,0.18)',
        transform: [{ scale: orbScale }],
      }]} />
      <Animated.View style={[styles.orb, styles.orbBottom, {
        backgroundColor: isDark ? 'rgba(30,89,121,0.12)' : 'rgba(121,213,220,0.15)',
        transform: [{ scale: orbScale }],
      }]} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* ── Back button ── */}
            <Animated.View style={{ opacity: headerO, transform: [{ translateY: headerY }] }}>
              <TouchableOpacity
                style={[styles.backRow, { flexDirection: rowDir }]}
                onPress={() => step === 2 ? goToStep1() : navigation.goBack()}
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
            </Animated.View>

            {/* ── Logo + brand ── */}
            <Animated.View style={[styles.logoRow, { opacity: headerO, transform: [{ translateY: headerY }] }]}>
              <View style={[styles.logoCircle, {
                backgroundColor:  isDark ? 'rgba(97,190,197,0.15)' : colors.teal,
                borderColor:      isDark ? 'rgba(97,190,197,0.40)' : 'rgba(255,255,255,0.50)',
                shadowColor:      colors.teal,
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
              <Text style={[styles.brandName, { color: isDark ? colors.blue : '#1e5979' }]}>
                {t('appName')}
              </Text>
            </Animated.View>

            {/* ── Step title ── */}
            <Animated.View style={{ opacity: headerO, transform: [{ translateY: headerY }] }}>
              <Text style={[styles.stepTitle, { color: isDark ? '#e6edf3' : '#1e5979', textAlign: align }]}>
                {step === 1 ? t('personalInfo') : t('accountSetup')}
              </Text>
              <Text style={[styles.stepSub, { color: colors.textSub, textAlign: align }]}>
                {step === 1
                  ? (isRTL ? 'أدخل بياناتك الشخصية للمتابعة' : 'Enter your personal details to continue')
                  : (isRTL ? 'أنشئ كلمة مرور آمنة لحسابك' : 'Create a secure password for your account')}
              </Text>
            </Animated.View>

            {/* ── Progress bar ── */}
            <Animated.View style={[styles.progressSection, { opacity: headerO }]}>
              <View style={[styles.progressMeta, { flexDirection: rowDir }]}>
                <Text style={[styles.progressStep, { color: isDark ? colors.teal : colors.primary }]}>
                  {step === 1 ? t('step1of2') : t('step2of2')}
                </Text>
                <Text style={[styles.progressPct, { color: colors.textSub }]}>
                  {step === 1 ? '50%' : '100%'}
                </Text>
              </View>
              {/* Track */}
              <View style={[styles.progressTrack, {
                backgroundColor: isDark ? 'rgba(97,190,197,0.12)' : 'rgba(0,105,111,0.10)',
              }]}>
                <Animated.View style={[styles.progressFill, {
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                }]}>
                  <LinearGradient
                    colors={['#00818a', '#61bec5']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  {/* Glow tip */}
                  <View style={styles.progressGlowTip} />
                </Animated.View>
              </View>
            </Animated.View>

            {/* ── Form fields (no card wrapper) ── */}
            <View style={styles.formSection}>

              {step === 1 ? (
                <>
                  {step1Fields.map((field, i) => (
                    <StaggerItem key={`f${i}`} index={i} triggered={step1Triggered}>
                      <PremiumField {...field} isRTL={isRTL} colors={colors} isDark={isDark} />
                    </StaggerItem>
                  ))}

                  {/* DOB */}
                  <StaggerItem index={4} triggered={step1Triggered}>
                    <DatePickerField
                      label={t('dateOfBirth')}
                      value={dob}
                      onChange={v => { setDob(v); setErrors(e => ({ ...e, dob: '' })); }}
                      error={errors.dob}
                      isRTL={isRTL}
                      colors={colors}
                      isDark={isDark}
                    />
                  </StaggerItem>

                  {/* Gender */}
                  <StaggerItem index={5} triggered={step1Triggered}>
                    <Text style={[styles.fieldLabel, { color: colors.textSub, textAlign: align }]}>
                      {t('gender')}
                    </Text>
                    <View style={[styles.genderRow, { flexDirection: rowDir }]}>
                      {(['male', 'female'] as const).map((g) => (
                        <TouchableOpacity
                          key={g}
                          style={[styles.genderBtn, {
                            backgroundColor: gender === g
                              ? (isDark ? 'rgba(97,190,197,0.20)' : colors.primary)
                              : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                            borderColor: gender === g
                              ? (isDark ? colors.teal : colors.primary)
                              : (isDark ? 'rgba(97,190,197,0.18)' : 'rgba(0,105,111,0.18)'),
                          }]}
                          onPress={() => { setGender(g); setErrors(e => ({ ...e, gender: '' })); }}
                          activeOpacity={0.78}
                        >
                          <Ionicons
                            name={g === 'male' ? 'male-outline' : 'female-outline'}
                            size={15}
                            color={gender === g ? (isDark ? colors.teal : '#fff') : colors.textSub}
                          />
                          <Text style={[styles.genderBtnText, {
                            color: gender === g ? (isDark ? colors.teal : '#fff') : colors.textSub,
                          }]}>
                            {t(g)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {errors.gender ? (
                      <Text style={[styles.errText, { color: colors.error }]}>{errors.gender}</Text>
                    ) : null}
                  </StaggerItem>

                  {/* Phone info note */}
                  <StaggerItem index={6} triggered={step1Triggered}>
                    <View style={[styles.infoNote, {
                      backgroundColor: isDark ? 'rgba(97,190,197,0.08)' : 'rgba(97,190,197,0.10)',
                      borderColor:     isDark ? 'rgba(97,190,197,0.20)' : 'rgba(97,190,197,0.25)',
                      flexDirection: rowDir,
                    }]}>
                      <Ionicons name="information-circle-outline" size={14} color={colors.teal} />
                      <Text style={[styles.infoNoteText, { color: isDark ? colors.teal : colors.primary, textAlign: align }]}>
                        {isRTL
                          ? 'أدخل رقم الهاتف الدولي مع رمز الدولة (مثال: +966 للرياض، +1 لأمريكا)'
                          : 'Enter international phone with country code (e.g., +966 for Riyadh, +1 for USA)'}
                      </Text>
                    </View>
                  </StaggerItem>

                  {/* Continue button */}
                  <StaggerItem index={7} triggered={step1Triggered}>
                    <TouchableOpacity
                      onPress={goToStep2}
                      activeOpacity={0.86}
                      style={styles.primaryBtnWrap}
                    >
                      <LinearGradient
                        colors={['#00818a', '#00696f', '#004f54']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.primaryBtnGradient}
                      >
                        <LinearGradient
                          colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.00)']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
                        />
                        <Text style={styles.primaryBtnText}>{t('continueBtn')}</Text>
                        <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={18} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </StaggerItem>
                </>
              ) : (
                <>
                  {/* Error banner */}
                  {generalError ? (
                    <StaggerItem index={0} triggered={step2Triggered}>
                      <View style={[styles.errorBanner, {
                        backgroundColor: isDark ? 'rgba(186,26,26,0.15)' : 'rgba(255,218,214,0.70)',
                        borderColor: colors.error + '50',
                        flexDirection: rowDir,
                      }]}>
                        <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                        <Text style={[styles.errorBannerText, { color: colors.error, textAlign: align }]}>
                          {generalError}
                        </Text>
                      </View>
                    </StaggerItem>
                  ) : null}

                  <StaggerItem index={1} triggered={step2Triggered}>
                    <PremiumField
                      label={t('password')} placeholder={t('passwordPh')}
                      value={password} onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: '' })); }}
                      secure={!showPwd} error={errors.password}
                      isRTL={isRTL} colors={colors} isDark={isDark}
                      rightIcon={
                        <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
                          <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSub} />
                        </TouchableOpacity>
                      }
                    />
                  </StaggerItem>

                  <StaggerItem index={2} triggered={step2Triggered}>
                    <PremiumField
                      label={t('confirmPwd')} placeholder={t('confirmPwdPh')}
                      value={confirm} onChange={v => { setConfirm(v); setErrors(e => ({ ...e, confirm: '' })); }}
                      secure={!showConfirm} error={errors.confirm}
                      isRTL={isRTL} colors={colors} isDark={isDark}
                      rightIcon={
                        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                          <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSub} />
                        </TouchableOpacity>
                      }
                    />
                  </StaggerItem>

                  <StaggerItem index={3} triggered={step2Triggered}>
                    <View style={[styles.infoNote, {
                      backgroundColor: isDark ? 'rgba(86,211,100,0.08)' : 'rgba(182,234,221,0.50)',
                      borderColor:     isDark ? 'rgba(86,211,100,0.20)' : 'rgba(53,103,93,0.20)',
                      flexDirection: rowDir,
                    }]}>
                      <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
                      <Text style={[styles.infoNoteText, { color: colors.success, textAlign: align }]}>
                        {isRTL
                          ? 'كلمة المرور: 8 أحرف على الأقل، حرف كبير، رقم، ورمز خاص'
                          : 'Min 8 chars, one uppercase, one number, one special character'}
                      </Text>
                    </View>
                  </StaggerItem>

                  <StaggerItem index={4} triggered={step2Triggered}>
                    <TouchableOpacity
                      style={[styles.primaryBtnWrap, loading && { opacity: 0.6 }]}
                      onPress={handleRegister}
                      disabled={loading}
                      activeOpacity={0.86}
                    >
                      <LinearGradient
                        colors={['#00818a', '#00696f', '#004f54']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.primaryBtnGradient}
                      >
                        <LinearGradient
                          colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.00)']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
                        />
                        {loading ? (
                          <Text style={styles.primaryBtnText}>
                            {isRTL ? 'جاري الإنشاء...' : 'Creating...'}
                          </Text>
                        ) : (
                          <>
                            <Text style={styles.primaryBtnText}>{t('createAccount')}</Text>
                            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </StaggerItem>
                </>
              )}

              {/* Login link */}
              <StaggerItem index={step === 1 ? 8 : 5} triggered={step === 1 ? step1Triggered : step2Triggered}>
                <View style={[styles.loginRow, { flexDirection: rowDir }]}>
                  <Text style={[styles.loginText, { color: colors.textSub }]}>
                    {`${t('hasAccount')} `}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                    <Text style={[styles.loginLink, { color: isDark ? colors.teal : colors.primary }]}>
                      {t('loginBtn') ?? (isRTL ? 'تسجيل الدخول' : 'Sign in')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </StaggerItem>
            </View>

          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#060b10' },
  flex:  { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingBottom: 52, paddingTop: 0 },

  // Orbs
  orb:       { position: 'absolute', borderRadius: 9999 },
  orbTop:    { width: 340, height: 340, top: -100, right: -80 },
  orbBottom: { width: 240, height: 240, bottom: 120, left: -70 },

  // Back
  backRow: { alignItems: 'center', gap: 6, paddingVertical: 10 },
  backText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  // Logo
  logoRow:    { alignItems: 'center', marginTop: 4, marginBottom: 18 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.40,
    shadowRadius: 24,
    elevation: 10,
  },
  logoLetters: { fontSize: 28, fontFamily: 'Manrope_700Bold', letterSpacing: 1.5 },
  brandName:   { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.4 },

  // Step header
  stepTitle: {
    fontSize: 26, fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.6, marginBottom: 5,
  },
  stepSub: {
    fontSize: 13, fontFamily: 'Inter_400Regular',
    lineHeight: 20, marginBottom: 18,
  },

  // Progress
  progressSection: { marginBottom: 20 },
  progressMeta: { justifyContent: 'space-between', marginBottom: 9 },
  progressStep: { fontSize: 11, fontFamily: 'Inter_600SemiBold', fontWeight: '700', letterSpacing: 0.4 },
  progressPct:  { fontSize: 11, fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3, overflow: 'hidden' },
  progressGlowTip: {
    position: 'absolute', right: 0, top: -3,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#61bec5',
    shadowColor: '#61bec5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },

  // Form section (no card)
  formSection: {
    paddingTop: 4,
  },

  // Field label (gender)
  fieldLabel: {
    fontSize: 10, fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  errText: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },

  // Gender
  genderRow: { gap: 10, marginBottom: 14 },
  genderBtn: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 13,
    borderRadius: 13, borderWidth: 1.5,
  },
  genderBtnText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  // Info note
  infoNote: {
    alignItems: 'flex-start', gap: 7,
    marginVertical: 10, borderRadius: 12,
    borderWidth: 1, padding: 11,
  },
  infoNoteText: { fontSize: 11, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 17 },

  // Primary button
  primaryBtnWrap: {
    borderRadius: 16, overflow: 'hidden',
    marginTop: 18,
    shadowColor: '#00818a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryBtnGradient: {
    height: 58, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 9,
  },
  primaryBtnText: {
    fontSize: 16, color: '#ffffff',
    fontWeight: '700', fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },

  // Error banner
  errorBanner: {
    alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1,
    padding: 13, marginBottom: 14,
  },
  errorBannerText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },

  // Login link
  loginRow: { justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  loginText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  loginLink: { fontSize: 13, fontFamily: 'Inter_600SemiBold', fontWeight: '700', textDecorationLine: 'underline' },
});
