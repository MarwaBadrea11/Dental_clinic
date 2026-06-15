// ─────────────────────────────────────────────
// QR Share Screen — App Download
// Displays a QR code for downloading the
// SmileFix Patient app APK directly.
// ─────────────────────────────────────────────
import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import Text from '../components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

// ── Direct APK download URL ────────────────────────────────────────────────
// TODO: Replace with your own server URL once you upload the APK to your backend
const APK_URL = 'https://expo.dev/accounts/marwamarwa11/projects/smilefix-patient-app/builds/0c5501ed-4043-423b-9b2f-524dd0a8d833';

// ── Cinematic easing ───────────────────────────────────────────────────────
const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);

// ── Entrance animation wrapper ─────────────────────────────────────────────
function FadeInView({
  delay = 0,
  children,
  style,
}: {
  delay?: number;
  children: React.ReactNode;
  style?: object;
}) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 520, delay, easing: EASE_OUT_EXPO, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 540, delay, easing: EASE_OUT_EXPO, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function QRScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();

  // Pulsing orbs
  const orb1 = useRef(new Animated.Value(1)).current;
  const orb2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1, { toValue: 1.18, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orb1, { toValue: 1.00, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    const t2 = setTimeout(() =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(orb2, { toValue: 1.14, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(orb2, { toValue: 1.00, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start()
    , 1800);
    return () => clearTimeout(t2);
  }, []);

  const bgColors: readonly [string, string, string] = isDark
    ? ['#060b10', '#0a1520', '#060e14']
    : ['#e6f3f6', '#eef7f8', '#e8f2f4'];

  const cardBg     = isDark ? 'rgba(14,22,32,0.92)' : 'rgba(255,255,255,0.96)';
  const cardBorder = isDark ? 'rgba(97,190,197,0.25)' : 'rgba(0,105,111,0.15)';

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Deep canvas gradient */}
      <LinearGradient
        colors={bgColors}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Ambient pulsing orbs */}
      <Animated.View style={[styles.orb, styles.orbTR, {
        backgroundColor: isDark ? 'rgba(97,190,197,0.09)' : 'rgba(97,190,197,0.18)',
        transform: [{ scale: orb1 }],
      }]} />
      <Animated.View style={[styles.orb, styles.orbBL, {
        backgroundColor: isDark ? 'rgba(30,89,121,0.11)' : 'rgba(121,213,220,0.16)',
        transform: [{ scale: orb2 }],
      }]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>

          {/* ── Header title ── */}
          <FadeInView delay={60} style={styles.headerWrap}>
            {/* Share icon badge */}
            <View style={[styles.iconBadge, {
              borderColor: isDark ? 'rgba(97,190,197,0.35)' : 'rgba(0,105,111,0.25)',
              shadowColor: colors.teal,
            }]}>
              <LinearGradient
                colors={isDark ? ['#00818a', '#004f54'] : ['#00818a', '#00696f']}
                start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              {/* Shine overlay */}
              <LinearGradient
                colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.00)']}
                start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Ionicons name="share-social-outline" size={30} color="#ffffff" />
            </View>

            <Text style={[styles.titleText, { color: isDark ? '#e6edf3' : '#1e5979' }]}>
              {t('shareTitle')}
            </Text>
            <Text style={[styles.subtitleText, { color: colors.textSub }]}>
              {t('shareSubtitle')}
            </Text>
          </FadeInView>

          {/* ── QR Card ── */}
          <FadeInView delay={160} style={styles.cardWrap}>
            <View style={[styles.card, {
              backgroundColor: cardBg,
              borderColor:     cardBorder,
              shadowColor:     isDark ? colors.teal : '#00696f',
            }]}>
              {/* Top glow bar */}
              <LinearGradient
                colors={['rgba(97,190,197,0.00)', 'rgba(97,190,197,0.65)', 'rgba(97,190,197,0.00)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.cardGlowBar}
              />

              {/* Brand mark */}
              <View style={styles.brandRow}>
                <View style={[styles.logoSquircle, {
                  borderColor: isDark ? 'rgba(97,190,197,0.40)' : 'rgba(0,105,111,0.30)',
                  shadowColor: colors.teal,
                }]}>
                  <LinearGradient
                    colors={isDark ? ['#00818a', '#004f54'] : ['#00818a', '#00696f']}
                    start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <LinearGradient
                    colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.00)']}
                    start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Text style={styles.logoLetters}>SF</Text>
                </View>
                <Text style={[styles.brandName, { color: isDark ? '#e6edf3' : '#1e5979' }]}>
                  SmileFix
                </Text>
              </View>

              {/* QR Code */}
              <View style={[styles.qrWrapper, {
                borderColor: isDark ? 'rgba(97,190,197,0.20)' : 'rgba(0,105,111,0.12)',
                shadowColor: isDark ? colors.teal : '#00696f',
              }]}>
                <QRCode
                  value={APK_URL}
                  size={200}
                  color={isDark ? '#0d1117' : '#1e5979'}
                  backgroundColor="#ffffff"
                />
              </View>

              {/* Caption */}
              <Text style={[styles.qrCaption, { color: isDark ? colors.teal : colors.primary }]}>
                {t('pointCameraToScan')}
              </Text>
              <Text style={[styles.qrUrl, { color: colors.textSub }]} numberOfLines={1}>
                {APK_URL}
              </Text>
            </View>
          </FadeInView>

          {/* ── Bottom instruction chips ── */}
          <FadeInView delay={280} style={styles.chipsRow}>
            {([
              { icon: 'camera-outline'  as const, labelKey: 'openCamera'  as const },
              { icon: 'scan-outline'    as const, labelKey: 'scanQr'      as const },
              { icon: 'download-outline' as const, labelKey: 'downloadApk' as const },
            ] as const).map((step, i) => (
              <View
                key={step.labelKey}
                style={[styles.chip, {
                  backgroundColor: isDark ? 'rgba(14,22,32,0.85)' : 'rgba(255,255,255,0.90)',
                  borderColor:     isDark ? 'rgba(97,190,197,0.16)' : 'rgba(0,105,111,0.12)',
                  shadowColor:     isDark ? colors.teal : '#00696f',
                }]}
              >
                <View style={[styles.chipIconWrap, {
                  backgroundColor: isDark ? 'rgba(97,190,197,0.14)' : 'rgba(0,105,111,0.10)',
                }]}>
                  <Ionicons name={step.icon} size={16} color={colors.teal} />
                </View>
                <Text style={[styles.chipLabel, { color: isDark ? '#e6edf3' : '#1e5979' }]}>
                  {t(step.labelKey)}
                </Text>
                {i < 2 && (
                  <Ionicons
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={12}
                    color={colors.textSub}
                    style={styles.chipArrow}
                  />
                )}
              </View>
            ))}
          </FadeInView>

        </View>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060b10' },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 28,
  },

  // Ambient orbs
  orb:   { position: 'absolute', borderRadius: 9999 },
  orbTR: { width: 340, height: 340, top: -100, right: -90 },
  orbBL: { width: 240, height: 240, bottom: 80, left: -70 },

  // Header
  headerWrap: { alignItems: 'center', gap: 12 },
  iconBadge: {
    width: 72, height: 72, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 1.5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 20, elevation: 10,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  // Card
  cardWrap: { width: '100%' },
  card: {
    width: '100%',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22, shadowRadius: 30, elevation: 12,
  },
  cardGlowBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
  },

  // Brand row
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  logoSquircle: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40, shadowRadius: 12, elevation: 6,
  },
  logoLetters: {
    fontSize: 15, color: '#fff',
    fontFamily: 'Manrope_700Bold', fontWeight: '700',
  },
  brandName: {
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
  },

  // QR code
  qrWrapper: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14, shadowRadius: 18, elevation: 6,
  },
  qrCaption: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  qrUrl: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    letterSpacing: 0.3,
    maxWidth: 260,
  },

  // Step chips row
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  chipIconWrap: {
    width: 28, height: 28, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  chipLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  chipArrow: {
    marginLeft: 2,
  },
});
