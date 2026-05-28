// ─────────────────────────────────────────────
// Booking Screen — 4-step smart booking
// Fully themed + conflict detection
// ─────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
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

const MOCK_DOCTORS = [
  { id: '1', name: 'Dr. Sarah Miller', nameAr: 'د. سارة ميلر',
    specialty: 'Orthodontist', specialtyAr: 'أخصائية تقويم الأسنان', rating: 4.9 },
  { id: '2', name: 'Dr. James Wilson', nameAr: 'د. جيمس ويلسون',
    specialty: 'General Dentist', specialtyAr: 'طبيب أسنان عام', rating: 4.7 },
];

const MOCK_SERVICES = [
  { id: '1', name: 'Aligner Check-up', nameAr: 'فحص المُقوِّم', duration: 30, price: 200 },
  { id: '2', name: 'Routine Cleaning', nameAr: 'تنظيف دوري',   duration: 45, price: 300 },
  { id: '3', name: 'Consultation',     nameAr: 'استشارة',       duration: 20, price: 150 },
];

const TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '14:00','14:30','15:00','15:30','16:00','16:30','17:00',
];

const STEPS = ['selectDoctor','selectService','selectDate','selectTime'] as const;

export default function BookingScreen({ navigation }: any) {
  const { colors }   = useTheme();
  const { t, isRTL } = useTranslation();
  const {
    bookingStep, selectedDoctor, selectedService,
    selectedDate, selectedTimeSlot,
    setBookingStep, setSelectedDoctor, setSelectedService,
    setSelectedDate, setSelectedTimeSlot,
    resetBookingFlow, addAppointment, hasConflict, patient,
  } = useAppStore();

  const [dates, setDates] = useState<string[]>([]);
  const s = makeStyles(colors, isRTL);

  useEffect(() => {
    const d: string[] = [];
    for (let i = 0; i < 14; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() + i);
      d.push(dt.toISOString().split('T')[0]);
    }
    setDates(d);
  }, []);

  const handleConfirm = () => {
    if (!selectedDoctor || !selectedService || !selectedDate || !selectedTimeSlot || !patient) return;
    addAppointment({
      id: Date.now().toString(),
      patientId: patient.id,
      doctorId: selectedDoctor.id,
      serviceId: selectedService.id,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      status: 'confirmed',
      doctor: selectedDoctor,
      service: selectedService,
      createdAt: new Date().toISOString(),
      isArchived: false,
    });
    Alert.alert(t('bookConfirmed'), t('bookSuccess'));
    resetBookingFlow();
    navigation.navigate('Appointments');
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <LinearGradient
        colors={[colors.gradStart, colors.gradEnd]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={s.safe}>
        {/* Title */}
        <Text style={s.title}>{t('bookAppointment')}</Text>

        {/* Step indicator */}
        <View style={s.steps}>
          {STEPS.map((_, i) => (
            <View key={i} style={s.stepItem}>
              <View style={[
                s.stepCircle,
                bookingStep > i  && s.stepDone,
                bookingStep === i && s.stepActive,
              ]}>
                {bookingStep > i ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={[s.stepNum, bookingStep === i && s.stepNumActive]}>
                    {i + 1}
                  </Text>
                )}
              </View>
              {i < STEPS.length - 1 && (
                <View style={[s.stepLine, bookingStep > i && s.stepLineDone]} />
              )}
            </View>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Step 0: Doctor */}
          {bookingStep === 0 && MOCK_DOCTORS.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={s.card}
              onPress={() => { setSelectedDoctor(doc); setBookingStep(1); }}
            >
              <View style={s.doctorRow}>
                <View style={s.docAvatar}>
                  <Text style={s.docAvatarLetter}>
                    {(isRTL ? doc.nameAr : doc.name).charAt(0)}
                  </Text>
                </View>
                <View style={s.docInfo}>
                  <Text style={s.docName}>{isRTL ? doc.nameAr : doc.name}</Text>
                  <Text style={s.docSpec}>{isRTL ? doc.specialtyAr : doc.specialty}</Text>
                  <Text style={s.docRating}>{'⭐'} {doc.rating}</Text>
                </View>
                <Ionicons
                  name={isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={20} color={colors.textSub}
                />
              </View>
            </TouchableOpacity>
          ))}

          {/* Step 1: Service */}
          {bookingStep === 1 && MOCK_SERVICES.map((srv) => (
            <TouchableOpacity
              key={srv.id}
              style={s.card}
              onPress={() => { setSelectedService(srv); setBookingStep(2); }}
            >
              <Text style={s.srvName}>{isRTL ? srv.nameAr : srv.name}</Text>
              <Text style={s.srvDetail}>
                {srv.duration} {t('min')}  •  {srv.price} {t('sar')}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Step 2: Date */}
          {bookingStep === 2 && (
            <FlatList
              data={dates}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(d) => d}
              contentContainerStyle={{ paddingVertical: 8 }}
              renderItem={({ item }) => {
                const d = new Date(item);
                const active = selectedDate === item;
                return (
                  <TouchableOpacity
                    style={[s.dateCard, active && s.dateCardActive]}
                    onPress={() => { setSelectedDate(item); setBookingStep(3); }}
                  >
                    <Text style={[s.dateName, active && s.dateTextActive]}>
                      {d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { weekday: 'short' })}
                    </Text>
                    <Text style={[s.dateNum, active && s.dateTextActive]}>
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Step 3: Time */}
          {bookingStep === 3 && (
            <View style={s.timeGrid}>
              {TIME_SLOTS.map((time) => {
                const active   = selectedTimeSlot === time;
                const conflict = selectedDoctor && selectedDate
                  ? hasConflict(selectedDoctor.id, selectedDate, time) : false;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[
                      s.timeSlot,
                      active    && s.timeSlotActive,
                      conflict  && s.timeSlotDisabled,
                    ]}
                    onPress={() => {
                      if (conflict) {
                        Alert.alert(t('conflictErr'), t('doctorBusy'));
                        return;
                      }
                      setSelectedTimeSlot(time);
                    }}
                    disabled={conflict}
                  >
                    <Text style={[
                      s.timeText,
                      active   && s.timeTextActive,
                      conflict && s.timeTextDisabled,
                    ]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Confirm */}
          {selectedTimeSlot ? (
            <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
              <Text style={s.confirmText}>{t('confirmBook')}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Back button */}
          {bookingStep > 0 ? (
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => setBookingStep(bookingStep - 1)}
            >
              <Ionicons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={16} color={colors.textSub}
              />
              <Text style={s.backText}>{t('back')}</Text>
            </TouchableOpacity>
          ) : null}
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
    title: {
      fontSize: 26, fontWeight: '700',
      color: c.blue, textAlign: align,
      paddingHorizontal: 20, paddingTop: 8,
      marginBottom: 16, fontFamily: 'Manrope_700Bold',
    },

    // Steps
    steps: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, marginBottom: 16,
    },
    stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    stepCircle: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: c.outline + '40',
      alignItems: 'center', justifyContent: 'center',
    },
    stepActive: { backgroundColor: c.blue },
    stepDone:   { backgroundColor: c.teal },
    stepNum: { fontSize: 12, color: c.textSub, fontWeight: '700' },
    stepNumActive: { color: '#fff' },
    stepLine: {
      flex: 1, height: 2,
      backgroundColor: c.outline + '40', marginHorizontal: 4,
    },
    stepLineDone: { backgroundColor: c.teal },

    scroll: { paddingHorizontal: 20, paddingBottom: 110 },

    // Card
    card: {
      backgroundColor: c.surfaceCard,
      borderRadius: 18, padding: 16,
      marginBottom: 12,
      borderWidth: 0.5, borderColor: c.surfaceCardBorder,
    },
    doctorRow: { flexDirection: row, alignItems: 'center', gap: 12 },
    docAvatar: {
      width: 52, height: 52, borderRadius: 16,
      backgroundColor: c.teal + '20',
      alignItems: 'center', justifyContent: 'center',
    },
    docAvatarLetter: {
      fontSize: 22, color: c.teal,
      fontWeight: '700', fontFamily: 'Manrope_700Bold',
    },
    docInfo: { flex: 1 },
    docName: {
      fontSize: 15, fontWeight: '700',
      color: c.text, textAlign: align,
      fontFamily: 'Manrope_700Bold',
    },
    docSpec: { fontSize: 12, color: c.textSub, textAlign: align },
    docRating: { fontSize: 12, color: c.teal, marginTop: 2 },

    srvName: {
      fontSize: 16, fontWeight: '700',
      color: c.text, textAlign: align,
      marginBottom: 4, fontFamily: 'Manrope_700Bold',
    },
    srvDetail: { fontSize: 13, color: c.textSub, textAlign: align },

    // Date
    dateCard: {
      width: 62, paddingVertical: 12,
      marginRight: 8, borderRadius: 14,
      backgroundColor: c.surfaceCard,
      alignItems: 'center',
      borderWidth: 1, borderColor: c.outline + '40',
    },
    dateCardActive: { backgroundColor: c.blue, borderColor: c.blue },
    dateName: { fontSize: 10, color: c.textSub, marginBottom: 4, fontWeight: '600' },
    dateNum:  { fontSize: 20, color: c.text, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
    dateTextActive: { color: '#fff' },

    // Time
    timeGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    },
    timeSlot: {
      width: '30%', paddingVertical: 12,
      borderRadius: 12, alignItems: 'center',
      backgroundColor: c.surfaceCard,
      borderWidth: 1, borderColor: c.outline + '40',
    },
    timeSlotActive:   { backgroundColor: c.blue, borderColor: c.blue },
    timeSlotDisabled: { opacity: 0.35 },
    timeText:         { fontSize: 14, color: c.text, fontWeight: '600' },
    timeTextActive:   { color: '#fff' },
    timeTextDisabled: { color: c.textSub },

    // Confirm
    confirmBtn: {
      backgroundColor: c.teal, borderRadius: 16,
      paddingVertical: 16, alignItems: 'center',
      marginTop: 20,
    },
    confirmText: {
      fontSize: 16, color: c.onPrimaryContainer,
      fontWeight: '700', fontFamily: 'Manrope_700Bold',
    },

    // Back
    backBtn: {
      flexDirection: row, alignItems: 'center',
      gap: 6, justifyContent: 'center',
      marginTop: 12, paddingVertical: 8,
    },
    backText: { fontSize: 13, color: c.textSub },
  });
}
