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
import Text from '../components/Text';
import { login as apiLogin } from '../services/authService';

// ── Design tokens (SRS: bg=#edf1f4, primary=#1e5979) ─────────
const C = {
  bg:        '#edf1f4',
  surface:   '#f6fafd',
  warm:      '#f7eee5',
  teal:      '#61bec5',
  tealLight: '#9acec1',
  blue:      '#1e5979',
  primary:   '#00696f',
  onTeal:    '#004b4f',
  textSub:   '#3e494a',
  outline:   '#bdc9c9',
  white:     '#ffffff',
  error:     '#ba1a1a',
  errorBg:   '#ffdad6',
  secondary: '#b6eadd',
  secText:   '#35675d',
};

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
  const isRTL = true; // Default to Arabic RTL for this screen

  const [phone, setPhone]         = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [phoneErr, setPhoneErr]   = useState('');
  const [loginErr, setLoginErr]   = useState('');

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

  // ── Email + Password Login ────────────────
  async function handleLogin() {
    setLoginErr('');
    if (!email.trim()) { setLoginErr('البريد الإلكتروني مطلوب'); shake(); return; }
    if (!password)     { setLoginErr('كلمة المرور مطلوبة');      shake(); return; }
    setLoading(true);
    try {
      const result = await apiLogin({ email: email.trim(), password });
      setAuthenticated(
        {
          id: result.user.id,
          fullName: result.user.email,
          phone: '',
          nationalId: '',
          dateOfBirth: '',
          gender: 'male',
          email: result.user.email,
        },
        result.accessToken
      );
    } catch (err: any) {
      setLoginErr(err.message ?? 'بيانات الدخول غير صحيحة');
      shake();
    } finally {
      setLoading(false);
    }
  }

  // ── Send OTP (phone flow — kept for future OTP integration) ──
  function handleSendOtp() {
    const cleaned = phone.replace(/\s/g, '');
    if (!cleaned) {
      setPhoneErr('رقم الهاتف مطلوب');
      shake();
      return;
    }
    if (!isValidPhone(cleaned)) {
      setPhoneErr(isRTL ? 'أدخل رقم هاتف دولي صحيح (مثال: +966 5X XXX XXXX)' : 'Enter a valid international phone number (e.g., +966 5X XXX XXXX)');
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
          'غير متاح',
          'المصادقة البيومترية غير مفعّلة على هذا الجهاز.\nيرجى استخدام رقم الهاتف.',
          [{ text: 'حسناً' }]
        );
        setBioLoading(false);
        return;
      }

      const result = await LA.authenticateAsync({
        promptMessage:         'تسجيل الدخول إلى SmileFix',
        fallbackLabel:         'استخدم رمز المرور',
        cancelLabel:           'إلغاء',
        disableDeviceFallback: false,
      });

      if (result.success) {
        navigation.navigate('OTPVerify', { phone: '0500000000' });
      } else {
        Alert.alert('فشل التحقق', 'لم يتم التعرف على البصمة. حاول مرة أخرى.');
      }
    } catch {
      Alert.alert('خطأ', 'تعذّر تفعيل المصادقة البيومترية.');
    } finally {
      setBioLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Background */}
      <LinearGradient
        colors={[C.surface, C.bg, C.warm + '70']}
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
              <Text style={s.backArrow}>{'←'}</Text>
              <Text style={s.backText}>رجوع</Text>
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
              <Text style={s.title}>{'مرحباً بعودتك 👋'}</Text>
              <Text style={s.subtitle}>
                {'أدخل رقم هاتفك لتسجيل الدخول إلى حسابك'}
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
              {/* Email field */}
              <Text style={s.fieldLabel}>البريد الإلكتروني</Text>
              <View style={[s.inputRow, loginErr ? s.inputRowErr : null]}>
                <TextInput
                  style={[s.phoneInput, { textAlign: 'right' }]}
                  placeholder="example@email.com"
                  placeholderTextColor={C.textSub + '70'}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setLoginErr(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              {/* Password field */}
              <Text style={[s.fieldLabel, { marginTop: 14 }]}>كلمة المرور</Text>
              <View style={[s.inputRow, loginErr ? s.inputRowErr : null]}>
                <TouchableOpacity style={{ paddingHorizontal: 12 }} onPress={() => setShowPwd(!showPwd)}>
                  <Text style={{ fontSize: 18 }}>{showPwd ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
                <View style={s.inputDivider} />
                <TextInput
                  style={[s.phoneInput, { textAlign: 'right' }]}
                  placeholder="••••••••"
                  placeholderTextColor={C.textSub + '70'}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setLoginErr(''); }}
                  secureTextEntry={!showPwd}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>

              {/* Error */}
              {loginErr ? (
                <View style={s.errRow}>
                  <Text style={s.errText}>{loginErr}</Text>
                  <Text style={s.errIcon}>{'⚠️'}</Text>
                </View>
              ) : null}

              {/* ── Login button ── */}
              <TouchableOpacity
                style={[s.btnPrimary, { marginTop: 20 }, loading ? s.btnDisabled : null]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.82}
              >
                <LinearGradient
                  colors={loading ? [C.outline, C.outline] : [C.teal, C.blue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.btnGrad}
                >
                  {loading ? (
                    <ActivityIndicator color={C.white} size="small" />
                  ) : (
                    <Text style={s.btnText}>تسجيل الدخول</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={s.divRow}>
                <View style={s.divLine} />
                <Text style={s.divText}>أو</Text>
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
                  <ActivityIndicator color={C.blue} size="small" />
                ) : (
                  <View style={s.bioBtnInner}>
                    <Text style={s.bioIcon}>🔐</Text>
                    <View style={s.bioCopy}>
                      <Text style={s.bioTitle}>الدخول بالبصمة / Face ID</Text>
                      <Text style={s.bioSub}>تسجيل دخول سريع وآمن</Text>
                    </View>
                    <Text style={s.bioArrow}>{'←'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* ── Register link ── */}
            <View style={s.regRow}>
              <Text style={s.regText}>مريض جديد؟ </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.regLink}>أنشئ حسابك الآن</Text>
              </TouchableOpacity>
            </View>

            {/* ── Security note ── */}
            <View style={s.secNote}>
              <Text style={s.secIcon}>🔒</Text>
              <Text style={s.secText}>
                {'بياناتك محمية بتشفير SSL — لن يُشارك رقم هاتفك مع أي طرف ثالث'}
              </Text>
            </View>

          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────
const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.bg },
  flex:  { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },

  // Blobs
  blob1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: C.teal + '14', top: -70, right: -70,
  },
  blob2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: C.tealLight + '10', bottom: 100, left: -60,
  },

  // Back
  backRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 16, paddingBottom: 4, alignSelf: 'flex-end',
  },
  backArrow: { fontSize: 18, color: C.primary },
  backText:  { fontSize: 14, color: C.primary, fontWeight: '600' },

  // Logo
  logoRow: { alignItems: 'center', marginVertical: 20 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.teal,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: 10,
    shadowColor: C.blue, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 16, elevation: 6,
  },
  logoShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
  },
  logoLetters: { fontSize: 24, color: C.onTeal, fontWeight: '700' },
  logoBrand:   { fontSize: 20, color: C.blue,   fontWeight: '800' },

  // Header
  header:   { marginBottom: 24, alignItems: 'flex-end' },
  title:    { fontSize: 26, color: C.blue, textAlign: 'right', fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.textSub, textAlign: 'right', lineHeight: 22 },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 24, padding: 22,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: C.blue, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07, shadowRadius: 28, elevation: 4,
    marginBottom: 20,
  },

  fieldLabel: {
    fontSize: 11, color: C.textSub, letterSpacing: 0.6,
    textTransform: 'uppercase', textAlign: 'right',
    marginBottom: 8, marginRight: 2, fontWeight: '600',
  },

  // Phone input
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14, borderWidth: 1.5,
    borderColor: 'transparent', minHeight: 56,
    overflow: 'hidden',
  },
  inputRowErr: { borderColor: C.error },
  flagBox: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 4,
  },
  flagEmoji: { fontSize: 20 },
  flagCode:  { fontSize: 14, color: C.blue, fontWeight: '600' },
  inputDivider: { width: 1, height: 28, backgroundColor: C.outline + '60' },
  phoneInput: {
    flex: 1, fontSize: 17, color: C.blue,
    paddingHorizontal: 14, paddingVertical: 14, letterSpacing: 1,
  },

  // Error
  errRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', gap: 6,
    marginTop: 6, marginBottom: 4,
  },
  errText: { fontSize: 12, color: C.error, textAlign: 'right' },
  errIcon: { fontSize: 14 },

  phoneHint: {
    fontSize: 12, color: C.textSub, textAlign: 'right',
    marginTop: 8, marginBottom: 16, lineHeight: 18,
  },

  // Primary button
  btnPrimary: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: C.teal, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32, shadowRadius: 18, elevation: 5,
  },
  btnDisabled: { opacity: 0.5 },
  btnGrad: { height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 17, color: C.white, fontWeight: '700', letterSpacing: 0.3 },

  // Divider
  divRow: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 18, gap: 10,
  },
  divLine: { flex: 1, height: 1, backgroundColor: C.outline + '80' },
  divText: { fontSize: 13, color: C.textSub },

  // Biometric
  bioBtn: {
    backgroundColor: C.warm,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.tealLight + '60',
    minHeight: 64, justifyContent: 'center',
  },
  bioBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  bioIcon:  { fontSize: 28 },
  bioCopy:  { flex: 1, alignItems: 'flex-end' },
  bioTitle: { fontSize: 15, color: C.blue, textAlign: 'right', fontWeight: '600' },
  bioSub:   { fontSize: 12, color: C.textSub, textAlign: 'right', marginTop: 2 },
  bioArrow: { fontSize: 18, color: C.teal },

  // Unique phone rule
  ruleBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 8, marginTop: 16,
    backgroundColor: C.secondary + '50',
    borderRadius: 12, padding: 12,
  },
  ruleIcon: { fontSize: 14 },
  ruleText: {
    flex: 1, fontSize: 12, color: C.secText,
    textAlign: 'right', lineHeight: 18,
  },

  // Register
  regRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginBottom: 12,
  },
  regText: { fontSize: 14, color: C.textSub },
  regLink: { fontSize: 14, color: C.primary, fontWeight: '700', textDecorationLine: 'underline' },

  // Security note
  secNote: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, backgroundColor: C.secondary + '40',
    borderRadius: 12, padding: 12,
  },
  secIcon: { fontSize: 16 },
  secText: {
    flex: 1, fontSize: 11, color: C.secText,
    textAlign: 'right', lineHeight: 17,
  },
});
