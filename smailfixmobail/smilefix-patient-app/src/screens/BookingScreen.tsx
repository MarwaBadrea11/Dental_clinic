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
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/appStore';
import type { AppColors } from '../theme/colors';
import Text from '../components/Text';
import { CustomModal, Dropdown } from '../components/CustomModal';

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

const STEPS = ['selectDoctor','selectService','selectDateTime'] as const;

export default function BookingScreen({ navigation }: any) {
  const { colors, isDark }   = useTheme();
  const { t, isRTL } = useTranslation();
  const {
    bookingStep, selectedDoctor, selectedService,
    selectedDate, selectedTimeSlot,
    setBookingStep, setSelectedDoctor, setSelectedService,
    setSelectedDate, setSelectedTimeSlot,
    resetBookingFlow, addAppointment, hasConflict, patient,
  } = useAppStore();

  const [dates, setDates] = useState<string[]>([]);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>(TIME_SLOTS);
  
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

  useEffect(() => {
    if (selectedDate && selectedDoctor) {
      // Filter out conflicting time slots
      const filteredSlots = TIME_SLOTS.filter(time => 
        !hasConflict(selectedDoctor.id, selectedDate, time)
      );
      setAvailableTimeSlots(filteredSlots);
    } else {
      setAvailableTimeSlots(TIME_SLOTS);
    }
  }, [selectedDate, selectedDoctor, hasConflict]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setShowDateModal(false);
    // Auto-open time modal if date is selected
    if (!selectedTimeSlot) {
      setTimeout(() => setShowTimeModal(true), 300);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTimeSlot(time);
    setShowTimeModal(false);
  };

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

          {/* Step 2: Date & Time Selection */}
          {bookingStep === 2 && (
            <View style={s.dateTimeSection}>
              <Dropdown
                label={t('selectDate')}
                value={selectedDate ? formatDate(selectedDate) : null}
                placeholder={t('selectDate')}
                onPress={() => setShowDateModal(true)}
                isRTL={isRTL}
              />

              <Dropdown
                label={t('selectTime')}
                value={selectedTimeSlot}
                placeholder={t('selectTime')}
                onPress={() => {
                  if (!selectedDate) {
                    Alert.alert(t('selectDateFirst'), t('pleaseSelectDateFirst'));
                    return;
                  }
                  setShowTimeModal(true);
                }}
                isRTL={isRTL}
              />

              {/* Summary */}
              {(selectedDate || selectedTimeSlot) && (
                <View style={s.summaryCard}>
                  <Text style={s.summaryTitle}>{t('appointmentSummary')}</Text>
                  {selectedDate && (
                    <View style={s.summaryRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSub} />
                      <Text style={s.summaryText}>{formatDate(selectedDate)}</Text>
                    </View>
                  )}
                  {selectedTimeSlot && (
                    <View style={s.summaryRow}>
                      <Ionicons name="time-outline" size={16} color={colors.textSub} />
                      <Text style={s.summaryText}>{selectedTimeSlot}</Text>
                    </View>
                  )}
                  {selectedDoctor && (
                    <View style={s.summaryRow}>
                      <Ionicons name="person-outline" size={16} color={colors.textSub} />
                      <Text style={s.summaryText}>{isRTL ? selectedDoctor.nameAr : selectedDoctor.name}</Text>
                    </View>
                  )}
                  {selectedService && (
                    <View style={s.summaryRow}>
                      <Ionicons name="medical-outline" size={16} color={colors.textSub} />
                      <Text style={s.summaryText}>{isRTL ? selectedService.nameAr : selectedService.name}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Confirm Button */}
          {selectedDoctor && selectedService && selectedDate && selectedTimeSlot && (
            <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
              <Text style={s.confirmText}>{t('confirmBook')}</Text>
            </TouchableOpacity>
          )}

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

      {/* Date Selection Modal */}
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
            const date = new Date(item);
            const isSelected = selectedDate === item;
            const dayName = date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { weekday: 'long' });
            const dateStr = date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            
            return (
              <Pressable
                style={[modalStyles.modalItem, isSelected && modalStyles.modalItemSelected]}
                onPress={() => handleDateSelect(item)}
              >
                <View style={modalStyles.modalItemContent}>
                  <Text style={[modalStyles.modalItemDay, { 
                    color: isDark ? '#000' : colors.text 
                  }]}>{dayName}</Text>
                  <Text style={[modalStyles.modalItemDate, { color: colors.textSub }]}>{dateStr}</Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={colors.teal} />
                )}
              </Pressable>
            );
          }}
        />
      </CustomModal>

      {/* Time Selection Modal */}
      <CustomModal
        visible={showTimeModal}
        onClose={() => setShowTimeModal(false)}
        title={t('selectTime')}
        isRTL={isRTL}
      >
        <FlatList
          data={availableTimeSlots}
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
                  isConflict && modalStyles.modalTimeItemDisabled
                ]}
                onPress={() => !isConflict && handleTimeSelect(item)}
                disabled={isConflict}
              >
                <Text style={[
                  modalStyles.modalTimeText,
                  isSelected && modalStyles.modalTimeTextSelected,
                  isConflict && modalStyles.modalTimeTextDisabled
                ]}>
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
        {availableTimeSlots.length === 0 && (
          <View style={modalStyles.noSlotsContainer}>
            <Ionicons name="time-outline" size={48} color={colors.textSub} />
            <Text style={[modalStyles.noSlotsText, { color: colors.textSub, textAlign: 'center' }]}>
              {t('noAvailableSlots')}
            </Text>
          </View>
        )}
      </CustomModal>
    </View>
  );
}

// Modal Styles
const modalStyles = StyleSheet.create({
  modalList: {
    padding: 16,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  modalItemSelected: {
    backgroundColor: '#e8f4f8',
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemDay: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  modalItemDate: {
    fontSize: 14,
  },
  modalTimeGrid: {
    padding: 16,
  },
  modalTimeRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTimeItem: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalTimeItemSelected: {
    backgroundColor: '#1e5979',
    borderColor: '#1e5979',
  },
  modalTimeItemDisabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.5,
  },
  modalTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalTimeTextSelected: {
    color: 'white',
  },
  modalTimeTextDisabled: {
    color: '#999',
  },
  noSlotsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noSlotsText: {
    fontSize: 16,
    marginTop: 12,
  },
});

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
      paddingRight: isRTL ? 20 : 0,
      paddingLeft: isRTL ? 0 : 20,
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

    // Date & Time Section
    dateTimeSection: {
      marginTop: 8,
    },

    // Summary Card
    summaryCard: {
      backgroundColor: c.surfaceCard,
      borderRadius: 18,
      padding: 16,
      marginTop: 20,
      borderWidth: 0.5,
      borderColor: c.surfaceCardBorder,
    },
    summaryTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
      marginBottom: 12,
      textAlign: align,
    },
    summaryRow: {
      flexDirection: row,
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    summaryText: {
      fontSize: 14,
      color: c.text,
      flex: 1,
      textAlign: align,
    },

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