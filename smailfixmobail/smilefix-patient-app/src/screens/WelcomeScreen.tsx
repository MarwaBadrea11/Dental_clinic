// ─────────────────────────────────────────────
// Welcome Screen — SmileFix
// Clinical Serenity | Arabic RTL
// ─────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../components/Text';

// ── Design tokens ─────────────────────────────
const C = {
  bg:        '#edf1f4',
  surface:   '#f6fafd',
  warm:      '#f7eee5',
  teal:      '#61bec5',
  tealLight: '#9acec1',
  blue:      '#1e5979',
  primary:   '#00696f',
  onTeal:    '#004b4f',
  textSub:   '#3e494a',
  white:     '#ffffff',
  secondary: '#b6eadd',
  secText:   '#35675d',
};

const { width, height } = Dimensions.get('window');

type Props = { navigation: any };

export default function WelcomeScreen({ navigation }: Props) {
  // ── Animations ───────────────────────────────
  const logoY    = useRef(new Animated.Value(-40)).current;
  const logoO    = useRef(new Animated.Value(0)).current;
  const heroO    = useRef(new Animated.Value(0)).current;
  const heroY    = useRef(new Animated.Value(24)).current;
  const btnsO    = useRef(new Animated.Value(0)).current;
  const btnsY    = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo drops in
      Animated.parallel([
        Animated.spring(logoY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(logoO, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      // Hero text fades up
      Animated.parallel([
        Animated.timing(heroO, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(heroY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]),
      // Buttons slide up
      Animated.parallel([
        Animated.timing(btnsO, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(btnsY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Background gradient ── */}
      <LinearGradient
        colors={[C.surface, C.bg, C.warm + '80']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Decorative blobs ── */}
      <View style={s.blob1} />
      <View style={s.blob2} />
      <View style={s.blob3} />

      <SafeAreaView style={s.safe}>

        {/* ══ LOGO SECTION ══════════════════════ */}
        <Animated.View style={[s.logoSection, { opacity: logoO, transform: [{ translateY: logoY }] }]}>
          {/* Outer glow */}
          <View style={s.logoGlow}>
            {/* Logo circle */}
            <View style={s.logoCircle}>
              <View style={s.logoShine} />
              <Text style={s.logoLetters}>SF</Text>
            </View>
          </View>

          <Text style={s.brandName}>SmileFix</Text>
          <Text style={s.brandTagline}>ابتسامتك، أولويتنا</Text>
        </Animated.View>

        {/* ══ HERO TEXT ═════════════════════════ */}
        <Animated.View style={[s.heroSection, { opacity: heroO, transform: [{ translateY: heroY }] }]}>
          <Text style={s.heroTitle}>
            رعاية أسنانك{'\n'}في متناول يدك
          </Text>
          <Text style={s.heroSubtitle}>
            احجز مواعيدك، تابع علاجك، وتواصل مع طبيبك — كل ذلك من مكان واحد
          </Text>

          {/* Feature pills */}
          <View style={s.pillsRow}>
            {['حجز فوري ٢٤/٧', 'تذكير تلقائي', 'سجل طبي'].map((p) => (
              <View key={p} style={s.pill}>
                <Text style={s.pillText}>{p}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ══ BUTTONS ═══════════════════════════ */}
        <Animated.View style={[s.btnsSection, { opacity: btnsO, transform: [{ translateY: btnsY }] }]}>

          {/* Primary CTA */}
          <TouchableOpacity
            style={s.btnPrimary}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.82}
          >
            <LinearGradient
              colors={[C.teal, C.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.btnGradient}
            >
              <Text style={s.btnPrimaryText}>تسجيل جديد</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary CTA */}
          <TouchableOpacity
            style={s.btnSecondary}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.82}
          >
            <Text style={s.btnSecondaryText}>تسجيل الدخول</Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={s.terms}>
            بالمتابعة توافق على{' '}
            <Text style={s.termsLink}>شروط الاستخدام</Text>
            {' '}و{' '}
            <Text style={s.termsLink}>سياسة الخصوصية</Text>
          </Text>
        </Animated.View>

      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
  },

  // Blobs
  blob1: {
    position: 'absolute',
    width: 340, height: 340, borderRadius: 170,
    backgroundColor: C.teal + '18',
    top: -100, right: -80,
  },
  blob2: {
    position: 'absolute',
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.tealLight + '20',
    bottom: height * 0.28, left: -70,
  },
  blob3: {
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: C.warm,
    bottom: -50, right: -30,
    opacity: 0.7,
  },

  // Logo
  logoSection: { alignItems: 'center', paddingTop: 24 },
  logoGlow: {
    width: 112, height: 112, borderRadius: 56,
    backgroundColor: C.teal + '22',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  logoCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: C.teal,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 20,
    elevation: 8,
  },
  logoShine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '48%',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
  },
  logoLetters: {
    fontSize: 34,
    fontFamily: 'Manrope_700Bold',
    color: C.onTeal,
    letterSpacing: 1.5,
  },
  brandName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    color: C.blue,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandTagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: C.textSub,
    letterSpacing: 0.4,
  },

  // Hero
  heroSection: { alignItems: 'center', paddingHorizontal: 8 },
  heroTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 30,
    lineHeight: 44,
    color: C.blue,
    textAlign: 'center',
    marginBottom: 14,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: C.textSub,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    backgroundColor: C.secondary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: C.secText,
    letterSpacing: 0.2,
  },

  // Buttons
  btnsSection: { paddingBottom: 8 },
  btnPrimary: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  btnGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: C.white,
    letterSpacing: 0.3,
  },
  btnSecondary: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.tealLight,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  btnSecondaryText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 17,
    color: C.blue,
    letterSpacing: 0.2,
  },
  terms: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    fontFamily: 'Inter_600SemiBold',
    color: C.primary,
  },
});
