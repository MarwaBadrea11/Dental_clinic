// ─────────────────────────────────────────────
// Profile Screen — Language + Theme + Settings
// Dynamic i18n (AR↔EN) + RTL/LTR switching
// ─────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  I18nManager,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/appStore';
import type { AppColors } from '../theme/colors';
import Text from '../components/Text';
import { useTabBarHeight } from '../hooks/useTabBarHeight';
import { updateMyPatient, adaptPatient } from '../services/patientService';

export default function ProfileScreen() {
  const { t, isRTL, locale, i18n } = useTranslation();
  const { colors, isDark, toggleTheme } = useTheme();
  const { patient, logout, setLocale, setPatient } = useAppStore();
  const [langLoading, setLangLoading] = useState(false);
  const tabBarHeight = useTabBarHeight();

  // ── Edit Profile modal state ──────────────
  const [editVisible, setEditVisible] = useState(false);
  const [editName,    setEditName]    = useState('');
  const [editEmail,   setEditEmail]   = useState('');
  const [editPhone,   setEditPhone]   = useState('');
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);

  const s = makeStyles(colors, isRTL);

  // ── Open edit modal prefilled with current data ──
  const handleOpenEdit = () => {
    setEditName(patient?.fullName  ?? '');
    setEditEmail(patient?.email    ?? '');
    setEditPhone(patient?.phone    ?? '');
    setSaveError(null);
    setEditVisible(true);
  };

  // ── Save profile changes to backend ──────
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setSaveError(t('required'));
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const nameParts  = editName.trim().split(/\s+/);
      const first_name = nameParts[0];
      const last_name  = nameParts.slice(1).join(' ') || undefined;

      const updated = await updateMyPatient({
        first_name,
        last_name,
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
      });

      // Refresh patient in the global store so the UI reflects the change
      setPatient(adaptPatient(updated, editEmail.trim() || undefined));
      setEditVisible(false);
    } catch (err: any) {
      setSaveError(err?.message ?? t('networkError'));
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers for RTL/LTR styling ───────────
  const getTextAlignment = (center = false) => ({
    textAlign: center ? 'center' : (isRTL ? 'right' : 'left'),
    alignSelf: center ? 'center' : (isRTL ? 'flex-end' : 'flex-start'),
    paddingRight: center ? 0 : (isRTL ? 20 : 0),
    paddingLeft:  center ? 0 : (isRTL ? 0  : 20),
  });

  const getFlexDirection = () => ({
    flexDirection: isRTL ? 'row-reverse' : 'row' as any,
  });

  const getIconName = (iconName: string) => {
    if (iconName === 'chevron-forward' || iconName === 'chevron-back') {
      return isRTL ? 'chevron-back' : 'chevron-forward';
    }
    return iconName;
  };

  const getSpacingStyle = () => ({
    paddingLeft:  isRTL ? 0 : 4,
    paddingRight: isRTL ? 4 : 0,
  });

  // ── Language toggle ───────────────────────
  const handleToggleLang = () => {
    const next = locale === 'ar' ? 'en' : 'ar';
    setLangLoading(true);
    i18n.changeLanguage(next).then(() => {
      setLocale(next);
      I18nManager.forceRTL(next === 'ar');
      setLangLoading(false);
    });
  };

  // ── Logout ────────────────────────────────
  const handleLogout = () => {
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('no'), style: 'cancel' },
      { text: t('yes'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[colors.gradStart, colors.gradEnd]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={s.safe}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: tabBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Page title ── */}
          <Text style={[s.pageTitle, getTextAlignment()]}>{t('myProfile')}</Text>

          {/* ── Avatar card ── */}
          <View style={s.avatarCard}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarLetter}>
                {patient?.fullName?.charAt(0) ?? 'P'}
              </Text>
            </View>
            <Text style={[s.patientName,  getTextAlignment(true)]}>{patient?.fullName ?? '—'}</Text>
            <Text style={[s.patientPhone, getTextAlignment(true)]}>{patient?.phone    ?? '—'}</Text>
            {patient?.email ? (
              <Text style={[s.patientEmail, getTextAlignment(true)]}>{patient.email}</Text>
            ) : null}

            {/* ── Edit Profile button — NOW HAS onPress ── */}
            <TouchableOpacity style={s.editBtn} onPress={handleOpenEdit} activeOpacity={0.75}>
              <Text style={s.editBtnText}>{t('editProfile')}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Treatment progress ── */}
          {patient?.alignersTotal ? (
            <View style={s.card}>
              <Text style={[s.cardTitle, getTextAlignment()]}>{t('treatmentProg')}</Text>
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressFill,
                    {
                      width: `${Math.round(
                        ((patient.alignersCurrent ?? 0) / patient.alignersTotal) * 100,
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[s.progressLabel, getTextAlignment()]}>
                {patient.alignersCurrent} / {patient.alignersTotal}{' '}
                {t('alignersLeft')}
              </Text>
            </View>
          ) : null}

          {/* ── Settings section ── */}
          <Text style={[s.sectionTitle, getTextAlignment()]}>{t('settings')}</Text>

          {/* Language toggle */}
          <TouchableOpacity style={s.settingRow} onPress={handleToggleLang} disabled={langLoading}>
            <View style={s.settingLeft}>
              <View style={[s.iconBox, { backgroundColor: colors.teal + '20' }]}>
                <Ionicons name="language" size={20} color={colors.teal} />
              </View>
              <View style={[{ flex: 1 }, getSpacingStyle()]}>
                <Text style={[s.settingLabel, getTextAlignment()]}>{t('language')}</Text>
                <Text style={[s.settingDesc,  getTextAlignment()]}>
                  {locale === 'ar' ? 'العربية → English' : 'English → العربية'}
                </Text>
              </View>
            </View>
            <View style={[s.langBadge, { backgroundColor: colors.teal + '20' }]}>
              <Text style={[s.langBadgeText, { color: colors.teal }]}>
                {locale === 'ar' ? 'AR' : 'EN'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Dark mode toggle */}
          <View style={s.settingRow}>
            <View style={s.settingLeft}>
              <View style={[s.iconBox, { backgroundColor: (isDark ? '#79d5dc' : '#1e5979') + '20' }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={isDark ? '#79d5dc' : '#1e5979'} />
              </View>
              <View style={[{ flex: 1 }, getSpacingStyle()]}>
                <Text style={[s.settingLabel, getTextAlignment()]}>{t('darkMode')}</Text>
                <Text style={[s.settingDesc,  getTextAlignment()]}>
                  {isDark ? (locale === 'ar' ? 'مفعّل' : 'Enabled') : (locale === 'ar' ? 'معطّل' : 'Disabled')}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.outline, true: colors.teal }}
              thumbColor={isDark ? colors.blue : '#ffffff'}
              ios_backgroundColor={colors.outline}
            />
          </View>

          {/* Notifications */}
          <TouchableOpacity style={s.settingRow}>
            <View style={s.settingLeft}>
              <View style={[s.iconBox, { backgroundColor: colors.successBg }]}>
                <Ionicons name="notifications-outline" size={20} color={colors.success} />
              </View>
              <Text style={[s.settingLabel, getTextAlignment(), getSpacingStyle()]}>{t('notifications')}</Text>
            </View>
            <Ionicons name={getIconName('chevron-forward')} size={18} color={colors.textSub} />
          </TouchableOpacity>


          {/* Help */}
          <TouchableOpacity style={s.settingRow}>
            <View style={s.settingLeft}>
              <View style={[s.iconBox, { backgroundColor: colors.teal + '15' }]}>
                <Ionicons name="help-circle-outline" size={20} color={colors.teal} />
              </View>
              <Text style={[s.settingLabel, getTextAlignment(), getSpacingStyle()]}>{t('help')}</Text>
            </View>
            <Ionicons name={getIconName('chevron-forward')} size={18} color={colors.textSub} />
          </TouchableOpacity>

          {/* About */}
          <TouchableOpacity style={s.settingRow}>
            <View style={s.settingLeft}>
              <View style={[s.iconBox, { backgroundColor: colors.blue + '15' }]}>
                <Ionicons name="information-circle-outline" size={20} color={colors.blue} />
              </View>
              <Text style={[s.settingLabel, getTextAlignment(), getSpacingStyle()]}>{t('about')}</Text>
            </View>
            <Ionicons name={getIconName('chevron-forward')} size={18} color={colors.textSub} />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity style={[s.logoutBtn, getFlexDirection()]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={s.logoutText}>{t('logout')}</Text>
          </TouchableOpacity>

          <Text style={s.version}>SmileFix v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>

      {/* ── Edit Profile Modal ───────────────────── */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !saving && setEditVisible(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={[s.modalHeader, getFlexDirection()]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>{t('editProfile')}</Text>
              <TouchableOpacity onPress={() => !saving && setEditVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            {/* Error banner */}
            {saveError ? (
              <View style={[s.errorBanner, { backgroundColor: colors.error + '15' }]}>
                <Text style={[s.errorText, { color: colors.error }]}>{saveError}</Text>
              </View>
            ) : null}

            {/* Full name */}
            <Text style={[s.fieldLabel, { color: colors.textSub, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('fullName')}
            </Text>
            <TextInput
              style={[s.input, {
                backgroundColor: colors.inputBg ?? colors.surfaceCard,
                color:           colors.text,
                borderColor:     colors.outline,
                textAlign:       isRTL ? 'right' : 'left',
              }]}
              value={editName}
              onChangeText={setEditName}
              placeholder={t('fullNamePh')}
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="words"
              editable={!saving}
            />

            {/* Email */}
            <Text style={[s.fieldLabel, { color: colors.textSub, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('email')}
            </Text>
            <TextInput
              style={[s.input, {
                backgroundColor: colors.inputBg ?? colors.surfaceCard,
                color:           colors.text,
                borderColor:     colors.outline,
                textAlign:       isRTL ? 'right' : 'left',
              }]}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder={t('emailPh')}
              placeholderTextColor={colors.textDisabled}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!saving}
            />

            {/* Phone */}
            <Text style={[s.fieldLabel, { color: colors.textSub, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('phoneNumber')}
            </Text>
            <TextInput
              style={[s.input, {
                backgroundColor: colors.inputBg ?? colors.surfaceCard,
                color:           colors.text,
                borderColor:     colors.outline,
                textAlign:       isRTL ? 'right' : 'left',
              }]}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="+966 5X XXX XXXX"
              placeholderTextColor={colors.textDisabled}
              keyboardType="phone-pad"
              editable={!saving}
            />

            {/* Save button */}
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: colors.teal, opacity: saving ? 0.7 : 1 }]}
              onPress={handleSaveProfile}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={s.saveBtnText}>{locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Dynamic styles ────────────────────────────
function makeStyles(c: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    root:  { flex: 1, backgroundColor: c.bg },
    safe:  { flex: 1 },
    scroll: { paddingHorizontal: 20 },

    pageTitle: {
      fontSize: 28, fontWeight: '700',
      color: c.blue,
      marginTop: 8, marginBottom: 20,
      fontFamily: 'Manrope_700Bold',
      paddingRight: isRTL ? 20 : 0,
      paddingLeft:  isRTL ? 0  : 20,
    },

    // Avatar card
    avatarCard: {
      backgroundColor: c.surfaceCard,
      borderRadius: 24, padding: 24,
      alignItems: 'center',
      flexDirection: 'column',
      borderWidth: 0.5, borderColor: c.surfaceCardBorder,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
    },
    avatarCircle: {
      width: 84, height: 84, borderRadius: 42,
      backgroundColor: c.teal,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 14,
      shadowColor: c.teal,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3, shadowRadius: 14, elevation: 5,
    },
    avatarLetter: {
      fontSize: 38, color: '#ffffff',
      fontWeight: '700', fontFamily: 'Manrope_700Bold',
    },
    patientName: {
      fontSize: 20, color: c.text, fontWeight: '700',
      marginBottom: 4, fontFamily: 'Manrope_700Bold',
    },
    patientPhone: { fontSize: 14, color: c.textSub, marginBottom: 2 },
    patientEmail: { fontSize: 12, color: c.textSub, marginBottom: 14 },
    editBtn: {
      paddingHorizontal: 22, paddingVertical: 9,
      borderRadius: 12, borderWidth: 1.5, borderColor: c.primary,
    },
    editBtnText: {
      fontSize: 13, color: c.primary, fontWeight: '600',
      fontFamily: 'Inter_600SemiBold',
    },

    // Progress card
    card: {
      backgroundColor: c.surfaceCard,
      borderRadius: 20, padding: 20,
      borderWidth: 0.5, borderColor: c.surfaceCardBorder,
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 15, fontWeight: '600', color: c.text,
      marginBottom: 12,
      fontFamily: 'Manrope_600SemiBold',
      paddingRight: isRTL ? 20 : 0,
      paddingLeft:  isRTL ? 0  : 20,
    },
    progressTrack: {
      height: 8, backgroundColor: c.outline + '40',
      borderRadius: 4, overflow: 'hidden', marginBottom: 8,
    },
    progressFill: {
      height: '100%', backgroundColor: c.teal, borderRadius: 4,
    },
    progressLabel: { fontSize: 12, color: c.textSub },

    // Settings
    sectionTitle: {
      fontSize: 13, fontWeight: '700', color: c.textSub,
      marginBottom: 10, marginTop: 4,
      letterSpacing: 0.8, textTransform: 'uppercase',
      fontFamily: 'Inter_600SemiBold',
      paddingRight: isRTL ? 20 : 0,
      paddingLeft:  isRTL ? 0  : 20,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surfaceCard,
      borderRadius: 16, padding: 14,
      marginBottom: 8,
      borderWidth: 0.5, borderColor: c.surfaceCardBorder,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center', gap: 12, flex: 1,
    },
    iconBox: {
      width: 38, height: 38, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    settingLabel: {
      fontSize: 15, color: c.text, fontWeight: '600',
      fontFamily: 'Inter_600SemiBold',
    },
    settingDesc: { fontSize: 11, color: c.textSub, marginTop: 1 },
    langBadge: {
      paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    },
    langBadgeText: {
      fontSize: 12, fontWeight: '700', fontFamily: 'Inter_600SemiBold',
    },

    // Logout
    logoutBtn: {
      alignItems: 'center', justifyContent: 'center',
      gap: 8,
      backgroundColor: c.error + '12',
      borderRadius: 16, paddingVertical: 16,
      marginTop: 16,
      borderWidth: 1, borderColor: c.error + '25',
    },
    logoutText: {
      fontSize: 16, color: c.error, fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
    },
    version: {
      fontSize: 11, color: c.textDisabled,
      textAlign: 'center', marginTop: 20,
    },

    // ── Edit Profile Modal ────────────────────
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalSheet: {
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 24,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18, fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
    },
    errorBanner: {
      borderRadius: 12, padding: 10, marginBottom: 14,
    },
    errorText: { fontSize: 13, fontWeight: '600' },
    fieldLabel: {
      fontSize: 12, fontWeight: '600',
      marginBottom: 6, marginTop: 4,
      fontFamily: 'Inter_600SemiBold',
    },
    input: {
      borderWidth: 1, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 11,
      fontSize: 15, marginBottom: 14,
    },
    saveBtn: {
      borderRadius: 14, paddingVertical: 14,
      alignItems: 'center', justifyContent: 'center',
      marginTop: 4,
    },
    saveBtnText: {
      color: '#ffffff', fontSize: 16, fontWeight: '700',
      fontFamily: 'Manrope_700Bold',
    },
  });
}
