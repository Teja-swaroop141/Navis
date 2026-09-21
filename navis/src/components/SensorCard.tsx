/**
 * SensorCard — displays one type of sensor reading (accel, gyro, mag, etc.)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { textStyles, fontWeights, fontSizes } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { Vec3 } from '../types';

interface SensorCardProps {
  title: string;
  unit: string;
  data: Vec3 | { heading: number; direction?: string } | null;
  color?: string;
  isActive?: boolean;
}

export function SensorCard({ title, unit, data, color = colors.primary, isActive = true }: SensorCardProps) {
  const isVec3 = data && 'x' in data;
  const isHeading = data && 'heading' in data;

  const formatVal = (v: number) => v.toFixed(2);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: isActive ? colors.gnssActive : colors.gray300 }]} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>

      {isVec3 && data && 'x' in data && (
        <View style={styles.axisRow}>
          {(['x', 'y', 'z'] as const).map((axis) => (
            <View key={axis} style={styles.axisItem}>
              <Text style={[styles.axisLabel, { color }]}>{axis.toUpperCase()}</Text>
              <Text style={styles.axisValue}>{formatVal((data as Vec3)[axis])}</Text>
            </View>
          ))}
        </View>
      )}

      {isHeading && data && 'heading' in data && (
        <View style={styles.headingContainer}>
          <Text style={[styles.headingValue, { color }]}>
            {(data as { heading: number }).heading.toFixed(1)}°
          </Text>
          {'direction' in data && (
            <Text style={styles.directionLabel}>{(data as { direction: string }).direction}</Text>
          )}
        </View>
      )}
    </View>
  );
}

function headingToDirection(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export { headingToDirection };

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  title: {
    ...textStyles.labelMedium,
    color: colors.textPrimary,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  unit: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisItem: {
    alignItems: 'center',
    flex: 1,
    gap: spacing[1],
  },
  axisLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  axisValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headingContainer: {
    alignItems: 'center',
    gap: spacing[1],
  },
  headingValue: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: -1,
  },
  directionLabel: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
  },
});
