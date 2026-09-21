/**
 * StatusIndicator — small inline "● label" indicator with color
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { textStyles } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface StatusIndicatorProps {
  label: string;
  active?: boolean;
  color?: string;
  pulse?: boolean;
}

export function StatusIndicator({ label, active = true, color, pulse = false }: StatusIndicatorProps) {
  const dotColor = color ?? (active ? colors.gnssActive : colors.gray300);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pulse && active) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [pulse, active]);

  return (
    <View style={styles.row}>
      <Animated.View style={[styles.dot, { backgroundColor: dotColor, opacity: pulseAnim }]} />
      <Text style={[styles.label, { color: active ? colors.textPrimary : colors.textTertiary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  label: {
    ...textStyles.bodySmall,
    fontWeight: '500',
  },
});
