// ─────────────────────────────────────────────
// App Navigator — Auth Stack + Main Tabs
// Fix: navigator reacts to isAuthenticated,
// no navigation.replace('Main') needed.
// ─────────────────────────────────────────────
import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  I18nManager,
} from 'react-native';
import Text from '../components/Text';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '../store/appStore';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { RootStackParamList } from './types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Screens ───────────────────────────────────
import WelcomeScreen      from '../screens/WelcomeScreen';
import LoginScreen        from '../screens/LoginScreen';
import OTPVerifyScreen    from '../screens/OTPVerifyScreen';
import RegisterScreen     from '../screens/RegisterScreen';
import HomeScreen         from '../screens/HomeScreen';
import BookingScreen      from '../screens/BookingScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import ProfileScreen      from '../screens/ProfileScreen';
import QRScreen           from '../screens/QRScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator();

// ── Tab icon config ───────────────────────────
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Home:         { active: 'home',           inactive: 'home-outline' },
  Appointments: { active: 'calendar',       inactive: 'calendar-outline' },
  Booking:      { active: 'add-circle',     inactive: 'add-circle-outline' },
  Profile:      { active: 'person',         inactive: 'person-outline' },
  QR:           { active: 'share-social',   inactive: 'share-social-outline' },
};

// ── Main bottom tabs ──────────────────────────
function MainTabs() {
  const { colors, isDark } = useTheme();
  const { t, locale }      = useTranslation();
  const i18n               = useAppStore((s) => s.locale);
  const insets             = useSafeAreaInsets();

  // Tab bar height = base content height + device bottom safe area
  const TAB_BAR_BASE   = 60;
  const tabBarHeight   = TAB_BAR_BASE + insets.bottom;

  // Sync RTL with i18n language — i18n/index.ts already handles the initial
  // forceRTL call, so we only need to re-sync when the user toggles language.
  useEffect(() => {
    const shouldRTL = locale === 'ar';
    if (I18nManager.isRTL !== shouldRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(shouldRTL);
    }
  }, [locale]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        // ── Tab bar style ──────────────────────
        tabBarStyle: {
          position:        'absolute',
          height:          tabBarHeight,
          backgroundColor: colors.tabBar,
          borderTopWidth:  1,
          borderTopColor:  colors.tabBarBorder,
          paddingBottom:   insets.bottom,   // push icons above home indicator
          paddingTop:      8,
          paddingHorizontal: 4,
          // FLAT — no shadow, no elevation
          shadowColor:     'transparent',
          shadowOffset:    { width: 0, height: 0 },
          shadowOpacity:   0,
          shadowRadius:    0,
          elevation:       0,
        },

        tabBarActiveTintColor:   colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarShowLabel:         false,

        // ── Icon renderer ─────────────────────
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          if (!icons) return null;

          // Booking tab: special FAB style
          if (route.name === 'Booking') {
            return (
              <View style={[
                tabS.fab,
                { backgroundColor: focused ? colors.blue : colors.teal },
              ]}>
                <Ionicons
                  name={focused ? 'add-circle' : 'add-circle-outline'}
                  size={28}
                  color="#ffffff"
                />
              </View>
            );
          }

          // Regular tabs: circle indicator when active
          if (focused) {
            const label = t(
              route.name === 'Home'         ? 'tabHome'    :
              route.name === 'Appointments' ? 'tabAppts'   :
              route.name === 'Profile'      ? 'tabProfile' : 'tabShare'
            );
            return (
              <View style={[tabS.iconWrap, { backgroundColor: colors.blue }]}>
                <Ionicons name={icons.active} size={18} color="#ffffff" />
                <Text style={tabS.iconWrapLabel} numberOfLines={1}>{label}</Text>
              </View>
            );
          }

          return (
            <View style={tabS.iconWrap}>
              <Ionicons name={icons.inactive} size={22} color={color} />
            </View>
          );
        },

        tabBarLabel: () => null,
      })}
    >
      <Tab.Screen name="Home"         component={HomeScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} />
      <Tab.Screen name="Booking"      component={BookingScreen} />
      <Tab.Screen name="Profile"      component={ProfileScreen} />
      <Tab.Screen name="QR"           component={QRScreen} />
    </Tab.Navigator>
  );
}

// ── Root navigator ────────────────────────────
export default function AppNavigator() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const { colors, isDark } = useTheme();

  // React Navigation theme driven by our color system
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.bg,
      card:       colors.surface,
      text:       colors.text,
      primary:    colors.primary,
      border:     colors.outline,
      notification: colors.teal,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        {!isAuthenticated ? (
          // ── Auth flow ──────────────────────────
          // setAuthenticated() → isAuthenticated = true
          // → navigator re-renders → shows Main automatically
          // NEVER call navigation.replace('Main') from here
          <>
            <Stack.Screen name="Welcome"  component={WelcomeScreen} />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="OTPVerify"
              component={OTPVerifyScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
          </>
        ) : (
          // ── Main app ───────────────────────────
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ── Tab styles ────────────────────────────────
const tabS = StyleSheet.create({
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,   // Perfect circle
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
    marginTop: 2,
    textAlign: 'center',
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    // No shadow — flat design
  },
});
