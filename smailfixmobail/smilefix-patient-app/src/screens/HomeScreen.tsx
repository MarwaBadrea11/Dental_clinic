// ─────────────────────────────────────────────
// Home Screen — Dashboard
// Fully themed (dark/light) + RTL/LTR
// ─────────────────────────────────────────────
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
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
import GlassCard from '../components/GlassCard';

export default function HomeScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { t, isRTL }       = useTranslation();
  const { patient, appointments } = useAppStore();
  const tabBarHeight = useTabBarHeight();

  const now = new Date().toISOString().split('T')[0];
  const nextAppt = appointments
    .filter((a) => !a.isArchived && a.date >= now && a.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening');

  const progress = patient?.alignersTotal
    ? ((patient.alignersCurrent ?? 0) / patient.alignersTotal) * 100
    : 0;

  const s = makeStyles(colors, isRTL);

  const QUICK_ACTIONS = [
    { icon: 'calendar-outline' as const, label: t('bookAppt'),  screen: 'Booking' },
    { icon: 'list-outline'     as const, label: t('myAppts'),   screen: 'Appointments' },
    { icon: 'person-outline'   as const, label: t('myProfile'), screen: 'Profile' },
    { icon: 'share-outline'    as const, label: t('shareApp'),  screen: 'QR' },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <LinearGradient
        colors={[colors.gradStart, colors.gradEnd]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={s.safe}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: tabBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
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
            >
              <Text style={s.avatarLetter}>
                {patient?.fullName?.charAt(0) ?? 'P'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Next appointment card ── */}
          {nextAppt ? (
            <View style={s.card}>
              <Text style={s.cardLabel}>{t('nextAppt')}</Text>
              <View style={s.apptRow}>
                <View style={s.apptAvatar}>
                  <Text style={s.apptAvatarLetter}>
                    {(isRTL ? nextAppt.doctor?.nameAr : nextAppt.doctor?.name)?.charAt(0) ?? 'D'}
                  </Text>
                </View>
                <View style={s.apptInfo}>
                  <Text style={s.apptDoctor} numberOfLines={1}>
                    {isRTL ? nextAppt.doctor?.nameAr : nextAppt.doctor?.name}
                  </Text>
                  <Text style={s.apptService} numberOfLines={1}>
                    {isRTL ? nextAppt.service?.nameAr : nextAppt.service?.name}
                  </Text>
                  <Text style={s.apptDateTime}>
                    {nextAppt.date}  •  {nextAppt.timeSlot}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.detailsBtn}
                onPress={() => navigation.navigate('Appointments')}
              >
                <Text style={s.detailsBtnText}>{t('viewDetails')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.noApptText}>{t('noUpcoming')}</Text>
              <TouchableOpacity
                style={s.bookNowBtn}
                onPress={() => navigation.navigate('Booking')}
              >
                <Text style={s.bookNowText}>{t('bookNow')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Treatment progress ── */}
          {patient?.alignersTotal ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>{t('treatmentProg')}</Text>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${progress}%` }]} />
              </View>
              <View style={s.progressRow}>
                <Text style={s.progressStat}>
                  {patient.alignersCurrent} / {patient.alignersTotal} {t('alignersLeft')}
                </Text>
                <Text style={s.progressPct}>{Math.round(progress)}%</Text>
              </View>
            </View>
          ) : null}

          {/* ── Quick actions ── */}
          <Text style={s.sectionTitle}>{t('quickActions')}</Text>
          <View style={s.actionsGrid}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.screen}
                style={s.actionCard}
                onPress={() => navigation.navigate(a.screen)}
                activeOpacity={0.75}
              >
                <View style={s.actionIconBox}>
                  <Ionicons name={a.icon} size={26} color={colors.teal} />
                </View>
                <Text style={s.actionLabel} numberOfLines={2}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(c: AppColors, isRTL: boolean) {
  const align = isRTL ? 'right' : 'left';
  const row   = isRTL ? 'row-reverse' : 'row';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    safe: { flex: 1 },
    scroll: { paddingHorizontal: 20 },

    // Header
    header: {
      flexDirection: row,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      marginBottom: 20,
    },
    headerText: { flex: 1 },
    greeting: {
      fontSize: 13, color: c.textSub,
      textAlign: align, marginBottom: 2,
      paddingRight: isRTL ? 20 : 0,
      paddingLeft: isRTL ? 0 : 20,
    },
    patientName: {
      fontSize: 26, fontWeight: '700',
      color: c.blue, textAlign: align,
      fontFamily: 'Manrope_700Bold',
      paddingRight: isRTL ? 20 : 0,
      paddingLeft: isRTL ? 0 : 20,
    },
    avatarBtn: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: c.teal,
      alignItems: 'center', justifyContent: 'center',
      marginLeft: isRTL ? 0 : 12,
      marginRight: isRTL ? 12 : 0,
    },
    avatarLetter: {
      fontSize: 20, color: '#ffffff',
      fontWeight: '700', fontFamily: 'Manrope_700Bold',
    },

    // Card
    card: {
      backgroundColor: c.surfaceCard,
      borderRadius: 20, padding: 18,
      marginBottom: 14,
      borderWidth: 0.5, borderColor: c.surfaceCardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03, shadowRadius: 7, elevation: 1,
      // Explicitly enforce column layout so RTL direction on parent
      // does not cause children to stack horizontally
      flexDirection: 'column',
    },
    cardLabel: {
      fontSize: 11, fontWeight: '600',
      color: c.textSub, textAlign: align,
      letterSpacing: 0.6, textTransform: 'uppercase',
      marginBottom: 12, fontFamily: 'Inter_600SemiBold',
      paddingRight: isRTL ? 20 : 0,
      paddingLeft: isRTL ? 0 : 20,
    },
    cardTitle: {
      fontSize: 15, fontWeight: '600',
      color: c.text, textAlign: align,
      marginBottom: 12, fontFamily: 'Manrope_600SemiBold',
      paddingRight: isRTL ? 20 : 0,
      paddingLeft: isRTL ? 0 : 20,
    },

    // Appointment
    apptRow: {
      flexDirection: row, alignItems: 'center',
      gap: 12, marginBottom: 14,
    },
    apptAvatar: {
      width: 52, height: 52, borderRadius: 14,
      backgroundColor: c.teal + '25',
      alignItems: 'center', justifyContent: 'center',
    },
    apptAvatarLetter: {
      fontSize: 22, color: c.teal,
      fontWeight: '700', fontFamily: 'Manrope_700Bold',
    },
    apptInfo: { flex: 1 },
    apptDoctor: {
      fontSize: 16, fontWeight: '700',
      color: c.text, textAlign: align,
      fontFamily: 'Manrope_700Bold',
      paddingRight: isRTL ? 8 : 0,
      paddingLeft: isRTL ? 0 : 8,
    },
    apptService: {
      fontSize: 13, color: c.textSub,
      textAlign: align, marginTop: 2,
      paddingRight: isRTL ? 8 : 0,
      paddingLeft: isRTL ? 0 : 8,
    },
    apptDateTime: {
      fontSize: 13, color: c.teal,
      fontWeight: '600', textAlign: align,
      marginTop: 4, fontFamily: 'Inter_600SemiBold',
      paddingRight: isRTL ? 8 : 0,
      paddingLeft: isRTL ? 0 : 8,
    },
    detailsBtn: {
      backgroundColor: c.primary,
      borderRadius: 12, paddingVertical: 12,
      alignItems: 'center',
    },
    detailsBtnText: {
      fontSize: 14, color: '#fff',
      fontWeight: '700', fontFamily: 'Inter_600SemiBold',
    },
    noApptText: {
      fontSize: 15, color: c.textSub,
      textAlign: 'center', marginBottom: 14,
      // Ensure text sits on its own line above the button
      width: '100%',
    },
    bookNowBtn: {
      backgroundColor: c.teal,
      borderRadius: 12, paddingVertical: 13,
      alignItems: 'center',
      // Prevent the button from stretching to fill parent width unexpectedly
      alignSelf: 'stretch',
    },
    bookNowText: {
      fontSize: 15, color: '#ffffff',
      fontWeight: '700', fontFamily: 'Manrope_700Bold',
    },

    // Progress
    progressTrack: {
      height: 8, backgroundColor: c.outline + '30',
      borderRadius: 4, overflow: 'hidden', marginBottom: 8,
    },
    progressFill: {
      height: '100%', backgroundColor: c.teal, borderRadius: 4,
    },
    progressRow: {
      flexDirection: row, justifyContent: 'space-between',
    },
    progressStat: { fontSize: 12, color: c.textSub },
    progressPct: {
      fontSize: 13, color: c.teal,
      fontWeight: '700', fontFamily: 'Inter_600SemiBold',
    },

    // Quick actions
    sectionTitle: {
      fontSize: 17, fontWeight: '700',
      color: c.text, textAlign: align,
      marginBottom: 12, fontFamily: 'Manrope_700Bold',
      paddingRight: isRTL ? 20 : 0,
      paddingLeft: isRTL ? 0 : 20,
    },
    actionsGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    },
    actionCard: {
      width: '47%',
      backgroundColor: c.surfaceCard,
      borderRadius: 18, padding: 16,
      alignItems: 'center',
      borderWidth: 0.5, borderColor: c.surfaceCardBorder,
    },
    actionIconBox: {
      width: 52, height: 52, borderRadius: 16,
      backgroundColor: c.teal + '18',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 10,
    },
    actionLabel: {
      fontSize: 12, color: c.text,
      textAlign: 'center', fontWeight: '600',
      fontFamily: 'Inter_600SemiBold',
    },
  });
}
