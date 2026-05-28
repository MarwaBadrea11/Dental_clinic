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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/appStore';
import type { AppColors } from '../theme/colors';
import Text from '../components/Text';

export default function ProfileScreen() {
  const { t, isRTL, locale, i18n } = useTranslation();
  const { colors, isDark, toggleTheme } = useTheme();
  const { patient, logout, setLocale } = useAppStore();
  const [langLoading, setLangLoading] = useState(false);

  const s = makeStyles(colors, isRTL);

  // ── Language toggle with RTL switch ──────────
  const handleToggleLang = () => {
    const next = locale === 'ar' ? 'en' : 'ar';
    setLangLoading(true);

    // Update i18next language
    i18n.changeLanguage(next).then(() => {
      // Update store
      setLocale(next);
      // Apply RTL/LTR
      const shouldRTL = next === 'ar';
      I18nManager.forceRTL(shouldRTL);
      setLangLoading(false);
    });
  };

  // ── Logout ────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('no'), style: 'cancel' },
      {
        text: t('yes'),
        style: 'destructive',
        onPress: () => logout(), // navigator reacts automatically
      },
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
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Page title ── */}
          <Text style={s.pageTitle}>{t('myProfile')}</Text>

          {/* ── Avatar card ── */}
          <View style={s.avatarCard}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarLetter}>
                {patient?.fullName?.charAt(0) ?? 'P'}
              </Text>
            </View>
            <Text style={s.patientName}>{patient?.fullName ?? '—'}</Text>
            <Text style={s.patientPhone}>{patient?.phone ?? '—'}</Text>
            {patient?.email ? (
              <Text style={s.patientEmail}>{patient.email}</Text>
            ) : null}
            <TouchableOpacity style={s.editBtn}>
              <Text style={s.editBtnText}>{t('editProfile')}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Treatment progress ── */}
          {patient?.alignersTotal ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>{t('treatmentProg')}</Text>
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressFill,
                    {
                      width: `${Math.round(
                        ((patient.alignersCurrent ?? 0) / patient.alignersTotal) * 100
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={s.progressLabel}>
                {patient.alignersCurrent} / {patient.alignersTotal}{' '}
                {t('alignersLeft')}
              </Text>
            </View>
          ) : null}

          {/* ── Settings section ── */}
          <Text style={s.sectionTitle}>{t('settings')}</Text>

          {/* Language toggle */}
          <TouchableOpacity
            style={s.settingRow}
            onPress={handleToggleLang}
            disabled={langLoading}
          >
            <View style={s.settingLeft}>
              <View style={[s.iconBox, { backgroundColor: colors.teal + '20' }]}>
                <Ionicons name="language" size={20} color={colors.teal} />
              </View>
              <View>
                <Text style={s.settingLabel}>{t('language')}</Text>
                <Text style={s.settingDesc}>
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
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={20}
                  color={isDark ? '#79d5dc' : '#1e5979'}
                />
              </View>
              <View>
                <Text style={s.settingLabel}>{t('darkMode')}</Text>
                <Text style={s.settingDesc}>
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
              <Text style={s.settingLabel}>{t('notifications')}</Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSub} />
          </TouchableOpacity>

          {/* Privacy */}
          <TouchableOpacity style={s.settingRow}>
            <View style={s.settingLeft}>
              <View style={[s.iconBox, { backgroundColor: colors.warningBg }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.warning} />
              </View>
              <Text style={s.settingLabel}>{t('privacy')}</Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSub} />
          </TouchableOpacity>

          {/* Help */}
          <TouchableOpacity style={s.settingRow}>
            <View style={s.settingLeft}>
              <View style={[s.iconBox, { backgroundColor: colors.teal + '15' }]}>
                <Ionicons name="help-circle-outline" size={20} color={colors.teal} />
              </View>
              <Text style={s.settingLabel}>{t('help')}</Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSub} />
          </TouchableOpacity>

          {/* About */}
          <TouchableOpacity style={s.settingRow}>
            <View style={s.settingLeft}>
              <View style={[s.iconBox, { backgroundColor: colors.blue + '15' }]}>
                <Ionicons name="information-circle-outline" size={20} color={colors.blue} />
              </View>
              <Text style={s.settingLabel}>{t('about')}</Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSub} />
          </TouchableOpacity>

          {/* ── Logout ── */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={s.logoutText}>{t('logout')}</Text>
          </TouchableOpacity>

          {/* App version */}
          <Text style={s.version}>SmileFix v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Dynamic styles ────────────────────────────
function makeStyles(c: AppColors, isRTL: boolean) {
  const dir = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  return StyleSheet.create({
    root:  { flex: 1, backgroundColor: c.bg },
    safe:  { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingBottom: 110 },

    pageTitle: {
      fontSize: 28, fontWeight: '700',
      color: c.blue, textAlign: dir,
      marginTop: 8, marginBottom: 20,
      fontFamily: 'Manrope_700Bold',
    },

    // Avatar card
    avatarCard: {
      backgroundColor: c.surfaceCard,
      borderRadius: 24, padding: 24,
      alignItems: 'center',
      borderWidth: 0.5, borderColor: c.surfaceCardBorder,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
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
      fontSize: 38, color: c.onPrimaryContainer,
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
      textAlign: dir, marginBottom: 12,
      fontFamily: 'Manrope_600SemiBold',
    },
    progressTrack: {
      height: 8, backgroundColor: c.outline + '40',
      borderRadius: 4, overflow: 'hidden', marginBottom: 8,
    },
    progressFill: {
      height: '100%', backgroundColor: c.teal, borderRadius: 4,
    },
    progressLabel: {
      fontSize: 12, color: c.textSub, textAlign: dir,
    },

    // Settings
    sectionTitle: {
      fontSize: 13, fontWeight: '700', color: c.textSub,
      textAlign: dir, marginBottom: 10, marginTop: 4,
      letterSpacing: 0.8, textTransform: 'uppercase',
      fontFamily: 'Inter_600SemiBold',
    },
    settingRow: {
      flexDirection: rowDir,
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surfaceCard,
      borderRadius: 16, padding: 14,
      marginBottom: 8,
      borderWidth: 0.5, borderColor: c.surfaceCardBorder,
    },
    settingLeft: {
      flexDirection: rowDir,
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
    settingDesc: {
      fontSize: 11, color: c.textSub, marginTop: 1,
    },
    langBadge: {
      paddingHorizontal: 12, paddingVertical: 5,
      borderRadius: 999,
    },
    langBadgeText: {
      fontSize: 12, fontWeight: '700',
      fontFamily: 'Inter_600SemiBold',
    },

    // Logout
    logoutBtn: {
      flexDirection: rowDir,
      alignItems: 'center',
      justifyContent: 'center',
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
  });
}
