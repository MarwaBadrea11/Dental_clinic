// ─────────────────────────────────────────────
// SmileFix Logo Component
// ─────────────────────────────────────────────
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Radius, Shadows } from '../constants/theme';
import Text from './Text';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export default function SmileFixLogo({ size = 'md', showTagline = false }: Props) {
  const dim = size === 'lg' ? 96 : size === 'md' ? 72 : 48;
  const fontSize = size === 'lg' ? 36 : size === 'md' ? 26 : 18;

  return (
    <View style={styles.wrapper}>
      {/* Outer glow ring */}
      <View style={[styles.glowRing, { width: dim + 24, height: dim + 24, borderRadius: (dim + 24) / 2 }]}>
        {/* Logo circle */}
        <View style={[styles.circle, { width: dim, height: dim, borderRadius: dim / 2 }]}>
          {/* Inner gradient simulation */}
          <View style={styles.innerHighlight} />
          <Text style={[styles.letters, { fontSize }]}>SF</Text>
        </View>
      </View>

      {/* Brand name */}
      <Text style={[styles.brandName, size === 'lg' && styles.brandNameLg]}>
        SmileFix
      </Text>

      {showTagline && (
        <Text style={styles.tagline}>ابتسامتك، أولويتنا</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  glowRing: {
    backgroundColor: Colors.primaryContainer + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  circle: {
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Shadows.button,
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  letters: {
    fontFamily: 'Manrope_700Bold',
    // primaryContainer background is teal — white gives proper contrast
    color: '#ffffff',
    letterSpacing: 1,
  },
  brandName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 26,
    color: Colors.darkBlue,
    letterSpacing: -0.5,
  },
  brandNameLg: {
    fontSize: 32,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    letterSpacing: 0.3,
  },
});
