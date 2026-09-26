/**
 * StatusBadge — High-contrast pill showing current navigation mode in #FAEDCB, Black, and White
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { textStyles, fontWeights } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import { NavigationMode } from '../types';

interface StatusBadgeProps {
  mode: NavigationMode;
  small?: boolean;
}

const modeConfig: Record<NavigationMode, { label: string; color: string; surface: string; dot: string; border: string }> = {
  GNSS_ACTIVE: { label: 'GNSS ACTIVE', color: colors.black, surface: colors.brandCream, dot: colors.black, border: colors.brandCreamDark },
  GNSS_LOST: { label: 'GNSS LOST', color: colors.white, surface: colors.black, dot: colors.brandCream, border: colors.black },
  DEAD_RECKONING: { label: 'DEAD RECKONING', color: colors.black, surface: colors.brandCream, dot: colors.black, border: colors.brandCreamDark },
  GNSS_RECOVERING: { label: 'RECOVERING', color: colors.black, surface: colors.brandCreamLight, dot: colors.black, border: colors.brandCream },
  FUSED: { label: 'FUSED', color: colors.black, surface: colors.brandCream, dot: colors.black, border: colors.brandCreamDark },
};

export function StatusBadge({ mode, small = false }: StatusBadgeProps) {
  const config = modeConfig[mode] || modeConfig.GNSS_ACTIVE;
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
    <View
      style={[
        styles.badge,
        { backgroundColor: config.surface, borderColor: config.border },
        small && styles.small,
      ]}
    >
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
    borderWidth: 1,
  },
  small: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  label: {
    ...textStyles.labelSmall,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 0.8,
  },
  labelSmall: {
    fontSize: 9,
  },
});
