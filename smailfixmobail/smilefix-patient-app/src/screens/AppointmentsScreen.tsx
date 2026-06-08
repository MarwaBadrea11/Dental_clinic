// ─────────────────────────────────────────────
// Appointments Screen — Fully themed
// Fetches real appointments from backend on focus
// ─────────────────────────────────────────────
import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore, Appointment } from '../store/appStore';
import type { AppColors } from '../theme/colors';
import Text from '../components/Text';
import {
  listAppointments,
  updateAppointment,
  ApiRequestError,
  type BackendAppointment,
} from '../services';

type TabKey = 'upcoming' | 'past';

// ── Map backend appointment → store Appointment shape ─
function adaptAppointment(a: BackendAppointment): Appointment {
  // Extract date (YYYY-MM-DD) and time (HH:mm) from scheduled_at ISO string
  const dt       = new Date(a.scheduled_at);
  const date     = dt.toISOString().split('T')[0];
  const timeSlot = dt.toTimeString().slice(0, 5);   // 'HH:mm'

  // Map backend status to store status
  const statusMap: Record<string, Appointment['status']> = {
    SCHEDULED:   'waiting',
    CONFIRMED:   'confirmed',
    IN_PROGRESS: 'confirmed',
    COMPLETED:   'completed',
    CANCELLED:   'cancelled',
    NO_SHOW:     'cancelled',
  };

  return {
    id:         a.id,
    patientId:  a.patient_id,
    doctorId:   a.dentist_id,
    serviceId:  '',
    date,
    timeSlot,
    status:     statusMap[a.status] ?? 'waiting',
    notes:      a.notes ?? undefined,
    createdAt:  a.created_at,
    isArchived: a.status === 'CANCELLED' || a.status === 'NO_SHOW',
    // Reconstruct doctor display object from joined fields
    doctor: a.dentist_username ? {
      id:           a.dentist_id,
      name:         a.dentist_username,
      nameAr:       a.dentist_username,
      specialty:    'Dentist',
      specialtyAr:  'طبيب أسنان',
      rating:       0,
      availableDays: [],
    } : undefined,
    // treatment_name exposed as service name placeholder
    service: a.treatment_name ? {
      id:       '',
      name:     a.treatment_name,
      nameAr:   a.treatment_name,
      duration: a.duration_minutes,
      price:    0,
    } : undefined,
  };
}

