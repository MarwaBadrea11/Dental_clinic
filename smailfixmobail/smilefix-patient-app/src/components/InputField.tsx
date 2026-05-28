// ─────────────────────────────────────────────
// InputField — RTL-aware clinical input
// ─────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import Text from './Text';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  isRTL?: boolean;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export default function InputField({
  label,
  error,
  isRTL = true,
  rightIcon,
  onRightIconPress,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, isRTL && styles.rtl]}>{label}</Text>

      <View
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      >
        <TextInput
          style={[styles.input, isRTL && styles.rtlInput]}
          placeholderTextColor={Colors.onSurfaceVariant + '70'}
          textAlign={isRTL ? 'right' : 'left'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {!!error && (
        <Text style={[styles.errorText, isRTL && styles.rtl]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.labelCaps,
    marginBottom: 6,
    marginHorizontal: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  inputFocused: {
    borderColor: Colors.primaryContainer,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    ...Typography.bodyLg,
    color: Colors.onSurface,
    paddingVertical: 12,
  },
  rtlInput: {
    textAlign: 'right',
  },
  iconBtn: {
    paddingLeft: 8,
  },
  errorText: {
    ...Typography.bodySm,
    color: Colors.error,
    marginTop: 4,
    marginHorizontal: 4,
  },
  rtl: {
    textAlign: 'right',
  },
});
