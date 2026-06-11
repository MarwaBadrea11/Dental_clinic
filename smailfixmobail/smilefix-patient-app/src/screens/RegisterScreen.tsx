import React, { useState, useRef } from 'react';
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
} from 'react-native';
import Text from '../components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/appStore';
import { register, login, fetchMyPatient, adaptPatient, ApiRequestError } from '../services';
import type { AppColors } from '../theme/colors';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Phone validation - International numbers
// ─────────────────────────────────────────────
function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '');
  if (!cleaned) return false;
  
  // Accept international numbers with optional plus sign
  // Minimum 7 digits, maximum 15 digits (including country code)
  const internationalPattern = /^\+?[1-9]\d{6,14}$/;
  
  // Also accept local numbers (without country code) for backward compatibility
  const localPattern = /^\d{7,15}$/;
  
  return internationalPattern.test(cleaned) || localPattern.test(cleaned);
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function RegisterScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);

  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [natId, setNatId] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const progressAnim = useRef(new Animated.Value(0.5)).current;
  const s = makeStyles(colors, isRTL, isDark);

  const validateStep1 = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = t('required');
    if (!validatePhone(phone)) e.phone = t('invalidPhone');
    // Email validation — must contain @ and a dot after it
    if (!email.trim()) {
      e.email = t('emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = t('invalidEmail');
    }
    if (!natId || natId.length < 9) e.natId = t('invalidId');
    if (!gender) e.gender = t('required');
    // DOB: must be YYYY-MM-DD
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      e.dob = isRTL ? 'الصيغة الصحيحة: YYYY-MM-DD مثال: 2004-05-23' : 'Format must be YYYY-MM-DD e.g. 2004-05-23';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = (): boolean => {
    const e: Record<string, string> = {};
    if (!password || password.length < 8) {
      e.password = t('pwdTooShort');
    } else if (!/[A-Z]/.test(password)) {
      e.password = t('pwdNeedsUppercase');
    } else if (!/[0-9]/.test(password)) {
      e.password = t('pwdNeedsNumber');
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      e.password = t('pwdNeedsSpecial');
    }
    if (password !== confirm) e.confirm = t('pwdMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goToStep2 = () => {
    if (!validateStep1()) return;
    setStep(2);
    Animated.timing(progressAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
  };

  const goToStep1 = () => {
    setStep(1);
    Animated.timing(progressAnim, { toValue: 0.5, duration: 300, useNativeDriver: false }).start();
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    setGeneralError('');
    try {
      // Step 1: create the user account with role=PATIENT
      // The backend will automatically create the linked patient record.
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

      // Step 2: immediately log in to get the tokens
      const result = await login({ email: email.trim(), password });

      // Step 3: resolve the patient record — pass the token explicitly
      // because setAuthenticated() hasn't been called yet, so the store is empty
      const backendPatient = await fetchMyPatient(result.accessToken);

      // Step 4: store the session
      const patient = backendPatient
        ? adaptPatient(backendPatient, result.user.email)
        : {
            id:          result.user.id,
            fullName:    fullName.trim(),
            phone:       phone.replace(/\s/g, ''),
            nationalId:  natId,
            dateOfBirth: dob,
            gender:      gender as 'male' | 'female',
            email:       result.user.email,
          };

      await setAuthenticated(patient, result.accessToken, result.refreshToken);
      // Navigator auto-switches to Main when isAuthenticated becomes true
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 422) {
          const fields = err.body.details?.fields ?? [];
          const fieldErrors: Record<string, string> = {};
          for (const f of fields) {
            if (f.field === 'email')    fieldErrors.email    = f.message;
            if (f.field === 'password') fieldErrors.password = f.message;
            if (f.field === 'username') fieldErrors.fullName = f.message;
          }
          if (Object.keys(fieldErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...fieldErrors }));
          } else {
            setGeneralError(t('registerFailed'));
          }
        } else if (err.status === 409) {
          setErrors((prev) => ({ ...prev, email: t('emailAlreadyExists') }));
          // Go back to step 1 so the user can see the email error
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

  const step1Fields: Omit<FieldConfig, 'rightIcon'>[] = [
    {
      label: t('fullName'),
      placeholder: t('fullNamePh'),
      value: fullName,
      onChange: (v) => { setFullName(v); setErrors(e => ({ ...e, fullName: '' })); },
      error: errors.fullName,
    },
    {
      label: t('phoneLabel'),
      placeholder: isRTL ? 'مثال: +966 5X XXX XXXX أو +1 555 000 0000' : 'e.g. +966 5X XXX XXXX or +1 555 000 0000',
      value: phone,
      onChange: (v) => { setPhone(v); setErrors(e => ({ ...e, phone: '' })); },
      keyboardType: 'phone-pad',
      error: errors.phone,
    },
    {
      label: t('email'),
      placeholder: t('emailPh'),
      value: email,
      onChange: (v) => { setEmail(v); setErrors(e => ({ ...e, email: '' })); },
      keyboardType: 'email-address',
      error: errors.email,
    },
    {
      label: t('nationalId'),
      placeholder: t('nationalIdPh'),
      value: natId,
      onChange: (v) => { setNatId(v); setErrors(e => ({ ...e, natId: '' })); },
      keyboardType: 'numeric',
      maxLength: 12,
      error: errors.natId,
    },
    {
      label: t('dateOfBirth'),
      placeholder: isRTL ? 'مثال: 2004-05-23' : 'e.g. 2004-05-23',
      value: dob,
      onChange: (v) => {
        // Auto-format: insert dashes at positions 4 and 7
        const digits = v.replace(/\D/g, '').slice(0, 8);
        let formatted = digits;
        if (digits.length > 4) formatted = digits.slice(0, 4) + '-' + digits.slice(4);
        if (digits.length > 6) formatted = formatted.slice(0, 7) + '-' + digits.slice(6);
        setDob(formatted);
        setErrors(e => ({ ...e, dob: '' }));
      },
      keyboardType: 'numeric',
      maxLength: 10,
      error: errors.dob,
    },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <LinearGradient colors={[colors.gradStart, colors.gradEnd]} style={StyleSheet.absoluteFillObject} />

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={s.flex}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            
            {/* Back Button */}
            <TouchableOpacity style={s.backRow} onPress={() => (step === 2 ? goToStep1() : navigation.goBack())}>
              <Ionicons name={isRTL ? 'arrow-forward-outline' : 'arrow-back-outline'} size={20} color={colors.primary} />
              <Text style={s.backText}>{t('back')}</Text>
            </TouchableOpacity>

            {/* Logo & Header */}
            <View style={s.logoRow}>
              <View style={s.logoCircle}>
                <View style={s.logoShine} />
                <Text style={s.logoLetters}>SF</Text>
              </View>
              <Text style={s.brandName}>{t('appName')}</Text>
            </View>

            <Text style={s.stepTitle}>{step === 1 ? t('personalInfo') : t('accountSetup')}</Text>
            <Text style={s.stepSub}>
              {step === 1
                ? (isRTL ? 'أدخل بياناتك الشخصية للمتابعة' : 'Enter your personal details to continue')
                : (isRTL ? 'أنشئ كلمة مرور آمنة لحسابك' : 'Create a secure password for your account')}
            </Text>

            {/* Progress Bar */}
            <View style={s.progressSection}>
              <View style={s.progressMeta}>
                <Text style={s.progressStep}>{step === 1 ? t('step1of2') : t('step2of2')}</Text>
                <Text style={s.progressPct}>{step === 1 ? '50%' : '100%'}</Text>
              </View>
              <View style={s.progressTrack}>
                <Animated.View style={[s.progressFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
              </View>
            </View>

            {/* Form Card */}
            <View style={s.card}>
              {step === 1 ? (
                <>
                  {step1Fields.map((field, index) => (
                    <FlatField
                      key={`field-${index}`}
                      {...field}
                      isRTL={isRTL}
                      colors={colors}
                      isDark={isDark}
                    />
                  ))}

                  {/* Gender */}
                  <Text style={s.fieldLabel}>{t('gender')}</Text>
                  <View style={s.genderRow}>
                    {(['male', 'female'] as const).map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[s.genderBtn, gender === g && s.genderBtnActive]}
                        onPress={() => { setGender(g); setErrors(e => ({ ...e, gender: '' })); }}
                      >
                        <Ionicons name={g === 'male' ? 'male-outline' : 'female-outline'} size={16} color={gender === g ? '#fff' : colors.textSub} />
                        <Text style={[s.genderBtnText, gender === g && s.genderBtnTextActive]}>{t(g)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.gender && <Text style={s.errText}>{errors.gender}</Text>}

                  <View style={s.phoneNote}>
                    <Ionicons name="information-circle-outline" size={14} color={colors.teal} />
                    <Text style={s.phoneNoteText}>
                      {isRTL ? 'أدخل رقم الهاتف الدولي مع رمز الدولة (مثال: +966 للرياض، +1 لأمريكا)' : 'Enter international phone with country code (e.g., +966 for Riyadh, +1 for USA)'}
                    </Text>
                  </View>

                  <TouchableOpacity style={s.primaryBtn} onPress={goToStep2}>
                    <Text style={s.primaryBtnText}>{t('continueBtn')}</Text>
                    <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={18} color={colors.onPrimaryContainer} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* General error banner — visible on step 2 */}
                  {generalError ? (
                    <View style={s.errorBanner}>
                      <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                      <Text style={s.errorBannerText}>{generalError}</Text>
                    </View>
                  ) : null}

                  <FlatField
                    label={t('password')}
                    placeholder={t('passwordPh')}
                    value={password}
                    onChange={(v) => { setPassword(v); setErrors(e => ({ ...e, password: '' })); }}
                    secure={!showPwd}
                    error={errors.password}
                    isRTL={isRTL}
                    colors={colors}
                    isDark={isDark}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
                        <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSub} />
                      </TouchableOpacity>
                    }
                  />

                  <FlatField
                    label={t('confirmPwd')}
                    placeholder={t('confirmPwdPh')}
                    value={confirm}
                    onChange={(v) => { setConfirm(v); setErrors(e => ({ ...e, confirm: '' })); }}
                    secure={!showConfirm}
                    error={errors.confirm}
                    isRTL={isRTL}
                    colors={colors}
                    isDark={isDark}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                        <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSub} />
                      </TouchableOpacity>
                    }
                  />

                  <View style={s.pwdHint}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
                    <Text style={s.pwdHintText}>
                      {isRTL
                        ? 'كلمة المرور: 8 أحرف على الأقل، حرف كبير، رقم، ورمز خاص'
                        : 'Min 8 chars, one uppercase, one number, one special character'}
                    </Text>
                  </View>

                  <TouchableOpacity style={[s.primaryBtn, loading && s.btnDisabled]} onPress={handleRegister} disabled={loading}>
                    {loading ? (
                      <Text style={s.primaryBtnText}>جاري الإنشاء...</Text>
                    ) : (
                      <>
                        <Text style={s.primaryBtnText}>{t('createAccount')}</Text>
                        <Ionicons name="checkmark-circle-outline" size={18} color={colors.onPrimaryContainer} />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* Login Link */}
              <View style={s.loginRow}>
                <Text style={s.loginText}>{t('hasAccount')} </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={s.loginLink}>{t('loginBtn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

// FlatField Component
function FlatField({
  label,
  placeholder,
  value,
  onChange,
  keyboardType,
  secure,
  maxLength,
  error,
  rightIcon,
  isRTL,
  colors,
  isDark,
}: FieldConfig & { isRTL: boolean; colors: AppColors; isDark: boolean }) {
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const align = isRTL ? 'right' : 'left';
  const rowDirection = isRTL ? 'row-reverse' : 'row';

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? colors.error : colors.outline + '50', error ? colors.error : colors.blue],
  });

  const bgColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceInput, isDark ? `${colors.outline}20` : `${colors.blue}06`],
  });

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{
        fontSize: 11,
        fontWeight: '600',
        color: focused ? colors.blue : colors.textSub,
        textAlign: align,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 6,
      }}>
        {label}
      </Text>

      <Animated.View style={{
        flexDirection: rowDirection,
        alignItems: 'center',
        backgroundColor: bgColor,
        borderRadius: 14,
        borderWidth: focused ? 1.5 : 1,
        borderColor,
        paddingHorizontal: 14,
        minHeight: 52,
      }}>
        <TextInput
          style={{ flex: 1, fontSize: 15, color: colors.text, textAlign: align, paddingVertical: 13 }}
          placeholder={placeholder}
          placeholderTextColor={colors.textSub + '60'}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType === 'phone-pad' ? 'phone-pad' : keyboardType ?? 'default'}
          secureTextEntry={secure}
          maxLength={maxLength}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {rightIcon && <View style={{ paddingLeft: isRTL ? 0 : 8, paddingRight: isRTL ? 8 : 0 }}>{rightIcon}</View>}
      </Animated.View>

      {error && (
        <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Ionicons name="alert-circle-outline" size={12} color={colors.error} />
          <Text style={{ fontSize: 11, color: colors.error, textAlign: align }}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// Styles
function makeStyles(c: AppColors, isRTL: boolean, isDark: boolean) {
  const align = isRTL ? 'right' : 'left';
  const row = isRTL ? 'row-reverse' : 'row';

  return StyleSheet.create({
    root: { flex: 1 },
    flex: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingBottom: 48 },

    backRow: { flexDirection: row, alignItems: 'center', gap: 6, paddingVertical: 8 },
    backText: { fontSize: 14, color: c.primary, fontWeight: '600' },

    logoRow: { alignItems: 'center', marginVertical: 16 },
    logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.teal, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 10 },
    logoShine: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: 'rgba(255,255,255,0.22)', borderTopLeftRadius: 32, borderTopRightRadius: 32 },
    logoLetters: { fontSize: 26, color: '#ffffff', fontWeight: '700' },
    brandName: { fontSize: 22, color: c.blue, fontWeight: '800', textAlign: align, paddingRight: isRTL ? 20 : 0, paddingLeft: isRTL ? 0 : 20 },

    stepTitle: { fontSize: 22, fontWeight: '700', color: c.blue, textAlign: align, marginBottom: 4, paddingRight: isRTL ? 20 : 0, paddingLeft: isRTL ? 0 : 20 },
    stepSub: { fontSize: 13, color: c.textSub, textAlign: align, marginBottom: 16, lineHeight: 20, paddingRight: isRTL ? 20 : 0, paddingLeft: isRTL ? 0 : 20 },

    progressSection: { marginBottom: 20 },
    progressMeta: { flexDirection: row, justifyContent: 'space-between', marginBottom: 8 },
    progressStep: { fontSize: 11, color: c.primary, fontWeight: '700' },
    progressPct: { fontSize: 11, color: c.textSub, fontWeight: '600' },
    progressTrack: { height: 6, backgroundColor: c.outline + '30', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: c.teal, borderRadius: 3 },

    card: {
      backgroundColor: c.surfaceCard,
      borderRadius: 24,
      padding: 20,
      borderWidth: 0.5,
      borderColor: c.surfaceCardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 9,
      elevation: 2,
    },

    fieldLabel: { fontSize: 11, fontWeight: '600', color: c.textSub, textAlign: align, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
    errText: { fontSize: 11, color: c.error, textAlign: align, marginTop: 4 },

    genderRow: { flexDirection: row, gap: 10, marginBottom: 12 },
    genderBtn: { flex: 1, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: c.surfaceInput, borderWidth: 1.5, borderColor: c.outline + '40' },
    genderBtnActive: { backgroundColor: c.blue, borderColor: c.blue },
    genderBtnText: { fontSize: 14, color: c.textSub, fontWeight: '600' },
    genderBtnTextActive: { color: '#ffffff' },

    phoneNote: { flexDirection: row, alignItems: 'flex-start', gap: 6, marginVertical: 12, backgroundColor: c.teal + '12', borderRadius: 10, padding: 10 },
    phoneNoteText: { fontSize: 11, color: c.teal, flex: 1, textAlign: align },

    pwdHint: { flexDirection: row, alignItems: 'center', gap: 6, marginBottom: 12, backgroundColor: c.successBg, borderRadius: 10, padding: 10 },
    pwdHintText: { fontSize: 11, color: c.success, flex: 1, textAlign: align },

    primaryBtn: { flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.blue, borderRadius: 14, paddingVertical: 16, marginTop: 20 },
    btnDisabled: { opacity: 0.6 },
    primaryBtnText: { fontSize: 16, color: '#ffffff', fontWeight: '700' },

    errorBanner: {
      flexDirection: row, alignItems: 'center', gap: 8,
      backgroundColor: c.errorBg + (isDark ? '40' : '60'),
      borderRadius: 12, padding: 12, marginBottom: 16,
    },
    errorBannerText: { flex: 1, fontSize: 13, color: c.error, textAlign: align },

    loginRow: { flexDirection: row, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    loginText: { fontSize: 13, color: c.textSub },
    loginLink: { fontSize: 13, color: c.primary, fontWeight: '700', textDecorationLine: 'underline' },
  });
}