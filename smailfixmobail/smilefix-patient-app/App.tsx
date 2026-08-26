// ─────────────────────────────────────────────
// SmileFix — Root Entry Point
// Expo 54 | React Native 0.81.5
// ─────────────────────────────────────────────
import 'react-native-gesture-handler';
// Initialize i18next before anything else
import './src/i18n';

import React, { useEffect, useLayoutEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, I18nManager, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as Updates from 'expo-updates';
import Text from './src/components/Text';
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

import { ThemeProvider } from './src/theme/ThemeContext';
import { useTheme } from './src/theme/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { useAppStore } from './src/store/appStore';
import i18n from './src/i18n';

// ── Splash screen shown while fonts load or storage hydrates ─
function SplashScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.splash, { backgroundColor: colors.bg }]}>
      <View style={[styles.splashCircle, { backgroundColor: colors.teal }]}>
        <Text style={[styles.splashLogo, { color: '#ffffff' }]}>
          SF
        </Text>
      </View>
      <ActivityIndicator
        color={colors.teal}
        size="large"
        style={{ marginTop: 32 }}
      />
    </View>
  );
}

// ── Inner app (needs ThemeProvider) ──────────
function InnerApp() {
  const { colors } = useTheme();
  const hydrateFromStorage = useAppStore((s) => s.hydrateFromStorage);
  const isHydrating        = useAppStore((s) => s.isHydrating);
  const locale             = useAppStore((s) => s.locale);

  // ── Sync RTL direction with stored locale after hydration ──
  // After hydrateFromStorage resolves, if the persisted locale's RTL state
  // differs from the current native layout direction, reload the JS bundle so
  // the native layout engine picks up the change. I18nManager changes require
  // a full bundle reload to affect View flex direction, margin mirroring, etc.
  useLayoutEffect(() => {
    if (isHydrating) return; // wait until SecureStore has been read

    const shouldBeRTL = locale === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(shouldBeRTL);

      // Reload the bundle so the native layout engine applies the new direction.
      // Updates.reloadAsync() works in production builds and standalone apps.
      // In Expo Go it is a no-op (returns without throwing), so we also show
      // an Alert as a fallback for development.
      Updates.reloadAsync().catch(() => {
        Alert.alert(
          'إعادة تشغيل مطلوبة / Restart Required',
          locale === 'ar'
            ? 'يرجى إعادة تشغيل التطبيق لتطبيق تخطيط اللغة العربية.'
            : 'Please restart the app to apply the new layout direction.',
          [{ text: 'OK' }],
        );
      });
    }
  }, [isHydrating, locale]);

  // ── Sync i18next language with persisted locale ──
  // After hydration restores a locale different from i18n's current
  // language (e.g. user had switched to English), align i18next.
  useEffect(() => {
    if (!isHydrating && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [isHydrating, locale]);

  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // ── Hydrate auth session from SecureStore on first mount ──
  useEffect(() => {
    hydrateFromStorage();
  }, []);

  // Wait for both fonts AND storage hydration before rendering the navigator.
  // This prevents a flash of the auth screens for already-logged-in users.
  if ((!fontsLoaded && !fontError) || isHydrating) {
    return <SplashScreen />;
  }

  return (
    <>
      <StatusBar style={colors.statusBar === 'dark-content' ? 'dark' : 'light'} />
      <AppNavigator />
    </>
  );
}

// ── Root ──────────────────────────────────────
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <InnerApp />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
