/**
 * GlassCard — Premium floating card with soft shadow and optional blur
 */

import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { radius, shadows, spacing } from '../theme/spacing';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  elevated?: boolean;
}

export function GlassCard({ children, style, padding = spacing[5], elevated = false }: GlassCardProps) {
  return (
    <View style={[styles.card, elevated && styles.elevated, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  elevated: {
    ...shadows.lg,
    backgroundColor: colors.surface,
  },
});
