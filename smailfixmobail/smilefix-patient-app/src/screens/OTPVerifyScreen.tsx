// ─────────────────────────────────────────────
// OTP Verification Screen
// 4-digit boxes | Countdown | Resend
// Clinical Serenity | Arabic RTL | Dark Mode
// ─────────────────────────────────────────────
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  StatusBar,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import Text from '../components/Text';

const OTP_LENGTH = 4;

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OTPVerify'>;
  route: RouteProp<RootStackParamList, 'OTPVerify'>;
};

export default function OTPVerifyScreen({ navigation, route }: Props) {
  const { phone } = route.params;
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();

  const [digits, setDigits]     = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [countdown, setCountdown] = useState(59);
  const [resending, setResending] = useState(false);
  const [success, setSuccess]   = useState(false);

  // One hidden input that drives all boxes
  const hiddenRef = useRef<TextInput>(null);

  // Animations
  const cardY   = useRef(new Animated.Value(50)).current;
  const cardO   = useRef(new Animated.Value(0)).current;
  const shakeX  = useRef(new Animated.Value(0)).current;
  const successS = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardY, { toValue: 0, tension: 65, friction: 9, useNativeDriver: true }),
      Animated.timing(cardO, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
    // Auto-focus
    setTimeout(() => hiddenRef.current?.focus(), 400);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const shake = () =>
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 14,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -14, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8,   duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 55, useNativeDriver: true }),
    ]).start();

  // Handle digit input from hidden field
  const handleChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    const arr = cleaned.split('');
    while (arr.length < OTP_LENGTH) arr.push('');
    setDigits(arr);
    setError('');

    // Auto-verify when all filled
    if (cleaned.length === OTP_LENGTH) {
      Keyboard.dismiss();
      verify(cleaned);
    }
  };

  const verify = useCallback((code: string) => {
    setLoading(true);
    setError('');

    // Simulate API verification (any 4 digits pass in demo)
    setTimeout(() => {
      if (code.length === OTP_LENGTH) {
        // Success animation
        setSuccess(true);
        Animated.spring(successS, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();

        setTimeout(() => {
          setAuthenticated(
            {
              id: Date.now().toString(),
              fullName: 'أحمد محمد',
              phone,
              nationalId: '1234567890',
              dateOfBirth: '1990-01-01',
              gender: 'male',
              email: 'ahmed@smilefix.sa',
              alignersTotal: 24,
              alignersCurrent: 12,
            },
            'token-' + Date.now()
          );
          setLoading(false);
          // Navigator reacts to isAuthenticated automatically
        }, 800);
      } else {
        setLoading(false);
        setError(t('incorrectVerificationCode'));
        setDigits(Array(OTP_LENGTH).fill(''));
        shake();
        setTimeout(() => hiddenRef.current?.focus(), 200);
      }
    }, 1200);
  }, [phone]);

  const handleResend = () => {
    setResending(true);
    setDigits(Array(OTP_LENGTH).fill(''));
    setError('');
    setTimeout(() => {
      setResending(false);
      setCountdown(59);
      setTimeout(() => hiddenRef.current?.focus(), 200);
    }, 1000);
  };

  const filledCount = digits.filter(Boolean).length;

  const s = makeStyles(colors, isRTL, isDark);

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      <LinearGradient
        colors={[colors.surface, colors.bg, colors.warm + (isDark ? '40' : '70')]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={s.blob1} />
      <View style={s.blob2} />

      <SafeAreaView style={s.safe}>
        {/* ── Back ── */}
        <TouchableOpacity
          style={s.backRow}
          onPress={() => navigation.goBack()}
        >
          <Text style={s.backArrow}>{isRTL ? '←' : '→'}</Text>
          <Text style={s.backText}>{t('changeNumber')}</Text>
        </TouchableOpacity>

        {/* ── Header ── */}
        <View style={s.header}>
          {/* Success icon or lock icon */}
          <Animated.View
            style={[
              s.iconCircle,
              success && s.iconCircleSuccess,
              {
                transform: [{
                  scale: successS.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }),
                }],
              },
            ]}
          >
            <Text style={s.iconEmoji}>{success ? '✅' : '📱'}</Text>
          </Animated.View>

          <Text style={s.title}>
            {success ? t('verificationSuccess') : t('enterVerificationCode')}
          </Text>
          <Text style={s.subtitle}>
            {success
              ? t('loggingYouIn')
              : isRTL ? `أرسلنا رمزاً مكوّناً من ${OTP_LENGTH} أرقام إلى` : `We sent a ${OTP_LENGTH}-digit code to`}
          </Text>
          {!success && (
            <Text style={s.phoneDisplay}>{phone}</Text>
          )}
        </View>

        {/* ── OTP Card ── */}
        <Animated.View
          style={[
            s.card,
            {
              opacity: cardO,
              transform: [{ translateY: cardY }, { translateX: shakeX }],
            },
          ]}
        >
          {/* ── 4 digit boxes ── */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => hiddenRef.current?.focus()}
            style={s.boxesRow}
          >
            {digits.map((d, i) => {
              const isFocused = !loading && filledCount === i;
              const isFilled  = !!d;
              return (
                <View
                  key={i}
                  style={[
                    s.digitBox,
                    isFocused && s.digitBoxFocused,
                    isFilled  && s.digitBoxFilled,
                    !!error   && s.digitBoxError,
                    success   && s.digitBoxSuccess,
                  ]}
                >
                  {loading && isFilled ? (
                    <ActivityIndicator color={colors.teal} size="small" />
                  ) : (
                    <Text style={[s.digitText, isFilled && s.digitTextFilled]}>
                      {d || (isFocused ? '|' : '')}
                    </Text>
                  )}
                </View>
              );
            })}
          </TouchableOpacity>

          {/* Hidden input */}
          <TextInput
            ref={hiddenRef}
            style={s.hiddenInput}
            value={digits.join('')}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            caretHidden
          />

          {/* Error message */}
          {!!error && (
            <View style={s.errRow}>
              <Text style={s.errText}>{error}</Text>
              <Text style={s.errIcon}>⚠️</Text>
            </View>
          )}

          {/* Progress bar */}
          <View style={s.progressTrack}>
            <Animated.View
              style={[
                s.progressFill,
                { width: `${(filledCount / OTP_LENGTH) * 100}%` },
                success && s.progressSuccess,
              ]}
            />
          </View>
          <Text style={s.progressHint}>
            {filledCount}/{OTP_LENGTH} {t('digits')}
          </Text>

          {/* Verify button (manual) */}
          {!success && (
            <TouchableOpacity
              style={[
                s.btnVerify,
                (loading || filledCount < OTP_LENGTH) && s.btnDisabled,
              ]}
              onPress={() => verify(digits.join(''))}
              disabled={loading || filledCount < OTP_LENGTH}
              activeOpacity={0.82}
            >
              <LinearGradient
                colors={
                  loading || filledCount < OTP_LENGTH
                    ? [colors.outline, colors.outline]
                    : [colors.teal, colors.blue]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.btnGrad}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <Text style={s.btnText}>{t('verifyAndEnter')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Resend section */}
          {!success && (
            <View style={s.resendSection}>
              {countdown > 0 ? (
                <View style={s.countdownRow}>
                  <Text style={s.countdownText}>
                    {t('resendAfter')}{' '}
                    <Text style={s.countdownNum}>{countdown}</Text>
                    {' '}{t('seconds')}
                  </Text>
                  {/* Circular progress */}
                  <View style={s.countdownCircle}>
                    <Text style={s.countdownCircleText}>{countdown}</Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.resendBtn}
                  onPress={handleResend}
                  disabled={resending}
                >
                  {resending ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <>
                      <Text style={s.resendIcon}>🔄</Text>
                      <Text style={s.resendText}>{t('resendCode')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>

        {/* ── Demo hint ── */}
        <View style={s.demoBox}>
          <Text style={s.demoIcon}>💡</Text>
          <Text style={s.demoText}>
            {isRTL ? `للتجربة: أدخل أي ${OTP_LENGTH} أرقام للدخول` : `Demo: enter any ${OTP_LENGTH} digits to login`}
          </Text>
        </View>

        {/* ── Register link ── */}
        <View style={s.regRow}>
          <Text style={s.regText}>{t('newPatient')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={s.regLink}>{t('createAccountNow')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────
function makeStyles(c: any, isRTL: boolean, isDark: boolean) {
  const BOX = 64;
  const textAlign = isRTL ? 'right' : 'left';
  const flexDirection = isRTL ? 'row-reverse' : 'row';
  const alignSelf = isRTL ? 'flex-end' : 'flex-start';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    safe: { flex: 1, paddingHorizontal: 24 },

    blob1: {
      position: 'absolute', width: 280, height: 280, borderRadius: 140,
      backgroundColor: isDark ? c.teal + '08' : c.teal + '14', top: -60, right: -60,
    },
    blob2: {
      position: 'absolute', width: 200, height: 200, borderRadius: 100,
      backgroundColor: isDark ? c.tealLight + '05' : c.tealLight + '10', bottom: 80, left: -60,
    },

    backRow: {
      flexDirection: flexDirection, alignItems: 'center', gap: 6,
      paddingTop: 16, paddingBottom: 4, alignSelf: alignSelf,
    },
    backArrow: { fontSize: 18, color: c.primary },
    backText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.primary },

    // Header
    header: { alignItems: 'center', marginVertical: 24 },
    iconCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: isDark ? c.teal + '10' : c.teal + '20',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
    },
    iconCircleSuccess: { backgroundColor: isDark ? c.successBg : '#b6eadd' },
    iconEmoji: { fontSize: 36 },
    title: {
      fontFamily: 'Manrope_700Bold', fontSize: 26,
      color: c.blue, textAlign: 'center', marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Inter_400Regular', fontSize: 14,
      color: c.textSub, textAlign: 'center',
    },
    phoneDisplay: {
      fontFamily: 'Manrope_700Bold', fontSize: 18,
      color: c.primary, textAlign: 'center',
      marginTop: 4, letterSpacing: 1,
    },

    // Card
    card: {
      backgroundColor: isDark ? 'rgba(22,27,34,0.85)' : 'rgba(255,255,255,0.82)',
      borderRadius: 24, padding: 24,
      borderWidth: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)',
      shadowColor: c.blue, shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.04 : 0.07, shadowRadius: 28, elevation: 4,
      marginBottom: 16,
    },

    // OTP boxes
    boxesRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 16,
    },
    digitBox: {
      width: BOX, height: BOX, borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
      borderWidth: 2, borderColor: c.outline,
      alignItems: 'center', justifyContent: 'center',
    },
    digitBoxFocused: {
      borderColor: c.teal,
      shadowColor: c.teal, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: isDark ? 0.2 : 0.3, shadowRadius: 8, elevation: 3,
    },
    digitBoxFilled: { borderColor: c.blue, backgroundColor: c.blue + (isDark ? '10' : '08') },
    digitBoxError:  { borderColor: c.error, backgroundColor: c.errorBg + (isDark ? '30' : '40') },
    digitBoxSuccess: { borderColor: isDark ? c.success : '#35675d', backgroundColor: isDark ? c.successBg : '#b6eadd' },
    digitText: {
      fontFamily: 'Manrope_700Bold', fontSize: 28,
      color: c.outline, letterSpacing: 0,
    },
    digitTextFilled: { color: c.blue },

    // Hidden input
    hiddenInput: {
      position: 'absolute', opacity: 0,
      width: 1, height: 1, top: 0, left: 0,
    },

    // Error
    errRow: {
      flexDirection: flexDirection, alignItems: 'center',
      justifyContent: 'center', gap: 6, marginBottom: 12,
    },
    errText: {
      fontFamily: 'Inter_400Regular', fontSize: 13,
      color: c.error, textAlign: 'center',
    },
    errIcon: { fontSize: 14 },

    // Progress
    progressTrack: {
      height: 4, backgroundColor: c.outline + (isDark ? '30' : '40'),
      borderRadius: 2, overflow: 'hidden', marginBottom: 6,
    },
    progressFill: {
      height: '100%', backgroundColor: c.teal,
      borderRadius: 2,
    },
    progressSuccess: { backgroundColor: isDark ? c.success : '#35675d' },
    progressHint: {
      fontFamily: 'Inter_400Regular', fontSize: 11,
      color: c.textSub, textAlign: 'center', marginBottom: 16,
    },

    // Verify button
    btnVerify: {
      borderRadius: 16, overflow: 'hidden',
      shadowColor: c.teal, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.25 : 0.30, shadowRadius: 18, elevation: 5,
      marginBottom: 16,
    },
    btnDisabled: { opacity: 0.45 },
    btnGrad: { height: 56, alignItems: 'center', justifyContent: 'center' },
    btnText: {
      fontFamily: 'Manrope_700Bold', fontSize: 17,
      color: c.onPrimary, letterSpacing: 0.3,
    },

    // Resend
    resendSection: { alignItems: 'center' },
    countdownRow: {
      flexDirection: flexDirection, alignItems: 'center', gap: 10,
    },
    countdownText: {
      fontFamily: 'Inter_400Regular', fontSize: 13, color: c.textSub,
    },
    countdownNum: {
      fontFamily: 'Manrope_700Bold', color: c.primary,
    },
    countdownCircle: {
      width: 36, height: 36, borderRadius: 18,
      borderWidth: 2, borderColor: c.teal,
      alignItems: 'center', justifyContent: 'center',
    },
    countdownCircleText: {
      fontFamily: 'Manrope_700Bold', fontSize: 13, color: c.primary,
    },
    resendBtn: {
      flexDirection: flexDirection, alignItems: 'center', gap: 8,
      paddingVertical: 10, paddingHorizontal: 20,
      backgroundColor: isDark ? c.successBg + '30' : '#b6eadd' + '60',
      borderRadius: 12,
    },
    resendIcon: { fontSize: 16 },
    resendText: {
      fontFamily: 'Inter_600SemiBold', fontSize: 14, color: c.primary,
    },

    // Demo
    demoBox: {
      flexDirection: flexDirection, alignItems: 'center', gap: 8,
      backgroundColor: c.warm, borderRadius: 12,
      padding: 12, marginBottom: 16,
    },
    demoIcon: { fontSize: 16 },
    demoText: {
      fontFamily: 'Inter_400Regular', fontSize: 12,
      color: c.textSub, flex: 1, textAlign: textAlign,
    },

    // Register
    regRow: {
      flexDirection: flexDirection, justifyContent: 'center', alignItems: 'center',
    },
    regText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: c.textSub },
    regLink: {
      fontFamily: 'Manrope_700Bold', fontSize: 14,
      color: c.primary, textDecorationLine: 'underline',
    },
  });
}
