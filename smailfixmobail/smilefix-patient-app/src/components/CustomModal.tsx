// ─────────────────────────────────────────────
// CustomModal — Premium animated picker dialog
// Uses AnimatedModal (center variant) with a
// spring scale-in + overlay fade.
// ─────────────────────────────────────────────
import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import Text from './Text';
import { AnimatedModal } from './AnimatedModal';
import { Radius, Shadows } from '../constants/theme';

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  isRTL: boolean;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  onClose,
  title,
  children,
  isRTL,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <AnimatedModal
      visible={visible}
      onClose={onClose}
      variant="center"
      containerStyle={{
        backgroundColor: isDark ? colors.surfaceCard : '#ffffff',
        borderRadius: Radius.xl,
        maxHeight: '78%',
        overflow: 'hidden',
        ...Shadows.heroCard,
        // Subtle border on dark mode
        borderWidth: isDark ? 0.5 : 0,
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'transparent',
      }}
    >
      {/* Handle bar (visual affordance) */}
      <View style={styles.handle} />

      {/* Header */}
      <View style={[
        styles.header,
        { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}>
        <Text style={[
          styles.title,
          { color: colors.text, textAlign: isRTL ? 'right' : 'left', flex: 1 },
        ]}>
          {title}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={20} color={colors.textSub} />
        </TouchableOpacity>
      </View>

      {children}
    </AnimatedModal>
  );
};

// ── Dropdown field ─────────────────────────────────────────────────────────
interface DropdownProps {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
  isRTL: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  value,
  placeholder,
  onPress,
  isRTL,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.dropdownContainer}>
      <Text style={[styles.dropdownLabel, {
        color: colors.textSub,
        textAlign: isRTL ? 'right' : 'left',
      }]}>
        {label}
      </Text>
      <TouchableOpacity
        style={[styles.dropdownButton, {
          borderColor: value ? colors.primary + '60' : colors.outline + '50',
          backgroundColor: colors.surfaceCard,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Text style={[styles.dropdownValue, {
          color: value ? colors.text : colors.textSub + '80',
          textAlign: isRTL ? 'right' : 'left',
          flex: 1,
        }]}>
          {value || placeholder}
        </Text>
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={18}
          color={value ? colors.primary : colors.textSub}
        />
      </TouchableOpacity>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  handle: {
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  closeBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  dropdownContainer: {
    marginBottom: 20,
  },
  dropdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: 'Inter_600SemiBold',
  },
  dropdownButton: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  dropdownValue: {
    fontSize: 15,
    fontWeight: '500',
  },
});
