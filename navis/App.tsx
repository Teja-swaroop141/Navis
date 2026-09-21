/**
 * App.tsx — Root application component
 *
 * Wraps the app with:
 * - NavigationProvider (global state machine)
 * - React Navigation container
 * - Safe area handling
 * - Gesture handler support
 */

import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, Animated, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationProvider } from './src/state/NavigationContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';
import { fontWeights, fontSizes } from './src/theme/typography';

// ─── Splash Screen ────────────────────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  const fade = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.85)).current;
  const textFade = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
      ]),
      Animated.timing(textFade, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(textFade, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => onDone());
  }, []);

  return (
    <View style={splashStyles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <Animated.View style={[splashStyles.logoContainer, { opacity: fade, transform: [{ scale }] }]}>
        <View style={splashStyles.logoCircle}>
          <Text style={splashStyles.logoIcon}>◈</Text>
        </View>
      </Animated.View>
      <Animated.View style={{ opacity: textFade, alignItems: 'center' }}>
        <Text style={splashStyles.appName}>NAVIS</Text>
        <Text style={splashStyles.tagline}>GNSS Dead Reckoning Navigation</Text>
      </Animated.View>
      <Animated.View style={[splashStyles.dotsRow, { opacity: textFade }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[splashStyles.dot, { opacity: 0.4 + i * 0.2 }]} />
        ))}
      </Animated.View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  logoContainer: { alignItems: 'center' },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  logoIcon: { fontSize: 48, color: colors.surface },
  appName: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.surface,
    letterSpacing: 8,
  },
  tagline: {
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1,
    marginTop: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
  },
});

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </NavigationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
