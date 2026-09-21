/**
 * MetricCard — shows a single metric with label, value, and unit
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { textStyles, fontWeights, fontSizes } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
  small?: boolean;
}

export function MetricCard({ label, value, unit, accent, small = false }: MetricCardProps) {
  return (
    <View style={[styles.container, small && styles.small]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, accent ? { color: accent } : {}]}>
          {value}
        </Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  small: {},
  label: {
    ...textStyles.labelSmall,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[1],
  },
  value: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  unit: {
    ...textStyles.bodySmall,
    color: colors.textTertiary,
  },
});
