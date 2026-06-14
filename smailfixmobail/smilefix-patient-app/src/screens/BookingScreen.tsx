// ─────────────────────────────────────────────
// Booking Screen — Elite Premium Redesign
// 3-step smart booking · Cinematic stagger
// Deep canvas · Neon step indicators
// ─────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  StatusBar,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/appStore';
import type { AppColors } from '../theme/colors';
import type { Doctor, Service } from '../store/appStore';
import Text from '../components/Text';
import { CustomModal, Dropdown } from '../components/CustomModal';
import { useTabBarHeight } from '../hooks/useTabBarHeight';
import {
  fetchDentists,
  fetchProcedures,
  createAppointment,
  toScheduledAt,
  ApiRequestError,
  type BackendDentist,
  type BackendProcedure,
} from '../services';
import {
  fetchWorkingHours,
  generateSlots,
  type WorkingHoursDay,
} from '../services/settingsService';

const { width } = Dimensions.get('window');

// ── Cinematic easing curves ────────────────────────────────────────────────
const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IN_OUT   = Easing.bezier(0.65, 0, 0.35, 1);

// ── Shift type ────────────────────────────────
type ShiftKey = 'morning' | 'evening';

const STEPS = ['selectDoctor', 'selectService', 'selectDateTime'] as const;

// ── Adapter: BackendDentist → Doctor store shape ─
function adaptDentist(d: BackendDentist): Doctor {
  return {
    id:            d.id,
    name:          d.username,
    nameAr:        d.username,
    specialty:     'Dentist',
    specialtyAr:   'طبيب أسنان',
    rating:        0,
    availableDays: [0, 1, 2, 3, 4],
  };
}

