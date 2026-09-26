/**
 * SimulationStatus.tsx
 *
 * Polished status panel reflecting the exact state transitions:
 * - IDLE: "Ready to begin", Route overview
 * - GNSS ACTIVE: "GNSS NAVIGATION", satellite fix
 * - DEAD RECKONING ACTIVE (Inside Tunnel):
 *   Resilient purple/indigo panel with GNSS LOST, IMU ACTIVE, Speed, Heading, DR Distance,
 *   Time Without GNSS, Position Source: INERTIAL ESTIMATE
 * - POSITION RECOVERY (Tunnel Exit):
 *   GNSS Restored, DR + GNSS sensor fusion convergence animation
 * - FUSED / COMPLETED: GNSS + IMU fused highway navigation
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fontSizes, fontWeights, textStyles } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { SimulationFrame } from '../services/simulationEngine';

interface SimulationStatusProps {
  frame: SimulationFrame;
  isPresentationMode: boolean;
}

export function SimulationStatus({ frame, isPresentationMode }: SimulationStatusProps) {
  const {
    state,
    carSpeedKmh,
    carHeading,
    routeProgressPercent,
    gnssStatusText,
    imuStatusText,
    navigationModeText,
    positionSource,
    isInsideTunnel,
    tunnelDrivenMeters,
    timeWithoutGNSSSec,
    drDisplacementMeters,
    totalDrivenMeters,
  } = frame;

  // ─── 1. IDLE State Before Simulation Starts ───────────────────────────────
  if (state === 'IDLE') {
    return (
      <View style={styles.idleCard}>
        <View style={styles.idleHeaderRow}>
          <View>
            <Text style={styles.idleSuperTitle}>GNSS SIMULATION</Text>
            <Text style={styles.idleTitle}>Ready to begin</Text>
          </View>
          <View style={styles.gnssAvailableBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.gnssAvailableText}>GNSS AVAILABLE</Text>
          </View>
        </View>

        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>Route Scenario</Text>
          <View style={styles.routePathWrap}>
            <Text style={styles.routeStepActive}>Normal Road</Text>
            <Text style={styles.routeArrow}>→</Text>
            <Text style={styles.routeStepTunnel}>Tunnel (Outage)</Text>
            <Text style={styles.routeArrow}>→</Text>
            <Text style={styles.routeStepActive}>Normal Road (Fused)</Text>
          </View>
        </View>
      </View>
    );
  }

  // ─── 2. DEAD RECKONING ACTIVE Inside Tunnel ───────────────────────────────
  if (isInsideTunnel || state === 'GNSS_LOST') {
    const formattedOutageTime = `00:${String(Math.floor(timeWithoutGNSSSec)).padStart(2, '0')}`;

    return (
      <View style={styles.drContainer}>
        {/* Banner */}
        <View style={styles.drHeaderRow}>
          <View style={styles.drTitleBadge}>
            <View style={styles.drPulsingDot} />
            <Text style={styles.drTitleText}>DEAD RECKONING ACTIVE</Text>
          </View>
          <View style={styles.sourcePill}>
            <Text style={styles.sourcePillText}>INERTIAL ESTIMATE</Text>
          </View>
        </View>

        {/* Status Line: GNSS LOST | IMU ACTIVE */}
        <View style={styles.sensorsRow}>
          <View style={styles.sensorItem}>
            <Text style={styles.sensorLabel}>GNSS</Text>
            <View style={styles.sensorStatusWrap}>
              <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.sensorStatusVal, { color: '#DC2626' }]}>LOST</Text>
            </View>
          </View>

          <View style={styles.sensorDivider} />

          <View style={styles.sensorItem}>
            <Text style={styles.sensorLabel}>IMU / INS</Text>
            <View style={styles.sensorStatusWrap}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.sensorStatusVal, { color: '#059669' }]}>ACTIVE</Text>
            </View>
          </View>

          <View style={styles.sensorDivider} />

          <View style={styles.sensorItem}>
            <Text style={styles.sensorLabel}>TIME W/O GNSS</Text>
            <Text style={[styles.sensorStatusVal, { color: '#7C3AED' }]}>{formattedOutageTime}</Text>
          </View>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricBoxLabel}>SPEED</Text>
            <Text style={styles.metricBoxVal}>{carSpeedKmh.toFixed(1)} <Text style={styles.metricUnit}>km/h</Text></Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricBoxLabel}>HEADING</Text>
            <Text style={styles.metricBoxVal}>{Math.round(carHeading)}°</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricBoxLabel}>DR DISTANCE</Text>
            <Text style={styles.metricBoxVal}>{tunnelDrivenMeters} <Text style={styles.metricUnit}>m</Text></Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricBoxLabel}>EST. DRIFT</Text>
            <Text style={styles.metricBoxVal}>±{drDisplacementMeters.toFixed(1)} <Text style={styles.metricUnit}>m</Text></Text>
          </View>
        </View>
      </View>
    );
  }

  // ─── 3. POSITION RECOVERY When Exiting Tunnel ──────────────────────────────
  if (state === 'TUNNEL_EXIT' || state === 'GNSS_RECOVERING') {
    return (
      <View style={styles.recoveryContainer}>
        <View style={styles.recoveryHeader}>
          <View style={styles.recoveryBadge}>
            <View style={styles.recoveryDot} />
            <Text style={styles.recoveryBadgeText}>POSITION RECOVERY</Text>
          </View>
          <Text style={styles.recoverySub}>GNSS Signal Restored • Fusing Trajectories</Text>
        </View>

        {/* Fusion Equation Visual */}
        <View style={styles.fusionEquationWrap}>
          <View style={styles.fusionBlock}>
            <Text style={styles.fusionBlockTitle}>DR POSITION</Text>
            <Text style={styles.fusionBlockSub}>Inertial Vector</Text>
          </View>
          <Text style={styles.fusionOp}>+</Text>
          <View style={styles.fusionBlock}>
            <Text style={styles.fusionBlockTitle}>GNSS FIX</Text>
            <Text style={styles.fusionBlockSub}>Satellite Nav</Text>
          </View>
          <Text style={styles.fusionOp}>→</Text>
          <View style={[styles.fusionBlock, styles.fusionBlockActive]}>
            <Text style={styles.fusionBlockTitleActive}>FUSED</Text>
            <Text style={styles.fusionBlockSubActive}>Centerline</Text>
          </View>
        </View>

        <View style={styles.liveMetricsStrip}>
          <Text style={styles.stripMetric}>Speed: <Text style={styles.stripBold}>{carSpeedKmh.toFixed(1)} km/h</Text></Text>
          <Text style={styles.stripDivider}>•</Text>
          <Text style={styles.stripMetric}>Correcting: <Text style={styles.stripBold}>Smooth Animation</Text></Text>
        </View>
      </View>
    );
  }

  // ─── 4. NORMAL RUNNING STATE (GNSS_ACTIVE, FUSED, or STARTING) ────────────
  const isFusedMode = state === 'FUSED' || state === 'COMPLETED';
  const badgeColor = isFusedMode ? colors.black : colors.primary;
  const badgeSurface = isFusedMode ? colors.brandCream : colors.primarySurface;

  return (
    <View style={styles.normalContainer}>
      <View style={styles.normalHeaderRow}>
        <View style={styles.modeWrap}>
          <View style={[styles.modeBadge, { backgroundColor: badgeSurface }]}>
            <View style={[styles.statusDot, { backgroundColor: badgeColor }]} />
            <Text style={[styles.modeText, { color: badgeColor }]}>{navigationModeText}</Text>
          </View>
          <Text style={styles.sourceText}>Source: {positionSource}</Text>
        </View>

        <View style={styles.gnssStatusIndicator}>
          <Text style={styles.gnssIndicatorLabel}>GNSS</Text>
          <View style={styles.gnssActivePill}>
            <View style={styles.greenDot} />
            <Text style={styles.gnssActivePillText}>ACTIVE</Text>
          </View>
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricBoxLabel}>SPEED</Text>
          <Text style={styles.metricBoxVal}>{carSpeedKmh.toFixed(1)} <Text style={styles.metricUnit}>km/h</Text></Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricBoxLabel}>HEADING</Text>
          <Text style={styles.metricBoxVal}>{Math.round(carHeading)}°</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricBoxLabel}>DISTANCE</Text>
          <Text style={styles.metricBoxVal}>{totalDrivenMeters} <Text style={styles.metricUnit}>m</Text></Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricBoxLabel}>ACCURACY</Text>
          <Text style={styles.metricBoxVal}>{isFusedMode ? '0.8 m' : '1.4 m'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // IDLE State
  idleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  idleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  idleSuperTitle: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  idleTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  gnssAvailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandCream,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  gnssAvailableText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.black,
    letterSpacing: 0.4,
  },
  routeRow: {
    backgroundColor: colors.lavender,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: 6,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  routePathWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  routeStepActive: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.primaryDark,
  },
  routeStepTunnel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.black,
    backgroundColor: colors.brandCream,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  routeArrow: {
    fontSize: 11,
    color: colors.textTertiary,
  },

  // Dead Reckoning Panel
  drContainer: {
    backgroundColor: colors.black,
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.brandCream,
    ...shadows.md,
  },
  drHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandCream,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 6,
    ...shadows.sm,
  },
  drPulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.black,
  },
  drTitleText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.black,
    letterSpacing: 0.8,
  },
  sourcePill: {
    backgroundColor: colors.brandCream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  sourcePillText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.black,
    letterSpacing: 0.5,
  },
  sensorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sensorItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  sensorLabel: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    letterSpacing: 0.6,
  },
  sensorStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sensorStatusVal: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.3,
  },
  sensorDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.borderLight,
  },

  // Recovery Panel
  recoveryContainer: {
    backgroundColor: colors.brandCream,
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.brandCreamDark,
    ...shadows.md,
  },
  recoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recoveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 6,
  },
  recoveryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brandCream,
  },
  recoveryBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.surface,
    letterSpacing: 0.6,
  },
  recoverySub: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.black,
  },
  fusionEquationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing[2],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  fusionBlock: {
    alignItems: 'center',
    flex: 1,
  },
  fusionBlockTitle: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  fusionBlockSub: {
    fontSize: 8,
    color: colors.textTertiary,
  },
  fusionOp: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    paddingHorizontal: 2,
  },
  fusionBlockActive: {
    backgroundColor: colors.brandCream,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  fusionBlockTitleActive: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: colors.black,
  },
  fusionBlockSubActive: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.black,
  },
  liveMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  stripMetric: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  stripBold: {
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  stripDivider: {
    color: colors.textTertiary,
  },

  // Normal / GNSS Active Container
  normalContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  normalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeWrap: {
    gap: 3,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 6,
    alignSelf: 'flex-start',
  },
  modeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 0.6,
  },
  sourceText: {
    fontSize: 10,
    color: colors.textTertiary,
    marginLeft: 4,
  },
  gnssStatusIndicator: {
    alignItems: 'flex-end',
    gap: 2,
  },
  gnssIndicatorLabel: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  gnssActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandCream,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 5,
  },
  gnssActivePillText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.black,
  },

  // Shared Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricBoxLabel: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    letterSpacing: 0.6,
  },
  metricBoxVal: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  metricUnit: {
    fontSize: 9,
    fontWeight: fontWeights.normal,
    color: colors.textTertiary,
  },
});
