import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

// Branded boot splash — full-bleed store photo with an azure wash and the
// YIIVA wordmark. Replaces the Expo template placeholder ("atrocious" per the
// owner, 2026-09-05). Rendered as a top-level overlay by app/_layout while the
// app boots, then fades itself out and calls onDone so the layout unmounts it.
//
// The NATIVE splash (app.json expo-splash-screen plugin) is configured to a
// deep-blue ground + white wordmark so it dissolves into this screen; we hide
// it the moment this JS splash lays out.

const HOLD_MS = 2700; // how long the splash stays before fading (owner call, 2026-09-08)
const FADE_MS = 350;

export function Splash({ onDone }: { onDone: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => onDone());
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [opacity, onDone]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, { opacity, zIndex: 100 }]}
      onLayout={() => {
        // JS splash is on screen — release the native one underneath.
        SplashScreen.hideAsync().catch(() => {});
      }}
      pointerEvents="none"
    >
      <Image
        source={require('@/assets/images/Yiiva-load.jpg')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      {/* Light scrim so the white wordmark stays legible on the photo. */}
      <View style={[StyleSheet.absoluteFillObject, styles.scrim]} />
      <View style={styles.center}>
        <Image
          source={require('@/assets/images/ICON_WHITE.png')}
          style={styles.wordmark}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(0, 0, 0, 0.25)' },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { width: 190, height: 55 },
});
