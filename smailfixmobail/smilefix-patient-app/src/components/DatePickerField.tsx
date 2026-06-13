// ─────────────────────────────────────────────
// DatePickerField
// Read-only trigger button → calendar modal
// Supports: month/year navigation arrows,
//           tap-month for month grid,
//           tap-year for year scroll list.
// No extra packages — uses AnimatedModal only.
// ─────────────────────────────────────────────
import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { AnimatedModal } from './AnimatedModal';
import type { AppColors } from '../theme/colors';
import { Radius } from '../constants/theme';

// ── Constants ──────────────────────────────────────────────────────────────
const MONTH_NAMES_EN = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTH_NAMES_AR = [
  'يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر',
];
const DAY_NAMES_EN = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const DAY_NAMES_AR = ['أح','إث','ثل','أر','خم','جم','سب'];

const MIN_YEAR = 1924;
// Max = today
const TODAY = new Date();
const MAX_YEAR = TODAY.getFullYear();

// ── Helpers ────────────────────────────────────────────────────────────────
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
/** 0 = Sunday … 6 = Saturday */
function firstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function pad2(n: number) {
  return String(n).padStart(2, '0');
}
/** Format selected date for display */
function formatDisplay(year: number, month: number, day: number, isAr: boolean) {
  const months = isAr ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  return isAr
    ? `${day} ${months[month]} ${year}`
    : `${months[month]} ${day}, ${year}`;
}

// ── Props ──────────────────────────────────────────────────────────────────
interface DatePickerFieldProps {
  label: string;
  value: string;           // 'YYYY-MM-DD' or ''
  onChange: (v: string) => void;
  error?: string;
  isRTL: boolean;
  colors: AppColors;
  isDark: boolean;
}

type CalendarView = 'days' | 'months' | 'years';

