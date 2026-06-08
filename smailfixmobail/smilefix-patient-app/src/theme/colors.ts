// ─────────────────────────────────────────────
// Clinical Serenity — Color Palettes
// Light + Dark themes
// ─────────────────────────────────────────────

export const lightColors = {
  // Backgrounds
  bg:              '#edf1f4',
  surface:         '#f6fafd',
  surfaceCard:     '#ffffff',
  surfaceCardBorder: 'rgba(189,201,201,0.35)',
  surfaceInput:    '#ffffff',
  warm:            '#f7eee5',

  // Brand
  teal:            '#61bec5',
  tealLight:       '#9acec1',
  blue:            '#1e5979',   // SRS primary
  primary:         '#00696f',
  primaryContainer: '#61bec5',
  onPrimary:       '#ffffff',
  onPrimaryContainer: '#004b4f',

  // Text
  text:            '#171c1f',
  textSub:         '#3e494a',
  textDisabled:    '#9ab0b8',

  // UI
  outline:         '#bdc9c9',
  outlineVariant:  '#dfe3e6',
  divider:         'rgba(0,0,0,0.06)',

  // Semantic
  error:           '#ba1a1a',
  errorBg:         '#ffdad6',
  success:         '#35675d',
  successBg:       '#b6eadd',
  warning:         '#7d5700',
  warningBg:       '#ffddb3',

  // Tab bar
  tabBar:          'rgba(255,255,255,0.94)',
  tabBarBorder:    'rgba(30,89,121,0.06)',
  tabActive:       '#00696f',
  tabInactive:     '#6e797a',

  // Gradient
  gradStart:       '#f6fafd',
  gradEnd:         '#edf1f4',

  // Status bar
  statusBar:       'dark-content' as const,
};

export const darkColors = {
  bg:              '#0d1117',
  surface:         '#161b22',
  surfaceCard:     'rgba(22,27,34,0.95)',
  surfaceCardBorder: 'rgba(255,255,255,0.07)',
  surfaceInput:    'rgba(255,255,255,0.05)',
  warm:            '#1a1510',

  // Brand — keep teal identity
  teal:            '#61bec5',
  tealLight:       '#9acec1',
  blue:            '#79d5dc',   // lighter for dark bg
  primary:         '#79d5dc',
  primaryContainer: '#004f54',
  onPrimary:       '#002022',
  onPrimaryContainer: '#95f1f8',

  // Text
  text:            '#e6edf3',
  textSub:         '#8b949e',
  textDisabled:    '#484f58',

  // UI
  outline:         '#30363d',
  outlineVariant:  '#21262d',
  divider:         'rgba(255,255,255,0.06)',

  // Semantic
  error:           '#ff7b72',
  errorBg:         '#3d1a1a',
  success:         '#56d364',
  successBg:       '#1a3d2b',
  warning:         '#e3b341',
  warningBg:       '#3d2e00',

  // Tab bar
  tabBar:          'rgba(13,17,23,0.97)',
  tabBarBorder:    'rgba(255,255,255,0.05)',
  tabActive:       '#79d5dc',
  tabInactive:     '#8b949e',

  // Gradient
  gradStart:       '#161b22',
  gradEnd:         '#0d1117',

  statusBar:       'light-content' as const,
};

export type AppColors = typeof lightColors;
