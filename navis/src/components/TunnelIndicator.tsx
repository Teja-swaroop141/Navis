/**
 * TunnelIndicator.tsx
 *
 * Dedicated visual indicator for the tunnel section:
 * - "Approaching GNSS-denied zone" advisory banner
 * - In-tunnel active progress bar: ████████░░░░░░ 62%
 * - Distance progress (e.g. 184 m / 320 m)
 * - Elapsed GNSS outage timer
 * - Resilient subtle purple/indigo/amber aesthetics
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { fontSizes, fontWeights, textStyles } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';

interface TunnelIndicatorProps {
  isApproaching: boolean;
  isInsideTunnel: boolean;
  tunnelProgressPercent: number; // 0 - 100
  tunnelDrivenMeters: number;
  tunnelLengthMeters: number;
  timeWithoutGNSSSec: number;
}

export function TunnelIndicator({
  isApproaching,
  isInsideTunnel,
  tunnelProgressPercent,
  tunnelDrivenMeters,
  tunnelLengthMeters,
  timeWithoutGNSSSec,
}: TunnelIndicatorProps) {
  if (!isApproaching && !isInsideTunnel) {
    return null;
  }

  // Pre-tunnel advisory banner
  if (isApproaching && !isInsideTunnel) {
    return (
      <View style={[styles.container, styles.advisoryContainer]}>
        <View style={styles.advisoryIconCircle}>
          <Text style={styles.advisoryIcon}>⚠</Text>
        </View>
        <View style={styles.advisoryTextWrap}>
          <Text style={styles.advisoryTitle}>Approaching GNSS-Denied Zone</Text>
          <Text style={styles.advisorySubtitle}>Broadway Tunnel • Dead Reckoning will engage upon entry</Text>
        </View>
        <View style={styles.advisoryBadge}>
          <Text style={styles.advisoryBadgeText}>~120 m</Text>
        </View>
      </View>
    );
  }

  // Active tunnel progress display
  const formattedTime = `00:${String(Math.floor(timeWithoutGNSSSec)).padStart(2, '0')}`;
  const clampedPercent = Math.min(100, Math.max(0, tunnelProgressPercent));

  return (
    <View style={[styles.container, styles.tunnelActiveContainer]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.tunnelPill}>
            <View style={styles.pulsingDot} />
            <Text style={styles.tunnelPillText}>TUNNEL TRANSIT</Text>
          </View>
          <Text style={styles.subText}>Underground GNSS Denied Zone</Text>
        </View>

        <View style={styles.timeGroup}>
          <Text style={styles.timeLabel}>WITHOUT GNSS</Text>
          <Text style={styles.timeValue}>{formattedTime}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${clampedPercent}%` }]} />
      </View>

      {/* Footer Metrics */}
      <View style={styles.footerRow}>
        <Text style={styles.metricText}>
          Tunnel Progress: <Text style={styles.metricHighlight}>{tunnelDrivenMeters} m</Text> / {tunnelLengthMeters} m
        </Text>
        <Text style={styles.percentText}>{clampedPercent}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 1,
  },
  advisoryContainer: {
    backgroundColor: '#FEF9C3', // Subtle yellow/amber
    borderColor: '#FDE047',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    ...shadows.sm,
  },
  advisoryIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  advisoryIcon: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  advisoryTextWrap: {
    flex: 1,
  },
  advisoryTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: '#92400E',
    letterSpacing: 0.2,
  },
  advisorySubtitle: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 1,
  },
  advisoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.md,
  },
  advisoryBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#92400E',
  },

  tunnelActiveContainer: {
    backgroundColor: '#2D1B69', // Deep royal indigo/purple
    borderColor: '#4C1D95',
    gap: spacing[2],
    ...shadows.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    gap: 2,
  },
  tunnelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  tunnelPillText: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: '#FDE68A',
    letterSpacing: 0.8,
  },
  subText: {
    fontSize: 10,
    color: '#C4B5FD',
    letterSpacing: 0.2,
  },
  timeGroup: {
    alignItems: 'flex-end',
  },
  timeLabel: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: '#DDD6FE',
    letterSpacing: 0.6,
  },
  timeValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.surface,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  progressBarBackground: {
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B', // Amber progress inside tunnel
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricText: {
    fontSize: 10,
    color: '#DDD6FE',
    letterSpacing: 0.2,
  },
  metricHighlight: {
    color: colors.surface,
    fontWeight: fontWeights.bold,
  },
  percentText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#FDE68A',
    fontVariant: ['tabular-nums'],
  },
});
