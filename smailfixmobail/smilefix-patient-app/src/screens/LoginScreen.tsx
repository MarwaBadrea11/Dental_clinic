// ─────────────────────────────────────────────
// Login Screen — Email + Password + Biometric
// Wired to POST /api/v1/auth/login
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
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../hooks/useTheme';
import {
  login,
  fetchMyPatient,
  adaptPatient,
  ApiRequestError,
} from '../services';
import Text from '../components/Text';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const { t, isRTL }    = useTranslation();
  const { colors, isDark } = useTheme();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [emailErr, setEmailErr]   = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [generalErr, setGeneralErr]   = useState('');

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

  // ── Validate fields ───────────────────────
  function validate(): boolean {
    let valid = true;
    if (!email.trim()) {
      setEmailErr(t('emailRequired'));
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setEmailErr(t('invalidEmail'));
      valid = false;
    }
    if (!password) {
      setPasswordErr(t('passwordRequired'));
      valid = false;
    }
    if (!valid) shake();
    return valid;
  }

  // ── Login handler ─────────────────────────
  async function handleLogin() {
    setEmailErr('');
    setPasswordErr('');
    setGeneralErr('');
    if (!validate()) return;

    setLoading(true);
    try {
      // Step 1: authenticate and get tokens
      const result = await login({ email: email.trim(), password });

      // Step 2: resolve the linked patient record — pass the token explicitly
      // because setAuthenticated() hasn't been called yet, so the store is empty
      const backendPatient = await fetchMyPatient(result.accessToken);

      // Step 3: build the Patient object for the store
      const patient = backendPatient
        ? adaptPatient(backendPatient, result.user.email)
        : {
            // Fallback: no patient record yet — use user account data as placeholder
            id:          result.user.id,   // NOTE: this is the user UUID, not a patient UUID
            fullName:    result.user.username,
            phone:       '',
            nationalId:  '',
            dateOfBirth: '',
            gender:      'male' as const,
            email:       result.user.email,
          };

      await setAuthenticated(patient, result.accessToken, result.refreshToken);
      // Navigator reacts to isAuthenticated automatically — no navigation.replace needed
    } catch (err) {
      shake();
      if (err instanceof ApiRequestError) {
        if (err.status === 401 || err.status === 400) {
          setGeneralErr(t('invalidCredentials'));
        } else if (err.status === 429) {
          setGeneralErr(t('tooManyRequests'));
        } else if (err.status === 0) {
          setGeneralErr(t('networkError'));
        } else {
          setGeneralErr(err.body.message || t('loginFailed'));
        }
      } else {
        setGeneralErr(t('networkError'));
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Biometric — restores session from SecureStore ──
  async function handleBiometric() {
    setBioLoading(true);
    try {
      const LA = await import('expo-local-authentication');
      const hasHW    = await LA.hasHardwareAsync();
      const enrolled = await LA.isEnrolledAsync();

      if (!hasHW || !enrolled) {
        Alert.alert(t('notAvailable'), t('biometricNotEnabled'), [{ text: t('ok') }]);
        return;
      }

      const result = await LA.authenticateAsync({
        promptMessage:         t('loginToSmileFix'),
        fallbackLabel:         t('usePassword'),
        cancelLabel:           t('cancel'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Re-hydrate from SecureStore — the session was already saved on last login
        const hydrateFromStorage = useAppStore.getState().hydrateFromStorage;
        await hydrateFromStorage();
        // If no stored session, tell the user to log in with credentials first
        const isAuth = useAppStore.getState().isAuthenticated;
        if (!isAuth) {
          Alert.alert(t('notAvailable'), t('noStoredSession'), [{ text: t('ok') }]);
        }
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <LinearGradient
        colors={[colors.surface, colors.bg, colors.warm + (isDark ? '40' : '70')]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
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
            {/* Back */}
            <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()}>
              <Text style={s.backArrow}>{isRTL ? '←' : '→'}</Text>
              <Text style={s.backText}>{t('back')}</Text>
            </TouchableOpacity>

            {/* Logo */}
            <View style={s.logoRow}>
              <View style={s.logoCircle}>
                <View style={s.logoShine} />
                <Text style={s.logoLetters}>SF</Text>
              </View>
              <Text style={s.logoBrand}>SmileFix</Text>
            </View>

            {/* Header */}
            <View style={s.header}>
              <Text style={s.title}>{t('welcomeBack')}</Text>
              <Text style={s.subtitle}>{t('signInWithEmail')}</Text>
            </View>

            {/* Card */}
            <Animated.View
              style={[s.card, { opacity: cardO, transform: [{ translateY: cardY }, { translateX: shakeX }] }]}
            >
              {/* General error banner */}
              {generalErr ? (
                <View style={s.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={s.errorBannerText}>{generalErr}</Text>
                </View>
              ) : null}

              {/* Email */}
              <Text style={s.fieldLabel}>{t('email')}</Text>
              <View style={[s.inputRow, emailErr ? s.inputRowErr : null]}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={emailErr ? colors.error : colors.textSub}
                  style={s.inputIcon}
                />
                <TextInput
                  style={s.textInput}
                  placeholder={t('emailPh')}
                  placeholderTextColor={colors.textSub + '70'}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setEmailErr(''); setGeneralErr(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textAlign={isRTL ? 'right' : 'left'}
                  returnKeyType="next"
                />
              </View>
              {emailErr ? <Text style={s.fieldErr}>{emailErr}</Text> : null}

              {/* Password */}
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>{t('password')}</Text>
              <View style={[s.inputRow, passwordErr ? s.inputRowErr : null]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passwordErr ? colors.error : colors.textSub}
                  style={s.inputIcon}
                />
                <TextInput
                  style={s.textInput}
                  placeholder={t('passwordPh')}
                  placeholderTextColor={colors.textSub + '70'}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setPasswordErr(''); setGeneralErr(''); }}
                  secureTextEntry={!showPwd}
                  textAlign={isRTL ? 'right' : 'left'}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={s.eyeBtn}>
                  <Ionicons
                    name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSub}
                  />
                </TouchableOpacity>
              </View>
              {passwordErr ? <Text style={s.fieldErr}>{passwordErr}</Text> : null}

              {/* Login button */}
              <TouchableOpacity
                style={[s.btnPrimary, loading && s.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.82}
              >
                <LinearGradient
                  colors={loading ? [colors.outline, colors.outline] : [colors.teal, colors.blue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.btnGrad}
                >
                  {loading
                    ? <ActivityIndicator color={colors.onPrimary} size="small" />
                    : <Text style={s.btnText}>{t('login')}</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={s.divRow}>
                <View style={s.divLine} />
                <Text style={s.divText}>{t('or')}</Text>
                <View style={s.divLine} />
              </View>

              {/* Biometric */}
              <TouchableOpacity
                style={[s.bioBtn, bioLoading && s.btnDisabled]}
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

              {/* Security note */}
              <View style={s.secNote}>
                <Text style={s.secIcon}>🔒</Text>
                <Text style={s.secText}>{t('dataProtectedSSL')}</Text>
              </View>
            </Animated.View>

            {/* Register link */}
            <View style={s.regRow}>
              <Text style={s.regText}>{t('newPatient')} </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.regLink}>{t('createAccountNow')}</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────
function makeStyles(c: any, isRTL: boolean, isDark: boolean) {
  const textAlign    = isRTL ? 'right' : 'left';
  const flexDirection = isRTL ? 'row-reverse' : 'row';
  const alignSelf    = isRTL ? 'flex-end' : 'flex-start';

  return StyleSheet.create({
    root:  { flex: 1, backgroundColor: c.bg },
    flex:  { flex: 1 },
    scroll: { paddingHorizontal: 24, paddingBottom: 48 },

    blob1: {
      position: 'absolute', width: 300, height: 300, borderRadius: 150,
      backgroundColor: isDark ? c.teal + '08' : c.teal + '14', top: -70, right: -70,
    },
    blob2: {
      position: 'absolute', width: 200, height: 200, borderRadius: 100,
      backgroundColor: isDark ? c.tealLight + '05' : c.tealLight + '10', bottom: 100, left: -60,
    },

    backRow: {
      flexDirection: flexDirection, alignItems: 'center', gap: 6,
      paddingTop: 16, paddingBottom: 4, alignSelf: alignSelf,
    },
    backArrow: { fontSize: 18, color: c.primary },
    backText:  { fontSize: 14, color: c.primary, fontWeight: '600' },

    logoRow: { alignItems: 'center', marginVertical: 20 },
    logoCircle: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: c.teal,
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
    logoLetters: { fontSize: 24, color: '#ffffff', fontWeight: '700' },
    logoBrand:   { fontSize: 20, color: c.blue, fontWeight: '800' },

    header:   { marginBottom: 24, alignItems: alignSelf },
    title:    { fontSize: 26, color: c.blue, textAlign: textAlign, fontWeight: '700', marginBottom: 6 },
    subtitle: { fontSize: 14, color: c.textSub, textAlign: textAlign, lineHeight: 22 },

    card: {
      backgroundColor: c.surfaceCard,
      borderRadius: 24, padding: 22,
      borderWidth: 0.5, borderColor: c.surfaceCardBorder,
      shadowColor: c.blue, shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.04 : 0.07, shadowRadius: 28, elevation: 4,
      marginBottom: 20,
    },

    errorBanner: {
      flexDirection: flexDirection, alignItems: 'center', gap: 8,
      backgroundColor: c.errorBg + (isDark ? '40' : '60'),
      borderRadius: 12, padding: 12, marginBottom: 16,
    },
    errorBannerText: { flex: 1, fontSize: 13, color: c.error, textAlign: textAlign },

    fieldLabel: {
      fontSize: 11, color: c.textSub, letterSpacing: 0.6,
      textTransform: 'uppercase', textAlign: textAlign,
      marginBottom: 8, fontWeight: '600',
    },
    fieldErr: { fontSize: 12, color: c.error, textAlign: textAlign, marginTop: 4 },

    inputRow: {
      flexDirection: flexDirection, alignItems: 'center',
      backgroundColor: c.surfaceInput,
      borderRadius: 14, borderWidth: 1,
      borderColor: c.outline + '50', minHeight: 56,
      overflow: 'hidden', paddingHorizontal: 12,
    },
    inputRowErr: { borderColor: c.error, borderWidth: 1.5 },
    inputIcon:   { marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 },
    textInput: {
      flex: 1, fontSize: 16, color: c.text,
      paddingVertical: 14, textAlign: textAlign,
    },
    eyeBtn: { padding: 4 },

    btnPrimary: {
      borderRadius: 16, overflow: 'hidden', marginTop: 20,
      shadowColor: c.teal, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.25 : 0.32, shadowRadius: 18, elevation: 5,
    },
    btnDisabled: { opacity: 0.5 },
    btnGrad: { height: 56, alignItems: 'center', justifyContent: 'center' },
    btnText: { fontSize: 17, color: c.onPrimary, fontWeight: '700', letterSpacing: 0.3 },

    divRow: {
      flexDirection: flexDirection, alignItems: 'center',
      marginVertical: 18, gap: 10,
    },
    divLine: { flex: 1, height: 1, backgroundColor: c.outline + (isDark ? '40' : '80') },
    divText: { fontSize: 13, color: c.textSub },

    bioBtn: {
      backgroundColor: c.warm, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: isDark ? c.outline + '40' : c.tealLight + '60',
      minHeight: 64, justifyContent: 'center', marginBottom: 16,
    },
    bioBtnInner: { flexDirection: flexDirection, alignItems: 'center', gap: 12 },
    bioIcon:  { fontSize: 28 },
    bioCopy:  { flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' },
    bioTitle: { fontSize: 15, color: c.blue, textAlign: textAlign, fontWeight: '600' },
    bioSub:   { fontSize: 12, color: c.textSub, textAlign: textAlign, marginTop: 2 },
    bioArrow: { fontSize: 18, color: c.teal },

    secNote: {
      flexDirection: flexDirection, alignItems: 'center', gap: 8,
      backgroundColor: isDark ? c.successBg + '20' : c.successBg + '40',
      borderRadius: 12, padding: 12,
    },
    secIcon: { fontSize: 16 },
    secText: { flex: 1, fontSize: 11, color: isDark ? c.success : c.secText, textAlign: textAlign, lineHeight: 17 },

    regRow: {
      flexDirection: flexDirection, justifyContent: 'center',
      alignItems: 'center', marginBottom: 12,
    },
    regText: { fontSize: 14, color: c.textSub },
    regLink: { fontSize: 14, color: c.primary, fontWeight: '700', textDecorationLine: 'underline' },
  });
}
