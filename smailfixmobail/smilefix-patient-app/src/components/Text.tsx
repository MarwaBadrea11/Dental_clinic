// ─────────────────────────────────────────────
// Custom Text Component with RTL/LTR support
// Enforces textAlign + writingDirection so the
// layout engine never clips Arabic text in LTR
// containers.
// ─────────────────────────────────────────────
import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';

export interface TextProps extends RNTextProps {
  children?: React.ReactNode;
}

export default function Text({ style, children, ...props }: TextProps) {
  const { isRTL } = useTranslation();

  // Enforce both alignment AND writing direction so the native text engine
  // never renders Arabic glyphs from the wrong edge of the container.
  const rtlBase = StyleSheet.flatten([
    {
      textAlign:        isRTL ? ('right'  as const) : ('left'  as const),
      writingDirection: isRTL ? ('rtl'    as const) : ('ltr'   as const),
    },
    style, // caller style wins — intentional override is allowed
  ]);

  return (
    <RNText style={rtlBase} {...props}>
      {children}
    </RNText>
  );
}
