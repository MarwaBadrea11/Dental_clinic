// ─────────────────────────────────────────────
// PrimaryButton — Clinical Serenity CTA
// ─────────────────────────────────────────────
import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Radius, Shadows } from '../constants/theme';
import Text from './Text';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export default function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  fullWidth = true,
}: Props) {
  const isPrimary   = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost     = variant === 'ghost';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={[
        styles.base,
        fullWidth && styles.fullWidth,
        isPrimary   && styles.primary,
        isSecondary && styles.secondary,
        isGhost     && styles.ghost,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? Colors.onPrimaryContainer : Colors.primary}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.label,
            isPrimary   && styles.labelPrimary,
            isSecondary && styles.labelSecondary,
            isGhost     && styles.labelGhost,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: Colors.primaryContainer,
    ...Shadows.button,
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1.5,
    borderColor: Colors.secondaryTeal,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  labelPrimary: {
    color: Colors.onPrimaryContainer,
  },
  labelSecondary: {
    color: Colors.darkBlue,
  },
  labelGhost: {
    color: Colors.primary,
  },
});
