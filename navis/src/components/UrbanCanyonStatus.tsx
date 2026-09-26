/**
 * UrbanCanyonStatus.tsx
 *
 * Live status, metrics, error comparison, and GNSS vs IMU contribution
 * for the Urban Canyon GNSS Degradation scenario.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fontSizes, fontWeights } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { UrbanCanyonFrame } from '../services/urbanCanyonEngine';

interface UrbanCanyonStatusProps {
  frame: UrbanCanyonFrame;
  isPresentationMode: boolean;
}

function ErrorBar({ label, meters, maxMeters, color }: { label: string; meters: number; maxMeters: number; color: string }) {
  const pct = Math.min(100, Math.max(6, (meters / maxMeters) * 100));
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label}>{label}</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[barStyles.value, { color }]}>{meters.toFixed(1)} m</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    width: 58,
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    letterSpacing: 0.4,
  },
  track: {
    flex: 1,
    height: 7,
    backgroundColor: colors.gray100,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  value: {
    width: 48,
    fontSize: 10,
    fontWeight: fontWeights.bold,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});

export function UrbanCanyonStatus({ frame, isPresentationMode }: UrbanCanyonStatusProps) {
  const degraded = frame.state === 'GNSS_DEGRADED' || frame.state === 'NAVIS_ESTIMATION';
  const recovering = frame.state === 'EXIT_RECOVERY' || frame.state === 'GNSS_RECOVERING';

  if (frame.state === 'IDLE') {
    return (
      <View style={styles.idleCard}>
        <View style={styles.idleHeaderRow}>
          <View>
            <Text style={styles.idleSuperTitle}>URBAN CANYON</Text>
            <Text style={styles.idleTitle}>GNSS DEGRADATION</Text>
          </View>
          <View style={styles.gnssAvailableBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.gnssAvailableText}>GNSS AVAILABLE</Text>
          </View>
        </View>

        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>Route Scenario</Text>
          <View style={styles.routePathWrap}>
            <Text style={styles.routeStepActive}>Normal GNSS</Text>
            <Text style={styles.routeArrow}>→</Text>
            <Text style={styles.routeStepCanyon}>Urban Canyon</Text>
            <Text style={styles.routeArrow}>→</Text>
            <Text style={styles.routeStepActive}>GNSS Recovering</Text>
          </View>
        </View>

        {!isPresentationMode && (
          <Text style={styles.description}>
            Urban canyons can cause GNSS multipath and signal degradation due to surrounding structures. NAVIS maintains a continuous position estimate by combining GNSS with inertial motion estimation and dead reckoning.
          </Text>
        )}
      </View>
    );
  }

  const gnssStatusColor = colors.black;
  const gnssStatusBg = colors.brandCream;
  const gnssWord = frame.gnssReliable ? 'ACTIVE' : degraded ? 'DEGRADED' : recovering ? 'RECOVERING' : 'ACTIVE';

  return (
    <View style={[styles.liveCard, degraded && styles.liveCardDegraded, recovering && styles.liveCardRecovery]}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.idleSuperTitle}>URBAN CANYON</Text>
          <Text style={styles.phaseText}>{frame.phaseLabel}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: gnssStatusBg }]}>
          <View style={[styles.statusDot, { backgroundColor: gnssStatusColor }]} />
          <Text style={[styles.statusPillText, { color: gnssStatusColor }]}>{frame.liveStatus}</Text>
        </View>
      </View>

      <View style={styles.sensorsRow}>
        <View style={styles.sensorItem}>
          <Text style={styles.sensorLabel}>GNSS</Text>
          <Text style={[styles.sensorVal, { color: gnssStatusColor }]}>{gnssWord}</Text>
        </View>
        <View style={styles.sensorDivider} />
        <View style={styles.sensorItem}>
          <Text style={styles.sensorLabel}>SIGNAL</Text>
          <Text style={styles.sensorVal}>{frame.gnssSignalQualityLabel}</Text>
        </View>
        <View style={styles.sensorDivider} />
        <View style={styles.sensorItem}>
          <Text style={styles.sensorLabel}>NAVIS</Text>
          <Text style={[styles.sensorVal, { color: colors.black }]}>
            {degraded ? 'IMU / DR' : recovering ? 'FUSING' : 'GNSS + IMU'}
          </Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricBoxLabel}>GNSS ACC</Text>
          <Text style={styles.metricBoxVal}>{frame.gnssAccuracyM.toFixed(1)} <Text style={styles.metricUnit}>m</Text></Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricBoxLabel}>NAVIS ACC</Text>
          <Text style={styles.metricBoxVal}>{frame.navisAccuracyM.toFixed(1)} <Text style={styles.metricUnit}>m</Text></Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricBoxLabel}>SPEED</Text>
          <Text style={styles.metricBoxVal}>{frame.carSpeedKmh.toFixed(1)} <Text style={styles.metricUnit}>km/h</Text></Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricBoxLabel}>HEADING</Text>
          <Text style={styles.metricBoxVal}>{Math.round(frame.carHeading)}°</Text>
        </View>
      </View>

      <View style={styles.compareBox}>
        <Text style={styles.compareTitle}>POSITION ERROR</Text>
        <ErrorBar label="GNSS" meters={frame.gnssPositionErrorM} maxMeters={28} color={colors.black} />
        <ErrorBar label="NAVIS" meters={frame.navisPositionErrorM} maxMeters={28} color={colors.brandCreamDark} />
      </View>

      <View style={styles.contribBox}>
        <View style={styles.contribHeader}>
          <Text style={styles.compareTitle}>ESTIMATION MIX</Text>
          <Text style={styles.confidence}>Confidence {frame.navisConfidence}%</Text>
        </View>
        <View style={styles.contribTrack}>
          <View style={[styles.contribGnss, { flex: Math.max(1, frame.gnssContribution) }]} />
          <View style={[styles.contribImu, { flex: Math.max(1, frame.imuDrContribution) }]} />
        </View>
        <View style={styles.contribLegend}>
          <Text style={styles.contribLegendText}>GNSS {frame.gnssContribution}%</Text>
          <Text style={styles.contribLegendText}>IMU / DR {frame.imuDrContribution}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.black,
  },
  gnssAvailableText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.black,
    letterSpacing: 0.4,
  },
  routeRow: {
    backgroundColor: colors.surfaceSecondary,
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
    color: colors.black,
  },
  routeStepCanyon: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.black,
    backgroundColor: colors.brandCream,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
  },
  routeArrow: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  description: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  liveCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  liveCardDegraded: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  liveCardRecovery: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  phaseText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 5,
    maxWidth: '58%',
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  sensorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
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
  sensorVal: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  sensorDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.border,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSecondary,
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
  compareBox: {
    gap: 6,
  },
  compareTitle: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 0.7,
  },
  contribBox: {
    gap: 6,
  },
  contribHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidence: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.black,
  },
  contribTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.gray200,
  },
  contribGnss: {
    backgroundColor: colors.black,
  },
  contribImu: {
    backgroundColor: colors.brandCreamDark,
  },
  contribLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contribLegendText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
});
