// ─────────────────────────────────────────────
// Appointments Screen — Elite Premium Redesign
// Cinematic staggered cards · Neon status badges
// Deep canvas · Organic cubic-bezier curves
// ─────────────────────────────────────────────
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { AnimatedModal } from '../components/AnimatedModal';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore, Appointment } from '../store/appStore';
import type { AppColors } from '../theme/colors';
import Text from '../components/Text';
import { useTabBarHeight } from '../hooks/useTabBarHeight';
import {
  listAppointments, deleteAppointment,
  ApiRequestError, type BackendAppointment,
} from '../services';

// ── Cinematic easings ─────────────────────────────────────────────────────
const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IN_OUT   = Easing.bezier(0.65, 0, 0.35, 1);

type TabKey = 'upcoming' | 'past';

// ── Adapt backend → store shape ────────────────────────────────────────────
function adaptAppointment(a: BackendAppointment): Appointment {
  // Parse the ISO string (which includes timezone offset from the backend).
  // Use local time methods — NOT toISOString() — so the displayed time
  // matches what the patient booked, not the UTC-converted equivalent.
  const dt = new Date(a.scheduled_at);
  const pad = (n: number) => String(n).padStart(2, '0');
  const date     = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const timeSlot = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  const statusMap: Record<string, Appointment['status']> = {
    SCHEDULED: 'waiting', CONFIRMED: 'confirmed', IN_PROGRESS: 'confirmed',
    COMPLETED: 'completed', CANCELLED: 'cancelled', NO_SHOW: 'cancelled',
  };
  let mappedStatus: Appointment['status'] = statusMap[a.status] ?? 'waiting';
  const endMs = dt.getTime() + (a.duration_minutes ?? 30) * 60_000;
  if (endMs < Date.now() && (mappedStatus === 'waiting' || mappedStatus === 'confirmed')) {
    mappedStatus = 'completed';
  }
  return {
    id: a.id, patientId: a.patient_id, doctorId: a.dentist_id, serviceId: '',
    date, timeSlot, status: mappedStatus, notes: a.notes ?? undefined,
    createdAt: a.created_at,
    isArchived: a.status === 'CANCELLED' || a.status === 'NO_SHOW',
    doctor: a.dentist_username ? {
      id: a.dentist_id, name: a.dentist_username, nameAr: a.dentist_username,
      specialty: 'Dentist', specialtyAr: 'طبيب أسنان', rating: 0, availableDays: [],
    } : undefined,
    service: a.treatment_name ? {
      id: '', name: a.treatment_name, nameAr: a.treatment_name,
      duration: a.duration_minutes, price: 0,
    } : undefined,
  };
}

// ── Animated card wrapper — staggered reveal ──────────────────────────────
function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(32)).current;
  const scale      = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    const delay = index * 80 + 60;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 500, delay,
        easing: EASE_OUT_EXPO, useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 540, delay,
        easing: EASE_OUT_EXPO, useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1, duration: 480, delay,
        easing: EASE_OUT_EXPO, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      {children}
    </Animated.View>
  );
}

// ── Status config ──────────────────────────────────────────────────────────
function useStatusConfig(colors: AppColors, isDark: boolean) {
  return {
    confirmed: {
      bg:         isDark ? 'rgba(86,211,100,0.14)' : 'rgba(182,234,221,0.60)',
      text:       colors.success,
      border:     isDark ? 'rgba(86,211,100,0.30)' : 'rgba(53,103,93,0.28)',
      glow:       colors.success,
      icon:       'checkmark-circle-outline' as const,
    },
    waiting: {
      bg:         isDark ? 'rgba(227,179,65,0.14)' : 'rgba(255,221,179,0.60)',
      text:       colors.warning,
      border:     isDark ? 'rgba(227,179,65,0.30)' : 'rgba(125,87,0,0.22)',
      glow:       colors.warning,
      icon:       'time-outline' as const,
    },
    completed: {
      bg:         isDark ? 'rgba(97,190,197,0.12)' : 'rgba(97,190,197,0.16)',
      text:       colors.teal,
      border:     isDark ? 'rgba(97,190,197,0.28)' : 'rgba(0,105,111,0.22)',
      glow:       colors.teal,
      icon:       'ribbon-outline' as const,
    },
    cancelled: {
      bg:         isDark ? 'rgba(255,123,114,0.12)' : 'rgba(255,218,214,0.60)',
      text:       colors.error,
      border:     isDark ? 'rgba(255,123,114,0.28)' : 'rgba(186,26,26,0.22)',
      glow:       colors.error,
      icon:       'close-circle-outline' as const,
    },
  };
}

