// ─────────────────────────────────────────────
// QR Share Screen — Elite Premium Redesign
// Deep canvas · Staggered entrance · Neon glow
// ─────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Share,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import Text from '../components/Text';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useTabBarHeight } from '../hooks/useTabBarHeight';

// ── Cinematic easing curves ────────────────────────────────────────────────
const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IN_OUT   = Easing.bezier(0.65, 0, 0.35, 1);

const APP_URL = 'https://smilefix.app/download';

type ShareOption = {
  id:    string;
  icon:  React.ComponentProps<typeof Ionicons>['name'];
  label: string;
};

// ── Stagger wrapper ────────────────────────────────────────────────────────
function StaggerItem({
  index,
  children,
  style,
}: {
  index: number;
  children: React.ReactNode;
  style?: object;
}) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(32)).current;
  const scale      = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    const delay = index * 80 + 60;
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 500, delay, easing: EASE_OUT_EXPO, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 540, delay, easing: EASE_OUT_EXPO, useNativeDriver: true }),
      Animated.timing(scale,      { toValue: 1, duration: 480, delay, easing: EASE_OUT_EXPO, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }, { scale }] }]}>
      {children}
    </Animated.View>
  );
}

export default function QRScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL }       = useTranslation();
  const [copied, setCopied] = useState(false);
  const tabBarHeight = useTabBarHeight();

  // ── Orb pulses ────────────────────────────
  const orb1 = useRef(new Animated.Value(1)).current;
  const orb2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1, { toValue: 1.18, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orb1, { toValue: 1.00, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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

  const SHARE_OPTIONS: ShareOption[] = [
    { id: 'whatsapp', icon: 'logo-whatsapp',      label: t('whatsapp') },
    { id: 'sms',      icon: 'chatbubble-outline',  label: t('sms') },
    { id: 'copy',     icon: 'copy-outline',        label: copied ? t('linkCopied') : t('copyLink') },
  ];

  const handleShare = async (id: string) => {
    if (id === 'copy') {
      await Clipboard.setStringAsync(APP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return;
    }
    try {
      await Share.share({
        message: `${t('scanToDownload')}\n${APP_URL}`,
        url:     APP_URL,
        title:   t('appName'),
      });
    } catch {
      // user cancelled
    }
  };

  const bgColors: readonly [string, string, string] = isDark
    ? ['#060b10', '#0a1520', '#060e14']
    : ['#e6f3f6', '#eef7f8', '#e8f2f4'];

  const cardBg     = isDark ? 'rgba(14,22,32,0.92)' : 'rgba(255,255,255,0.95)';
  const cardBorder = isDark ? 'rgba(97,190,197,0.25)' : 'rgba(0,105,111,0.15)';

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Deep canvas */}
      <LinearGradient colors={bgColors} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFillObject} />

      {/* Pulsing orbs */}
      <Animated.View style={[styles.orb, styles.orbTR, {
        backgroundColor: isDark ? 'rgba(97,190,197,0.09)' : 'rgba(97,190,197,0.18)',
        transform: [{ scale: orb1 }],
      }]} />
      <Animated.View style={[styles.orb, styles.orbBL, {
        backgroundColor: isDark ? 'rgba(30,89,121,0.11)' : 'rgba(121,213,220,0.16)',
        transform: [{ scale: orb2 }],
      }]} />

      <SafeAreaView style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Page title ── */}
          <StaggerItem index={0} style={styles.titleWrap}>
            <Text style={[styles.pageTitle, { color: isDark ? '#e6edf3' : '#1e5979' }]}>
              {t('inviteFriends')}
            </Text>
            <View style={[styles.tagPill, {
              backgroundColor: isDark ? 'rgba(97,190,197,0.15)' : 'rgba(97,190,197,0.18)',
              borderColor:     isDark ? 'rgba(97,190,197,0.30)' : 'rgba(0,105,111,0.20)',
            }]}>
              <Text style={[styles.tagText, { color: isDark ? colors.teal : colors.primary }]}>
                {t('tagline')}
              </Text>
            </View>
          </StaggerItem>

          {/* ── QR Card ── */}
          <StaggerItem index={1} style={styles.qrCardWrap}>
            <View style={[styles.qrCard, {
              backgroundColor: cardBg,
              borderColor:     cardBorder,
              shadowColor:     isDark ? colors.teal : '#000',
            }]}>
              {/* Gradient border glow top line */}
              <LinearGradient
                colors={['rgba(97,190,197,0.00)', 'rgba(97,190,197,0.60)', 'rgba(97,190,197,0.00)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.qrCardGlowBar}
              />

              {/* Logo squircle */}
              <View style={[styles.logoSquircle, {
                borderColor: isDark ? 'rgba(97,190,197,0.40)' : 'rgba(0,105,111,0.35)',
                shadowColor: colors.teal,
              }]}>
                <LinearGradient
                  colors={isDark
                    ? ['#00818a', '#004f54']
                    : ['#00818a', '#00696f']}
                  start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                {/* Shine overlay */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.00)']}
                  start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.logoLetters}>{'SF'}</Text>
              </View>

              <Text style={[styles.brandName, { color: isDark ? colors.blue : '#1e5979' }]}>
                {'SmileFix'}
              </Text>

              {/* QR Code */}
              <View style={[styles.qrWrapper, {
                borderColor: isDark ? 'rgba(97,190,197,0.22)' : 'rgba(0,105,111,0.12)',
                shadowColor: isDark ? colors.teal : '#000',
              }]}>
                <QRCode
                  value={APP_URL}
                  size={190}
                  color={isDark ? '#0d1117' : '#1e5979'}
                  backgroundColor="#ffffff"
                />
              </View>

              <Text style={[styles.qrCaption, { color: isDark ? colors.teal : colors.primary }]}>
                {t('scanToDownload')}
              </Text>
              <Text style={[styles.qrUrl, { color: colors.textSub }]}>
                {APP_URL}
              </Text>
            </View>
          </StaggerItem>

          {/* ── Quick Share label ── */}
          <StaggerItem index={2} style={styles.sectionLabelWrap}>
            <View style={styles.sectionLabelRow}>
              {/* Neon teal dot */}
              <View style={[styles.sectionDot, {
                backgroundColor: colors.teal,
                shadowColor: colors.teal,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.80, shadowRadius: 6,
              }]} />
              <Text style={[styles.sectionLabel, { color: colors.textSub }]}>
                {t('quickShare')}
              </Text>
            </View>
          </StaggerItem>

          {/* ── Share option tiles — 3-column grid ── */}
          <View style={[styles.shareGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {SHARE_OPTIONS.map((opt, index) => {
              const isCopied = opt.id === 'copy' && copied;
              return (
                <StaggerItem key={opt.id} index={3 + index} style={styles.shareTileWrap}>
                  <TouchableOpacity
                    onPress={() => handleShare(opt.id)}
                    activeOpacity={0.78}
                  >
                    <View style={[styles.shareTile, {
                      backgroundColor: cardBg,
                      borderColor: isCopied
                        ? (isDark ? 'rgba(86,211,100,0.35)' : 'rgba(53,103,93,0.28)')
                        : (isDark ? 'rgba(97,190,197,0.12)' : 'rgba(0,105,111,0.09)'),
                      shadowColor: isCopied ? colors.success : (isDark ? colors.teal : '#000'),
                    }]}>
                      {/* Icon in gradient circle */}
                      <View style={[styles.shareTileIconWrap, {
                        borderColor: isCopied
                          ? 'rgba(86,211,100,0.35)' : (isDark ? 'rgba(97,190,197,0.25)' : 'rgba(0,105,111,0.18)'),
                        overflow: 'hidden',
                      }]}>
                        <LinearGradient
                          colors={isCopied
                            ? ['rgba(86,211,100,0.25)', 'rgba(86,211,100,0.10)']
                            : (isDark
                              ? ['rgba(97,190,197,0.20)', 'rgba(97,190,197,0.06)']
                              : ['rgba(0,105,111,0.12)', 'rgba(0,105,111,0.04)'])}
                          start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <Ionicons
                          name={opt.icon}
                          size={24}
                          color={isCopied ? colors.success : colors.teal}
                        />
                      </View>
                      <Text style={[styles.shareTileLabel, { color: isCopied ? colors.success : colors.textSub }]} numberOfLines={1}>
                        {opt.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </StaggerItem>
              );
            })}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Static styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060b10' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, alignItems: 'center' },

  // Orbs
  orb:   { position: 'absolute', borderRadius: 9999 },
  orbTR: { width: 320, height: 320, top: -90,  right: -80 },
  orbBL: { width: 230, height: 230, bottom: 130, left: -65 },

  // Title area
  titleWrap: { alignItems: 'center', marginTop: 10, marginBottom: 22, width: '100%' },
  pageTitle: {
    fontSize: 28, fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.7, marginBottom: 10, textAlign: 'center',
  },
  tagPill: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
  },
  tagText: {
    fontSize: 10, fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },

  // QR card
  qrCardWrap: { width: '100%', marginBottom: 24 },
  qrCard: {
    width: '100%', borderRadius: 28, padding: 28,
    alignItems: 'center', borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.20, shadowRadius: 28, elevation: 10,
  },
  qrCardGlowBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 1.5,
  },

  // Logo squircle
  logoSquircle: {
    width: 66, height: 66, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 1.5,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 20, elevation: 8,
  },
  logoLetters: { fontSize: 24, color: '#fff', fontFamily: 'Manrope_700Bold', fontWeight: '700' },
  brandName: {
    fontSize: 22, fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800', marginBottom: 20,
  },

  // QR wrapper
  qrWrapper: {
    padding: 16, backgroundColor: '#ffffff',
    borderRadius: 20, marginBottom: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 5,
  },
  qrCaption: {
    fontSize: 15, fontFamily: 'Manrope_700Bold',
    fontWeight: '700', textAlign: 'center',
    marginBottom: 6, letterSpacing: -0.2,
  },
  qrUrl: {
    fontSize: 11, fontFamily: 'Inter_400Regular',
    textAlign: 'center', letterSpacing: 0.3,
  },

  // Section label
  sectionLabelWrap: { width: '100%', marginBottom: 14 },
  sectionLabelRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  sectionDot: {
    width: 7, height: 7, borderRadius: 3.5,
  },
  sectionLabel: {
    fontSize: 10, fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },

  // Share grid
  shareGrid: {
    justifyContent: 'space-between', width: '100%',
    gap: 12, marginBottom: 20,
  },
  shareTileWrap: { flex: 1 },
  shareTile: {
    alignItems: 'center', borderRadius: 18,
    borderWidth: 1, paddingVertical: 18, paddingHorizontal: 8,
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 14, elevation: 4,
  },
  shareTileIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  shareTileLabel: {
    fontSize: 10, fontFamily: 'Inter_600SemiBold',
    textAlign: 'center', fontWeight: '600',
  },
});
