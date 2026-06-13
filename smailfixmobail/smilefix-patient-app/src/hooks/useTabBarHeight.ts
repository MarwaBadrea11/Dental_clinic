// ─────────────────────────────────────────────
// useTabBarHeight
// Returns the total height of the bottom tab bar
// (base height + device safe-area bottom inset)
// so screens can apply the correct paddingBottom
// to their scroll containers.
// ─────────────────────────────────────────────
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_BASE = 60; // matches AppNavigator tabBarBase

export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BASE + insets.bottom;
}
