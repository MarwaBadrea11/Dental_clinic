// ─────────────────────────────────────────────
// Welcome Screen — SmileFix Premium Revamp
// Dark-first glassmorphism + spring animations
// + micro-interaction tap feedback on buttons
// ─────────────────────────────────────────────
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../hooks/useTheme';
import Text from '../components/Text';

const { width, height } = Dimensions.get('window');

type Props = { navigation: any };

// ── Micro-interaction button ───────────────────────────────────────────────
// Scales down on press-in, springs back on release — gives physical depth.
function PressableButton({
  onPress,
  children,
  style,
}: {
  onPress: () => void;
  children: React.ReactNode;
  style?: object;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.96,
      damping: 20,
      stiffness: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const pressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 14,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={1}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Animated feature pill ─────────────────────────────────────────────────
function FeaturePill({
  icon,
  label,
  delay,
  colors,
  isDark,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  delay: number;
  colors: any;
  isDark: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, {
        toValue: 1,
        duration: 480,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideX, {
        toValue: 0,
        delay,
        damping: 22,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateX: slideX }],
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark
        ? 'rgba(97,190,197,0.12)'
        : 'rgba(97,190,197,0.15)',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(97,190,197,0.25)'
        : 'rgba(97,190,197,0.30)',
    }}>
      <Ionicons name={icon} size={13} color={colors.teal} />
      <Text style={{
        fontFamily: 'Inter_600SemiBold',
        fontSize: 12,
        color: isDark ? colors.teal : colors.primary,
        letterSpacing: 0.2,
      }}>
        {label}
      </Text>
    </Animated.View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function WelcomeScreen({ navigation }: Props) {
  const { t, isRTL }    = useTranslation();
  const { colors, isDark } = useTheme();

  // ── Staggered entrance animations ────────────────────────────────────────
  const bgAnim    = useRef(new Animated.Value(0)).current;   // background pulse
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoO     = useRef(new Animated.Value(0)).current;
  const logoY     = useRef(new Animated.Value(-30)).current;
  const glowO     = useRef(new Animated.Value(0)).current;
  const heroO     = useRef(new Animated.Value(0)).current;
  const heroY     = useRef(new Animated.Value(28)).current;
  const btnsO     = useRef(new Animated.Value(0)).current;
  const btnsY     = useRef(new Animated.Value(36)).current;

  // Floating logo bob
  const bobY      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance sequence
    Animated.sequence([
      // 1. Logo pops in with spring + scale
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, damping: 14, stiffness: 180, useNativeDriver: true }),
        Animated.timing(logoO,     { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(logoY,     { toValue: 0, damping: 16, stiffness: 160, useNativeDriver: true }),
        Animated.timing(glowO,     { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      // 2. Hero text slides up
      Animated.parallel([
        Animated.timing(heroO, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(heroY, { toValue: 0, damping: 18, stiffness: 180, useNativeDriver: true }),
      ]),
      // 3. Buttons
      Animated.parallel([
        Animated.timing(btnsO,  { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(btnsY,  { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
      ]),
    ]).start();

    // Continuous gentle bob after entrance
    const startBob = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bobY, { toValue: -8, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bobY, { toValue:  0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    };
    const bobTimer = setTimeout(startBob, 1400);
    return () => clearTimeout(bobTimer);
  }, []);

  const align     = isRTL ? 'right' : 'left';
  const rowDir    = isRTL ? 'row-reverse' : 'row';

  // Dark: deep navy canvas; Light: soft off-white
  const bgColors: readonly [string, string, string] = isDark
    ? ['#080d13', '#0d1520', '#081218']
    : ['#e8f4f7', '#f0f8fa', '#eaf3f0'];

  const orb1Color = isDark ? 'rgba(97,190,197,0.12)'  : 'rgba(97,190,197,0.20)';
  const orb2Color = isDark ? 'rgba(30,89,121,0.14)'   : 'rgba(121,213,220,0.18)';
  const orb3Color = isDark ? 'rgba(0,105,111,0.10)'   : 'rgba(0,105,111,0.12)';

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* ── Deep gradient canvas ── */}
      <LinearGradient colors={bgColors} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFillObject} />

      {/* ── Atmospheric orbs (glassmorphism backdrop) ── */}
      <View style={[styles.orb, styles.orb1, { backgroundColor: orb1Color }]} />
      <View style={[styles.orb, styles.orb2, { backgroundColor: orb2Color }]} />
      <View style={[styles.orb, styles.orb3, { backgroundColor: orb3Color }]} />

      {/* Subtle grid overlay for depth on dark */}
      {isDark && <View style={styles.gridOverlay} />}

      <SafeAreaView style={styles.safe}>

        {/* ══ LOGO ══════════════════════════════ */}
        <Animated.View style={[
          styles.logoSection,
          { opacity: logoO, transform: [{ scale: logoScale }, { translateY: logoY }, { translateY: bobY }] },
        ]}>
          {/* Multi-layer glow rings */}
          <Animated.View style={[styles.glowRingOuter, { opacity: glowO, borderColor: isDark ? 'rgba(97,190,197,0.10)' : 'rgba(97,190,197,0.20)' }]} />
          <Animated.View style={[styles.glowRingInner, { opacity: glowO, borderColor: isDark ? 'rgba(97,190,197,0.22)' : 'rgba(97,190,197,0.35)' }]} />

          {/* Logo circle — glassmorphism */}
          <View style={[styles.logoCircle, {
            backgroundColor: isDark ? 'rgba(97,190,197,0.15)' : 'rgba(97,190,197,0.90)',
            borderColor: isDark ? 'rgba(97,190,197,0.35)' : 'rgba(255,255,255,0.60)',
            shadowColor: colors.teal,
          }]}>
            {/* Inner gradient shine */}
            <LinearGradient
              colors={isDark
                ? ['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.02)']
                : ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.05)']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={[styles.logoLetters, { color: isDark ? colors.teal : '#ffffff' }]}>SF</Text>
          </View>

          <Text style={[styles.brandName, { color: isDark ? colors.blue : '#1e5979', textAlign: align }]}>
            SmileFix
          </Text>
          <Text style={[styles.brandTagline, { color: colors.textSub, textAlign: align }]}>
            {t('yourSmileOurPriority')}
          </Text>
        </Animated.View>

        {/* ══ HERO ══════════════════════════════ */}
        <Animated.View style={[
          styles.heroSection,
          { opacity: heroO, transform: [{ translateY: heroY }] },
        ]}>
          <Text style={[styles.heroTitle, {
            color: isDark ? '#e6edf3' : '#1e5979',
            textAlign: 'center',
          }]}>
            {t('dentalCareInYourHands')}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSub, textAlign: 'center' }]}>
            {t('bookTrackConnectAllInOne')}
          </Text>

          {/* Feature pills — staggered slide-in */}
          <View style={[styles.pillsRow, { flexDirection: rowDir }]}>
            <FeaturePill icon="flash-outline"          label={t('instantBooking247')} delay={600}  colors={colors} isDark={isDark} />
            <FeaturePill icon="notifications-outline"  label={t('autoReminders')}     delay={720}  colors={colors} isDark={isDark} />
            <FeaturePill icon="document-text-outline"  label={t('medicalRecords')}    delay={840}  colors={colors} isDark={isDark} />
          </View>
        </Animated.View>

        {/* ══ BUTTONS ═══════════════════════════ */}
        <Animated.View style={[
          styles.btnsSection,
          { opacity: btnsO, transform: [{ translateY: btnsY }] },
        ]}>

          {/* Primary CTA — gradient with glow */}
          <PressableButton onPress={() => navigation.navigate('Register')}>
            <View style={[styles.btnPrimary, { shadowColor: colors.teal }]}>
              <LinearGradient
                colors={['#00818a', '#00696f', '#004f54']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btnGradient}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.00)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]}
                />
                <Text style={styles.btnPrimaryText}>{t('signUp')}</Text>
              </LinearGradient>
            </View>
          </PressableButton>

          {/* Secondary CTA */}
          <PressableButton onPress={() => navigation.navigate('Login')}>
            <View style={[styles.btnSecondary, {
              backgroundColor: isDark
                ? 'rgba(97,190,197,0.08)'
                : 'rgba(0,105,111,0.06)',
              borderColor: isDark
                ? 'rgba(97,190,197,0.30)'
                : 'rgba(0,105,111,0.25)',
            }]}>
              <Text style={[styles.btnSecondaryText, { color: isDark ? colors.blue : '#1e5979' }]}>
                {t('login')}
              </Text>
            </View>
          </PressableButton>

          {/* Terms */}
          <Text style={[styles.terms, { color: colors.textSub, textAlign: 'center' }]}>
            {`${t('byContinuingYouAgreeTo')} `}
            <Text style={[styles.termsLink, { color: colors.teal }]}>{t('termsOfUse')}</Text>
            {` ${t('and')} `}
            <Text style={[styles.termsLink, { color: colors.teal }]}>{t('privacyPolicy')}</Text>
          </Text>
        </Animated.View>

      </SafeAreaView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080d13' },

  safe: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 12,
  },

  // Atmospheric orbs
  orb: { position: 'absolute', borderRadius: 9999 },
  orb1: { width: 380, height: 380, top: -120, right: -100 },
  orb2: { width: 260, height: 260, top: height * 0.30, left: -90 },
  orb3: { width: 200, height: 200, bottom: height * 0.15, right: -60 },

  // Subtle dot-grid texture (dark only)
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.025,
    backgroundColor: 'transparent',
  },

  // ── Logo ──────────────────────────────────────────────────────────────────
  logoSection: {
    alignItems: 'center',
    paddingTop: 16,
  },
  glowRingOuter: {
    position: 'absolute',
    top: -10,
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 1.5,
  },
  glowRingInner: {
    position: 'absolute',
    top: 4,
    width: 116, height: 116, borderRadius: 58,
    borderWidth: 1,
  },
  logoCircle: {
    width: 96, height: 96, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    marginBottom: 16,
    // iOS shadow
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.40,
    shadowRadius: 28,
    elevation: 14,
  },
  logoLetters: {
    fontSize: 36,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 2,
  },
  brandName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 30,
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  brandTagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  heroTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 32,
    lineHeight: 46,
    letterSpacing: -0.8,
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  pillsRow: {
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  // ── Buttons section (no card wrapper) ───────────────────────────────────
  btnsSection: {
    paddingBottom: 8,
  },
  btnPrimary: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 8,
  },
  btnGradient: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  btnPrimaryText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  btnSecondary: {
    height: 58,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  btnSecondaryText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  terms: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    lineHeight: 18,
    marginBottom: 4,
  },
  termsLink: {
    fontFamily: 'Inter_600SemiBold',
  },
});