export default function AppointmentsScreen({ navigation }: any) {
  const { colors }   = useTheme();
  const { t, isRTL } = useTranslation();
  const { appointments, setAppointments, archiveAppointment, patient } = useAppStore();
  const [tab, setTab]           = useState<TabKey>('upcoming');
  const [loading, setLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // ── Fetch appointments from backend ───────
  const fetchAppointments = useCallback(async (silent = false) => {
    if (!patient?.id) return;
    silent ? setRefreshing(true) : setLoading(true);
    setFetchError('');
    try {
      const result = await listAppointments({ patient_id: patient.id });
      const adapted = result.appointments.map(adaptAppointment);
      setAppointments(adapted);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 0) {
        setFetchError(t('networkError'));
      } else {
        setFetchError(t('loadingFailed'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patient?.id]);

  // ── Refresh every time this screen gains focus ─
  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [fetchAppointments]),
  );

  const now      = new Date().toISOString().split('T')[0];
  const upcoming = appointments.filter(
    (a) => !a.isArchived && a.date >= now && a.status !== 'cancelled',
  );
  const past = appointments.filter(
    (a) => !a.isArchived && (a.date < now || a.status === 'completed'),
  );

  const s = makeStyles(colors, isRTL);

  const statusMeta = (status: Appointment['status']) => {
    const map = {
      confirmed: { bg: colors.successBg,   text: colors.success },
      waiting:   { bg: colors.warningBg,   text: colors.warning },
      completed: { bg: colors.teal + '20', text: colors.teal },
      cancelled: { bg: colors.errorBg,     text: colors.error },
    };
    return map[status] ?? map.waiting;
  };

  // ── Cancel an appointment via API ─────────
  const handleCancel = (id: string) => {
    Alert.alert(
      t('cancel'),
      isRTL ? 'هل أنت متأكد من إلغاء هذا الموعد؟' : 'Are you sure you want to cancel?',
      [
        { text: t('no'), style: 'cancel' },
        {
          text: t('yes'), style: 'destructive',
          onPress: async () => {
            try {
              await updateAppointment(id, { status: 'CANCELLED' });
              archiveAppointment(id);     // optimistic local update
              fetchAppointments(true);    // then sync with server
            } catch {
              Alert.alert(t('error'), t('cancelFailed'));
            }
          },
        },
      ],
    );
  };

  // ── Card renderer ─────────────────────────
  const renderItem = ({ item }: { item: Appointment }) => {
    const meta = statusMeta(item.status);
    return (
      <View style={s.card}>
        {/* Doctor row */}
        <View style={s.cardHeader}>
          <View style={s.doctorRow}>
            <View style={s.avatar}>
              <Text style={s.avatarLetter}>
                {(isRTL ? item.doctor?.nameAr : item.doctor?.name)?.charAt(0)?.toUpperCase() ?? 'D'}
              </Text>
            </View>
            <View style={s.doctorInfo}>
              <Text style={s.doctorName} numberOfLines={1}>
                {isRTL ? item.doctor?.nameAr : item.doctor?.name}
              </Text>
              <Text style={s.specialty} numberOfLines={1}>
                {isRTL ? item.doctor?.specialtyAr : item.doctor?.specialty}
              </Text>
            </View>
          </View>
          <View style={[s.badge, { backgroundColor: meta.bg }]}>
            <Text style={[s.badgeText, { color: meta.text }]}>{t(item.status)}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Details */}
        <View style={s.detailsRow}>
          <View style={s.detailItem}>
            <Text style={s.detailLabel}>{t('treatment')}</Text>
            <Text style={s.detailValue} numberOfLines={1}>
              {isRTL ? item.service?.nameAr : item.service?.name}
            </Text>
          </View>
          <View style={s.detailItem}>
            <Text style={[s.detailLabel, { textAlign: 'right' }]}>{t('dateTime')}</Text>
            <Text style={[s.detailValue, { textAlign: 'right' }]}>
              {item.date}  •  {item.timeSlot}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {item.status !== 'cancelled' && item.status !== 'completed' ? (
          <View style={s.actions}>
            <TouchableOpacity style={s.primaryBtn}>
              <Text style={s.primaryBtnText}>{t('viewDetails')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => handleCancel(item.id)}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.error} />
              <Text style={s.cancelBtnText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={s.empty}>
      <Ionicons name="calendar-outline" size={56} color={colors.textSub} />
      <Text style={s.emptyText}>{t('noUpcoming')}</Text>
      <TouchableOpacity style={s.bookBtn} onPress={() => navigation.navigate('Booking')}>
        <Text style={s.bookBtnText}>{t('bookNow')}</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Full-screen loading on first load ─────
  if (loading && appointments.length === 0) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={colors.teal} size="large" />
        <Text style={{ color: colors.textSub, marginTop: 12 }}>{t('loading')}</Text>
      </View>
    );
  }

  // ── Full-screen error ─────────────────────
  if (fetchError && appointments.length === 0) {
    return (
      <View style={[s.root, s.center]}>
        <Ionicons name="cloud-offline-outline" size={56} color={colors.textSub} />
        <Text style={{ color: colors.textSub, marginTop: 12, textAlign: 'center' }}>{fetchError}</Text>
        <TouchableOpacity style={[s.bookBtn, { marginTop: 20 }]} onPress={() => fetchAppointments()}>
          <Text style={s.bookBtnText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <LinearGradient colors={[colors.gradStart, colors.gradEnd]} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={s.safe}>
        {/* Title */}
        <Text style={s.title}>{t('myAppts')}</Text>

        {/* Tabs */}
        <View style={s.tabRow}>
          {(['upcoming', 'past'] as TabKey[]).map((k) => (
            <TouchableOpacity
              key={k}
              style={[s.tabBtn, tab === k && s.tabBtnActive]}
              onPress={() => setTab(k)}
            >
              <Text style={[s.tabText, tab === k && s.tabTextActive]}>{t(k)}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={s.newApptBtn}
            onPress={() => navigation.navigate('Booking')}
          >
            <Ionicons name="add" size={18} color={colors.onPrimaryContainer} />
            <Text style={s.newApptText}>{t('bookNow')}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={tab === 'upcoming' ? upcoming : past}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={s.list}
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
    </View>
  );
}

function makeStyles(c: AppColors, isRTL: boolean) {
  const align = isRTL ? 'right' : 'left';
  const row   = isRTL ? 'row-reverse' : 'row';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    safe: { flex: 1 },
    center: { alignItems: 'center', justifyContent: 'center' },
    title: {
      fontSize: 26, fontWeight: '700',
      color: c.blue, textAlign: align,
      paddingHorizontal: 20, paddingTop: 8,
      marginBottom: 14, fontFamily: 'Manrope_700Bold',
      paddingRight: isRTL ? 20 : 0,
      paddingLeft: isRTL ? 0 : 20,
    },

    // Tabs
    tabRow: {
      flexDirection: row, alignItems: 'center',
      paddingHorizontal: 20, gap: 8, marginBottom: 14,
    },
    tabBtn: {
      paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.surfaceCard,
      borderWidth: 0.5, borderColor: c.surfaceCardBorder,
    },
    tabBtnActive: {
      backgroundColor: c.blue,
      borderColor: c.blue,
    },
    tabText: { 
      fontSize: 13, color: c.textSub, fontWeight: '600',
      textAlign: align,
    },
    tabTextActive: { color: '#fff' },
    newApptBtn: {
      flexDirection: row, alignItems: 'center', gap: 4,
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20, backgroundColor: c.teal,
      marginLeft: isRTL ? 0 : 'auto' as any,
      marginRight: isRTL ? 'auto' as any : 0,
    },
    newApptText: {
      fontSize: 12, color: '#ffffff',
      fontWeight: '700', fontFamily: 'Inter_600SemiBold',
    },

    list: { paddingHorizontal: 20, paddingBottom: 110 },

    // Card
    card: {
      backgroundColor: c.surfaceCard,
      borderRadius: 20, padding: 16,
      marginBottom: 12,
      borderWidth: 0.5, borderColor: c.surfaceCardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    cardHeader: {
      flexDirection: row,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    doctorRow: {
      flexDirection: row, alignItems: 'center',
      gap: 10, flex: 1,
    },
    avatar: {
      width: 46, height: 46, borderRadius: 14,
      backgroundColor: c.teal + '20',
      alignItems: 'center', justifyContent: 'center',
    },
    avatarLetter: {
      fontSize: 20, color: c.teal,
      fontWeight: '700', fontFamily: 'Manrope_700Bold',
    },
    doctorInfo: { flex: 1 },
    doctorName: {
      fontSize: 15, fontWeight: '700',
      color: c.text, textAlign: align,
      fontFamily: 'Manrope_700Bold',
      paddingRight: isRTL ? 8 : 0,
      paddingLeft: isRTL ? 0 : 8,
    },
    specialty: {
      fontSize: 12, color: c.textSub, textAlign: align,
      paddingRight: isRTL ? 8 : 0,
      paddingLeft: isRTL ? 0 : 8,
    },
    badge: {
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 999,
    },
    badgeText: {
      fontSize: 10, fontWeight: '700',
      fontFamily: 'Inter_600SemiBold',
      textTransform: 'uppercase', letterSpacing: 0.4,
    },
    divider: {
      height: 1, backgroundColor: c.divider,
      marginVertical: 12,
    },
    detailsRow: {
      flexDirection: row, justifyContent: 'space-between',
    },
    detailItem: { flex: 1 },
    detailLabel: {
      fontSize: 10, color: c.textSub,
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginBottom: 3, textAlign: align,
      paddingRight: isRTL ? 8 : 0,
      paddingLeft: isRTL ? 0 : 8,
    },
    detailValue: {
      fontSize: 13, color: c.text,
      fontWeight: '600', textAlign: align,
      paddingRight: isRTL ? 8 : 0,
      paddingLeft: isRTL ? 0 : 8,
    },
    actions: {
      flexDirection: row, gap: 8, marginTop: 12,
    },
    primaryBtn: {
      flex: 1, backgroundColor: c.primary,
      borderRadius: 12, paddingVertical: 11,
      alignItems: 'center',
    },
    primaryBtnText: {
      fontSize: 13, color: '#fff',
      fontWeight: '700', fontFamily: 'Inter_600SemiBold',
    },
    cancelBtn: {
      flexDirection: row, alignItems: 'center', gap: 4,
      paddingHorizontal: 14, paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1, borderColor: c.error + '40',
    },
    cancelBtnText: {
      fontSize: 13, color: c.error, fontWeight: '600',
    },

    // Empty
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: c.textSub, textAlign: 'center' },
    bookBtn: {
      backgroundColor: c.teal, borderRadius: 14,
      paddingVertical: 13, paddingHorizontal: 28,
      alignSelf: 'center',
    },
    bookBtnText: {
      fontSize: 15, color: '#ffffff',
      fontWeight: '700', fontFamily: 'Manrope_700Bold',
    },
  });
}
