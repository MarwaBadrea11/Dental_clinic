// ─────────────────────────────────────────────
// SmileFix — Root Entry Point
// Expo 54 | React Native 0.81.5
// ─────────────────────────────────────────────
import 'react-native-gesture-handler';
// Initialize i18next before anything else
import './src/i18n';

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
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

// ── Inner app (needs ThemeProvider) ──────────
function InnerApp() {
  const { colors } = useTheme();

  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.bg }]}>
        <View style={[styles.splashCircle, { backgroundColor: colors.teal }]}>
          <Text style={[styles.splashLogo, { color: colors.onPrimaryContainer }]}>
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
