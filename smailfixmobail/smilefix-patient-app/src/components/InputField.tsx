// ─────────────────────────────────────────────
// InputField — RTL-aware clinical input
// flexDirection, textAlign, and icon padding
// all derive from the isRTL flag so the field
// mirrors perfectly in Arabic layout.
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
  label:             string;
  error?:            string;
  isRTL?:            boolean;
  rightIcon?:        React.ReactNode;
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

  const align  = isRTL ? 'right' as const : 'left' as const;
  const rowDir = isRTL ? 'row-reverse' as const : 'row' as const;

  return (
    <View style={styles.wrapper}>
      {/* Label — inherits RTL alignment from <Text> but we also pass textAlign
          explicitly so StyleSheet.create callers without the hook still work */}
      <Text style={[styles.label, { textAlign: align }]}>{label}</Text>

      <View
        style={[
          styles.inputContainer,
          { flexDirection: rowDir },
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { textAlign: align, writingDirection: isRTL ? 'rtl' : 'ltr' },
          ]}
          placeholderTextColor={Colors.onSurfaceVariant + '70'}
          textAlign={align}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            // Icon sits on the logical END of the row (left for RTL, right for LTR)
            style={[styles.iconBtn, isRTL ? { paddingRight: 8 } : { paddingLeft: 8 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {!!error && (
        <Text style={[styles.errorText, { textAlign: align }]}>{error}</Text>
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
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  inputFocused: {
    borderColor: Colors.primaryContainer,
    borderWidth: 1.5,
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
  iconBtn: {
    // horizontal padding applied inline so it mirrors correctly
  },
  errorText: {
    ...Typography.bodySm,
    color: Colors.error,
    marginTop: 4,
    marginHorizontal: 4,
  },
});
