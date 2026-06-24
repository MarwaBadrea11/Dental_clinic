// ─────────────────────────────────────────────
// Profile Screen — Elite Premium Redesign
// Deep canvas · Staggered rows · Neon glows
// Cinematic cubic-bezier transitions
// ─────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  I18nManager,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { AnimatedModal } from '../components/AnimatedModal';
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
import { api } from '../services/api';

// ── Cinematic easing ──────────────────────────────────────────────────────
const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IN_OUT   = Easing.bezier(0.65, 0, 0.35, 1);

// ── Stagger wrapper ───────────────────────────────────────────────────────
function StaggerItem({ index, children, style }: { index: number; children: React.ReactNode; style?: object }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const delay = index * 65 + 80;
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 480, delay, easing: EASE_OUT_EXPO, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 520, delay, easing: EASE_OUT_EXPO, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ── Setting row ───────────────────────────────────────────────────────────
function SettingRow({
  icon, iconColor, iconBg, label, description,
  right, onPress, isDark, colors, isRTL,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string; iconBg: string;
  label: string; description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  isDark: boolean; colors: AppColors; isRTL: boolean;
}) {
  const rowDir = isRTL ? 'row-reverse' as const : 'row' as const;
  const align  = isRTL ? 'right' as const : 'left' as const;

  const content = (
    <View style={[sRow.row, {
      backgroundColor: isDark ? 'rgba(14,22,32,0.88)' : 'rgba(255,255,255,0.92)',
      borderColor:     isDark ? 'rgba(97,190,197,0.10)' : 'rgba(0,105,111,0.08)',
      flexDirection: rowDir,
    }]}>
      {/* Icon chip */}
      <View style={[sRow.iconChip, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={19} color={iconColor} />
      </View>

      {/* Label */}
      <View style={[sRow.labelWrap, isRTL ? { paddingRight: 12 } : { paddingLeft: 12 }]}>
        <Text style={[sRow.label, { color: isDark ? '#e6edf3' : '#1e5979', textAlign: align }]}>
          {label}
        </Text>
        {description ? (
          <Text style={[sRow.desc, { color: colors.textSub, textAlign: align }]}>
            {description}
          </Text>
        ) : null}
      </View>

      {/* Right slot */}
      <View style={sRow.rightSlot}>{right}</View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.78}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const sRow = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderRadius: 18, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 13,
    marginBottom: 9,
    shadowColor: '#00696f',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  iconChip: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  labelWrap: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  desc:  { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  rightSlot: { flexShrink: 0, marginLeft: 8 },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { t, isRTL, locale, i18n } = useTranslation();
  const { colors, isDark, toggleTheme } = useTheme();
  const { patient, logout, setLocale, setPatient } = useAppStore();
  const [langLoading, setLangLoading] = useState(false);
  const tabBarHeight = useTabBarHeight();

  const [editVisible, setEditVisible] = useState(false);
  const [editName,    setEditName]    = useState('');
  const [editEmail,   setEditEmail]   = useState('');
  const [editPhone,   setEditPhone]   = useState('');
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);

  const [helpVisible,  setHelpVisible]  = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [notifsVisible,  setNotifsVisible]  = useState(false);
  const [notifs,         setNotifs]         = useState<any[]>([]);
  const [notifsLoading,  setNotifsLoading]  = useState(false);
  const [notifsError,    setNotifsError]    = useState<string | null>(null);

  // Orb pulse
  const orbScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.14, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1.00, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const align  = isRTL ? 'right' as const : 'left' as const;
  const rowDir = isRTL ? 'row-reverse' as const : 'row' as const;

  const bgColors: readonly [string, string, string] = isDark
    ? ['#060b10', '#0a1520', '#060e14']
    : ['#e6f3f6', '#eef7f8', '#e8f2f4'];

  const handleOpenNotifs = async () => {
    setNotifsVisible(true); setNotifsLoading(true); setNotifsError(null);
    try {
      const result = await api.get<{ notifications: any[]; unreadCount: number }>('/notifications');
      setNotifs(result.notifications ?? []);
    } catch (err: any) { setNotifsError(err?.message ?? t('loadingFailed')); }
    finally { setNotifsLoading(false); }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifs(p => p.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const handleOpenEdit = () => {
    setEditName(patient?.fullName ?? '');
    setEditEmail(patient?.email ?? '');
    setEditPhone(patient?.phone ?? '');
    setSaveError(null);
    setEditVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { setSaveError(t('required')); return; }
    setSaving(true); setSaveError(null);
    try {
      const parts = editName.trim().split(/\s+/);
      const updated = await updateMyPatient({
        first_name: parts[0],
        last_name:  parts.slice(1).join(' ') || undefined,
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
      });
      setPatient(adaptPatient(updated, editEmail.trim() || undefined));
      setEditVisible(false);
    } catch (err: any) { setSaveError(err?.message ?? t('networkError')); }
    finally { setSaving(false); }
  };

  const handleToggleLang = () => {
    const next = locale === 'ar' ? 'en' : 'ar';
    setLangLoading(true);
    const shouldBeRTL = next === 'ar';

    i18n.changeLanguage(next).then(() => {
      setLocale(next);

      // Apply the new RTL state at the native level
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);

      setLangLoading(false);

      // Reload the JS bundle so the new direction takes effect immediately.
      // In Expo Go dev mode this triggers a fast JS reload.
      try {
        const { reloadAsync } = require('expo-updates');
        reloadAsync().catch(() => {
          // Fallback: inform user to shake-to-reload
          Alert.alert(
            shouldBeRTL ? 'تم تغيير اللغة' : 'Language Changed',
            shouldBeRTL
              ? 'اهزّ الجهاز واختر "Reload" لتطبيق الاتجاه العربي بالكامل.'
              : 'Shake the device and tap "Reload" to fully apply English direction.',
            [{ text: shouldBeRTL ? 'حسناً' : 'OK' }]
          );
        });
      } catch {
        Alert.alert(
          shouldBeRTL ? 'تم تغيير اللغة' : 'Language Changed',
          shouldBeRTL
            ? 'اهزّ الجهاز واختر "Reload" لتطبيق الاتجاه العربي بالكامل.'
            : 'Shake the device and tap "Reload" to fully apply English direction.',
          [{ text: shouldBeRTL ? 'حسناً' : 'OK' }]
        );
      }
    });
  };

  const handleLogout = () => {
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('no'), style: 'cancel' },
      { text: t('yes'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  // Progress %
  const progress = patient?.alignersTotal
    ? Math.round(((patient.alignersCurrent ?? 0) / patient.alignersTotal) * 100)
    : 0;

  // Modal shared sheet style
  const sheetBg = isDark ? '#0e1a24' : '#ffffff';

  return (
    <View style={styles.root}>

      <LinearGradient colors={bgColors} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFillObject} />

      <Animated.View style={[styles.orb, styles.orbTR, {
        backgroundColor: isDark ? 'rgba(97,190,197,0.08)' : 'rgba(97,190,197,0.16)',
        transform: [{ scale: orbScale }],
      }]} />
      <Animated.View style={[styles.orb, styles.orbBL, {
        backgroundColor: isDark ? 'rgba(30,89,121,0.10)' : 'rgba(121,213,220,0.14)',
        transform: [{ scale: orbScale }],
      }]} />

      <SafeAreaView style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Page title ── */}
          <StaggerItem index={0}>
            <Text style={[styles.pageTitle, { color: isDark ? '#e6edf3' : '#1e5979', textAlign: align }]}>
              {t('myProfile')}
            </Text>
          </StaggerItem>

          {/* ── Avatar hero ── */}
          <StaggerItem index={1}>
            <View style={[styles.avatarHero, {
              backgroundColor: isDark ? 'rgba(14,22,32,0.88)' : 'rgba(255,255,255,0.92)',
              borderColor:     isDark ? 'rgba(97,190,197,0.18)' : 'rgba(0,105,111,0.12)',
              shadowColor:     isDark ? colors.teal : '#000',
            }]}>
              {/* Gradient glow top line */}
              <LinearGradient
                colors={['rgba(97,190,197,0.00)', 'rgba(97,190,197,0.50)', 'rgba(97,190,197,0.00)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.heroGlowBar}
              />

              {/* Avatar with glow ring */}
              <View style={[styles.avatarRing, { borderColor: isDark ? 'rgba(97,190,197,0.30)' : 'rgba(0,105,111,0.20)' }]}>
                <LinearGradient
                  colors={['#00818a', '#00696f', '#004f54']}
                  start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                  style={styles.avatarCircle}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.00)']}
                    start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Text style={styles.avatarLetter}>
                    {patient?.fullName?.charAt(0)?.toUpperCase() ?? 'P'}
                  </Text>
                </LinearGradient>
              </View>

              <Text style={[styles.patientName, { color: isDark ? '#e6edf3' : '#1e5979' }]}>
                {patient?.fullName ?? '—'}
              </Text>
              {patient?.phone ? (
                <Text style={[styles.patientSub, { color: colors.textSub }]}>{patient.phone}</Text>
              ) : null}
              {patient?.email ? (
                <Text style={[styles.patientSub, { color: colors.textSub }]}>{patient.email}</Text>
              ) : null}

              {/* Edit profile button */}
              <TouchableOpacity
                onPress={handleOpenEdit}
                activeOpacity={0.80}
                style={styles.editBtnWrap}
              >
                <LinearGradient
                  colors={isDark
                    ? ['rgba(97,190,197,0.22)', 'rgba(97,190,197,0.10)']
                    : ['rgba(0,105,111,0.12)', 'rgba(0,105,111,0.06)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.editBtnGrad, {
                    borderColor: isDark ? 'rgba(97,190,197,0.35)' : 'rgba(0,105,111,0.28)',
                  }]}
                >
                  <Ionicons name="pencil-outline" size={13} color={isDark ? colors.teal : colors.primary} />
                  <Text style={[styles.editBtnText, { color: isDark ? colors.teal : colors.primary }]}>
                    {t('editProfile')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </StaggerItem>

          {/* ── Treatment progress ── */}
          {patient?.alignersTotal ? (
            <StaggerItem index={2}>
              <View style={[styles.progressCard, {
                backgroundColor: isDark ? 'rgba(14,22,32,0.88)' : 'rgba(255,255,255,0.92)',
                borderColor:     isDark ? 'rgba(97,190,197,0.12)' : 'rgba(0,105,111,0.09)',
                shadowColor:     isDark ? colors.teal : '#000',
              }]}>
                <View style={[{ flexDirection: rowDir }, styles.progressHeader]}>
                  <View style={[styles.progressIconChip, { backgroundColor: isDark ? 'rgba(97,190,197,0.14)' : 'rgba(0,105,111,0.09)' }]}>
                    <Ionicons name="medkit-outline" size={16} color={colors.teal} />
                  </View>
                  <Text style={[styles.progressTitle, {
                    color: isDark ? '#e6edf3' : '#1e5979',
                    textAlign: align,
                    paddingLeft: isRTL ? 0 : 10,
                    paddingRight: isRTL ? 10 : 0,
                  }]}>
                    {t('treatmentProg')}
                  </Text>
                  <Text style={[styles.progressPct, { color: colors.teal }]}>{`${progress}%`}</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(97,190,197,0.12)' : 'rgba(0,105,111,0.10)' }]}>
                  <LinearGradient
                    colors={['#00818a', '#61bec5']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${progress}%` as any }]}
                  />
                </View>
                <Text style={[styles.progressLabel, { color: colors.textSub, textAlign: align }]}>
                  {`${patient.alignersCurrent} / ${patient.alignersTotal} ${t('alignersLeft')}`}
                </Text>
              </View>
            </StaggerItem>
          ) : null}

          {/* ── Settings section label ── */}
          <StaggerItem index={3}>
            <View style={[styles.sectionLabelRow, { flexDirection: rowDir }]}>
              <View style={[styles.sectionDot, {
                backgroundColor: colors.teal,
                shadowColor: colors.teal, shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.75, shadowRadius: 6,
              }]} />
              <Text style={[styles.sectionLabel, { color: colors.textSub }]}>
                {t('settings').toUpperCase()}
              </Text>
            </View>
          </StaggerItem>

          {/* Language */}
          <StaggerItem index={4}>
            <SettingRow
              icon="language-outline"
              iconColor={colors.teal}
              iconBg={isDark ? 'rgba(97,190,197,0.14)' : 'rgba(97,190,197,0.16)'}
              label={t('language')}
              description={locale === 'ar' ? 'العربية → English' : 'English → العربية'}
              isRTL={isRTL} colors={colors} isDark={isDark}
              onPress={handleToggleLang}
              right={
                langLoading
                  ? <ActivityIndicator size="small" color={colors.teal} />
                  : (
                    <View style={[styles.langBadge, {
                      backgroundColor: isDark ? 'rgba(97,190,197,0.16)' : 'rgba(97,190,197,0.18)',
                      borderColor:     isDark ? 'rgba(97,190,197,0.30)' : 'rgba(0,105,111,0.20)',
                    }]}>
                      <Text style={[styles.langBadgeText, { color: colors.teal }]}>
                        {locale === 'ar' ? 'AR' : 'EN'}
                      </Text>
                    </View>
                  )
              }
            />
          </StaggerItem>

          {/* Dark mode */}
          <StaggerItem index={5}>
            <SettingRow
              icon={isDark ? 'moon-outline' : 'sunny-outline'}
              iconColor={isDark ? '#79d5dc' : '#1e5979'}
              iconBg={isDark ? 'rgba(121,213,220,0.14)' : 'rgba(30,89,121,0.10)'}
              label={t('darkMode')}
              description={isDark ? t('enabled') : t('disabled')}
              isRTL={isRTL} colors={colors} isDark={isDark}
              right={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.outline + '60', true: colors.teal + 'aa' }}
                  thumbColor={isDark ? colors.teal : '#ffffff'}
                  ios_backgroundColor={colors.outline + '60'}
                />
              }
            />
          </StaggerItem>

          {/* Notifications */}
          <StaggerItem index={6}>
            <SettingRow
              icon="notifications-outline"
              iconColor={colors.success}
              iconBg={isDark ? 'rgba(86,211,100,0.12)' : 'rgba(182,234,221,0.50)'}
              label={t('notifications')}
              isRTL={isRTL} colors={colors} isDark={isDark}
              onPress={handleOpenNotifs}
              right={<Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textSub} />}
            />
          </StaggerItem>

          {/* Help */}
          <StaggerItem index={7}>
            <SettingRow
              icon="help-circle-outline"
              iconColor={colors.teal}
              iconBg={isDark ? 'rgba(97,190,197,0.12)' : 'rgba(97,190,197,0.14)'}
              label={t('help')}
              isRTL={isRTL} colors={colors} isDark={isDark}
              onPress={() => setHelpVisible(true)}
              right={<Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textSub} />}
            />
          </StaggerItem>

          {/* About */}
          <StaggerItem index={8}>
            <SettingRow
              icon="information-circle-outline"
              iconColor={isDark ? '#79d5dc' : '#1e5979'}
              iconBg={isDark ? 'rgba(121,213,220,0.12)' : 'rgba(30,89,121,0.09)'}
              label={t('about')}
              isRTL={isRTL} colors={colors} isDark={isDark}
              onPress={() => setAboutVisible(true)}
              right={<Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textSub} />}
            />
          </StaggerItem>

          {/* Logout */}
          <StaggerItem index={9}>
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.82}
              style={[styles.logoutBtnWrap, {
                backgroundColor: isDark ? 'rgba(255,123,114,0.08)' : 'rgba(255,218,214,0.45)',
                borderColor:     isDark ? 'rgba(255,123,114,0.25)' : 'rgba(186,26,26,0.18)',
              }]}
            >
              <View style={[{ flexDirection: rowDir, alignItems: 'center', gap: 9 }]}>
                <Ionicons name="log-out-outline" size={19} color={colors.error} />
                <Text style={[styles.logoutText, { color: colors.error }]}>{t('logout')}</Text>
              </View>
            </TouchableOpacity>
          </StaggerItem>

          <StaggerItem index={10}>
            <Text style={[styles.version, { color: colors.textSub }]}>SmileFix v1.0.0</Text>
          </StaggerItem>

        </ScrollView>
      </SafeAreaView>

      {/* ═══════════════════════════════════════
          MODALS — all logic identical, only
          visual layer upgraded
          ═══════════════════════════════════════ */}

      {/* ── Edit Profile ── */}
      <AnimatedModal visible={editVisible} onClose={() => !saving && setEditVisible(false)} variant="sheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalSheet, { backgroundColor: sheetBg, borderTopColor: isDark ? 'rgba(97,190,197,0.16)' : 'rgba(0,105,111,0.10)' }]}>
            <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(97,190,197,0.28)' : 'rgba(0,105,111,0.18)' }]} />
            <View style={[styles.modalHeader, { flexDirection: rowDir }]}>
              <Text style={[styles.modalTitle, { color: isDark ? '#e6edf3' : '#1e5979' }]}>{t('editProfile')}</Text>
              <TouchableOpacity onPress={() => !saving && setEditVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <View style={[styles.closeChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                  <Ionicons name="close" size={18} color={colors.textSub} />
                </View>
              </TouchableOpacity>
            </View>

            {saveError ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.error + '15', borderColor: colors.error + '40' }]}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{saveError}</Text>
              </View>
            ) : null}

            {[
              { label: t('fullName'), value: editName, onChange: setEditName, placeholder: t('fullNamePh'), keyboard: 'default' as const, caps: 'words' as const },
              { label: t('email'),    value: editEmail, onChange: setEditEmail, placeholder: t('emailPh'), keyboard: 'email-address' as const, caps: 'none' as const },
              { label: t('phoneNumber'), value: editPhone, onChange: setEditPhone, placeholder: '+966 5X XXX XXXX', keyboard: 'phone-pad' as const, caps: 'none' as const },
            ].map((f) => (
              <View key={f.label} style={{ marginBottom: 14 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSub, textAlign: align }]}>{f.label}</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderColor:     isDark ? 'rgba(97,190,197,0.22)' : 'rgba(0,105,111,0.18)',
                    color: isDark ? '#e6edf3' : colors.text,
                    textAlign: align,
                  }]}
                  value={f.value}
                  onChangeText={f.onChange}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.textSub + '60'}
                  keyboardType={f.keyboard}
                  autoCapitalize={f.caps}
                  editable={!saving}
                />
              </View>
            ))}

            <TouchableOpacity
              onPress={handleSaveProfile} disabled={saving} activeOpacity={0.85}
              style={{ borderRadius: 16, overflow: 'hidden', marginTop: 4 }}
            >
              <LinearGradient colors={['#00818a', '#00696f', '#004f54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveBtnGrad}>
                {saving
                  ? <ActivityIndicator color="#ffffff" />
                  : <Text style={styles.saveBtnText}>{t('saveChanges')}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </AnimatedModal>

      {/* ── Notifications ── */}
      <AnimatedModal visible={notifsVisible} onClose={() => setNotifsVisible(false)} variant="sheet">
        <View style={[styles.modalSheet, { backgroundColor: sheetBg, borderTopColor: isDark ? 'rgba(97,190,197,0.16)' : 'rgba(0,105,111,0.10)' }]}>
          <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(97,190,197,0.28)' : 'rgba(0,105,111,0.18)' }]} />
          <View style={[styles.modalHeader, { flexDirection: rowDir }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#e6edf3' : '#1e5979' }]}>
              {t('notificationsTitle')}
            </Text>
            <TouchableOpacity onPress={() => setNotifsVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <View style={[styles.closeChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <Ionicons name="close" size={18} color={colors.textSub} />
              </View>
            </TouchableOpacity>
          </View>

          {notifsLoading ? (
            <View style={styles.modalCenter}>
              <ActivityIndicator color={colors.teal} size="large" />
            </View>
          ) : notifsError ? (
            <View style={styles.modalCenter}>
              <Text style={{ color: colors.error, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>{notifsError}</Text>
            </View>
          ) : notifs.length === 0 ? (
            <View style={styles.modalCenter}>
              <Text style={{ fontSize: 36 }}>🔔</Text>
              <Text style={{ color: colors.textSub, marginTop: 10, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
                {t('noNotificationsYet')}
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {notifs.map((n) => (
                <TouchableOpacity key={n.id} onPress={() => handleMarkRead(n.id)} activeOpacity={0.75}
                  style={[styles.notifRow, {
                    backgroundColor: n.isRead
                      ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)')
                      : (isDark ? 'rgba(97,190,197,0.10)' : 'rgba(97,190,197,0.12)'),
                    borderColor: n.isRead
                      ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
                      : (isDark ? 'rgba(97,190,197,0.28)' : 'rgba(0,105,111,0.20)'),
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  }]}>
                  <View style={[styles.notifIconWrap, {
                    backgroundColor: n.severity === 'error' ? colors.error + '20'
                      : n.severity === 'warning' ? colors.warning + '20'
                      : colors.teal + '18',
                  }]}>
                    <Text style={{ fontSize: 17 }}>
                      {n.type === 'appointment' ? '🦷' : n.type === 'finance' ? '💳' : 'ℹ️'}
                    </Text>
                  </View>
                  <View style={[styles.notifTextWrap, { paddingLeft: isRTL ? 0 : 10, paddingRight: isRTL ? 10 : 0 }]}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.notifTitle, { color: isDark ? '#e6edf3' : colors.text, textAlign: align }]} numberOfLines={1}>
                        {n.title}
                      </Text>
                      {!n.isRead && <View style={[styles.notifDot, { backgroundColor: colors.teal }]} />}
                    </View>
                    <Text style={[styles.notifMsg, { color: colors.textSub, textAlign: align }]} numberOfLines={2}>{n.message}</Text>
                    <Text style={[styles.notifTime, { color: colors.textSub + '80', textAlign: align }]}>
                      {new Date(n.createdAt).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity onPress={() => setNotifsVisible(false)} activeOpacity={0.85}
            style={{ borderRadius: 16, overflow: 'hidden', marginTop: 16 }}>
            <LinearGradient colors={['#00818a', '#00696f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveBtnGrad}>
              <Text style={styles.saveBtnText}>{t('close')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </AnimatedModal>

      {/* ── Help ── */}
      <AnimatedModal visible={helpVisible} onClose={() => setHelpVisible(false)} variant="sheet">
        <View style={[styles.modalSheet, { backgroundColor: sheetBg, borderTopColor: isDark ? 'rgba(97,190,197,0.16)' : 'rgba(0,105,111,0.10)' }]}>
          <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(97,190,197,0.28)' : 'rgba(0,105,111,0.18)' }]} />
          <View style={[styles.modalHeader, { flexDirection: rowDir }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#e6edf3' : '#1e5979' }]}>
              {t('howToUseApp')}
            </Text>
            <TouchableOpacity onPress={() => setHelpVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <View style={[styles.closeChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <Ionicons name="close" size={18} color={colors.textSub} />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {[
              { icon: '🔑', ar: { title: 'تسجيل الدخول', desc: 'أدخل بريدك الإلكتروني وكلمة المرور للدخول.' }, en: { title: 'Login', desc: 'Enter your email and password to access your account.' } },
              { icon: '🏠', ar: { title: 'الشاشة الرئيسية', desc: 'اطّلع على موعدك القادم وتقدّم علاجك.' }, en: { title: 'Home Screen', desc: 'View your next appointment, treatment progress, and quick actions.' } },
              { icon: '📅', ar: { title: 'حجز موعد', desc: 'اختر الطبيب والخدمة والتاريخ والوقت.' }, en: { title: 'Book an Appointment', desc: 'Choose your doctor, service, date and time.' } },
              { icon: '🗓️', ar: { title: 'عرض المواعيد', desc: 'انتقل إلى تبويب مواعيدي لعرض مواعيدك.' }, en: { title: 'View Appointments', desc: 'Go to the Appointments tab to see upcoming and past visits.' } },
              { icon: '👤', ar: { title: 'تعديل الملف', desc: 'اضغط تعديل الملف لتحديث بياناتك.' }, en: { title: 'Edit Profile', desc: 'Tap Edit Profile to update your name, email or phone.' } },
              { icon: '🌐', ar: { title: 'تغيير اللغة', desc: 'اضغط اللغة للتبديل بين العربية والإنجليزية.' }, en: { title: 'Change Language', desc: 'Tap Language in Settings to switch between Arabic and English.' } },
              { icon: '🌙', ar: { title: 'الوضع الداكن', desc: 'فعّل الوضع الداكن من الإعدادات.' }, en: { title: 'Dark Mode', desc: 'Enable Dark Mode from Settings.' } },
              { icon: '📤', ar: { title: 'مشاركة التطبيق', desc: 'شارك رمز QR أو رابط التطبيق.' }, en: { title: 'Share the App', desc: 'Share the QR code or app link with friends and family.' } },
            ].map((step, i) => (
              <View key={i} style={[styles.helpStep, {
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }]}>
                <View style={[styles.helpIconWrap, { backgroundColor: isDark ? 'rgba(97,190,197,0.10)' : 'rgba(97,190,197,0.14)' }]}>
                  <Text style={{ fontSize: 20 }}>{step.icon}</Text>
                  <Text style={[styles.helpStepNum, { color: colors.teal }]}>{i + 1}</Text>
                </View>
                <View style={[styles.helpTextWrap, { paddingLeft: isRTL ? 0 : 12, paddingRight: isRTL ? 12 : 0 }]}>
                  <Text style={[styles.helpStepTitle, { color: isDark ? '#e6edf3' : '#1e5979', textAlign: align }]}>
                    {locale === 'ar' ? step.ar.title : step.en.title}
                  </Text>
                  <Text style={[styles.helpStepDesc, { color: colors.textSub, textAlign: align }]}>
                    {locale === 'ar' ? step.ar.desc : step.en.desc}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={() => setHelpVisible(false)} activeOpacity={0.85}
            style={{ borderRadius: 16, overflow: 'hidden', marginTop: 16 }}>
            <LinearGradient colors={['#00818a', '#00696f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveBtnGrad}>
              <Text style={styles.saveBtnText}>{t('close')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </AnimatedModal>

      {/* ── About ── */}
      <AnimatedModal visible={aboutVisible} onClose={() => setAboutVisible(false)} variant="sheet">
        <View style={[styles.modalSheet, { backgroundColor: sheetBg, borderTopColor: isDark ? 'rgba(97,190,197,0.16)' : 'rgba(0,105,111,0.10)' }]}>
          <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(97,190,197,0.28)' : 'rgba(0,105,111,0.18)' }]} />
          <View style={[styles.modalHeader, { flexDirection: rowDir }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#e6edf3' : '#1e5979' }]}>
              {t('aboutApp')}
            </Text>
            <TouchableOpacity onPress={() => setAboutVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <View style={[styles.closeChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <Ionicons name="close" size={18} color={colors.textSub} />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Logo */}
            <View style={styles.aboutLogoRow}>
              <View style={[styles.aboutLogoCircle, { shadowColor: colors.teal }]}>
                <LinearGradient colors={['#00818a', '#004f54']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFillObject} />
                <LinearGradient colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.00)']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFillObject} />
                <Text style={styles.aboutLogoText}>SF</Text>
              </View>
              <Text style={[styles.aboutAppName, { color: isDark ? '#e6edf3' : '#1e5979' }]}>SmileFix</Text>
              <Text style={[styles.aboutVersion, { color: colors.textSub }]}>
                {t('appVersion')}
              </Text>
              <Text style={[styles.aboutTagline, { color: colors.teal }]}>
                {`✦ ${t('tagline')} ✦`}
              </Text>
            </View>

            <Text style={[styles.aboutDesc, { color: colors.textSub, textAlign: align }]}>
              {t('appDescAbout')}
            </Text>

            {[
              { icon: '📅', key: 'aboutFeature1' as const },
              { icon: '📊', key: 'aboutFeature2' as const },
              { icon: '🔔', key: 'aboutFeature3' as const },
              { icon: '🔒', key: 'aboutFeature4' as const },
            ].map((f, i) => (
              <View key={i} style={[styles.aboutFeatureRow, {
                backgroundColor: isDark ? 'rgba(97,190,197,0.06)' : 'rgba(97,190,197,0.08)',
                borderColor:     isDark ? 'rgba(97,190,197,0.16)' : 'rgba(0,105,111,0.12)',
                flexDirection:   isRTL ? 'row-reverse' : 'row',
              }]}>
                <Text style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</Text>
                <Text style={[styles.aboutFeatureText, {
                  color: isDark ? '#e6edf3' : colors.text,
                  textAlign: align,
                  paddingLeft: isRTL ? 0 : 10, paddingRight: isRTL ? 10 : 0,
                }]}>
                  {t(f.key)}
                </Text>
              </View>
            ))}

            <View style={[styles.aboutDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]} />
            <Text style={[styles.aboutMeta, { color: colors.textSub }]}>
              {t('copyright')}
            </Text>
          </ScrollView>

          <TouchableOpacity onPress={() => setAboutVisible(false)} activeOpacity={0.85}
            style={{ borderRadius: 16, overflow: 'hidden', marginTop: 16 }}>
            <LinearGradient colors={['#1e5979', '#1e5979']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveBtnGrad}>
              <Text style={styles.saveBtnText}>{t('close')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </AnimatedModal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060b10' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 18 },

  orb:   { position: 'absolute', borderRadius: 9999 },
  orbTR: { width: 320, height: 320, top: -90, right: -80 },
  orbBL: { width: 220, height: 220, bottom: 130, left: -60 },

  pageTitle: {
    fontSize: 28, fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.7, marginTop: 10, marginBottom: 18,
  },

  // Avatar hero
  avatarHero: {
    borderRadius: 26, padding: 26,
    alignItems: 'center',
    borderWidth: 1, overflow: 'hidden',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16, shadowRadius: 24, elevation: 7,
  },
  heroGlowBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
  },
  avatarRing: {
    width: 98, height: 98, borderRadius: 49,
    borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLetter: { fontSize: 38, color: '#fff', fontFamily: 'Manrope_700Bold', fontWeight: '700' },
  patientName:  { fontSize: 20, fontFamily: 'Manrope_700Bold', fontWeight: '700', marginBottom: 4 },
  patientSub:   { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  editBtnWrap:  { marginTop: 16, borderRadius: 12, overflow: 'hidden' },
  editBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  // Progress card
  progressCard: {
    borderRadius: 20, padding: 16,
    borderWidth: 1, marginBottom: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 14, elevation: 4,
  },
  progressHeader:  { alignItems: 'center', marginBottom: 12 },
  progressIconChip: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  progressTitle: { flex: 1, fontSize: 14, fontFamily: 'Manrope_600SemiBold', fontWeight: '600' },
  progressPct:   { fontSize: 16, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill:  { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  // Section label
  sectionLabelRow: {
    alignItems: 'center', gap: 8,
    marginBottom: 10, marginTop: 4,
  },
  sectionDot:  { width: 7, height: 7, borderRadius: 3.5 },
  sectionLabel: {
    fontSize: 10, fontFamily: 'Inter_600SemiBold',
    fontWeight: '700', letterSpacing: 1.3,
  },

  // Lang badge
  langBadge: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1,
  },
  langBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_600SemiBold' },

  // Logout
  logoutBtnWrap: {
    borderRadius: 18, borderWidth: 1,
    paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700', fontFamily: 'Manrope_700Bold' },

  version: {
    fontSize: 11, fontFamily: 'Inter_400Regular',
    textAlign: 'center', marginTop: 18, marginBottom: 4,
  },

  // Modals shared
  modalSheet: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 22, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 26,
    borderTopWidth: 1,
    // Flex column so ScrollView children can use flex: 1 within maxHeight
    flexDirection: 'column',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: {
    justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  closeChip: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1, padding: 11, marginBottom: 14,
  },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  fieldLabel: { fontSize: 10, fontWeight: '700', fontFamily: 'Inter_600SemiBold', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 7 },
  input: {
    borderWidth: 1.5, borderRadius: 13,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: 'Inter_400Regular',
  },
  saveBtnGrad: { height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'Manrope_700Bold', letterSpacing: 0.3 },
  modalCenter: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },

  // Notifications
  notifRow: {
    alignItems: 'flex-start', borderRadius: 14, borderWidth: 1,
    padding: 12, marginBottom: 8,
  },
  notifIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifTextWrap: { flex: 1 },
  notifTitle: { fontSize: 13, fontWeight: '700', fontFamily: 'Manrope_700Bold', flex: 1 },
  notifDot:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  notifMsg:   { fontSize: 12, lineHeight: 17, marginTop: 2, fontFamily: 'Inter_400Regular' },
  notifTime:  { fontSize: 10, marginTop: 4, fontFamily: 'Inter_400Regular' },

  // Help
  helpStep: {
    alignItems: 'flex-start', paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 2,
  },
  helpIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  helpStepNum:  { fontSize: 9, fontWeight: '700', fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  helpTextWrap: { flex: 1 },
  helpStepTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Manrope_700Bold', marginBottom: 3 },
  helpStepDesc:  { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },

  // About
  aboutLogoRow:   { alignItems: 'center', marginBottom: 12 },
  aboutLogoCircle: {
    width: 76, height: 76, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40, shadowRadius: 20, elevation: 8,
  },
  aboutLogoText: { fontSize: 28, color: '#fff', fontWeight: '800', fontFamily: 'Manrope_700Bold' },
  aboutAppName:  { fontSize: 22, fontWeight: '800', fontFamily: 'Manrope_700Bold', marginBottom: 2 },
  aboutVersion:  { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  aboutTagline:  { fontSize: 13, fontWeight: '700', fontFamily: 'Manrope_700Bold', marginBottom: 14 },
  aboutDesc:     { fontSize: 13, lineHeight: 21, fontFamily: 'Inter_400Regular', marginBottom: 14 },
  aboutFeatureRow: { alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  aboutFeatureText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  aboutDivider:  { height: 1, marginVertical: 14 },
  aboutMeta:     { fontSize: 11, lineHeight: 18, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 4 },
});
