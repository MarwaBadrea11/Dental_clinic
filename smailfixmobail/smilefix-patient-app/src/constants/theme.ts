// ─────────────────────────────────────────────
// theme.ts — Static tokens (layout, spacing, radius)
// Colors are dynamic — use useTheme() hook instead
// ─────────────────────────────────────────────
import { lightColors } from '../theme/colors';

// Static fallback for StyleSheet.create() calls
// (screens should use useTheme() for dynamic colors)
export const Colors = {
  ...lightColors,
  // Legacy aliases used by older screens
  background:             lightColors.bg,
  surface:                lightColors.surface,
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow:    '#f0f4f7',
  surfaceContainer:       '#eaeef1',
  surfaceContainerHigh:   '#e5e9ec',
  surfaceDim:             '#d6dbdd',
  onSurface:              lightColors.text,
  onSurfaceVariant:       lightColors.textSub,
  outlineVariant:         '#dfe3e6',
  primaryContainer:       lightColors.teal,
  onPrimaryContainer:     lightColors.onPrimaryContainer,
  onPrimary:              '#ffffff',
  secondaryContainer:     '#b6eadd',
  onSecondaryContainer:   '#396b61',
  secondary:              '#35675d',
  tertiary:               '#635d57',
  tertiaryFixed:          '#eae1d8',
  primaryFixed:           '#95f1f8',
  errorContainer:         '#ffdad6',
  warmAccent:             '#f7eee5',
  darkBlue:               lightColors.blue,
};

export const Typography = {
  h1: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.56,
  },
  h2: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.22,
  },
  h3: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  bodyLg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMd: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  bodySm: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  labelCaps: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.55,
    textTransform: 'uppercase' as const,
  },
};

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: '#1e5979',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  floating: {
    shadowColor: '#1e5979',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 8,
  },
  button: {
    shadowColor: '#61bec5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 5,
  },
};
