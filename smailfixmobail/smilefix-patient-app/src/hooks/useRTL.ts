// ─────────────────────────────────────────────
// useRTL — Central RTL layout helpers
// Single source of truth for all directional
// style values across the app.
// ─────────────────────────────────────────────
import { useTranslation } from './useTranslation';
import type { TextStyle, ViewStyle } from 'react-native';

export interface RTLHelpers {
  isRTL: boolean;
  /** 'right' | 'left' — for textAlign */
  align: TextStyle['textAlign'];
  /** 'row-reverse' | 'row' — for flexDirection */
  rowDir: ViewStyle['flexDirection'];
  /** writing direction for Text nodes */
  writingDir: TextStyle['writingDirection'];
  /** Swap left ↔ right padding/margin based on direction */
  start: 'left' | 'right';
  end:   'right' | 'left';
  /** Shorthand style objects ready to spread */
  textStyle:  Pick<TextStyle, 'textAlign' | 'writingDirection'>;
  rowStyle:   Pick<ViewStyle, 'flexDirection'>;
  /** paddingStart replaces paddingLeft in RTL — use for icon spacing */
  iconPadStart: (size: number) => ViewStyle;
  iconPadEnd:   (size: number) => ViewStyle;
  /** Horizontal margin helpers (start = logical leading edge) */
  marginStart: (size: number) => ViewStyle;
  marginEnd:   (size: number) => ViewStyle;
}

export function useRTL(): RTLHelpers {
  const { isRTL } = useTranslation();

  const align:      TextStyle['textAlign']     = isRTL ? 'right' : 'left';
  const rowDir:     ViewStyle['flexDirection']  = isRTL ? 'row-reverse' : 'row';
  const writingDir: TextStyle['writingDirection'] = isRTL ? 'rtl' : 'ltr';
  const start = isRTL ? 'right' : 'left' as 'left' | 'right';
  const end   = isRTL ? 'left'  : 'right' as 'right' | 'left';

  return {
    isRTL,
    align,
    rowDir,
    writingDir,
    start,
    end,
    textStyle:  { textAlign: align, writingDirection: writingDir },
    rowStyle:   { flexDirection: rowDir },
    iconPadStart: (size) => isRTL ? { paddingRight: size } : { paddingLeft: size },
    iconPadEnd:   (size) => isRTL ? { paddingLeft: size }  : { paddingRight: size },
    marginStart:  (size) => isRTL ? { marginRight: size }  : { marginLeft: size },
    marginEnd:    (size) => isRTL ? { marginLeft: size }   : { marginRight: size },
  };
}
