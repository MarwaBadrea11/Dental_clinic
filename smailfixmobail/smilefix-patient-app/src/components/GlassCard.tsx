// ─────────────────────────────────────────────
// GlassCard — Clinical Serenity glassmorphism
// ─────────────────────────────────────────────
import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Radius, Shadows } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  intensity?: number;
}

export default function GlassCard({
  children,
  style,
  padding = 24,
  intensity = 25,
}: Props) {
  const inner = <View style={[styles.inner, { padding }]}>{children}</View>;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.blur, styles.webFallback, style]}>
        {inner}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} tint="light" style={[styles.blur, style]}>
      {inner}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.85)',
    alignSelf: 'stretch',
    ...Shadows.card,
  },
  webFallback: {
    backdropFilter: 'blur(12px)',
  },
  inner: {
    width: '100%',
    flexDirection: 'column',
    flexShrink: 0,
    backgroundColor: 'transparent',
  },
});
