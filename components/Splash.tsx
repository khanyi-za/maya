import * as SplashScreen from 'expo-splash-screen';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/lib/auth-store';

// Branded boot splash — full-bleed store photo with the YIIVA lockup.
// Two modes, decided by the auth session (Superbalist-style welcome gate,
// owner call 2026-09-08):
//
// - SIGNED IN: timed splash — holds HOLD_MS then fades into the app.
// - GUEST (no session): the splash becomes the welcome gate — no timer, it
//   stays up offering Create account / Sign in / Continue as guest. The
//   auth actions navigate first and then fade the splash out over the
//   pushed screen; "Continue as guest" just fades into the app.
// - While the cold-start session is still resolving, neither happens: the
//   photo + lockup hold until the store settles (resolution is fast — a
//   secure-store read plus at most one refresh call).
//
// The NATIVE splash (app.json expo-splash-screen plugin) is a matching
// lockup-on-brown frame; we hide it the moment this JS splash lays out.

const HOLD_MS = 2700; // signed-in hold before fading (owner call, 2026-09-08)
const FADE_MS = 350;
const GATE_FADE_IN_MS = 400;

export function Splash({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.state.status);

  const opacity = useRef(new Animated.Value(1)).current;
  const gateOpacity = useRef(new Animated.Value(0)).current;
  const [holdDone, setHoldDone] = useState(false);
  const leaving = useRef(false);

  // The signed-in clock starts at mount so hydration time counts toward the
  // hold — the user perceives one continuous 2.7s splash, not 2.7s stacked
  // on top of however long the session refresh took.
  useEffect(() => {
    const timer = setTimeout(() => setHoldDone(true), HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  const fadeOut = () => {
    if (leaving.current) return;
    leaving.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start(() => onDone());
  };

  // Signed in: leave once both the hold has elapsed and the session is known.
  useEffect(() => {
    if (status === 'authenticated' && holdDone) fadeOut();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, holdDone]);

  // Guest: reveal the gate actions (no timer — the splash waits for a choice).
  useEffect(() => {
    if (status === 'guest' && !leaving.current) {
      Animated.timing(gateOpacity, {
        toValue: 1,
        duration: GATE_FADE_IN_MS,
        useNativeDriver: true,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const gateVisible = status === 'guest';

  const goTo = (path: '/auth/register' | '/auth/login') => {
    if (leaving.current) return;
    router.push(path);
    fadeOut();
  };

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, { opacity, zIndex: 100 }]}
      onLayout={() => {
        // JS splash is on screen — release the native one underneath.
        SplashScreen.hideAsync().catch(() => {});
      }}
      pointerEvents={gateVisible ? 'auto' : 'none'}
    >
      <Image
        source={require('@/assets/images/Yiiva-load.jpg')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      {/* Light scrim so the white lockup stays legible on the photo. */}
      <View style={[StyleSheet.absoluteFillObject, styles.scrim]} />
      {/* Bottom gradient seats the gate actions into the photo (and deepens
          the timed splash's ground a touch — same treatment both modes). */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={styles.bottomShade}
      />

      {/* Brand block — rule + lockup (editorial, per the inspo). */}
      <View style={styles.center}>
        <View style={styles.rule} />
        <Image
          source={require('@/assets/images/ICON_WHITE.png')}
          style={styles.wordmark}
          resizeMode="contain"
        />
      </View>

      {gateVisible && (
        <Animated.View
          style={[
            styles.gate,
            { opacity: gateOpacity, paddingBottom: insets.bottom + 64 },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.primaryBtn}
            onPress={() => goTo('/auth/register')}
          >
            <Text style={styles.primaryText}>CREATE ACCOUNT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.secondaryBtn}
            onPress={() => goTo('/auth/login')}
          >
            <Text style={styles.secondaryText}>SIGN IN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.guestBtn}
            onPress={fadeOut}
          >
            <Text style={styles.guestText}>Continue as Guest</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(0, 0, 0, 0.25)' },
  bottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 420,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  rule: {
    width: 56,
    height: 4,
    backgroundColor: '#ffffff',
  },
  wordmark: { width: 210, height: 60 },
  gate: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 0,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#ffffff',
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(10,10,10,0.55)',
    borderWidth: 1.25,
    borderColor: '#ffffff',
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  guestBtn: { alignItems: 'center', paddingVertical: 6 },
  guestText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
