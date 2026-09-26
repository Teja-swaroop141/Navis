/**
 * TunnelIndicator.tsx
 *
 * Dedicated visual indicator for the tunnel section:
 * - "Approaching GNSS-denied zone" advisory banner in #FAEDCB & Black
 * - In-tunnel active progress bar in Obsidian Black & #FAEDCB Cream
 * - Distance progress (e.g. 184 m / 320 m)
 * - Elapsed GNSS outage timer
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fontSizes, fontWeights } from '../theme/typography';
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
          <Feather name="alert-triangle" size={14} color={colors.brandCream} />
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
    borderWidth: 1.5,
  },
  advisoryContainer: {
    backgroundColor: colors.brandCream,
    borderColor: colors.brandCreamDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    ...shadows.sm,
  },
  advisoryIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advisoryTextWrap: {
    flex: 1,
  },
  advisoryTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.black,
    letterSpacing: 0.2,
  },
  advisorySubtitle: {
    fontSize: 10,
    color: colors.black,
    marginTop: 1,
    opacity: 0.85,
  },
  advisoryBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  advisoryBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.black,
  },

  tunnelActiveContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.brandCreamDark,
    borderRadius: radius['2xl'],
    gap: spacing[3],
    ...shadows.sm,
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
    backgroundColor: colors.brandCream,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.black,
  },
  tunnelPillText: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.black,
    letterSpacing: 0.8,
  },
  subText: {
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  timeGroup: {
    alignItems: 'flex-end',
  },
  timeLabel: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    letterSpacing: 0.6,
  },
  timeValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.black,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  progressBarBackground: {
    height: 7,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.brandCream,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricText: {
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  metricHighlight: {
    color: colors.black,
    fontWeight: fontWeights.bold,
  },
  percentText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.black,
    fontVariant: ['tabular-nums'],
  },
});
