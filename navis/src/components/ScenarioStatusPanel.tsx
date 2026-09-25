/**
 * ScenarioStatusPanel.tsx
 *
 * Bottom status panel for "Sensor Failure During Dead Reckoning" scenario.
 *
 * Features:
 * - Scenario Timeline (GNSS → DEAD RECKONING → SENSOR FAILURE → ADAPTIVE NAVIGATION → SENSOR RECOVERY → COMPLETED)
 * - Stage 1 (Before GNSS loss): GNSS NAVIGATION, GNSS ACTIVE, IMU ACTIVE, Speed, Heading
 * - Stage 2 (After GNSS loss): DEAD RECKONING, GNSS LOST, IMU ACTIVE, DR Distance, Outage Time
 * - Stage 3 (After sensor failure): DEAD RECKONING, GNSS LOST, Sensor Fusion DEGRADED, Available Sensors, DR Error, Navigation CONTINUING
 * - Compact Navigation Engine status box with sensors available (✓/✕) and Fusion: ADAPTIVE
 * - Scenario Completion card with all summary metrics and [ Run Again ] / [ Back to Scenarios ]
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { textStyles, fontWeights, fontSizes } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import {
  ScenarioSimulationFrame,
  ScenarioSummary,
} from '../services/sensorFailureSimulation';

interface ScenarioStatusPanelProps {
  frame: ScenarioSimulationFrame;
  summary: ScenarioSummary | null;
  onRunAgain: () => void;
  onBackToScenarios: () => void;
  onOpenSensorPanel: () => void;
}

export function ScenarioStatusPanel({
  frame,
  summary,
  onRunAgain,
  onBackToScenarios,
  onOpenSensorPanel,
}: ScenarioStatusPanelProps) {
  const {
    state,
    carSpeedKmh,
    carHeading,
    isInsideTunnel,
    tunnelDrivenMeters,
    timeWithoutGNSSSec,
    drErrorMeters,
    totalDrivenMeters,
    disabledSensors,
    sensorStatus,
    availableSensorsCount,
    fusionStateText,
  } = frame;

  const isCompleted = state === 'COMPLETED' && summary !== null;
  const hasFailedSensors = disabledSensors.length > 0;
  const isDR = isInsideTunnel || state === 'GNSS_LOST';
  const isRecovering = state === 'TUNNEL_EXIT' || state === 'GNSS_RECOVERING';
  const isRestoringAny = Object.values(sensorStatus).includes('RESTORING');

  // ─── Scenario Timeline Progress ───────────────────────────────────────────
  // Timeline Stages:
  // 1: GNSS
  // 2: DEAD RECKONING
  // 3: SENSOR FAILURE
  // 4: ADAPTIVE NAVIGATION
  // 5: SENSOR RECOVERY
  // 6: COMPLETED

  const getTimelineStatus = (stageIndex: number): 'done' | 'active' | 'pending' => {
    if (isCompleted) {
      return 'done';
    }

    switch (stageIndex) {
      case 1: // GNSS
        if (state === 'IDLE' || state === 'STARTING' || state === 'GNSS_ACTIVE' || state === 'APPROACHING_TUNNEL') {
          return 'active';
        }
        return 'done';

      case 2: // DEAD RECKONING
        if (state === 'IDLE' || state === 'STARTING' || state === 'GNSS_ACTIVE' || state === 'APPROACHING_TUNNEL') {
          return 'pending';
        }
        if (isDR && !hasFailedSensors && !isRestoringAny) {
          return 'active';
        }
        return 'done';

      case 3: // SENSOR FAILURE
        if (state === 'IDLE' || state === 'STARTING' || state === 'GNSS_ACTIVE' || state === 'APPROACHING_TUNNEL') {
          return 'pending';
        }
        if (hasFailedSensors) {
          return 'done';
        }
        return isDR ? 'pending' : 'done';

      case 4: // ADAPTIVE NAVIGATION
        if (hasFailedSensors && isDR) {
          return 'active';
        }
        if (isRecovering || state === 'FUSED') {
          return 'done';
        }
        return 'pending';

      case 5: // SENSOR RECOVERY / TUNNEL RECOVERY
        if (isRestoringAny || isRecovering) {
          return 'active';
        }
        if (state === 'FUSED') {
          return 'done';
        }
        return 'pending';

      case 6: // COMPLETED
        return isCompleted ? 'done' : 'pending';

      default:
        return 'pending';
    }
  };

  const timelineSteps = [
    { label: 'GNSS', index: 1 },
    { label: 'DEAD RECKONING', index: 2 },
    { label: 'SENSOR FAILURE', index: 3 },
    { label: 'ADAPTIVE NAV', index: 4 },
    { label: 'RECOVERY', index: 5 },
    { label: 'COMPLETED', index: 6 },
  ];

  // ─── 1. COMPLETION SUMMARY CARD ───────────────────────────────────────────
  if (isCompleted && summary) {
    const failedNames =
      summary.failedSensors.length > 0
        ? summary.failedSensors.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' + ')
        : 'None (Baseline DR)';

    return (
      <View style={styles.completionCard}>
        {/* Header */}
        <View style={styles.completionHeaderRow}>
          <View style={styles.completionBadge}>
            <Feather name="check-circle" size={15} color={colors.gnssActive} />
            <Text style={styles.completionBadgeText}>SCENARIO COMPLETE</Text>
          </View>
          <View style={styles.continuityBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.continuityText}>CONTINUITY MAINTAINED</Text>
          </View>
        </View>

        <Text style={styles.completionSubtitle}>
          Dead reckoning navigation continued uninterrupted despite sensor dropouts.
        </Text>

        {/* Metrics Grid */}
        <View style={styles.completionGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>SENSOR FAILURE</Text>
            <Text style={[styles.summaryVal, { color: colors.warning }]}>{failedNames}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>GNSS OUTAGE</Text>
            <Text style={styles.summaryVal}>
              {summary.gnssOutageDurationSec.toFixed(1)} <Text style={styles.summaryUnit}>sec</Text>
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>DIST. IN FAILURE</Text>
            <Text style={styles.summaryVal}>
              {summary.distanceDuringFailureMeters} <Text style={styles.summaryUnit}>m</Text>
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>MAX DR ERROR</Text>
            <Text style={[styles.summaryVal, { color: colors.primaryDark }]}>
              {summary.maxDRErrorMeters.toFixed(1)} <Text style={styles.summaryUnit}>m</Text>
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>CONTINUITY</Text>
            <Text style={[styles.summaryVal, { color: colors.gnssActive }]}>MAINTAINED</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>SENSORS RESTORED</Text>
            <Text style={[styles.summaryVal, { color: summary.sensorsRestored ? colors.gnssActive : colors.warning }]}>
              {summary.sensorsRestored ? 'YES' : 'NO'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.completionButtonsRow}>
          <PrimaryButton
            label="Run Again"
            onPress={onRunAgain}
            style={styles.flexBtn}
            icon={<Feather name="refresh-cw" size={13} color="#fff" />}
          />
          <SecondaryButton
            label="Back to Scenarios"
            onPress={onBackToScenarios}
            style={styles.flexBtn}
          />
        </View>
      </View>
    );
  }

  // ─── 2. ACTIVE SIMULATION STATUS PANEL ────────────────────────────────────
  return (
    <View style={styles.panelContainer}>
      {/* ── Scenario Timeline Indicator ── */}
      <View style={styles.timelineWrapper}>
        <View style={styles.timelineRow}>
          {timelineSteps.map((step, idx) => {
            const status = getTimelineStatus(step.index);
            const isLast = idx === timelineSteps.length - 1;

            return (
              <React.Fragment key={step.label}>
                <View style={styles.timelineItem}>
                  <View
                    style={[
                      styles.timelineDot,
                      status === 'done' && styles.timelineDotDone,
                      status === 'active' && styles.timelineDotActive,
                    ]}
                  >
                    {status === 'done' ? (
                      <Feather name="check" size={8} color="#fff" />
                    ) : status === 'active' ? (
                      <View style={styles.timelineDotInner} />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.timelineText,
                      status === 'done' && styles.timelineTextDone,
                      status === 'active' && styles.timelineTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.timelineLine,
                      status === 'done' && styles.timelineLineDone,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* ── Mode & Sensor Status Header ── */}
      {isDR ? (
        /* AFTER GNSS LOSS (Tunnel) */
        <View style={styles.drStatusBlock}>
          <View style={styles.drHeaderRow}>
            <View style={styles.drTitleBadge}>
              <View style={[styles.pulsingDot, hasFailedSensors && { backgroundColor: colors.warning }]} />
              <Text style={styles.drTitleText}>
                {hasFailedSensors ? 'DEAD RECKONING • ADAPTIVE' : 'DEAD RECKONING ACTIVE'}
              </Text>
            </View>

            {/* Quick SENSORS trigger button */}
            <TouchableOpacity
              style={[styles.miniSensorsBtn, hasFailedSensors && styles.miniSensorsBtnActive]}
              onPress={onOpenSensorPanel}
              activeOpacity={0.8}
            >
              <Feather name="cpu" size={11} color={hasFailedSensors ? colors.warning : colors.textSecondary} />
              <Text style={styles.miniSensorsLabel}>
                SENSORS {disabledSensors.length}/2
              </Text>
            </TouchableOpacity>
          </View>

          {/* Indicators Row: GNSS LOST | Fusion Status | Available Sensors */}
          <View style={styles.sensorStatusRow}>
            <View style={styles.statusCol}>
              <Text style={styles.statusColLabel}>GNSS</Text>
              <View style={styles.statusColPill}>
                <View style={[styles.microDot, { backgroundColor: colors.danger }]} />
                <Text style={[styles.statusColVal, { color: colors.danger }]}>LOST</Text>
              </View>
            </View>

            <View style={styles.statusColDivider} />

            <View style={styles.statusCol}>
              <Text style={styles.statusColLabel}>SENSOR FUSION</Text>
              <View style={styles.statusColPill}>
                <View
                  style={[
                    styles.microDot,
                    { backgroundColor: hasFailedSensors ? colors.warning : colors.gnssActive },
                  ]}
                />
                <Text
                  style={[
                    styles.statusColVal,
                    { color: hasFailedSensors ? '#B45309' : colors.gnssActive },
                  ]}
                >
                  {hasFailedSensors ? 'DEGRADED' : 'ACTIVE'}
                </Text>
              </View>
            </View>

            <View style={styles.statusColDivider} />

            <View style={styles.statusCol}>
              <Text style={styles.statusColLabel}>AVAILABLE SENSORS</Text>
              <Text style={[styles.statusColVal, { color: colors.primaryDark }]}>
                {availableSensorsCount} / 3
              </Text>
            </View>

            <View style={styles.statusColDivider} />

            <View style={styles.statusCol}>
              <Text style={styles.statusColLabel}>NAVIGATION</Text>
              <View style={styles.statusColPill}>
                <View style={[styles.microDot, { backgroundColor: colors.gnssActive }]} />
                <Text style={[styles.statusColVal, { color: colors.gnssActive }]}>CONTINUING</Text>
              </View>
            </View>
          </View>

          {/* Live Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>SPEED</Text>
              <Text style={styles.metricVal}>
                {carSpeedKmh.toFixed(1)} <Text style={styles.metricUnit}>km/h</Text>
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>HEADING</Text>
              <Text style={styles.metricVal}>{Math.round(carHeading)}°</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>DR DISTANCE</Text>
              <Text style={styles.metricVal}>
                {tunnelDrivenMeters} <Text style={styles.metricUnit}>m</Text>
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>DR ERROR</Text>
              <Text
                style={[
                  styles.metricVal,
                  drErrorMeters > 5.0 && { color: colors.danger },
                  drErrorMeters > 3.0 && drErrorMeters <= 5.0 && { color: colors.warning },
                ]}
              >
                {drErrorMeters.toFixed(1)} <Text style={styles.metricUnit}>m</Text>
              </Text>
            </View>
          </View>

          {/* ── Compact Adaptive Navigation Engine Box (Requirement 15) ── */}
          <View style={styles.engineBox}>
            <View style={styles.engineBoxHeader}>
              <Text style={styles.engineBoxTitle}>NAVIGATION ENGINE</Text>
              <Text style={styles.engineBoxSubtitle}>
                Fusion: <Text style={{ color: hasFailedSensors ? colors.warning : colors.gnssActive, fontWeight: '700' }}>{fusionStateText}</Text>
                {'  '}•{'  '}
                Nav: <Text style={{ color: colors.gnssActive, fontWeight: '700' }}>CONTINUING</Text>
              </Text>
            </View>

            <View style={styles.sensorChipsRow}>
              {(['accelerometer', 'gyroscope', 'magnetometer'] as const).map((key) => {
                const isOnline = sensorStatus[key] === 'ACTIVE';
                const isRestoring = sensorStatus[key] === 'RESTORING';
                const shortName = key === 'accelerometer' ? 'Accel' : key === 'gyroscope' ? 'Gyro' : 'Mag';
                const chipIcon = isOnline ? 'check' : isRestoring ? 'refresh-cw' : 'x';
                const chipIconColor = isOnline ? colors.gnssActive : isRestoring ? colors.warning : colors.danger;

                return (
                  <View
                    key={key}
                    style={[
                      styles.sensorChip,
                      isOnline && styles.sensorChipOnline,
                      !isOnline && !isRestoring && styles.sensorChipOffline,
                      isRestoring && styles.sensorChipRestoring,
                    ]}
                  >
                    <Feather name={chipIcon as any} size={8} color={chipIconColor} />
                    <Text
                      style={[
                        styles.sensorChipText,
                        isOnline && styles.sensorChipTextOnline,
                        !isOnline && !isRestoring && styles.sensorChipTextOffline,
                        isRestoring && styles.sensorChipTextRestoring,
                      ]}
                    >
                      {shortName}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      ) : isRecovering ? (
        /* TUNNEL EXIT / RECOVERY */
        <View style={styles.recoveryStatusBlock}>
          <View style={styles.recoveryHeaderRow}>
            <View style={styles.recoveryBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.recoveryBadgeText}>POSITION RECOVERY</Text>
            </View>
            <Text style={styles.recoverySub}>GNSS Restored • Correcting Trajectory</Text>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>SPEED</Text>
              <Text style={styles.metricVal}>{carSpeedKmh.toFixed(1)} km/h</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>FUSION</Text>
              <Text style={[styles.metricVal, { color: colors.gnssActive }]}>ACTIVE</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>TOTAL DIST</Text>
              <Text style={styles.metricVal}>{totalDrivenMeters} m</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>STATUS</Text>
              <Text style={[styles.metricVal, { color: colors.primaryDark }]}>CORRECTING</Text>
            </View>
          </View>
        </View>
      ) : (
        /* BEFORE GNSS LOSS (Stage 1) */
        <View style={styles.gnssStatusBlock}>
          <View style={styles.gnssHeaderRow}>
            <View style={styles.gnssActivePill}>
              <View style={styles.greenDot} />
              <Text style={styles.gnssActivePillText}>GNSS NAVIGATION</Text>
            </View>
            <View style={styles.imuActivePill}>
              <View style={styles.greenDot} />
              <Text style={styles.imuActivePillText}>IMU ACTIVE (3/3)</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>SPEED</Text>
              <Text style={styles.metricVal}>{carSpeedKmh.toFixed(1)} <Text style={styles.metricUnit}>km/h</Text></Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>HEADING</Text>
              <Text style={styles.metricVal}>{Math.round(carHeading)}°</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>DISTANCE</Text>
              <Text style={styles.metricVal}>{totalDrivenMeters} <Text style={styles.metricUnit}>m</Text></Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>GNSS SATS</Text>
              <View style={styles.satsRow}>
                <Feather name="radio" size={11} color={colors.primaryDark} />
                <Text style={[styles.metricVal, { color: colors.primaryDark }]}>14</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panelContainer: {
    gap: spacing[2],
  },

  // ── Timeline ───────────────────────────────────────────────────────────────
  timelineWrapper: {
    backgroundColor: 'rgba(240, 239, 254, 0.65)',
    borderRadius: radius.lg,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: colors.gnssActive,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
  },
  timelineDotText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '800',
  },
  timelineText: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
  timelineTextDone: {
    color: colors.textPrimary,
  },
  timelineTextActive: {
    color: colors.primaryDark,
    fontWeight: fontWeights.extrabold,
  },
  timelineLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.gray200,
    marginHorizontal: 3,
  },
  timelineLineDone: {
    backgroundColor: colors.gnssActive,
  },

  // ── Pre-tunnel GNSS Block ──────────────────────────────────────────────────
  gnssStatusBlock: {
    gap: spacing[2],
  },
  gnssHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gnssActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gnssActiveSurface,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  gnssActivePillText: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: colors.gnssActive,
    letterSpacing: 0.5,
  },
  imuActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  imuActivePillText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.primaryDark,
    letterSpacing: 0.4,
  },

  // ── Dead Reckoning Block (Inside Tunnel) ───────────────────────────────────
  drStatusBlock: {
    gap: spacing[2],
  },
  drHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    gap: 6,
  },
  drTitleText: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: colors.secondary,
    letterSpacing: 0.6,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  miniSensorsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  miniSensorsBtnActive: {
    backgroundColor: colors.warningSurface,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  miniSensorsIcon: { fontSize: 10 },
  miniSensorsLabel: {
    fontSize: 9.5,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },

  // ── Sensor Status Row ──────────────────────────────────────────────────────
  sensorStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray50,
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statusCol: {
    alignItems: 'center',
    gap: 2,
  },
  statusColLabel: {
    fontSize: 7.5,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusColPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusColVal: {
    fontSize: 9.5,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 0.2,
  },
  statusColDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.borderLight,
  },
  microDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // ── Adaptive Navigation Engine Box ─────────────────────────────────────────
  engineBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: radius.lg,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    gap: 6,
  },
  engineBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  engineBoxTitle: {
    fontSize: 8.5,
    fontWeight: fontWeights.extrabold,
    color: colors.secondary,
    letterSpacing: 0.8,
  },
  engineBoxSubtitle: {
    fontSize: 8.5,
    color: colors.textSecondary,
  },
  sensorChipsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  sensorChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  timelineDotInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#fff',
  },
  satsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sensorChipOnline: {
    backgroundColor: colors.gnssActiveSurface,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  sensorChipOffline: {
    backgroundColor: colors.dangerSurface,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  sensorChipRestoring: {
    backgroundColor: colors.warningSurface,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  sensorChipText: {
    fontSize: 9.5,
    fontWeight: fontWeights.bold,
  },
  sensorChipTextOnline: { color: colors.gnssActive },
  sensorChipTextOffline: { color: colors.danger },
  sensorChipTextRestoring: { color: colors.warning },

  // ── Metrics Grid ───────────────────────────────────────────────────────────
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    letterSpacing: 0.6,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  metricUnit: {
    fontSize: 8.5,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
  },

  // ── Recovery Block ─────────────────────────────────────────────────────────
  recoveryStatusBlock: {
    gap: spacing[2],
  },
  recoveryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recoveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gnssActiveSurface,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.md,
    gap: 6,
  },
  recoveryBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: colors.gnssActive,
    letterSpacing: 0.6,
  },
  recoverySub: {
    fontSize: 9.5,
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gnssActive,
  },

  // ── Completion Card ────────────────────────────────────────────────────────
  completionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
    gap: spacing[3],
  },
  completionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  completionBadgeIcon: {
    fontSize: 14,
    color: colors.gnssActive,
    fontWeight: '900',
  },
  completionBadgeText: {
    fontSize: 12,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  continuityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gnssActiveSurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  continuityText: {
    fontSize: 8.5,
    fontWeight: fontWeights.extrabold,
    color: colors.gnssActive,
    letterSpacing: 0.4,
  },
  completionSubtitle: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  completionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  summaryItem: {
    width: '47%',
    gap: 2,
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 0.6,
  },
  summaryVal: {
    fontSize: 12.5,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  summaryUnit: {
    fontSize: 9,
    fontWeight: fontWeights.normal,
    color: colors.textTertiary,
  },
  completionButtonsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: 2,
  },
  flexBtn: {
    flex: 1,
  },
});