// ── Component ──────────────────────────────────────────────────────────────
export function DatePickerField({
  label, value, onChange, error, isRTL, colors, isDark,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  // Parse existing value or default to 20 years ago
  const parsed = value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? { y: parseInt(value.slice(0, 4)), m: parseInt(value.slice(5, 7)) - 1, d: parseInt(value.slice(8, 10)) }
    : null;

  const defaultYear  = MAX_YEAR - 20;
  const [viewYear,   setViewYear]   = useState(parsed?.y  ?? defaultYear);
  const [viewMonth,  setViewMonth]  = useState(parsed?.m  ?? 0);
  const [calView,    setCalView]    = useState<CalendarView>('days');

  // Selected day parts (null = nothing selected yet)
  const [selYear,  setSelYear]  = useState<number | null>(parsed?.y  ?? null);
  const [selMonth, setSelMonth] = useState<number | null>(parsed?.m  ?? null);
  const [selDay,   setSelDay]   = useState<number | null>(parsed?.d  ?? null);

  const months = isRTL ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const days   = isRTL ? DAY_NAMES_AR   : DAY_NAMES_EN;

  // ── Navigation ────────────────────────────────────────────────────────────
  const prevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setCalView('days');
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    const maxM = viewYear === MAX_YEAR ? TODAY.getMonth() : 11;
    if (viewMonth >= maxM && viewYear >= MAX_YEAR) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setCalView('days');
  }, [viewMonth, viewYear]);

  // ── Day selection ─────────────────────────────────────────────────────────
  const handleDayPress = (day: number) => {
    setSelYear(viewYear);
    setSelMonth(viewMonth);
    setSelDay(day);
    // Confirm immediately
    const iso = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`;
    onChange(iso);
    setOpen(false);
  };

  // ── Month grid selection ──────────────────────────────────────────────────
  const handleMonthSelect = (m: number) => {
    setViewMonth(m);
    setCalView('days');
  };

  // ── Year list selection ───────────────────────────────────────────────────
  const handleYearSelect = (y: number) => {
    setViewYear(y);
    // Clamp month if we jumped to current year
    if (y === MAX_YEAR && viewMonth > TODAY.getMonth()) {
      setViewMonth(TODAY.getMonth());
    }
    setCalView('days');
  };

  // ── Open modal ────────────────────────────────────────────────────────────
  const handleOpen = () => {
    // Reset navigation to currently selected date (or default)
    setViewYear(selYear  ?? defaultYear);
    setViewMonth(selMonth ?? 0);
    setCalView('days');
    setOpen(true);
  };

  // ── Day grid ──────────────────────────────────────────────────────────────
  const totalDays    = daysInMonth(viewYear, viewMonth);
  const startOffset  = firstWeekday(viewYear, viewMonth); // 0–6

  // Max day in current grid (cap future dates)
  const isCurrentMonth = viewYear === MAX_YEAR && viewMonth === TODAY.getMonth();
  const maxDay = isCurrentMonth ? TODAY.getDate() : totalDays;

  // ── Display label ─────────────────────────────────────────────────────────
  const displayValue = value && selYear && selMonth !== null && selDay
    ? formatDisplay(selYear, selMonth, selDay, isRTL)
    : '';

  const placeholderText = isRTL ? 'اختر تاريخ الميلاد' : 'Select date of birth';
  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  // ── Year list (MIN_YEAR … MAX_YEAR, reversed = newest first) ─────────────
  const yearList: number[] = [];
  for (let y = MAX_YEAR; y >= MIN_YEAR; y--) yearList.push(y);

  // ── Styles (inline for brevity, dependent on theme) ───────────────────────
  const triggerBorder = error ? colors.error : colors.outline + '50';

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Label */}
      <Text style={{
        fontSize: 11, fontWeight: '600',
        color: colors.textSub,
        textAlign: align,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 6,
      }}>
        {label}
      </Text>

      {/* Trigger button — no keyboard, no editable input */}
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.75}
        style={{
          flexDirection: rowDir,
          alignItems: 'center',
          backgroundColor: colors.surfaceInput,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: triggerBorder,
          paddingHorizontal: 14,
          minHeight: 52,
          gap: 10,
        }}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.teal} />
        <Text style={{
          flex: 1,
          fontSize: 15,
          color: displayValue ? colors.text : colors.textSub + '80',
          textAlign: align,
        }}>
          {displayValue || placeholderText}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color={colors.textSub}
        />
      </TouchableOpacity>

      {/* Error */}
      {error ? (
        <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Ionicons name="alert-circle-outline" size={12} color={colors.error} />
          <Text style={{ fontSize: 11, color: colors.error, textAlign: align }}>{error}</Text>
        </View>
      ) : null}

      {/* Calendar Modal */}
      <AnimatedModal
        visible={open}
        onClose={() => setOpen(false)}
        variant="sheet"
      >
        <View style={[s.sheet, {
          backgroundColor: isDark ? colors.surfaceCard : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'transparent',
        }]}>

          {/* ── Header row ── */}
          <View style={[s.header, { flexDirection: rowDir }]}>
            {/* Prev arrow */}
            <TouchableOpacity
              onPress={calView === 'days' ? prevMonth : () => setCalView('days')}
              style={s.navBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isRTL ? 'chevron-forward' : 'chevron-back'}
                size={20} color={colors.text}
              />
            </TouchableOpacity>

            {/* Month + Year — tappable */}
            <View style={[s.headerCenter, { flexDirection: rowDir, gap: 6 }]}>
              <TouchableOpacity
                onPress={() => setCalView(calView === 'months' ? 'days' : 'months')}
                style={[s.headerPill, {
                  backgroundColor: calView === 'months'
                    ? colors.teal + '22'
                    : colors.outline + '18',
                }]}
              >
                <Text style={[s.headerPillText, { color: colors.primary }]}>
                  {months[viewMonth]}
                </Text>
                <Ionicons
                  name={calView === 'months' ? 'chevron-up' : 'chevron-down'}
                  size={12} color={colors.primary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCalView(calView === 'years' ? 'days' : 'years')}
                style={[s.headerPill, {
                  backgroundColor: calView === 'years'
                    ? colors.blue + '22'
                    : colors.outline + '18',
                }]}
              >
                <Text style={[s.headerPillText, { color: colors.blue }]}>
                  {viewYear}
                </Text>
                <Ionicons
                  name={calView === 'years' ? 'chevron-up' : 'chevron-down'}
                  size={12} color={colors.blue}
                />
              </TouchableOpacity>
            </View>

            {/* Next arrow */}
            <TouchableOpacity
              onPress={calView === 'days' ? nextMonth : () => setCalView('days')}
              style={s.navBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={viewYear >= MAX_YEAR && viewMonth >= TODAY.getMonth() && calView === 'days'}
            >
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={20}
                color={
                  viewYear >= MAX_YEAR && viewMonth >= TODAY.getMonth() && calView === 'days'
                    ? colors.outline + '40'
                    : colors.text
                }
              />
            </TouchableOpacity>
          </View>

          {/* ── Day-of-week labels ── */}
          {calView === 'days' && (
            <View style={[s.dowRow, { flexDirection: rowDir }]}>
              {days.map((d) => (
                <Text key={d} style={[s.dowLabel, { color: colors.textSub }]}>{d}</Text>
              ))}
            </View>
          )}

          {/* ── Day grid ── */}
          {calView === 'days' && (
            <View style={s.gridWrap}>
              {/* Offset blank cells */}
              {Array.from({ length: startOffset }).map((_, i) => (
                <View key={`blank-${i}`} style={s.dayCell} />
              ))}
              {/* Day cells */}
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const isSelected = selYear === viewYear && selMonth === viewMonth && selDay === day;
                const isToday    = viewYear === MAX_YEAR && viewMonth === TODAY.getMonth() && day === TODAY.getDate();
                const disabled   = day > maxDay;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      s.dayCell,
                      isSelected && { backgroundColor: colors.primary, borderRadius: 22 },
                      isToday && !isSelected && { borderWidth: 1.5, borderRadius: 22, borderColor: colors.teal },
                    ]}
                    onPress={() => !disabled && handleDayPress(day)}
                    disabled={disabled}
                    activeOpacity={0.75}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: isSelected ? '700' : '400',
                      color: isSelected
                        ? '#ffffff'
                        : disabled
                          ? colors.outline + '50'
                          : colors.text,
                      textAlign: 'center',
                    }}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Month grid ── */}
          {calView === 'months' && (
            <View style={s.monthGrid}>
              {months.map((name, idx) => {
                const isSel = idx === viewMonth;
                const isDisabled = viewYear === MAX_YEAR && idx > TODAY.getMonth();
                return (
                  <TouchableOpacity
                    key={name}
                    style={[
                      s.monthCell,
                      isSel && { backgroundColor: colors.primary },
                      { opacity: isDisabled ? 0.35 : 1 },
                    ]}
                    onPress={() => !isDisabled && handleMonthSelect(idx)}
                    disabled={isDisabled}
                    activeOpacity={0.75}
                  >
                    <Text style={{
                      fontSize: 13,
                      fontWeight: isSel ? '700' : '500',
                      color: isSel ? '#ffffff' : colors.text,
                      textAlign: 'center',
                    }}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Year scroll list ── */}
          {calView === 'years' && (
            <ScrollView
              style={{ maxHeight: 240 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.yearList}
            >
              {yearList.map((y) => {
                const isSel = y === viewYear;
                return (
                  <TouchableOpacity
                    key={y}
                    style={[
                      s.yearItem,
                      isSel && { backgroundColor: colors.primary, borderRadius: Radius.md },
                    ]}
                    onPress={() => handleYearSelect(y)}
                    activeOpacity={0.75}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: isSel ? '700' : '400',
                      color: isSel ? '#ffffff' : colors.text,
                      textAlign: 'center',
                    }}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* ── Cancel link ── */}
          <TouchableOpacity
            onPress={() => setOpen(false)}
            style={s.cancelRow}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 14, color: colors.textSub, fontWeight: '600' }}>
              {isRTL ? 'إغلاق' : 'Close'}
            </Text>
          </TouchableOpacity>
        </View>
      </AnimatedModal>
    </View>
  );
}

// ── Static styles ───────────────────────────────────────────────────────────
const CELL_SIZE = 40;

const s = StyleSheet.create({
  sheet: {
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 16,
    borderWidth: 0,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  headerPillText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Day-of-week row
  dowRow: {
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  dowLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Day grid
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    minHeight: 200,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Month grid
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 180,
  },
  monthCell: {
    width: '28%',
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Year list
  yearList: {
    paddingVertical: 4,
    alignItems: 'center',
    gap: 2,
  },
  yearItem: {
    width: 100,
    paddingVertical: 10,
    alignItems: 'center',
  },

  cancelRow: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
});
