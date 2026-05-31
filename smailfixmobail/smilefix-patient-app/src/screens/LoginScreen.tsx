// ─────────────────────────────────────────────
// Login Screen — Phone + OTP + Biometric
// Clinical Serenity | Arabic RTL | Expo 54
// ─────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../hooks/useTheme';
import Text from '../components/Text';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

// ── International phone validator ────────────
function isValidPhone(v: string): boolean {
  const cleaned = v.replace(/\s/g, '');
  if (!cleaned) return false;
  
  // Accept international numbers with optional plus sign
  // Minimum 7 digits, maximum 15 digits (including country code)
  const internationalPattern = /^\+?[1-9]\d{6,14}$/;
  
  // Also accept local numbers (without country code) for backward compatibility
  const localPattern = /^\d{7,15}$/;
  
  return internationalPattern.test(cleaned) || localPattern.test(cleaned);
}

export default function LoginScreen({ navigation }: Props) {
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const { t, isRTL } = useTranslation();
  const { colors, isDark } = useTheme();

  const [phone, setPhone]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [phoneErr, setPhoneErr]   = useState('');

  // ── Animations ────────────────────────────
  const cardY  = useRef(new Animated.Value(60)).current;
  const cardO  = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardY, { toValue: 0, tension: 65, friction: 9, useNativeDriver: true }),
      Animated.timing(cardO, { toValue: 1, duration: 550, useNativeDriver: true }),
    ]).start();
  }, []);

  function shake() {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 12,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -12, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 7,   duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 55, useNativeDriver: true }),
    ]).start();
  }

  // ── Send OTP ──────────────────────────────
  function handleSendOtp() {
    const cleaned = phone.replace(/\s/g, '');
    if (!cleaned) {
      setPhoneErr(t('phoneRequired'));
      shake();
      return;
    }
    if (!isValidPhone(cleaned)) {
      setPhoneErr(t('enterValidPhone'));
      shake();
      return;
    }
    setPhoneErr('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('OTPVerify', { phone: cleaned });
    }, 900);
  }

  // ── Biometric ─────────────────────────────
  async function handleBiometric() {
    setBioLoading(true);
    try {
      const LA = await import('expo-local-authentication');
      const hasHW    = await LA.hasHardwareAsync();
      const enrolled = await LA.isEnrolledAsync();

      if (!hasHW || !enrolled) {
        Alert.alert(
          t('notAvailable'),
          t('biometricNotEnabled'),
          [{ text: t('ok') }]
        );
        setBioLoading(false);
        return;
      }

      const result = await LA.authenticateAsync({
        promptMessage:         t('loginToSmileFix'),
        fallbackLabel:         t('usePassword'),
        cancelLabel:           t('cancel'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        navigation.navigate('OTPVerify', { phone: '0500000000' });
      } else {
        Alert.alert(t('verificationFailed'), t('fingerprintNotRecognized'));
      }
    } catch {
      Alert.alert(t('error'), t('biometricActivationFailed'));
    } finally {
      setBioLoading(false);
    }
  }

  const s = makeStyles(colors, isRTL, isDark);

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* Background */}
      <LinearGradient
        colors={[colors.surface, colors.bg, colors.warm + (isDark ? '40' : '70')]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative blobs */}
      <View style={s.blob1} />
      <View style={s.blob2} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={s.flex}>
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* ── Back button ── */}
            <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()}>
              <Text style={s.backArrow}>{isRTL ? '←' : '→'}</Text>
              <Text style={s.backText}>{t('back')}</Text>
            </TouchableOpacity>

            {/* ── Mini logo ── */}
            <View style={s.logoRow}>
              <View style={s.logoCircle}>
                <View style={s.logoShine} />
                <Text style={s.logoLetters}>SF</Text>
              </View>
              <Text style={s.logoBrand}>SmileFix</Text>
            </View>

            {/* ── Header ── */}
            <View style={s.header}>
              <Text style={s.title}>{t('welcomeBack')}</Text>
              <Text style={s.subtitle}>
                {t('enterPhoneToLogin')}
              </Text>
            </View>

            {/* ── Glass card ── */}
            <Animated.View
              style={[
                s.card,
                {
                  opacity: cardO,
                  transform: [
                    { translateY: cardY },
                    { translateX: shakeX },
                  ],
                },
              ]}
            >
              {/* Phone label */}
              <Text style={s.fieldLabel}>{t('phoneNumber')}</Text>

              {/* Phone input row */}
              <View style={[s.inputRow, phoneErr ? s.inputRowErr : null]}>
                <View style={s.flagBox}>
                  <Text style={s.flagEmoji}>🇸🇦</Text>
                  <Text style={s.flagCode}>+966</Text>
                </View>
                <View style={s.inputDivider} />
                <TextInput
                  style={s.phoneInput}
                  placeholder={t('phoneExample')}
                  placeholderTextColor={colors.textSub + '70'}
                  value={phone}
                  onChangeText={(t) => { setPhone(t); setPhoneErr(''); }}
                  keyboardType="phone-pad"
                  maxLength={15}
                  textAlign={isRTL ? 'right' : 'left'}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                />
              </View>

              {/* Error */}
              {phoneErr ? (
                <View style={s.errRow}>
                  <Text style={s.errText}>{phoneErr}</Text>
                  <Text style={s.errIcon}>{'⚠️'}</Text>
                </View>
              ) : null}

              {/* Hint */}
              <Text style={s.phoneHint}>
                {t('otpWillBeSent')}
              </Text>

              {/* ── Send OTP button ── */}
              <TouchableOpacity
                style={[s.btnPrimary, loading ? s.btnDisabled : null]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.82}
              >
                <LinearGradient
                  colors={loading ? [colors.outline, colors.outline] : [colors.teal, colors.blue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.btnGrad}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.onPrimary} size="small" />
                  ) : (
                    <Text style={s.btnText}>{t('sendVerificationCode')}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={s.divRow}>
                <View style={s.divLine} />
                <Text style={s.divText}>{t('or')}</Text>
                <View style={s.divLine} />
              </View>

              {/* ── Biometric button ── */}
              <TouchableOpacity
                style={[s.bioBtn, bioLoading ? s.btnDisabled : null]}
                onPress={handleBiometric}
                disabled={bioLoading}
                activeOpacity={0.82}
              >
                {bioLoading ? (
                  <ActivityIndicator color={colors.blue} size="small" />
                ) : (
                  <View style={s.bioBtnInner}>
                    <Text style={s.bioIcon}>🔐</Text>
                    <View style={s.bioCopy}>
                      <Text style={s.bioTitle}>{t('loginWithBiometric')}</Text>
                      <Text style={s.bioSub}>{t('quickSecureLogin')}</Text>
                    </View>
                    <Text style={s.bioArrow}>{isRTL ? '←' : '→'}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* ── Unique phone rule ── */}
              <View style={s.ruleBox}>
                <Text style={s.ruleIcon}>ℹ️</Text>
                <Text style={s.ruleText}>
                  {t('uniquePhoneRule')}
                </Text>
              </View>
            </Animated.View>

            {/* ── Register link ── */}
            <View style={s.regRow}>
              <Text style={s.regText}>{t('newPatient')} </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.regLink}>{t('createAccountNow')}</Text>
              </TouchableOpacity>
            </View>

            {/* ── Security note ── */}
            <View style={s.secNote}>
              <Text style={s.secIcon}>🔒</Text>
              <Text style={s.secText}>
                {t('dataProtectedSSL')}
              </Text>
            </View>

          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────
function makeStyles(c: any, isRTL: boolean, isDark: boolean) {
  const textAlign = isRTL ? 'right' : 'left';
  const paddingRight = isRTL ? 20 : 0;
  const paddingLeft = isRTL ? 0 : 20;
  const flexDirection = isRTL ? 'row-reverse' : 'row';
  const alignSelf = isRTL ? 'flex-end' : 'flex-start';

  return StyleSheet.create({
    root:  { flex: 1, backgroundColor: c.bg },
    flex:  { flex: 1 },
    scroll: { paddingHorizontal: 24, paddingBottom: 48 },

    // Blobs
    blob1: {
      position: 'absolute', width: 300, height: 300, borderRadius: 150,
      backgroundColor: isDark ? c.teal + '08' : c.teal + '14', top: -70, right: -70,
    },
    blob2: {
      position: 'absolute', width: 200, height: 200, borderRadius: 100,
      backgroundColor: isDark ? c.tealLight + '05' : c.tealLight + '10', bottom: 100, left: -60,
    },

    // Back
    backRow: {
      flexDirection: flexDirection, alignItems: 'center', gap: 6,
      paddingTop: 16, paddingBottom: 4, alignSelf: alignSelf,
    },
    backArrow: { fontSize: 18, color: c.primary },
    backText:  { fontSize: 14, color: c.primary, fontWeight: '600' },

    // Logo
    logoRow: { alignItems: 'center', marginVertical: 20 },
    logoCircle: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: c.teal,
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', marginBottom: 10,
      shadowColor: c.blue, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.15 : 0.28, shadowRadius: 16, elevation: 6,
    },
    logoShine: {
      position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
      backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)',
      borderTopLeftRadius: 32, borderTopRightRadius: 32,
    },
    logoLetters: { fontSize: 24, color: c.onPrimaryContainer, fontWeight: '700' },
    logoBrand:   { fontSize: 20, color: c.blue,   fontWeight: '800' },

    // Header
    header:   { marginBottom: 24, alignItems: alignSelf },
    title:    { 
      fontSize: 26, color: c.blue, textAlign: textAlign, 
      fontWeight: '700', marginBottom: 6, 
      paddingRight: paddingRight, paddingLeft: paddingLeft 
    },
    subtitle: { 
      fontSize: 14, color: c.textSub, textAlign: textAlign, 
      lineHeight: 22, 
      paddingRight: paddingRight, paddingLeft: paddingLeft 
    },

    // Card
    card: {
      backgroundColor: isDark ? 'rgba(22,27,34,0.85)' : 'rgba(255,255,255,0.82)',
      borderRadius: 24, padding: 22,
      borderWidth: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)',
      shadowColor: c.blue, shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.04 : 0.07, shadowRadius: 28, elevation: 4,
      marginBottom: 20,
    },

    fieldLabel: {
      fontSize: 11, color: c.textSub, letterSpacing: 0.6,
      textTransform: 'uppercase', textAlign: textAlign,
      marginBottom: 8, marginRight: isRTL ? 2 : 0,
      marginLeft: isRTL ? 0 : 2, fontWeight: '600',
    },

    // Phone input
    inputRow: {
      flexDirection: flexDirection, alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)',
      borderRadius: 14, borderWidth: 1.5,
      borderColor: 'transparent', minHeight: 56,
      overflow: 'hidden',
    },
    inputRowErr: { borderColor: c.error },
    flagBox: {
      flexDirection: flexDirection, alignItems: 'center',
      paddingHorizontal: 12, gap: 4,
    },
    flagEmoji: { fontSize: 20 },
    flagCode:  { fontSize: 14, color: c.blue, fontWeight: '600' },
    inputDivider: { width: 1, height: 28, backgroundColor: c.outline + (isDark ? '40' : '60') },
    phoneInput: {
      flex: 1, fontSize: 17, color: c.text,
      paddingHorizontal: 14, paddingVertical: 14, letterSpacing: 1,
      textAlign: textAlign,
    },

    // Error
    errRow: {
      flexDirection: flexDirection, alignItems: 'center',
      justifyContent: isRTL ? 'flex-end' : 'flex-start', gap: 6,
      marginTop: 6, marginBottom: 4,
    },
    errText: { fontSize: 12, color: c.error, textAlign: textAlign },
    errIcon: { fontSize: 14 },

    phoneHint: {
      fontSize: 12, color: c.textSub, textAlign: textAlign,
      marginTop: 8, marginBottom: 16, lineHeight: 18,
      paddingRight: paddingRight, paddingLeft: paddingLeft,
    },

    // Primary button
    btnPrimary: {
      borderRadius: 16, overflow: 'hidden',
      shadowColor: c.teal, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.25 : 0.32, shadowRadius: 18, elevation: 5,
    },
    btnDisabled: { opacity: 0.5 },
    btnGrad: { height: 56, alignItems: 'center', justifyContent: 'center' },
    btnText: { fontSize: 17, color: c.onPrimary, fontWeight: '700', letterSpacing: 0.3 },

    // Divider
    divRow: {
      flexDirection: flexDirection, alignItems: 'center',
      marginVertical: 18, gap: 10,
    },
    divLine: { flex: 1, height: 1, backgroundColor: c.outline + (isDark ? '40' : '80') },
    divText: { fontSize: 13, color: c.textSub },

    // Biometric
    bioBtn: {
      backgroundColor: isDark ? c.warm : c.warm,
      borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: isDark ? c.outline + '40' : c.tealLight + '60',
      minHeight: 64, justifyContent: 'center',
    },
    bioBtnInner: {
      flexDirection: flexDirection, alignItems: 'center', gap: 12,
    },
    bioIcon:  { fontSize: 28 },
    bioCopy:  { flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' },
    bioTitle: { fontSize: 15, color: c.blue, textAlign: textAlign, fontWeight: '600' },
    bioSub:   { fontSize: 12, color: c.textSub, textAlign: textAlign, marginTop: 2 },
    bioArrow: { fontSize: 18, color: c.teal },

    // Unique phone rule
    ruleBox: {
      flexDirection: flexDirection, alignItems: 'flex-start',
      gap: 8, marginTop: 16,
      backgroundColor: isDark ? c.successBg + '30' : c.successBg + '50',
      borderRadius: 12, padding: 12,
    },
    ruleIcon: { fontSize: 14 },
    ruleText: {
      flex: 1, fontSize: 12, color: isDark ? c.success : c.secText,
      textAlign: textAlign, lineHeight: 18,
    },

    // Register
    regRow: {
      flexDirection: flexDirection, justifyContent: 'center',
      alignItems: 'center', marginBottom: 12,
    },
    regText: { fontSize: 14, color: c.textSub },
    regLink: { fontSize: 14, color: c.primary, fontWeight: '700', textDecorationLine: 'underline' },

    // Security note
    secNote: {
      flexDirection: flexDirection, alignItems: 'center',
      gap: 8, backgroundColor: isDark ? c.successBg + '20' : c.successBg + '40',
      borderRadius: 12, padding: 12,
    },
    secIcon: { fontSize: 16 },
    secText: {
      flex: 1, fontSize: 11, color: isDark ? c.success : c.secText,
      textAlign: textAlign, lineHeight: 17,
    },
  });
}