// ─────────────────────────────────────────────
// AnimatedModal — Smooth spring-driven modals
// Built with React Native's built-in Animated API
// (fully compatible with Expo Go, no native build needed)
//
// Enter: Animated.spring  — organic settle with slight overshoot
// Exit:  Animated.timing  — fast ease-in curve, never gets stuck
//
// Two variants:
//   'sheet'  — slides up from bottom
//   'center' — scale + fade (picker dialogs)
// ─────────────────────────────────────────────
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');

// ── Exit uses timing (not spring) so it never stalls ──────────────────────
const EXIT_DURATION = 240; // ms — fast enough to feel responsive
const EXIT_EASING   = Easing.in(Easing.quad); // accelerates away, no settling lag

// ── Enter spring config ────────────────────────────────────────────────────
const ENTER_SPRING = {
  damping:   26,
  stiffness: 220,
  mass:      0.85,
  useNativeDriver: true as const,
};

export interface AnimatedModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** 'sheet' = slides up from bottom (default). 'center' = scale + fade. */
  variant?: 'sheet' | 'center';
  containerStyle?: object;
}

export function AnimatedModal({
  visible,
  onClose,
  children,
  variant = 'sheet',
  containerStyle,
}: AnimatedModalProps) {
  const [modalVisible, setModalVisible] = useState(false);

  // Animated values — initialised to their "hidden" state
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const scale      = useRef(new Animated.Value(0.88)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  // Track the active animation so we can stop it before starting a new one
  const currentAnim = useRef<Animated.CompositeAnimation | null>(null);

  const stopCurrent = useCallback(() => {
    currentAnim.current?.stop();
    currentAnim.current = null;
  }, []);

  useEffect(() => {
    if (visible) {
      // ── ENTER ────────────────────────────────────────────────────────────
      // Mount the RN Modal immediately, then start the enter animation
      // after one frame so React has painted the initial layout.
      setModalVisible(true);
      stopCurrent();

      const frame = requestAnimationFrame(() => {
        if (variant === 'sheet') {
          const anim = Animated.parallel([
            Animated.timing(opacity, {
              toValue:         1,
              duration:        260,
              easing:          Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.spring(translateY, {
              toValue: 0,
              ...ENTER_SPRING,
            }),
          ]);
          currentAnim.current = anim;
          anim.start();
        } else {
          const anim = Animated.parallel([
            Animated.timing(opacity, {
              toValue:         1,
              duration:        260,
              easing:          Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.spring(scale, {
              toValue: 1,
              damping:   28,
              stiffness: 260,
              mass:      0.85,
              useNativeDriver: true,
            }),
          ]);
          currentAnim.current = anim;
          anim.start();
        }
      });

      return () => cancelAnimationFrame(frame);

    } else {
      // ── EXIT ─────────────────────────────────────────────────────────────
      // Use Animated.timing (NOT spring) so the exit has a guaranteed fixed
      // duration and never stalls waiting for the spring to "settle".
      stopCurrent();

      if (variant === 'sheet') {
        const anim = Animated.parallel([
          Animated.timing(opacity, {
            toValue:         0,
            duration:        EXIT_DURATION,
            easing:          EXIT_EASING,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue:         SCREEN_H,   // slide all the way off-screen
            duration:        EXIT_DURATION,
            easing:          EXIT_EASING,
            useNativeDriver: true,
          }),
        ]);
        currentAnim.current = anim;
        anim.start(() => {
          // Always unmount — don't gate on `finished` (interrupted anims
          // return false but we still want to close)
          setModalVisible(false);
          // Pre-reset so the next open starts from the hidden position
          translateY.setValue(SCREEN_H);
          opacity.setValue(0);
        });

      } else {
        const anim = Animated.parallel([
          Animated.timing(opacity, {
            toValue:         0,
            duration:        EXIT_DURATION,
            easing:          EXIT_EASING,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue:         0.88,
            duration:        EXIT_DURATION,
            easing:          EXIT_EASING,
            useNativeDriver: true,
          }),
        ]);
        currentAnim.current = anim;
        anim.start(() => {
          setModalVisible(false);
          scale.setValue(0.88);
          opacity.setValue(0);
        });
      }
    }
  }, [visible]);

  // Nothing to render if both states are false
  if (!modalVisible && !visible) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Dimmed overlay — tap to dismiss */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlayBg, { opacity }]} />
      </Pressable>

      {variant === 'sheet' ? (
        <Animated.View
          style={[styles.sheetContainer, { transform: [{ translateY }] }]}
          pointerEvents="box-none"
        >
          {/* Pressable absorbs taps so they don't bubble to the overlay */}
          <Pressable onPress={() => {}} style={styles.sheetPressable}>
            <View style={[styles.sheetInner, containerStyle]}>
              {children}
            </View>
          </Pressable>
        </Animated.View>
      ) : (
        <View style={styles.centerWrapper} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.centerContainer,
              containerStyle,
              { opacity, transform: [{ scale }] },
            ]}
          >
            <Pressable onPress={() => { /* absorb */ }}>
              {children}
            </Pressable>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayBg: {
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  sheetContainer: {
    // Anchored firmly to the bottom edge — never centred
    position: 'absolute',
    bottom:   0,
    left:     0,
    right:    0,
    // Cap at 92% of screen height so it never fully covers the screen
    maxHeight: SCREEN_H * 0.92,
  },
  // The Pressable must fill the Animated.View width
  sheetPressable: {
    width: '100%',
  },
  // Inner wrapper lets the content grow naturally up to maxHeight
  sheetInner: {
    width: '100%',
  },
  centerWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent:  'center',
    alignItems:      'center',
    paddingHorizontal: 20,
  },
  centerContainer: {
    width: '100%',
  },
});
