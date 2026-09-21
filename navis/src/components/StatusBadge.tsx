/**
 * StatusBadge — colored pill showing current navigation mode
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { textStyles } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import { NavigationMode } from '../types';

interface StatusBadgeProps {
  mode: NavigationMode;
  small?: boolean;
}

const modeConfig: Record<NavigationMode, { label: string; color: string; surface: string; dot: string }> = {
  GNSS_ACTIVE: { label: 'GNSS ACTIVE', color: colors.gnssActive, surface: colors.gnssActiveSurface, dot: colors.gnssActive },
  GNSS_LOST: { label: 'GNSS LOST', color: colors.gnssLost, surface: colors.gnssLostSurface, dot: colors.gnssLost },
  DEAD_RECKONING: { label: 'DEAD RECKONING', color: colors.deadReckoning, surface: colors.deadReckoningSurface, dot: colors.deadReckoning },
  GNSS_RECOVERING: { label: 'RECOVERING', color: colors.recovering, surface: colors.secondarySurface, dot: colors.recovering },
  FUSED: { label: 'FUSED', color: colors.fused, surface: colors.fusedSurface, dot: colors.fused },
};

export function StatusBadge({ mode, small = false }: StatusBadgeProps) {
  const config = modeConfig[mode];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (mode === 'DEAD_RECKONING' || mode === 'GNSS_RECOVERING') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [mode]);

  return (
    <View style={[styles.badge, { backgroundColor: config.surface }, small && styles.small]}>
      <Animated.View style={[styles.dot, { backgroundColor: config.dot, opacity: pulseAnim }]} />
      <Text style={[styles.label, { color: config.color }, small && styles.labelSmall]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2] - 2,
    borderRadius: radius.full,
    gap: spacing[2],
  },
  small: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  label: {
    ...textStyles.labelSmall,
    letterSpacing: 0.8,
  },
  labelSmall: {
    fontSize: 10,
  },
});
