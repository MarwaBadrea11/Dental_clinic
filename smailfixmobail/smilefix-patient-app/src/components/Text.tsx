// ─────────────────────────────────────────────
// Custom Text Component with RTL/LTR support
// Automatically aligns text based on language direction
// ─────────────────────────────────────────────
import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';

export interface TextProps extends RNTextProps {
  children?: React.ReactNode;
}

export default function Text({ style, children, ...props }: TextProps) {
  const { isRTL } = useTranslation();
  
  const textAlign = isRTL ? 'right' : 'left';
  
  // Merge styles with automatic text alignment
  const mergedStyle = StyleSheet.flatten([
    { textAlign },
    style,
  ]);

  return (
    <RNText style={mergedStyle} {...props}>
      {children}
    </RNText>
  );
}