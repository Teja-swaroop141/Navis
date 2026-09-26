/**
 * App.tsx — Root application component
 *
 * Wraps the app with:
 * - NavigationProvider (global state machine)
 * - React Navigation container
 * - Safe area handling
 * - Gesture handler support
 * - Professional #FAEDCB / White / Black Splash Screen & Theme
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
import { NavisLogo } from './src/components/NavisLogo';

// ─── Professional Splash Screen ───────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  const fade = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.9)).current;
  const textFade = React.useRef(new Animated.Value(0)).current;
  const pulse = React.useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Pulse animation for the emblem ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.95, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 70, friction: 9 }),
      ]),
      Animated.timing(textFade, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(textFade, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => onDone());
  }, []);

  return (
    <View style={splashStyles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.brandCream} />
      
      {/* Background radial-like halo */}
      <Animated.View
        style={[
          splashStyles.halo,
          {
            transform: [{ scale: pulse }],
            opacity: fade,
          },
        ]}
      />

      {/* Main Logo Container */}
      <Animated.View style={[splashStyles.logoContainer, { opacity: fade, transform: [{ scale }] }]}>
        <View style={splashStyles.logoWrapper}>
          <NavisLogo size="xl" variant="light" showText={false} />
        </View>
      </Animated.View>

      {/* Brand Text Section */}
      <Animated.View style={[splashStyles.textSection, { opacity: textFade }]}>
        <Text style={splashStyles.appName}>NAVIS</Text>
        <View style={splashStyles.badge}>
          <Text style={splashStyles.badgeText}>DEAD RECKONING ENGINE</Text>
        </View>
        <Text style={splashStyles.tagline}>Precision Inertial Navigation System</Text>
      </Animated.View>

      {/* Elegant Loading Dots */}
      <Animated.View style={[splashStyles.dotsRow, { opacity: textFade }]}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              splashStyles.dot,
              {
                backgroundColor: i === 1 ? colors.black : 'rgba(26, 26, 26, 0.35)',
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brandCream,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    padding: 12,
    borderRadius: 36,
    backgroundColor: colors.black,
    borderWidth: 1.5,
    borderColor: colors.brandCreamDark,
    shadowColor: 'rgba(100, 80, 30, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  textSection: {
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.black,
    letterSpacing: 10,
    marginLeft: 10,
  },
  badge: {
    backgroundColor: colors.black,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.brandCream,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: fontSizes.xs,
    color: 'rgba(26, 26, 26, 0.55)',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
