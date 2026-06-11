// ─────────────────────────────────────────────
// QR Share Screen — Fully themed + SafeAreaView
// Clinical Serenity | Dark/Light | AR/EN
// ─────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Share,
  ScrollView,
  StatusBar,
} from 'react-native';
import Text from '../components/Text';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import type { AppColors } from '../theme/colors';
import { useTabBarHeight } from '../hooks/useTabBarHeight';

const APP_URL = 'https://smilefix.app/download';

type ShareOption = {
  id:    string;
  icon:  React.ComponentProps<typeof Ionicons>['name'];
  label: string;
};

export default function QRScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL }       = useTranslation();
  const [copied, setCopied] = useState(false);
  const tabBarHeight = useTabBarHeight();

  const s = makeStyles(colors, isRTL, isDark);

  const SHARE_OPTIONS: ShareOption[] = [
    { id: 'whatsapp', icon: 'logo-whatsapp',    label: t('whatsapp') },
    { id: 'sms',      icon: 'chatbubble-outline', label: t('sms') },
    { id: 'copy',     icon: 'copy-outline',      label: copied ? t('linkCopied') : t('copyLink') },
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

  return (
    <View style={s.root}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />

      {/* Background gradient */}
      <LinearGradient
        colors={[colors.gradStart, colors.gradEnd]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative blobs */}
      <View style={s.blob1} />
      <View style={s.blob2} />

      <SafeAreaView style={s.safe}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: tabBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <Text style={s.title}>{t('inviteFriends')}</Text>
          <View style={s.tagPill}>
            <Text style={s.tagText}>{t('tagline')}</Text>
          </View>

          {/* ── QR Card ── */}
          <View style={s.qrCard}>
            {/* Logo row */}
            <View style={s.logoRow}>
              <View style={s.logoCircle}>
                <Text style={s.logoLetters}>SF</Text>
              </View>
              <Text style={s.brandName}>{t('appName')}</Text>
            </View>

            {/* QR Code — white bg always for scannability */}
            <View style={s.qrWrapper}>
              <QRCode
                value={APP_URL}
                size={190}
                color={isDark ? '#0d1117' : '#1e5979'}
                backgroundColor="#ffffff"
              />
            </View>

            <Text style={s.qrCaption}>{t('scanToDownload')}</Text>
            <Text style={s.qrUrl}>{APP_URL}</Text>
          </View>

          {/* ── Quick share ── */}
          <Text style={s.sectionLabel}>{t('quickShare')}</Text>
          <View style={s.shareGrid}>
            {SHARE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={s.shareBtn}
                onPress={() => handleShare(opt.id)}
                activeOpacity={0.75}
              >
                <View style={[
                  s.shareBtnIcon,
                  opt.id === 'copy' && copied && s.shareBtnCopied,
                ]}>
                  <Ionicons
                    name={opt.icon}
                    size={24}
                    color={opt.id === 'copy' && copied ? colors.success : colors.teal}
                  />
                </View>
                <Text style={s.shareBtnLabel} numberOfLines={1}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Dynamic styles ────────────────────────────
function makeStyles(c: AppColors, isRTL: boolean, isDark: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    safe: { flex: 1 },
    scroll: {
      paddingHorizontal: 20,
      alignItems: 'center',
    },

    // Blobs
    blob1: {
      position: 'absolute', width: 300, height: 300, borderRadius: 150,
      backgroundColor: c.teal + '12', top: -80, right: -80,
    },
    blob2: {
      position: 'absolute', width: 200, height: 200, borderRadius: 100,
      backgroundColor: c.blue + '08', bottom: 120, left: -60,
    },

    // Header
    title: {
      fontSize: 24, fontWeight: '700',
      color: c.blue, textAlign: 'center',
      marginTop: 8, marginBottom: 10,
      fontFamily: 'Manrope_700Bold',
    },
    tagPill: {
      backgroundColor: isDark ? c.teal + '20' : '#f7eee5',
      paddingHorizontal: 16, paddingVertical: 6,
      borderRadius: 999, marginBottom: 24,
    },
    tagText: {
      fontSize: 11, fontWeight: '600',
      color: isDark ? c.teal : '#635d57',
      letterSpacing: 0.5, textTransform: 'uppercase',
      fontFamily: 'Inter_600SemiBold',
    },

    // QR Card
    qrCard: {
      width: '100%',
      backgroundColor: c.surfaceCard,
      borderRadius: 28, padding: 24,
      alignItems: 'center',
      borderWidth: 0.5, borderColor: c.surfaceCardBorder,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 12, elevation: 3,
    },
    logoRow: {
      flexDirection: 'row', alignItems: 'center',
      gap: 10, marginBottom: 20,
    },
    logoCircle: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.teal,
      alignItems: 'center', justifyContent: 'center',
    },
    logoLetters: {
      fontSize: 18, color: c.onPrimaryContainer,
      fontWeight: '700', fontFamily: 'Manrope_700Bold',
    },
    brandName: {
      fontSize: 22, fontWeight: '800',
      color: c.blue, fontFamily: 'Manrope_800ExtraBold',
    },
    qrWrapper: {
      padding: 16,
      backgroundColor: '#ffffff',   // Always white for QR scannability
      borderRadius: 20,
      marginBottom: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
    },
    qrCaption: {
      fontSize: 14, fontWeight: '600',
      color: c.primary, textAlign: 'center',
      marginBottom: 4, fontFamily: 'Inter_600SemiBold',
    },
    qrUrl: {
      fontSize: 11, color: c.textSub, textAlign: 'center',
    },

    // Share grid
    sectionLabel: {
      fontSize: 11, fontWeight: '600',
      color: c.textSub, textAlign: 'center',
      letterSpacing: 0.8, textTransform: 'uppercase',
      marginBottom: 14, fontFamily: 'Inter_600SemiBold',
    },
    shareGrid: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 20,
    },
    shareBtn: {
      alignItems: 'center', gap: 6, flex: 1,
    },
    shareBtnIcon: {
      width: 56, height: 56, borderRadius: 18,
      backgroundColor: c.surfaceCard,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 0.5, borderColor: c.surfaceCardBorder,
    },
    shareBtnCopied: {
      backgroundColor: c.successBg,
      borderColor: c.success + '40',
    },
    shareBtnLabel: {
      fontSize: 10, color: c.textSub,
      textAlign: 'center', fontWeight: '600',
      fontFamily: 'Inter_600SemiBold',
    },
  });
}
