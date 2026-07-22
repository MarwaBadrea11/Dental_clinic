/**
 * Design Tokens — Single source of truth for the Clinical Serenity design system.
 * All components reference these tokens. Change here → changes everywhere.
 */

export const colors = {
  primary: '#00696f',
  onPrimary: '#ffffff',
  primaryContainer: '#61bec5',
  onPrimaryContainer: '#004b4f',
  inversePrimary: '#79d5dc',
  primaryFixed: '#95f1f8',
  primaryFixedDim: '#79d5dc',
  onPrimaryFixed: '#002022',
  onPrimaryFixedVariant: '#004f54',

  secondary: '#35675d',
  onSecondary: '#ffffff',
  secondaryContainer: '#b6eadd',
  onSecondaryContainer: '#396b61',
  secondaryFixed: '#b8ede0',
  secondaryFixedDim: '#9dd1c4',
  onSecondaryFixed: '#00201b',
  onSecondaryFixedVariant: '#1b4f45',

  tertiary: '#2c6484',
  onTertiary: '#ffffff',
  tertiaryContainer: '#82b6da',
  onTertiaryContainer: '#004867',
  tertiaryFixed: '#c7e7ff',
  tertiaryFixedDim: '#98cdf2',
  onTertiaryFixed: '#001e2e',
  onTertiaryFixedVariant: '#074c6b',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  background: '#f6fafd',
  onBackground: '#171c1f',
  surface: '#f6fafd',
  surfaceDim: '#d6dbdd',
  surfaceBright: '#f6fafd',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f0f4f7',
  surfaceContainer: '#eaeef1',
  surfaceContainerHigh: '#e5e9ec',
  surfaceContainerHighest: '#dfe3e6',
  onSurface: '#171c1f',
  onSurfaceVariant: '#3e494a',
  inverseSurface: '#2c3134',
  inverseOnSurface: '#edf1f4',
  surfaceVariant: '#dfe3e6',
  surfaceTint: '#00696f',
  outline: '#6e797a',
  outlineVariant: '#bdc9c9',
} as const

export const typography = {
  fontDisplay: '"Manrope", sans-serif',
  fontBody: '"Inter", sans-serif',
  h1: { fontSize: '40px', fontWeight: '700', lineHeight: '1.2', letterSpacing: '-0.02em' },
  h2: { fontSize: '32px', fontWeight: '600', lineHeight: '1.25', letterSpacing: '-0.01em' },
  h3: { fontSize: '24px', fontWeight: '600', lineHeight: '1.3' },
  bodyLg: { fontSize: '18px', fontWeight: '400', lineHeight: '1.6' },
  bodyMd: { fontSize: '16px', fontWeight: '400', lineHeight: '1.6' },
  labelSm: { fontSize: '13px', fontWeight: '600', lineHeight: '1', letterSpacing: '0.05em' },
} as const

export const radius = {
  sm: '0.25rem',
  DEFAULT: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  full: '9999px',
} as const

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '3rem',      // 48px
  gutter: '1.5rem',
  margin: '2rem',
} as const

export const shadows = {
  card: '0 2px 12px 0 rgba(0,105,111,0.08)',
  cardHover: '0 8px 32px 0 rgba(0,105,111,0.14)',
  modal: '0 24px 64px 0 rgba(0,105,111,0.18)',
  sidebar: '4px 0 24px 0 rgba(0,105,111,0.07)',
  topbar: '0 2px 16px 0 rgba(23,28,31,0.06)',
  glowPrimary: '0 0 20px 0 rgba(0,105,111,0.25)',
  glowSm: '0 0 8px 0 rgba(0,105,111,0.15)',
} as const

export const transitions = {
  fast: '150ms ease',
  base: '200ms ease',
  slow: '350ms ease',
  spring: '400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const
