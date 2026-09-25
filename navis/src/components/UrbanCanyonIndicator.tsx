/**
 * UrbanCanyonIndicator.tsx
 *
 * Approach banner and in-canyon progress — parallel to TunnelIndicator,
 * without sharing tunnel-specific copy or GNSS-lost messaging.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fontSizes, fontWeights } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';

interface UrbanCanyonIndicatorProps {
  isApproaching: boolean;
  isInsideCanyon: boolean;
  canyonProgressPercent: number;
  canyonDrivenMeters: number;
  canyonLengthMeters: number;
  liveStatus: string;
}

export function UrbanCanyonIndicator({
  isApproaching,
  isInsideCanyon,
  canyonProgressPercent,
  canyonDrivenMeters,
  canyonLengthMeters,
  liveStatus,
}: UrbanCanyonIndicatorProps) {
  if (!isApproaching && !isInsideCanyon) {
    return null;
  }

  if (isApproaching && !isInsideCanyon) {
    return (
      <View style={styles.advisory}>
        <View style={styles.advisoryDot} />
        <View style={styles.advisoryTextWrap}>
          <Text style={styles.advisoryTitle}>APPROACHING URBAN CANYON</Text>
          <Text style={styles.advisorySubtitle}>Tall structures ahead • GNSS will degrade, not drop out</Text>
        </View>
      </View>
    );
  }

  const clampedPercent = Math.min(100, Math.max(0, canyonProgressPercent));

  return (
    <View style={[styles.container, styles.activeContainer]}>
      <View style={styles.headerRow}>
        <View style={styles.canyonPill}>
          <View style={styles.pillDot} />
          <Text style={styles.pillText}>URBAN CANYON</Text>
        </View>
        <Text style={styles.liveStatus}>{liveStatus}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${clampedPercent}%` }]} />
      </View>

      <Text style={styles.metricLine}>
        Canyon Progress: <Text style={styles.metricHighlight}>{canyonDrivenMeters} m</Text> / {canyonLengthMeters} m
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  advisory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: '#FFFBEB',
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: spacing[2],
  },
  advisoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  advisoryTextWrap: { flex: 1 },
  advisoryTitle: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: '#B45309',
    letterSpacing: 0.8,
  },
  advisorySubtitle: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
  },
  container: {
    marginBottom: spacing[2],
  },
  activeContainer: {
    backgroundColor: '#FAF5FF',
    borderRadius: radius.lg,
    padding: spacing[3],
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    gap: 8,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  canyonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 6,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FDE68A',
  },
  pillText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.surface,
    letterSpacing: 0.7,
  },
  liveStatus: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#6D28D9',
    letterSpacing: 0.3,
    maxWidth: '52%',
    textAlign: 'right',
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#EDE9FE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  metricLine: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  metricHighlight: {
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
});
