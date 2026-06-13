// ─────────────────────────────────────────────
// Home Screen — Premium Dashboard
// Elevated cards · Gradient hero · Depth + glow
// ─────────────────────────────────────────────
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/appStore';
import type { AppColors } from '../theme/colors';
import Text from '../components/Text';
import { useTabBarHeight } from '../hooks/useTabBarHeight';
import { Radius, Shadows } from '../constants/theme';

export default function HomeScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { t, isRTL }       = useTranslation();
  const { patient, appointments } = useAppStore();
  const tabBarHeight = useTabBarHeight();

  const nowMs = Date.now();
  const nextAppt = appointments
    .filter((a) => {
      if (a.isArchived || a.status === 'cancelled') return false;
      return new Date(`${a.date}T${a.timeSlot}:00`).getTime() > nowMs;
    })
    .sort((a, b) =>
      new Date(`${a.date}T${a.timeSlot}:00`).getTime() -
      new Date(`${b.date}T${b.timeSlot}:00`).getTime()
    )[0];

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening');

  const progress = patient?.alignersTotal
    ? Math.round(((patient.alignersCurrent ?? 0) / patient.alignersTotal) * 100)
    : 0;

  const s = makeStyles(colors, isRTL, isDark);

  const QUICK_ACTIONS = [
    { icon: 'calendar-outline'  as const, label: t('myAppts'),   screen: 'Appointments', color: colors.teal },
    { icon: 'add-circle-outline' as const, label: t('bookAppt'), screen: 'Booking',       color: colors.primary },
    { icon: 'share-outline'     as const, label: t('shareApp'),  screen: 'QR',            color: '#2c6484' },
    { icon: 'person-outline'    as const, label: t('myProfile'), screen: 'Profile',        color: colors.blue },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle={colors.statusBar} backgroundColor="transparent" translucent />

      {/* Full-screen background gradient */}
      <LinearGradient
        colors={isDark
          ? ['#0d1117', '#111820', '#0d1117']
          : ['#edf5f7', '#f0f7f8', '#edf1f4']
        }
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={s.safe}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ─────────────────────────────────── */}
          <View style={s.header}>
            <View style={s.headerText}>
              <Text style={s.greeting}>{greeting}</Text>
              <Text style={s.patientName} numberOfLines={1}>
                {patient?.fullName ?? '—'}
              </Text>
            </View>
            <TouchableOpacity
              style={s.avatarBtn}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.85}
            >
              {/* Avatar glow ring */}
              <View style={s.avatarGlow} />
              <Text style={s.avatarLetter}>
                {patient?.fullName?.charAt(0) ?? 'P'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Hero: Next Appointment Card ─────────────── */}
          {nextAppt ? (
            <View style={s.heroWrapper}>
              {/* Outer glow layer */}
              <View style={s.heroGlowLayer} />
              <LinearGradient
                colors={['#00818a', '#00696f', '#1a5f6a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.heroCard}
              >
                {/* Decorative radial highlight top-right */}
                <View style={s.heroHighlight} />

                {/* Card label row */}
                <View style={s.heroLabelRow}>
                  <View style={s.heroLabelPill}>
                    <Ionicons name="calendar" size={11} color="rgba(255,255,255,0.85)" />
                    <Text style={s.heroLabelText}>{t('nextAppt')}</Text>
                  </View>
                  {/* Live pulse */}
                  <View style={s.livePill}>
                    <View style={s.liveDot} />
                    <Text style={s.liveText}>LIVE</Text>
                  </View>
                </View>

                {/* Doctor row */}
                <View style={[s.apptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {/* Doctor avatar */}
                  <View style={s.heroAvatar}>
                    <Text style={s.heroAvatarLetter}>
                      {(isRTL ? nextAppt.doctor?.nameAr : nextAppt.doctor?.name)?.charAt(0) ?? 'D'}
                    </Text>
                  </View>
                  <View style={[s.apptInfo, isRTL ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                    <Text style={s.heroDocName} numberOfLines={1}>
                      {isRTL ? nextAppt.doctor?.nameAr : nextAppt.doctor?.name}
                    </Text>
                    <Text style={s.heroService} numberOfLines={1}>
                      {isRTL ? nextAppt.service?.nameAr : nextAppt.service?.name}
                    </Text>
                  </View>
                </View>

                {/* Date + time chips */}
                <View style={[s.chipRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={s.chip}>
                    <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.75)" />
                    <Text style={s.chipText}>{nextAppt.timeSlot}</Text>
                  </View>
                  <View style={s.chip}>
                    <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.75)" />
                    <Text style={s.chipText}>{nextAppt.date}</Text>
                  </View>
                </View>

                {/* CTA button */}
                <TouchableOpacity
                  style={s.heroBtn}
                  onPress={() => navigation.navigate('Appointments')}
                  activeOpacity={0.88}
                >
                  <Text style={s.heroBtnText}>{t('viewDetails')}</Text>
                  <Ionicons
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : (
            /* Empty state — elevated card */
            <View style={s.emptyCardWrapper}>
              <View style={[s.elevatedCard, s.emptyCard]}>
                <View style={s.emptyIconBox}>
                  <Ionicons name="calendar-outline" size={28} color={colors.teal} />
                </View>
                <Text style={s.noApptText}>{t('noUpcoming')}</Text>
                <TouchableOpacity
                  style={s.bookNowBtn}
                  onPress={() => navigation.navigate('Booking')}
                  activeOpacity={0.85}
                >
                  <Text style={s.bookNowText}>{t('bookNow')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Treatment Progress ────────────────────── */}
          {patient?.alignersTotal ? (
            <View style={s.elevatedCard}>
              {/* Accent bar */}
              <View style={s.progressAccent} />
              <View style={s.progressContent}>
                <Text style={[s.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('treatmentProg')}
                </Text>
                <View style={s.progressTrack}>
                  <LinearGradient
                    colors={[colors.teal, colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[s.progressFill, { width: `${progress}%` as any }]}
                  />
                </View>
                <View style={[s.progressRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={s.progressStat}>
                    {patient.alignersCurrent} / {patient.alignersTotal} {t('alignersLeft')}
                  </Text>
                  <Text style={s.progressPct}>{progress}%</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* ── Quick Actions ─────────────────────────── */}
          <Text style={[s.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('quickActions')}
          </Text>
          <View style={s.actionsGrid}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.screen}
                style={s.actionCard}
                onPress={() => navigation.navigate(a.screen)}
                activeOpacity={0.78}
              >
                {/* Icon with per-action tinted background */}
                <View style={[s.actionIconBox, { backgroundColor: a.color + '1A' }]}>
                  <Ionicons name={a.icon} size={24} color={a.color} />
                </View>
                <Text style={s.actionLabel} numberOfLines={2}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────
function makeStyles(c: AppColors, isRTL: boolean, isDark: boolean) {
  const align = isRTL ? 'right' : 'left';
  const row   = isRTL ? 'row-reverse' as const : 'row' as const;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    safe: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 4 },

    // ── Header ──────────────────────────────────
    header: {
      flexDirection: row,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: Platform.OS === 'android' ? 16 : 8,
      marginBottom: 22,
    },
    headerText: { flex: 1 },
    greeting: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textSub,
      textAlign: align,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      fontFamily: 'Inter_600SemiBold',
      marginBottom: 3,
    },
    patientName: {
      fontSize: 28,
      fontWeight: '800',
      color: isDark ? c.primary : c.blue,
      textAlign: align,
      fontFamily: 'Manrope_700Bold',
      letterSpacing: -0.5,
    },
    avatarBtn: {
      width: 50, height: 50, borderRadius: 25,
      backgroundColor: c.primary,
      alignItems: 'center', justifyContent: 'center',
      marginLeft: isRTL ? 0 : 14,
      marginRight: isRTL ? 14 : 0,
      ...Shadows.button,
    },
    avatarGlow: {
      position: 'absolute',
      width: 58, height: 58, borderRadius: 29,
      backgroundColor: c.primary + '20',
    },
    avatarLetter: {
      fontSize: 20, color: '#ffffff',
      fontWeight: '700', fontFamily: 'Manrope_700Bold',
    },

    // ── Hero appointment card ────────────────────
    heroWrapper: {
      marginBottom: 16,
      borderRadius: Radius.xl + 4,
    },
    heroGlowLayer: {
      position: 'absolute',
      top: 8, left: 8, right: 8, bottom: -8,
      borderRadius: Radius.xl + 4,
      backgroundColor: c.primary + '30',
      // blur-like glow via shadow
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
      elevation: 0,
    },
    heroCard: {
      borderRadius: Radius.xl + 4,
      padding: 22,
      overflow: 'hidden',
      ...Shadows.heroCard,
    },
    heroHighlight: {
      position: 'absolute',
      top: -40, right: -30,
      width: 180, height: 180,
      borderRadius: 90,
      backgroundColor: 'rgba(255,255,255,0.10)',
    },

    heroLabelRow: {
      flexDirection: row,
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    heroLabelPill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.15)',
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: Radius.full,
    },
    heroLabelText: {
      fontSize: 11, color: 'rgba(255,255,255,0.85)',
      fontWeight: '600', fontFamily: 'Inter_600SemiBold',
      letterSpacing: 0.5, textTransform: 'uppercase',
    },
    livePill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.15)',
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: Radius.full,
    },
    liveDot: {
      width: 6, height: 6, borderRadius: 3,
      backgroundColor: '#7dffd4',
    },
    liveText: {
      fontSize: 10, color: '#7dffd4',
      fontWeight: '700', fontFamily: 'Inter_600SemiBold',
      letterSpacing: 1,
    },

    apptRow: {
      alignItems: 'center',
      gap: 14,
      marginBottom: 16,
    },
    heroAvatar: {
      width: 56, height: 56, borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    },
    heroAvatarLetter: {
      fontSize: 24, color: '#ffffff',
      fontWeight: '700', fontFamily: 'Manrope_700Bold',
    },
    apptInfo: { flex: 1 },
    heroDocName: {
      fontSize: 18, fontWeight: '700',
      color: '#ffffff', fontFamily: 'Manrope_700Bold',
      marginBottom: 3,
    },
    heroService: {
      fontSize: 13, color: 'rgba(255,255,255,0.72)',
      fontFamily: 'Inter_400Regular',
    },

    chipRow: {
      gap: 8, marginBottom: 18,
    },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.14)',
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: Radius.full,
    },
    chipText: {
      fontSize: 13, color: 'rgba(255,255,255,0.90)',
      fontWeight: '600', fontFamily: 'Inter_600SemiBold',
    },

    heroBtn: {
      backgroundColor: '#ffffff',
      borderRadius: Radius.lg,
      paddingVertical: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    heroBtnText: {
      fontSize: 14, color: c.primary,
      fontWeight: '700', fontFamily: 'Manrope_700Bold',
    },

    // ── Empty state ──────────────────────────────
    emptyCardWrapper: { marginBottom: 16 },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: 28,
    },
    emptyIconBox: {
      width: 60, height: 60, borderRadius: 20,
      backgroundColor: c.teal + '18',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 12,
    },
    noApptText: {
      fontSize: 15, color: c.textSub,
      textAlign: 'center', marginBottom: 16,
      fontFamily: 'Inter_400Regular',
    },
    bookNowBtn: {
      backgroundColor: c.primary,
      borderRadius: Radius.lg,
      paddingVertical: 13, paddingHorizontal: 32,
      ...Shadows.button,
    },
    bookNowText: {
      fontSize: 15, color: '#ffffff',
      fontWeight: '700', fontFamily: 'Manrope_700Bold',
    },

    // ── Elevated base card ───────────────────────
    elevatedCard: {
      backgroundColor: isDark ? 'rgba(22,27,34,0.97)' : '#ffffff',
      borderRadius: Radius.xl,
      marginBottom: 16,
      overflow: 'hidden',
      borderWidth: isDark ? 0.5 : 0,
      borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'transparent',
      ...Shadows.cardElevated,
    },
    progressAccent: {
      height: 3,
      backgroundColor: c.teal,
      // subtle gradient effect via opacity gradient
      opacity: 0.85,
    },
    progressContent: { padding: 18 },
    cardTitle: {
      fontSize: 15, fontWeight: '600',
      color: c.text, marginBottom: 14,
      fontFamily: 'Manrope_600SemiBold',
    },
    progressTrack: {
      height: 9, backgroundColor: c.outline + '30',
      borderRadius: 5, overflow: 'hidden', marginBottom: 10,
    },
    progressFill: {
      height: '100%', borderRadius: 5,
    },
    progressRow: {
      justifyContent: 'space-between',
    },
    progressStat: {
      fontSize: 12, color: c.textSub,
      fontFamily: 'Inter_400Regular',
    },
    progressPct: {
      fontSize: 14, color: c.primary,
      fontWeight: '700', fontFamily: 'Inter_600SemiBold',
    },

    // ── Quick actions ────────────────────────────
    sectionTitle: {
      fontSize: 18, fontWeight: '700',
      color: c.text, marginBottom: 14,
      fontFamily: 'Manrope_700Bold',
      letterSpacing: -0.2,
    },
    actionsGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    },
    actionCard: {
      width: '47%',
      backgroundColor: isDark ? 'rgba(22,27,34,0.97)' : '#ffffff',
      borderRadius: Radius.xl,
      padding: 18,
      alignItems: 'center',
      borderWidth: isDark ? 0.5 : 0,
      borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'transparent',
      ...Shadows.actionTile,
    },
    actionIconBox: {
      width: 54, height: 54, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 12,
    },
    actionLabel: {
      fontSize: 13, color: c.text,
      textAlign: 'center', fontWeight: '600',
      fontFamily: 'Inter_600SemiBold',
      lineHeight: 18,
    },
  });
}