// ── Details Modal ──────────────────────────────────────────────────────────
function DetailsModal({
  item, visible, onClose, colors, isDark, isRTL, t,
}: {
  item: Appointment | null; visible: boolean; onClose: () => void;
  colors: AppColors; isDark: boolean; isRTL: boolean; t: (k: any) => string;
}) {
  if (!item && !visible) return null;

  const align = isRTL ? 'right' as const : 'left' as const;
  const rowDir = isRTL ? 'row-reverse' as const : 'row' as const;
  const statusCfg = useStatusConfig(colors, isDark);
  const meta = item ? (statusCfg[item.status] ?? statusCfg.waiting) : statusCfg.waiting;

  const rows: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = item ? [
    { label: t('doctorLabel'),    icon: 'person-outline',        value: (isRTL ? item.doctor?.nameAr     : item.doctor?.name)      ?? '—' },
    { label: t('specialtyLabel'), icon: 'medical-outline',       value: (isRTL ? item.doctor?.specialtyAr : item.doctor?.specialty) ?? '—' },
    { label: t('treatmentLabel'), icon: 'bandage-outline',       value: (isRTL ? item.service?.nameAr    : item.service?.name)     ?? '—' },
    { label: t('dateLabel'),      icon: 'calendar-outline',      value: item.date },
    { label: t('timeLabel'),      icon: 'time-outline',          value: item.timeSlot },
    { label: t('durationLabel'),  icon: 'hourglass-outline',     value: item.service?.duration ? `${item.service.duration}` : '—' },
    { label: t('notesLabel'),     icon: 'document-text-outline', value: item.notes ?? t('noNotesAvailable') },
  ] : [];

  return (
    <AnimatedModal visible={visible} onClose={onClose} variant="sheet">
      <View style={{
        backgroundColor: isDark ? '#0e1a24' : '#ffffff',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40,
        borderTopWidth: 1,
        borderColor: isDark ? 'rgba(97,190,197,0.16)' : 'rgba(0,105,111,0.10)',
      }}>
        {/* Handle */}
        <View style={{
          width: 40, height: 4, borderRadius: 2,
          backgroundColor: isDark ? 'rgba(97,190,197,0.30)' : 'rgba(0,105,111,0.20)',
          alignSelf: 'center', marginBottom: 22,
        }} />

        {/* Header row */}
        <View style={{ flexDirection: rowDir, justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 10 }}>
            <View style={{
              width: 4, height: 26, borderRadius: 2,
              backgroundColor: colors.teal,
              shadowColor: colors.teal, shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8, shadowRadius: 6,
            }} />
            <Text style={{
              fontSize: 19, fontWeight: '700', fontFamily: 'Manrope_700Bold',
              color: isDark ? '#e6edf3' : '#1e5979',
            }}>
              {t('appointmentDetails')}
            </Text>
          </View>
          {item && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 11, paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: meta.bg,
              borderWidth: 1, borderColor: meta.border,
            }}>
              <Ionicons name={meta.icon} size={11} color={meta.text} />
              <Text style={{ fontSize: 10, fontWeight: '700', color: meta.text, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: 'Inter_600SemiBold' }}>
                {t(item.status)}
              </Text>
            </View>
          )}
        </View>

        {/* Rows */}
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
          {rows.map((r, i) => (
            <View key={i} style={{
              flexDirection: rowDir,
              alignItems: 'center',
              paddingVertical: 14,
              borderBottomWidth: i < rows.length - 1 ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }}>
              <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 7, flex: 1 }}>
                <View style={{
                  width: 30, height: 30, borderRadius: 9,
                  backgroundColor: isDark ? 'rgba(97,190,197,0.10)' : 'rgba(0,105,111,0.07)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name={r.icon} size={14} color={colors.teal} />
                </View>
                <Text style={{
                  fontSize: 10, color: colors.textSub,
                  textTransform: 'uppercase', letterSpacing: 0.8,
                  fontFamily: 'Inter_600SemiBold',
                }}>
                  {r.label}
                </Text>
              </View>
              <Text style={{
                fontSize: 14, color: isDark ? '#e6edf3' : colors.text,
                fontWeight: '600', fontFamily: 'Manrope_600SemiBold',
                textAlign: isRTL ? 'left' : 'right', flex: 1.2,
              }}>
                {r.value}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.85}
          style={{ marginTop: 24, borderRadius: 16, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={['#00818a', '#00696f', '#004f54']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ height: 54, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 15, color: '#fff', fontWeight: '700', fontFamily: 'Manrope_700Bold', letterSpacing: 0.3 }}>
              {t('close')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </AnimatedModal>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function AppointmentsScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { t, isRTL }       = useTranslation();
  const { appointments, setAppointments, removeAppointment, patient } = useAppStore();
  const [tab, setTab]               = useState<TabKey>('upcoming');
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [detailItem, setDetailItem] = useState<Appointment | null>(null);
  const tabBarHeight = useTabBarHeight();

  // Header entrance
  const headerO = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerO, { toValue: 1, duration: 480, easing: EASE_OUT_EXPO, useNativeDriver: true }),
      Animated.timing(headerY, { toValue: 0, duration: 520, easing: EASE_OUT_EXPO, useNativeDriver: true }),
    ]).start();
  }, []);

  // Orb pulse
  const orbScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.14, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1.00, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Fetch
  const fetchAppointments = useCallback(async (silent = false) => {
    if (!patient?.id) return;
    silent ? setRefreshing(true) : setLoading(true);
    setFetchError('');
    try {
      const result = await listAppointments({ patient_id: patient.id });
      setAppointments(result.appointments.map(adaptAppointment));
    } catch (err) {
      setFetchError(err instanceof ApiRequestError && err.status === 0 ? t('networkError') : t('loadingFailed'));
    } finally { setLoading(false); setRefreshing(false); }
  }, [patient?.id]);

  useFocusEffect(useCallback(() => { fetchAppointments(); }, [fetchAppointments]));

  const nowMs = Date.now();
  const upcoming = appointments.filter((a) => {
    if (a.isArchived || a.status === 'cancelled') return false;
    return new Date(`${a.date}T${a.timeSlot}:00`).getTime() > nowMs;
  });
  const past = appointments.filter((a) => {
    if (a.isArchived) return false;
    if (a.status === 'completed') return true;
    const ms = new Date(`${a.date}T${a.timeSlot}:00`).getTime();
    return ms <= nowMs && a.status !== 'cancelled';
  });

  const statusCfg = useStatusConfig(colors, isDark);
  const align  = isRTL ? 'right' as const : 'left' as const;
  const rowDir = isRTL ? 'row-reverse' as const : 'row' as const;

  const handleCancel = (id: string) => {
    Alert.alert(
      t('cancelAppointmentTitle'),
      t('confirmCancelAppt'),
      [
        { text: t('no'), style: 'cancel' },
        {
          text: t('yesDelete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAppointment(id);
              removeAppointment(id);
              fetchAppointments(true);
            } catch {
              Alert.alert(t('error'), t('failedToDelete'));
            }
          },
        },
      ]
    );
  };

  // ── Canvas colors ──────────────────────────────────────────────────────
  const bgColors: readonly [string, string, string] = isDark
    ? ['#060b10', '#0a1520', '#060e14']
    : ['#e6f3f6', '#eef7f8', '#e8f2f4'];

  // ── Card renderer ──────────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: Appointment; index: number }) => {
    const cfg = statusCfg[item.status] ?? statusCfg.waiting;
    const doctorInitial = ((isRTL ? item.doctor?.nameAr : item.doctor?.name) ?? 'D').charAt(0).toUpperCase();

    return (
      <AnimatedCard index={index}>
        <View style={[cardStyles.card, {
          backgroundColor: isDark ? 'rgba(14,22,32,0.92)' : 'rgba(255,255,255,0.95)',
          borderColor:     isDark ? 'rgba(97,190,197,0.12)' : 'rgba(0,105,111,0.09)',
          shadowColor:     isDark ? colors.teal : '#000',
        }]}>

          {/* Neon left accent bar */}
          <View style={[cardStyles.accentBar, { backgroundColor: cfg.text,
            shadowColor: cfg.glow,
          }]} />

          {/* Header */}
          <View style={[cardStyles.header, { flexDirection: rowDir }]}>
            {/* Avatar */}
            <View style={[cardStyles.avatar, {
              backgroundColor: isDark ? 'rgba(97,190,197,0.13)' : 'rgba(97,190,197,0.16)',
              borderColor:     isDark ? 'rgba(97,190,197,0.30)' : 'rgba(97,190,197,0.35)',
            }]}>
              <Text style={[cardStyles.avatarLetter, { color: colors.teal }]}>
                {doctorInitial}
              </Text>
            </View>

            {/* Doctor info */}
            <View style={[cardStyles.doctorInfo, isRTL ? { paddingRight: 12 } : { paddingLeft: 12 }]}>
              <Text style={[cardStyles.doctorName, { color: isDark ? '#e6edf3' : '#1e5979', textAlign: align }]} numberOfLines={1}>
                {isRTL ? item.doctor?.nameAr : item.doctor?.name}
              </Text>
              <Text style={[cardStyles.specialty, { color: colors.textSub, textAlign: align }]} numberOfLines={1}>
                {isRTL ? item.doctor?.specialtyAr : item.doctor?.specialty}
              </Text>
            </View>

            {/* Status badge */}
            <View style={[cardStyles.badge, {
              backgroundColor: cfg.bg,
              borderColor:     cfg.border,
            }]}>
              <Ionicons name={cfg.icon} size={10} color={cfg.text} />
              <Text style={[cardStyles.badgeText, { color: cfg.text }]}>{t(item.status)}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[cardStyles.divider, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          }]} />

          {/* Details row */}
          <View style={[cardStyles.detailsRow, { flexDirection: rowDir }]}>
            {/* Treatment */}
            <View style={cardStyles.detailCol}>
              <View style={[cardStyles.detailLabelRow, { flexDirection: rowDir }]}>
                <Ionicons name="bandage-outline" size={10} color={colors.textSub} />
                <Text style={[cardStyles.detailLabel, { color: colors.textSub }]}>{t('treatment')}</Text>
              </View>
              <Text style={[cardStyles.detailValue, { color: isDark ? '#e6edf3' : colors.text, textAlign: align }]} numberOfLines={1}>
                {isRTL ? item.service?.nameAr : item.service?.name}
              </Text>
            </View>

            {/* Date + time */}
            <View style={[cardStyles.detailCol, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
              <View style={[cardStyles.detailLabelRow, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                <Ionicons name="calendar-outline" size={10} color={colors.textSub} />
                <Text style={[cardStyles.detailLabel, { color: colors.textSub }]}>{t('dateTime')}</Text>
              </View>
              <Text style={[cardStyles.detailValue, { color: isDark ? '#e6edf3' : colors.text, textAlign: isRTL ? 'left' : 'right' }]}>
                {`${item.date}  •  ${item.timeSlot}`}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          {item.status !== 'cancelled' && item.status !== 'completed' ? (
            <View style={[cardStyles.actions, { flexDirection: rowDir }]}>
              {/* View details */}
              <TouchableOpacity
                style={[cardStyles.primaryBtnWrap, { flex: 1 }]}
                onPress={() => setDetailItem(item)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#00818a', '#00696f']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={cardStyles.primaryBtnGrad}
                >
                  <Text style={cardStyles.primaryBtnText}>{t('viewDetails')}</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity
                style={[cardStyles.cancelBtn, {
                  borderColor: colors.error + '45',
                  backgroundColor: isDark ? 'rgba(255,123,114,0.07)' : 'rgba(255,218,214,0.40)',
                }]}
                onPress={() => handleCancel(item.id)}
                activeOpacity={0.78}
              >
                <Ionicons name="close-circle-outline" size={15} color={colors.error} />
                <Text style={[cardStyles.cancelBtnText, { color: colors.error }]}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </AnimatedCard>
    );
  };

  // ── Empty state ────────────────────────────────────────────────────────
  const renderEmpty = () => (
    <View style={emptyStyles.wrap}>
      <View style={[emptyStyles.iconWrap, {
        backgroundColor: isDark ? 'rgba(97,190,197,0.10)' : 'rgba(97,190,197,0.14)',
        borderColor:     isDark ? 'rgba(97,190,197,0.25)' : 'rgba(97,190,197,0.30)',
      }]}>
        <Ionicons name="calendar-outline" size={40} color={colors.teal} />
      </View>
      <Text style={[emptyStyles.title, { color: isDark ? '#e6edf3' : '#1e5979' }]}>
        {t('noAppointments')}
      </Text>
      <Text style={[emptyStyles.sub, { color: colors.textSub }]}>
        {t('bookFirstAppointment')}
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('Booking')}
        activeOpacity={0.86}
        style={emptyStyles.btnWrap}
      >
        <LinearGradient
          colors={['#00818a', '#00696f', '#004f54']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={emptyStyles.btnGrad}
        >
          <Text style={emptyStyles.btnText}>{t('bookNow')}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // ── Full-screen states ─────────────────────────────────────────────────
  const fullScreenBg = (
    <>
      <LinearGradient colors={bgColors} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFillObject} />
      <Animated.View style={[orbStyles.orb, orbStyles.tr, {
        backgroundColor: isDark ? 'rgba(97,190,197,0.08)' : 'rgba(97,190,197,0.16)',
        transform: [{ scale: orbScale }],
      }]} />
    </>
  );

  if (loading && appointments.length === 0) {
    return (
      <View style={styles.root}>
        {fullScreenBg}
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} size="large" />
          <Text style={{ color: colors.textSub, marginTop: 14, fontFamily: 'Inter_400Regular' }}>{t('loading')}</Text>
        </View>
      </View>
    );
  }

  if (fetchError && appointments.length === 0) {
    return (
      <View style={styles.root}>
        {fullScreenBg}
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={52} color={colors.textSub} />
          <Text style={{ color: colors.textSub, marginTop: 14, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>{fetchError}</Text>
          <TouchableOpacity
            onPress={() => fetchAppointments()}
            activeOpacity={0.85}
            style={[emptyStyles.btnWrap, { marginTop: 20 }]}
          >
            <LinearGradient colors={['#00818a', '#004f54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={emptyStyles.btnGrad}>
              <Text style={emptyStyles.btnText}>{t('retry')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Canvas */}
      <LinearGradient colors={bgColors} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFillObject} />
      <Animated.View style={[orbStyles.orb, orbStyles.tr, {
        backgroundColor: isDark ? 'rgba(97,190,197,0.08)' : 'rgba(97,190,197,0.16)',
        transform: [{ scale: orbScale }],
      }]} />
      <Animated.View style={[orbStyles.orb, orbStyles.bl, {
        backgroundColor: isDark ? 'rgba(30,89,121,0.10)' : 'rgba(121,213,220,0.14)',
        transform: [{ scale: orbScale }],
      }]} />

      <SafeAreaView style={styles.flex}>

        {/* ── Page header ── */}
        <Animated.View style={{
          opacity: headerO, transform: [{ translateY: headerY }],
          paddingHorizontal: 20, paddingTop: 8, marginBottom: 16,
        }}>
          <Text style={[styles.pageTitle, {
            color: isDark ? '#e6edf3' : '#1e5979',
            textAlign: align,
          }]}>
            {t('myAppts')}
          </Text>

          {/* Tab row */}
          <View style={[styles.tabRow, { flexDirection: rowDir }]}>
            {(['upcoming', 'past'] as TabKey[]).map((k) => (
              <TouchableOpacity
                key={k}
                style={[styles.tabBtn, {
                  backgroundColor: tab === k
                    ? (isDark ? 'rgba(97,190,197,0.20)' : colors.primary)
                    : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                  borderColor: tab === k
                    ? (isDark ? colors.teal : colors.primary)
                    : (isDark ? 'rgba(97,190,197,0.15)' : 'rgba(0,105,111,0.14)'),
                }]}
                onPress={() => setTab(k)}
                activeOpacity={0.78}
              >
                <Text style={[styles.tabText, {
                  color: tab === k
                    ? (isDark ? colors.teal : '#fff')
                    : colors.textSub,
                }]}>
                  {t(k)}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Book now pill */}
            <TouchableOpacity
              style={[styles.newBtn, {
                marginLeft: isRTL ? 0 : 'auto' as any,
                marginRight: isRTL ? 'auto' as any : 0,
              }]}
              onPress={() => navigation.navigate('Booking')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#00818a', '#00696f']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.newBtnGrad}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.newBtnText}>{t('bookNow')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── List ── */}
        <FlatList
          data={tab === 'upcoming' ? upcoming : past}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: tabBarHeight + 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAppointments(true)}
              colors={[colors.teal]}
              tintColor={colors.teal}
            />
          }
        />
      </SafeAreaView>

      <DetailsModal
        item={detailItem} visible={!!detailItem}
        onClose={() => setDetailItem(null)}
        colors={colors} isDark={isDark} isRTL={isRTL} t={t}
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#060b10' },
  flex:  { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  pageTitle: {
    fontSize: 28, fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.7, marginBottom: 14,
  },
  tabRow:  { alignItems: 'center', gap: 8 },
  tabBtn: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 999, borderWidth: 1.5,
  },
  tabText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_600SemiBold' },

  newBtn:  { borderRadius: 999, overflow: 'hidden' },
  newBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  newBtnText: { fontSize: 12, color: '#fff', fontWeight: '700', fontFamily: 'Inter_600SemiBold' },
});

// Card-specific styles
const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 22, marginBottom: 14,
    borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14, shadowRadius: 20, elevation: 6,
  },
  accentBar: {
    position: 'absolute', left: 0, top: 18, bottom: 18,
    width: 3.5, borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.70, shadowRadius: 8,
  },
  header: { alignItems: 'center', paddingLeft: 10 },
  avatar: {
    width: 48, height: 48, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, flexShrink: 0,
  },
  avatarLetter: { fontSize: 20, fontFamily: 'Manrope_700Bold', fontWeight: '700' },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  specialty:  { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1, flexShrink: 0,
  },
  badgeText: { fontSize: 9, fontWeight: '700', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.6, textTransform: 'uppercase' },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 13, marginLeft: 10 },

  detailsRow: { justifyContent: 'space-between', paddingLeft: 10 },
  detailCol:  { flex: 1 },
  detailLabelRow: { alignItems: 'center', gap: 4, marginBottom: 4 },
  detailLabel:  { fontSize: 9, fontWeight: '700', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.9, textTransform: 'uppercase' },
  detailValue:  { fontSize: 13, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },

  actions: { gap: 9, marginTop: 14, paddingLeft: 10 },
  primaryBtnWrap: { borderRadius: 12, overflow: 'hidden' },
  primaryBtnGrad: { height: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  primaryBtnText: { fontSize: 13, color: '#fff', fontWeight: '700', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.2 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, height: 42,
    borderRadius: 12, borderWidth: 1.5,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});

// Empty state styles
const emptyStyles = StyleSheet.create({
  wrap:    { alignItems: 'center', paddingTop: 72, gap: 12 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: 8,
  },
  title: { fontSize: 20, fontFamily: 'Manrope_700Bold', letterSpacing: -0.4 },
  sub:   { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  btnWrap:  { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  btnGrad:  { height: 50, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' },
  btnText:  { fontSize: 15, color: '#fff', fontWeight: '700', fontFamily: 'Manrope_700Bold', letterSpacing: 0.3 },
});

// Orb styles
const orbStyles = StyleSheet.create({
  orb: { position: 'absolute', borderRadius: 9999 },
  tr:  { width: 300, height: 300, top: -80, right: -70 },
  bl:  { width: 220, height: 220, bottom: 140, left: -60 },
});
