// ─────────────────────────────────────────────
// GlassCard — Clinical Serenity glassmorphism
// ─────────────────────────────────────────────
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
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
  return (
    <BlurView intensity={intensity} tint="light" style={[styles.blur, style]}>
      {/*
       * inner must NOT have a fixed width/height so it grows with its content.
       * flexDirection:'column' ensures children stack vertically and are never
       * clipped by the BlurView's overflow:hidden bounding box.
       * alignSelf:'stretch' makes it fill the BlurView width responsively.
       */}
      <View style={[styles.inner, { padding }]}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    borderRadius: Radius.xl,
    // overflow:'hidden' is required by BlurView on Android to apply the
    // border-radius mask, but we compensate by letting the inner View
    // size itself to its content (no fixed height/width).
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.85)',
    // alignSelf:'stretch' so the card fills its parent column
    alignSelf: 'stretch',
    ...Shadows.card,
  },
  inner: {
    // Responsive width — fills the BlurView, never rigid
    width: '100%',
    // Column layout so children stack vertically
    flexDirection: 'column',
    // Let height grow with content — no fixed height
    flexShrink: 0,
    // Must be transparent so it doesn't paint a white box over the BlurView
    backgroundColor: 'transparent',
  },
});