// ── Adapter: BackendProcedure → Service store shape ─
function adaptProcedure(p: BackendProcedure): Service {
  return {
    id:       p.id,
    name:     p.name,
    nameAr:   p.name_ar ?? p.name,
    duration: p.default_duration_minutes ?? 30,
    price:    Number(p.default_price),
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
      Animated.timing(opacity,    { toValue: 1, duration: 500, delay, easing: EASE_OUT_EXPO, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 540, delay, easing: EASE_OUT_EXPO, useNativeDriver: true }),
      Animated.timing(scale,      { toValue: 1, duration: 480, delay, easing: EASE_OUT_EXPO, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      {children}
    </Animated.View>
  );
}

export default function BookingScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { t, isRTL }       = useTranslation();
  const {
    bookingStep, selectedDoctor, selectedService,
    selectedDate, selectedTimeSlot,
    setBookingStep, setSelectedDoctor, setSelectedService,
    setSelectedDate, setSelectedTimeSlot,
    resetBookingFlow, addAppointment, hasConflict, patient,
  } = useAppStore();

  // ── Remote data ───────────────────────────
  const [doctors,  setDoctors]  = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingDocs,    setLoadingDocs]    = useState(false);
  const [loadingSrvs,    setLoadingSrvs]    = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [fetchError,     setFetchError]     = useState('');

  // ── Working-hours state ────────────────────
  const [workingHours,    setWorkingHours]    = useState<WorkingHoursDay[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // ── Date / time / shift state ─────────────
  const [dates,          setDates]          = useState<string[]>([]);
  const [selectedShift,  setSelectedShift]  = useState<ShiftKey | null>(null);
  const [showDateModal,  setShowDateModal]  = useState(false);
  const [showTimeModal,  setShowTimeModal]  = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const tabBarHeight = useTabBarHeight();
  const align  = isRTL ? 'right' as const : 'left' as const;
  const rowDir = isRTL ? 'row-reverse' as const : 'row' as const;

  // ── Header entrance animation ──────────────
  const headerO = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerO, { toValue: 1, duration: 480, easing: EASE_OUT_EXPO, useNativeDriver: true }),
      Animated.timing(headerY, { toValue: 0, duration: 520, easing: EASE_OUT_EXPO, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Orb pulse ──────────────────────────────
  const orb1 = useRef(new Animated.Value(1)).current;
  const orb2 = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1, { toValue: 1.18, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orb1, { toValue: 1.00, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    const t2 = setTimeout(() =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(orb2, { toValue: 1.14, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(orb2, { toValue: 1.00, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start()
    , 1800);
    return () => clearTimeout(t2);
  }, []);

  // ── Fetch working hours once on mount ─────
  useEffect(() => {
    setLoadingSchedule(true);
    fetchWorkingHours()
      .then(setWorkingHours)
      .catch(() => {/* silently fallback */})
      .finally(() => setLoadingSchedule(false));
  }, []);

  // ── Generate next 14 dates, filtered to open days ──
  useEffect(() => {
    const openDays = new Set(
      workingHours.filter((d) => d.isOpen).map((d) => d.dayOfWeek),
    );
    const d: string[] = [];
    for (let i = 1; i <= 60; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() + i);
      const dow = dt.getDay();
      if (openDays.size === 0 || openDays.has(dow)) {
        d.push(dt.toISOString().split('T')[0]);
      }
      if (d.length === 14) break;
    }
    setDates(d);
    if (selectedDate && d.length > 0 && !d.includes(selectedDate)) {
      setSelectedDate(null);
      setSelectedTimeSlot(null);
      setSelectedShift(null);
    }
  }, [workingHours]);

  // ── Rebuild slots when date, shift, or doctor changes ──
  useEffect(() => {
    if (!selectedDate || !selectedShift) { setAvailableSlots([]); return; }
    const dow       = new Date(selectedDate).getDay();
    const dayConfig = workingHours.find((d) => d.dayOfWeek === dow);
    let raw: string[] = [];
    if (dayConfig) {
      raw = selectedShift === 'morning'
        ? generateSlots(dayConfig.morningStart, dayConfig.morningEnd)
        : generateSlots(dayConfig.eveningStart, dayConfig.eveningEnd);
    }
    const filtered = selectedDoctor
      ? raw.filter((time) => !hasConflict(selectedDoctor.id, selectedDate, time))
      : raw;
    setAvailableSlots(filtered);
    if (selectedTimeSlot && !filtered.includes(selectedTimeSlot)) setSelectedTimeSlot(null);
  }, [selectedDate, selectedShift, selectedDoctor, workingHours, hasConflict]);

  // ── Fetch dentists when step 0 is shown ───
  useEffect(() => {
    if (bookingStep !== 0) return;
    if (doctors.length > 0) return;
    setLoadingDocs(true);
    setFetchError('');
    fetchDentists()
      .then((list) => setDoctors(list.map(adaptDentist)))
      .catch(() => setFetchError(t('networkError')))
      .finally(() => setLoadingDocs(false));
  }, [bookingStep]);

  // ── Fetch procedures when step 1 is shown ─
  useEffect(() => {
    if (bookingStep !== 1) return;
    if (services.length > 0) return;
    setLoadingSrvs(true);
    setFetchError('');
    fetchProcedures()
      .then((list) => setServices(list.filter((p) => p.is_active).map(adaptProcedure)))
      .catch(() => setFetchError(t('networkError')))
      .finally(() => setLoadingSrvs(false));
  }, [bookingStep]);

  // ── Helpers ───────────────────────────────
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedShift(null);
    setSelectedTimeSlot(null);
    setShowDateModal(false);
  };

  const handleShiftSelect = (shift: ShiftKey) => {
    setSelectedShift(shift);
    setSelectedTimeSlot(null);
    setTimeout(() => setShowTimeModal(true), 250);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTimeSlot(time);
    setShowTimeModal(false);
  };

  const selectedDayConfig = selectedDate
    ? workingHours.find((d) => d.dayOfWeek === new Date(selectedDate).getDay())
    : null;

  const hasMorningShift = !!(selectedDayConfig?.morningStart && selectedDayConfig.morningEnd);
  const hasEveningShift = !!(selectedDayConfig?.eveningStart && selectedDayConfig.eveningEnd);

  // ── Confirm booking → real API ────────────
  const handleConfirm = useCallback(async () => {
    if (!selectedDoctor || !selectedService || !selectedDate || !selectedTimeSlot || !patient) return;
    setLoadingConfirm(true);
    try {
      const booked = await createAppointment({
        patient_id:       patient.id,
        dentist_id:       selectedDoctor.id,
        scheduled_at:     toScheduledAt(selectedDate, selectedTimeSlot),
        duration_minutes: selectedService.duration,
        status:           'SCHEDULED',
        treatment_name:   selectedService.name,
      });
      addAppointment({
        id:        booked.id,
        patientId: booked.patient_id,
        doctorId:  booked.dentist_id,
        serviceId: selectedService.id,
        date:      selectedDate,
        timeSlot:  selectedTimeSlot,
        status:    'confirmed',
        doctor:    selectedDoctor,
        service:   selectedService,
        createdAt: booked.created_at,
        isArchived: false,
      });
      Alert.alert(t('bookConfirmed'), t('bookSuccess'));
      resetBookingFlow();
      setSelectedShift(null);
      navigation.navigate('Appointments');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 400 && err.body.message?.toLowerCase().includes('conflict')) {
          Alert.alert(t('timeUnavailable'), t('slotAlreadyBooked'));
        } else if (err.status === 0) {
          Alert.alert(t('networkError'), t('checkConnection'));
        } else {
          Alert.alert(t('bookingFailed'), err.body.message || t('tryAgain'));
        }
      } else {
        Alert.alert(t('bookingFailed'), t('tryAgain'));
      }
    } finally {
      setLoadingConfirm(false);
    }
  }, [selectedDoctor, selectedService, selectedDate, selectedTimeSlot, patient]);

  const handleRetry = () => {
    setFetchError('');
    setBookingStep(bookingStep);
    if (bookingStep === 0) setDoctors([]);
    if (bookingStep === 1) setServices([]);
  };

  function LoadingOrError({ loading }: { loading: boolean }) {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.teal} size="large" />
          <Text style={[styles.centerText, { color: colors.textSub }]}>{t('loading')}</Text>
        </View>
      );
    }
    if (fetchError) {
      return (
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textSub} />
          <Text style={[styles.centerText, { color: colors.textSub }]}>{fetchError}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.teal }]}
            onPress={handleRetry}
          >
            <Text style={styles.retryText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  }

  const bgColors: readonly [string, string, string] = isDark
    ? ['#060b10', '#0a1520', '#060e14']
    : ['#e6f3f6', '#eef7f8', '#e8f2f4'];

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Deep canvas */}
      <LinearGradient colors={bgColors} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFillObject} />

      {/* Pulsing orbs */}
      <Animated.View style={[styles.orb, styles.orbTR, {
        backgroundColor: isDark ? 'rgba(97,190,197,0.08)' : 'rgba(97,190,197,0.16)',
        transform: [{ scale: orb1 }],
      }]} />
      <Animated.View style={[styles.orb, styles.orbBL, {
        backgroundColor: isDark ? 'rgba(30,89,121,0.10)' : 'rgba(121,213,220,0.14)',
        transform: [{ scale: orb2 }],
      }]} />

      <SafeAreaView style={styles.flex}>

        {/* ── Page header ── */}
        <Animated.View style={{
          opacity: headerO, transform: [{ translateY: headerY }],
          paddingHorizontal: 22, paddingTop: 8, marginBottom: 10,
        }}>
          <Text style={[styles.pageTitle, { color: isDark ? '#e6edf3' : '#1e5979', textAlign: align }]}>
            {t('bookAppointment')}
          </Text>

          {/* ── Premium step indicator ── */}
          <View style={[styles.stepRow, { flexDirection: rowDir }]}>
            {STEPS.map((_, i) => {
              const isDone   = bookingStep > i;
              const isActive = bookingStep === i;
              return (
                <View key={i} style={[styles.stepItem, { flexDirection: rowDir }]}>
                  {/* Circle */}
                  {isDone ? (
                    <View style={[styles.stepCircle, {
                      backgroundColor: colors.teal,
                      shadowColor: colors.teal,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.55, shadowRadius: 8, elevation: 4,
                    }]}>
                      <Ionicons name="checkmark" size={13} color="#fff" />
                    </View>
                  ) : isActive ? (
                    <LinearGradient
                      colors={['#00818a', '#00696f', '#004f54']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={[styles.stepCircle, {
                        shadowColor: colors.teal,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.65, shadowRadius: 10, elevation: 5,
                      }]}
                    >
                      <Text style={styles.stepNumActive}>{i + 1}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.stepCircle, {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                      borderWidth: 1.5,
                      borderColor: isDark ? 'rgba(97,190,197,0.20)' : 'rgba(0,105,111,0.18)',
                    }]}>
                      <Text style={[styles.stepNum, { color: colors.textSub }]}>{i + 1}</Text>
                    </View>
                  )}
                  {/* Connector */}
                  {i < STEPS.length - 1 && (
                    isDone ? (
                      <LinearGradient
                        colors={['#00818a', '#61bec5']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.stepLineFilled}
                      />
                    ) : (
                      <View style={[styles.stepLine, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
                      }]} />
                    )
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Step 0: Select Dentist ────────── */}
          {bookingStep === 0 && (
            (loadingDocs || fetchError)
              ? <LoadingOrError loading={loadingDocs} />
              : doctors.length === 0
                ? (
                  <View style={styles.centerBox}>
                    <Ionicons name="person-outline" size={48} color={colors.textSub} />
                    <Text style={[styles.centerText, { color: colors.textSub }]}>{t('noDoctorsFound')}</Text>
                  </View>
                )
                : doctors.map((doc, index) => {
                    const initial = (isRTL ? doc.nameAr : doc.name).charAt(0).toUpperCase();
                    return (
                      <AnimatedCard key={doc.id} index={index}>
                        <TouchableOpacity
                          activeOpacity={0.88}
                          onPress={() => { setSelectedDoctor(doc); setBookingStep(1); }}
                        >
                          <View style={[styles.card, {
                            backgroundColor: isDark ? 'rgba(14,22,32,0.92)' : 'rgba(255,255,255,0.95)',
                            borderColor:     isDark ? 'rgba(97,190,197,0.12)' : 'rgba(0,105,111,0.09)',
                            shadowColor:     isDark ? colors.teal : '#000',
                          }]}>
                            {/* Neon left accent */}
                            <View style={[styles.accentBar, {
                              backgroundColor: colors.teal,
                              shadowColor: colors.teal,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.70, shadowRadius: 6,
                            }]} />
                            <View style={[styles.doctorRow, { flexDirection: rowDir, paddingLeft: 10 }]}>
                              {/* Squircle avatar */}
                              <View style={[styles.docAvatar, {
                                backgroundColor: isDark ? 'rgba(97,190,197,0.13)' : 'rgba(97,190,197,0.16)',
                                borderWidth: 1.5,
                                borderColor: isDark ? 'rgba(97,190,197,0.35)' : 'rgba(97,190,197,0.40)',
                              }]}>
                                <Text style={[styles.docAvatarLetter, { color: colors.teal }]}>
                                  {initial}
                                </Text>
                              </View>
                              <View style={[styles.docInfo, isRTL ? { paddingRight: 12 } : { paddingLeft: 12 }]}>
                                <Text style={[styles.docName, { color: isDark ? '#e6edf3' : '#1e5979', textAlign: align }]}>
                                  {isRTL ? doc.nameAr : doc.name}
                                </Text>
                                <Text style={[styles.docSpec, { color: colors.textSub, textAlign: align }]}>
                                  {isRTL ? doc.specialtyAr : doc.specialty}
                                </Text>
                                {doc.rating > 0 && (
                                  <Text style={[styles.docRating, { color: colors.teal }]}>
                                    {`⭐ ${doc.rating}`}
                                  </Text>
                                )}
                              </View>
                              <Ionicons
                                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                                size={18} color={colors.textSub}
                              />
                            </View>
                          </View>
                        </TouchableOpacity>
                      </AnimatedCard>
                    );
                  })
          )}

          {/* ── Step 1: Select Service ────────── */}
          {bookingStep === 1 && (
            (loadingSrvs || fetchError)
              ? <LoadingOrError loading={loadingSrvs} />
              : services.length === 0
                ? (
                  <View style={styles.centerBox}>
                    <Ionicons name="medical-outline" size={48} color={colors.textSub} />
                    <Text style={[styles.centerText, { color: colors.textSub }]}>{t('noServicesFound')}</Text>
                  </View>
                )
                : services.map((srv, index) => (
                    <AnimatedCard key={srv.id} index={index}>
                      <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() => { setSelectedService(srv); setBookingStep(2); }}
                      >
                        <View style={[styles.card, {
                          backgroundColor: isDark ? 'rgba(14,22,32,0.92)' : 'rgba(255,255,255,0.95)',
                          borderColor:     isDark ? 'rgba(97,190,197,0.12)' : 'rgba(0,105,111,0.09)',
                          shadowColor:     isDark ? colors.teal : '#000',
                        }]}>
                          {/* Neon left accent */}
                          <View style={[styles.accentBar, {
                            backgroundColor: colors.blue,
                            shadowColor: colors.blue,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.60, shadowRadius: 6,
                          }]} />
                          <View style={{ paddingLeft: 10 }}>
                            <Text style={[styles.srvName, { color: isDark ? '#e6edf3' : '#1e5979', textAlign: align }]}>
                              {isRTL ? srv.nameAr : srv.name}
                            </Text>
                            <View style={[styles.srvPillRow, { flexDirection: rowDir }]}>
                              <View style={[styles.srvPill, {
                                backgroundColor: isDark ? 'rgba(97,190,197,0.15)' : 'rgba(0,105,111,0.10)',
                                borderColor: isDark ? 'rgba(97,190,197,0.30)' : 'rgba(0,105,111,0.20)',
                              }]}>
                                <Ionicons name="time-outline" size={10} color={colors.teal} />
                                <Text style={[styles.srvPillText, { color: colors.teal }]}>
                                  {`${srv.duration} ${t('min')}`}
                                </Text>
                              </View>
                              <View style={[styles.srvPill, {
                                backgroundColor: isDark ? 'rgba(86,211,100,0.12)' : 'rgba(53,103,93,0.10)',
                                borderColor: isDark ? 'rgba(86,211,100,0.25)' : 'rgba(53,103,93,0.20)',
                              }]}>
                                <Ionicons name="pricetag-outline" size={10} color={colors.success} />
                                <Text style={[styles.srvPillText, { color: colors.success }]}>
                                  {`${srv.price} ${t('sar')}`}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </AnimatedCard>
                  ))
          )}

          {/* ── Step 2: Date / Shift / Time ─── */}
          {bookingStep === 2 && (
            <View style={styles.dateTimeSection}>
              {loadingSchedule && (
                <View style={styles.scheduleLoader}>
                  <ActivityIndicator color={colors.teal} size="small" />
                  <Text style={[styles.centerText, { color: colors.textSub, marginTop: 6 }]}>{t('loading')}</Text>
                </View>
              )}

              {/* Date picker */}
              <Dropdown
                label={t('selectDate')}
                value={selectedDate ? formatDate(selectedDate) : null}
                placeholder={t('selectDate')}
                onPress={() => setShowDateModal(true)}
                isRTL={isRTL}
              />

              {/* Shift selector */}
              {selectedDate && (hasMorningShift || hasEveningShift) && (
                <View style={styles.shiftSection}>
                  <Text style={[styles.shiftLabel, { color: colors.textSub, textAlign: align }]}>
                    {t('selectShift')}
                  </Text>
                  <View style={[styles.shiftRow, { flexDirection: rowDir }]}>
                    {hasMorningShift && (
                      <TouchableOpacity
                        activeOpacity={0.82}
                        style={[styles.shiftBtn, {
                          backgroundColor: selectedShift === 'morning'
                            ? 'transparent'
                            : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                          borderColor: selectedShift === 'morning'
                            ? colors.teal
                            : (isDark ? 'rgba(97,190,197,0.20)' : 'rgba(0,105,111,0.18)'),
                          overflow: 'hidden',
                        }]}
                        onPress={() => handleShiftSelect('morning')}
                      >
                        {selectedShift === 'morning' && (
                          <LinearGradient
                            colors={['#00818a', '#00696f', '#004f54']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                          />
                        )}
                        <Ionicons
                          name="sunny-outline" size={18}
                          color={selectedShift === 'morning' ? '#fff' : colors.teal}
                        />
                        <Text style={[styles.shiftBtnText, {
                          color: selectedShift === 'morning' ? '#fff' : (isDark ? '#e6edf3' : colors.text),
                        }]}>
                          {t('morningShift')}
                        </Text>
                        {selectedDayConfig?.morningStart && selectedDayConfig.morningEnd && (
                          <Text style={[styles.shiftTime, {
                            color: selectedShift === 'morning' ? 'rgba(255,255,255,0.80)' : colors.textSub,
                          }]}>
                            {`${selectedDayConfig.morningStart} – ${selectedDayConfig.morningEnd}`}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {hasEveningShift && (
                      <TouchableOpacity
                        activeOpacity={0.82}
                        style={[styles.shiftBtn, {
                          backgroundColor: selectedShift === 'evening'
                            ? 'transparent'
                            : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                          borderColor: selectedShift === 'evening'
                            ? colors.teal
                            : (isDark ? 'rgba(97,190,197,0.20)' : 'rgba(0,105,111,0.18)'),
                          overflow: 'hidden',
                        }]}
                        onPress={() => handleShiftSelect('evening')}
                      >
                        {selectedShift === 'evening' && (
                          <LinearGradient
                            colors={['#00818a', '#00696f', '#004f54']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                          />
                        )}
                        <Ionicons
                          name="moon-outline" size={18}
                          color={selectedShift === 'evening' ? '#fff' : colors.blue}
                        />
                        <Text style={[styles.shiftBtnText, {
                          color: selectedShift === 'evening' ? '#fff' : (isDark ? '#e6edf3' : colors.text),
                        }]}>
                          {t('eveningShift')}
                        </Text>
                        {selectedDayConfig?.eveningStart && selectedDayConfig.eveningEnd && (
                          <Text style={[styles.shiftTime, {
                            color: selectedShift === 'evening' ? 'rgba(255,255,255,0.80)' : colors.textSub,
                          }]}>
                            {`${selectedDayConfig.eveningStart} – ${selectedDayConfig.eveningEnd}`}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Time slot picker */}
              {selectedDate && selectedShift && (
                <Dropdown
                  label={t('selectTime')}
                  value={selectedTimeSlot}
                  placeholder={t('selectTime')}
                  onPress={() => setShowTimeModal(true)}
                  isRTL={isRTL}
                />
              )}

              {/* Premium summary card */}
              {(selectedDate || selectedTimeSlot) && (
                <AnimatedCard index={0}>
                  <View style={[styles.summaryCard, {
                    backgroundColor: isDark ? 'rgba(14,22,32,0.92)' : 'rgba(255,255,255,0.95)',
                    borderColor:     isDark ? 'rgba(97,190,197,0.12)' : 'rgba(0,105,111,0.09)',
                    shadowColor:     isDark ? colors.teal : '#000',
                  }]}>
                    {/* Gradient left bar */}
                    <LinearGradient
                      colors={['#00818a', '#61bec5']}
                      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                      style={[styles.summaryAccentBar, {
                        shadowColor: colors.teal,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.60, shadowRadius: 6,
                      }]}
                    />
                    <View style={{ paddingLeft: 12 }}>
                      <Text style={[styles.summaryTitle, { color: isDark ? '#e6edf3' : '#1e5979', textAlign: align }]}>
                        {t('appointmentSummary')}
                      </Text>
                      {[
                        selectedDate    && { icon: 'calendar-outline' as const, val: formatDate(selectedDate) },
                        selectedShift   && { icon: (selectedShift === 'morning' ? 'sunny-outline' : 'moon-outline') as const, val: selectedShift === 'morning' ? t('morningShift') : t('eveningShift') },
                        selectedTimeSlot && { icon: 'time-outline' as const, val: selectedTimeSlot },
                        selectedDoctor  && { icon: 'person-outline' as const, val: isRTL ? selectedDoctor.nameAr : selectedDoctor.name },
                        selectedService && { icon: 'medical-outline' as const, val: isRTL ? selectedService.nameAr : selectedService.name },
                      ].filter(Boolean).map((row: any, idx: number) => (
                        <View key={idx} style={[styles.summaryRow, { flexDirection: rowDir }]}>
                          <View style={[styles.summaryIconBox, {
                            backgroundColor: isDark ? 'rgba(97,190,197,0.10)' : 'rgba(0,105,111,0.07)',
                          }]}>
                            <Ionicons name={row.icon} size={13} color={colors.teal} />
                          </View>
                          <Text style={[styles.summaryText, { color: isDark ? '#e6edf3' : colors.text, textAlign: align }]}>
                            {row.val}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </AnimatedCard>
              )}
            </View>
          )}

          {/* ── Confirm button ── */}
          {selectedDoctor && selectedService && selectedDate && selectedTimeSlot && (
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={loadingConfirm}
              activeOpacity={0.86}
              style={[styles.confirmBtnWrap, loadingConfirm && { opacity: 0.60 }, {
                shadowColor: colors.teal,
              }]}
            >
              <LinearGradient
                colors={['#00818a', '#00696f', '#004f54']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.confirmBtnGradient}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.00)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
                />
                {loadingConfirm
                  ? <ActivityIndicator color="#ffffff" size="small" />
                  : <Text style={styles.confirmText}>{t('confirmBook')}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ── Back button ── */}
          {bookingStep > 0 && (
            <TouchableOpacity
              style={[styles.backBtn, { flexDirection: rowDir }]}
              onPress={() => {
                setBookingStep(bookingStep - 1);
                if (bookingStep === 2) { setSelectedShift(null); setSelectedTimeSlot(null); }
              }}
              activeOpacity={0.75}
            >
              <Ionicons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={16} color={isDark ? colors.teal : colors.primary}
              />
              <Text style={[styles.backText, { color: isDark ? colors.teal : colors.primary }]}>
                {t('back')}
              </Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </SafeAreaView>

      {/* ── Date Selection Modal ── */}
      <CustomModal
        visible={showDateModal}
        onClose={() => setShowDateModal(false)}
        title={t('selectDate')}
        isRTL={isRTL}
      >
        <FlatList
          data={dates}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={modalStyles.modalList}
          renderItem={({ item }) => {
            const date       = new Date(item);
            const isSelected = selectedDate === item;
            const dayName    = date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { weekday: 'long' });
            const dateStr    = date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            });
            const dowConfig = workingHours.find((d) => d.dayOfWeek === date.getDay());
            const shifts = [
              dowConfig?.morningStart && dowConfig.morningEnd
                ? `☀ ${dowConfig.morningStart}–${dowConfig.morningEnd}` : null,
              dowConfig?.eveningStart && dowConfig.eveningEnd
                ? `🌙 ${dowConfig.eveningStart}–${dowConfig.eveningEnd}` : null,
            ].filter(Boolean).join('  ');
            return (
              <Pressable
                style={[modalStyles.modalItem, isSelected && modalStyles.modalItemSelected]}
                onPress={() => handleDateSelect(item)}
              >
                <View style={modalStyles.modalItemContent}>
                  <Text style={[modalStyles.modalItemDay, { color: isDark ? '#000' : colors.text }]}>
                    {dayName}
                  </Text>
                  <Text style={[modalStyles.modalItemDate, { color: colors.textSub }]}>{dateStr}</Text>
                  {!!shifts && (
                    <Text style={[modalStyles.modalItemShifts, { color: colors.teal }]}>{shifts}</Text>
                  )}
                </View>
                {isSelected && <Ionicons name="checkmark" size={20} color={colors.teal} />}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={modalStyles.noSlotsContainer}>
              <Ionicons name="calendar-outline" size={40} color={colors.textSub} />
              <Text style={[modalStyles.noSlotsText, { color: colors.textSub, textAlign: 'center' }]}>
                {t('noOpenDays')}
              </Text>
            </View>
          }
        />
      </CustomModal>

      {/* ── Time Selection Modal ── */}
      <CustomModal
        visible={showTimeModal}
        onClose={() => setShowTimeModal(false)}
        title={t('selectTime')}
        isRTL={isRTL}
      >
        <FlatList
          data={availableSlots}
          keyExtractor={(item) => item}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={modalStyles.modalTimeGrid}
          columnWrapperStyle={modalStyles.modalTimeRow}
          renderItem={({ item }) => {
            const isSelected = selectedTimeSlot === item;
            const isConflict = selectedDoctor && selectedDate
              ? hasConflict(selectedDoctor.id, selectedDate, item)
              : false;
            return (
              <Pressable
                style={[
                  modalStyles.modalTimeItem,
                  isSelected && modalStyles.modalTimeItemSelected,
                  isConflict && modalStyles.modalTimeItemDisabled,
                ]}
                onPress={() => !isConflict && handleTimeSelect(item)}
                disabled={!!isConflict}
              >
                <Text style={[
                  modalStyles.modalTimeText,
                  isSelected && modalStyles.modalTimeTextSelected,
                  isConflict && modalStyles.modalTimeTextDisabled,
                ]}>
                  {item}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={modalStyles.noSlotsContainer}>
              <Ionicons name="time-outline" size={48} color={colors.textSub} />
              <Text style={[modalStyles.noSlotsText, { color: colors.textSub, textAlign: 'center' }]}>
                {t('noAvailableSlots')}
              </Text>
            </View>
          }
        />
      </CustomModal>
    </View>
  );
}

// ── Modal styles ────────────────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  modalList:             { padding: 16 },
  modalItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12,
    marginBottom: 8, backgroundColor: '#f8f9fa',
  },
  modalItemSelected:     { backgroundColor: '#e8f4f8' },
  modalItemContent:      { flex: 1 },
  modalItemDay:          { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  modalItemDate:         { fontSize: 14 },
  modalItemShifts:       { fontSize: 11, marginTop: 3, fontWeight: '600' },
  modalTimeGrid:         { padding: 16 },
  modalTimeRow:          { justifyContent: 'space-between', marginBottom: 12 },
  modalTimeItem: {
    width: '30%', paddingVertical: 12, borderRadius: 12,
    alignItems: 'center', backgroundColor: '#f8f9fa',
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  modalTimeItemSelected: { backgroundColor: '#1e5979', borderColor: '#1e5979' },
  modalTimeItemDisabled: { backgroundColor: '#f0f0f0', opacity: 0.5 },
  modalTimeText:         { fontSize: 14, fontWeight: '600', color: '#333' },
  modalTimeTextSelected: { color: 'white' },
  modalTimeTextDisabled: { color: '#999' },
  noSlotsContainer:      { padding: 40, alignItems: 'center' },
  noSlotsText:           { fontSize: 16, marginTop: 12 },
});

// ── Static styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060b10' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  // Orbs
  orb:   { position: 'absolute', borderRadius: 9999 },
  orbTR: { width: 320, height: 320, top: -90, right: -80 },
  orbBL: { width: 230, height: 230, bottom: 130, left: -65 },

  // Page title
  pageTitle: {
    fontSize: 28, fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.7, marginBottom: 18,
  },

  // Step indicator
  stepRow:  { alignItems: 'center', marginBottom: 4 },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum:       { fontSize: 12, fontFamily: 'Inter_600SemiBold', fontWeight: '700' },
  stepNumActive: { fontSize: 12, color: '#fff', fontFamily: 'Inter_600SemiBold', fontWeight: '700' },
  stepLine: {
    flex: 1, height: 2, marginHorizontal: 4, borderRadius: 1,
  },
  stepLineFilled: {
    flex: 1, height: 2, marginHorizontal: 4, borderRadius: 1,
  },

  // Cards
  card: {
    borderRadius: 20, marginBottom: 12,
    borderWidth: 1, padding: 16, overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14, shadowRadius: 18, elevation: 5,
  },
  accentBar: {
    position: 'absolute', left: 0, top: 16, bottom: 16,
    width: 3.5, borderRadius: 2,
  },
  doctorRow:    { alignItems: 'center', gap: 0 },
  docAvatar: {
    width: 50, height: 50, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  docAvatarLetter: { fontSize: 20, fontFamily: 'Manrope_700Bold', fontWeight: '700' },
  docInfo: { flex: 1 },
  docName:  { fontSize: 15, fontFamily: 'Manrope_700Bold', fontWeight: '700' },
  docSpec:  { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  docRating: { fontSize: 12, marginTop: 2 },

  // Service card
  srvName:  { fontSize: 16, fontFamily: 'Manrope_700Bold', fontWeight: '700', marginBottom: 10 },
  srvPillRow: { gap: 8, flexWrap: 'wrap' },
  srvPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1,
  },
  srvPillText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', fontWeight: '600' },

  // Date/Time section
  dateTimeSection: { marginTop: 8 },
  scheduleLoader: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },

  // Shift selector
  shiftSection: { marginTop: 16, marginBottom: 4 },
  shiftLabel: {
    fontSize: 10, fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10,
  },
  shiftRow: { gap: 12 },
  shiftBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 16,
    borderWidth: 1.5, gap: 4,
  },
  shiftBtnText: { fontSize: 13, fontFamily: 'Manrope_700Bold', fontWeight: '700' },
  shiftTime:    { fontSize: 10, fontFamily: 'Inter_400Regular' },

  // Summary card
  summaryCard: {
    borderRadius: 20, marginTop: 20, borderWidth: 1,
    padding: 16, overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14, shadowRadius: 18, elevation: 5,
  },
  summaryAccentBar: {
    position: 'absolute', left: 0, top: 16, bottom: 16,
    width: 3.5, borderRadius: 2,
  },
  summaryTitle: { fontSize: 14, fontFamily: 'Manrope_700Bold', fontWeight: '700', marginBottom: 14 },
  summaryRow: { alignItems: 'center', gap: 10, marginBottom: 10 },
  summaryIconBox: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryText: { fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1 },

  // Loading/error
  centerBox:  { alignItems: 'center', paddingVertical: 48, gap: 12 },
  centerText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  retryBtn:   { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText:  { fontSize: 14, color: '#ffffff', fontFamily: 'Manrope_700Bold', fontWeight: '700' },

  // Confirm button
  confirmBtnWrap: {
    borderRadius: 16, overflow: 'hidden',
    marginTop: 22, marginBottom: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40, shadowRadius: 22, elevation: 8,
  },
  confirmBtnGradient: {
    height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 16,
  },
  confirmText: {
    fontSize: 17, color: '#ffffff', fontFamily: 'Manrope_700Bold',
    fontWeight: '700', letterSpacing: 0.3,
  },

  // Back button
  backBtn: {
    alignItems: 'center', gap: 6, justifyContent: 'center',
    marginTop: 12, paddingVertical: 10,
  },
  backText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
});
