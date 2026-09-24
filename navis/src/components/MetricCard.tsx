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
      <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, accent ? { color: accent } : {}]} numberOfLines={1}>
          {value}
        </Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 68,
    gap: 2,
    alignItems: 'center',
  },
  small: {
    minWidth: 54,
  },
  label: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  value: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  unit: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
  },
});
