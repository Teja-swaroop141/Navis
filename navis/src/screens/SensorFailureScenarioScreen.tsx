/**
 * SensorFailureScenarioScreen.tsx
 *
 * Dedicated simulation screen for the "Sensor Failure During Dead Reckoning" scenario.
 * Reuses the existing SimulationMapView (Three.js WebGL / OpenStreetMap corridor),
 * TunnelIndicator, and theme design tokens.
 *
 * Lifecycle:
 * 1. GNSS NAVIGATION (Vehicle moves smoothly, camera follows)
 * 2. ENTERS TUNNEL (Automatically transitions to GNSS LOST → DEAD RECKONING)
 * 3. SENSORS TAB APPEARS (User can disable up to 2 sensors: Gyro / Accel / Mag)
 * 4. ADAPTIVE NAVIGATION (Vehicle continues moving without interruption; error increases dynamically)
 * 5. RESTORATION (User can restore sensors with simulated recalibration)
 * 6. TUNNEL EXIT & RECOVERY (GNSS restored, trajectories fused)
 * 7. COMPLETION (Metrics summary card, Run Again, Back to Scenarios)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fontSizes, fontWeights } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { NavigationHeader } from '../components/NavigationHeader';
import { SimulationMapView } from '../components/SimulationMapView';
import { TunnelIndicator } from '../components/TunnelIndicator';
import { ScenarioSensorPanel } from '../components/ScenarioSensorPanel';
import { ScenarioStatusPanel } from '../components/ScenarioStatusPanel';
import {
  sensorFailureSimulation,
  ScenarioSimulationFrame,
  ScenarioSummary,
  SpeedMultiplier,
} from '../services/sensorFailureSimulation';
import { SimulationFrame } from '../services/simulationEngine';
import { SensorType } from '../types';

type Props = {
  navigation: any;
};

export function SensorFailureScenarioScreen({ navigation }: Props) {
  const [frame, setFrame] = useState<ScenarioSimulationFrame>(
    sensorFailureSimulation.getCurrentFrame()
  );
  const [summary, setSummary] = useState<ScenarioSummary | null>(null);
  const [isSensorPanelExpanded, setIsSensorPanelExpanded] = useState<boolean>(false);

  // Animated notification toast
  const toastAnim = useRef(new Animated.Value(0)).current;
  const prevNotificationRef = useRef<string | null>(null);

  useEffect(() => {
    // Subscribe to scenario frame updates
    const unsubFrame = sensorFailureSimulation.subscribe((newFrame) => {
      setFrame(newFrame);
    });

    // Subscribe to scenario completion
    const unsubComplete = sensorFailureSimulation.onComplete((res) => {
      setSummary(res);
      setIsSensorPanelExpanded(false);
    });

    // Auto-start simulation on screen mount
    sensorFailureSimulation.start();

    return () => {
      unsubFrame();
      unsubComplete();
      sensorFailureSimulation.reset();
    };
  }, []);

  // Animate toast notification on message changes
  useEffect(() => {
    if (frame.statusNotification && frame.statusNotification !== prevNotificationRef.current) {
      prevNotificationRef.current = frame.statusNotification;
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(2600),
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [frame.statusNotification]);

  // Handlers
  const handleStart = () => {
    setSummary(null);
    sensorFailureSimulation.start();
  };

  const handlePause = () => {
    sensorFailureSimulation.pause();
  };

  const handleResume = () => {
    sensorFailureSimulation.resume();
  };

  const handleRestart = () => {
    setSummary(null);
    setIsSensorPanelExpanded(false);
    sensorFailureSimulation.restart();
  };

  const handleSpeedSelect = (spd: SpeedMultiplier) => {
    sensorFailureSimulation.setSpeedMultiplier(spd);
  };

  const handleDisableSensor = (sensor: SensorType) => {
    sensorFailureSimulation.disableSensor(sensor);
  };

  const handleRestoreSensor = (sensor: SensorType) => {
    sensorFailureSimulation.restoreSensor(sensor);
  };

  const handleBackToScenarios = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Scenarios');
    }
  };

  // Convert scenario frame to SimulationFrame for SimulationMapView compatibility
  const mapViewFrame: SimulationFrame = {
    state: frame.state as any,
    carPosition: frame.carPosition,
    carHeading: frame.carHeading,
    carSpeedKmh: frame.carSpeedKmh,
    routeProgressPercent: frame.routeProgressPercent,
    totalDrivenMeters: frame.totalDrivenMeters,
    gnssAvailable: frame.gnssAvailable,
    gnssStatusText: frame.gnssStatusText,
    imuStatusText: frame.imuStatusText as any,
    navigationModeText: frame.navigationModeText,
    positionSource: frame.positionSource,
    isInsideTunnel: frame.isInsideTunnel,
    isApproachingTunnel: frame.isApproachingTunnel,
    tunnelProgressPercent: frame.tunnelProgressPercent,
    tunnelDrivenMeters: frame.tunnelDrivenMeters,
    tunnelLengthMeters: frame.tunnelLengthMeters,
    timeWithoutGNSSSec: frame.timeWithoutGNSSSec,
    gnssTrajectory: frame.gnssTrajectory,
    drTrajectory: frame.drTrajectory,
    fusedTrajectory: frame.fusedTrajectory,
    drDisplacementMeters: frame.drErrorMeters,
    fusionCorrectionApplied: frame.fusionCorrectionApplied,
    statusNotification: frame.statusNotification,
    speedMultiplier: frame.speedMultiplier,
    isPaused: frame.isPaused,
  };

  const isCompleted = frame.state === 'COMPLETED' && summary !== null;
  // Sensor tab is only available once dead reckoning is active
  const isDRActive = frame.isInsideTunnel || frame.state === 'DEAD_RECKONING' || frame.state === 'GNSS_LOST';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Navigation Header */}
      <NavigationHeader
        title="Sensor Failure Scenario"
        onBack={handleBackToScenarios}
        right={
          <View style={styles.headerBadge}>
            <View style={styles.headerBadgeDot} />
            <Text style={styles.headerBadgeText}>SCENARIO</Text>
          </View>
        }
      />

      {/* Main Map Canvas */}
      <View style={styles.mapContainer}>
        <SimulationMapView
          frame={mapViewFrame}
          isPresentationMode={false}
          style={StyleSheet.absoluteFill}
          disableForkDecision={true}
        />

        {/* Legend Overlay */}
        <View style={styles.legendOverlay}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBar, { backgroundColor: colors.simGNSS }]} />
            <Text style={styles.legendText}>GNSS</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBar, styles.legendBarDashed, { backgroundColor: colors.simDR }]} />
            <Text style={styles.legendText}>DR</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBar, { backgroundColor: colors.simFused }]} />
            <Text style={styles.legendText}>Fused</Text>
          </View>
        </View>

        {/* Floating Sensor Control Tab (Visible ONLY when DR active) */}
        <ScenarioSensorPanel
          isVisible={isDRActive && !isCompleted}
          isExpanded={isSensorPanelExpanded}
          onToggleExpanded={() => setIsSensorPanelExpanded((prev) => !prev)}
          sensorStatus={frame.sensorStatus}
          disabledSensors={frame.disabledSensors}
          onDisableSensor={handleDisableSensor}
          onRestoreSensor={handleRestoreSensor}
        />

        {/* Real-Time Notification Toast */}
        {frame.statusNotification && (
          <Animated.View style={[styles.notificationToast, { opacity: toastAnim }]}>
            <View
              style={[
                styles.toastDot,
                frame.disabledSensors.length > 0 && { backgroundColor: colors.brandCream },
              ]}
            />
            <Text style={styles.toastText} numberOfLines={1}>
              {frame.statusNotification}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Bottom Floating Control & Status Panel */}
      <View style={styles.bottomSheet}>
        {/* Tunnel Indicator Banner */}
        <TunnelIndicator
          isApproaching={frame.isApproachingTunnel}
          isInsideTunnel={frame.isInsideTunnel}
          tunnelProgressPercent={frame.tunnelProgressPercent}
          tunnelDrivenMeters={frame.tunnelDrivenMeters}
          tunnelLengthMeters={frame.tunnelLengthMeters}
          timeWithoutGNSSSec={frame.timeWithoutGNSSSec}
        />

        {/* Main Status Panel / Completion Summary */}
        <ScenarioStatusPanel
          frame={frame}
          summary={summary}
          onRunAgain={handleRestart}
          onBackToScenarios={handleBackToScenarios}
          onOpenSensorPanel={() => setIsSensorPanelExpanded(true)}
        />

        {/* Playback Controls (When not completed) */}
        {!isCompleted && (
          <View style={styles.controlsBar}>
            {frame.state === 'IDLE' ? (
              <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.88}>
                <Feather name="play" size={12} color={colors.textOnPrimary} />
                <Text style={styles.startBtnText}>START SCENARIO</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.playbackButtonsRow}>
                {frame.isPaused ? (
                  <TouchableOpacity style={styles.playbackBtn} onPress={handleResume} activeOpacity={0.8}>
                    <Feather name="play" size={10} color={colors.primaryDark} />
                    <Text style={styles.playbackBtnText}>Resume</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.playbackBtn} onPress={handlePause} activeOpacity={0.8}>
                    <Feather name="pause" size={11} color={colors.primaryDark} />
                    <Text style={styles.playbackBtnText}>Pause</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.playbackBtnSecondary} onPress={handleRestart} activeOpacity={0.8}>
                  <Feather name="rotate-ccw" size={11} color={colors.textSecondary} />
                  <Text style={styles.playbackBtnTextSecondary}>Restart</Text>
                </TouchableOpacity>

                {/* Speed Multipliers */}
                <View style={styles.speedPillsRow}>
                  {([0.5, 1, 2] as const).map((spd) => (
                    <TouchableOpacity
                      key={spd}
                      style={[styles.speedPill, frame.speedMultiplier === spd && styles.speedPillActive]}
                      onPress={() => handleSpeedSelect(spd)}
                    >
                      <Text style={[styles.speedPillText, frame.speedMultiplier === spd && styles.speedPillTextActive]}>
                        {spd}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lavender,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.md,
    gap: 4,
  },
  headerBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#050811',
  },
  legendOverlay: {
    position: 'absolute',
    bottom: spacing[3],
    left: spacing[3],
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2] - 2,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
    zIndex: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBar: {
    width: 12,
    height: 3.5,
    borderRadius: 2,
  },
  legendBarDashed: {
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 9,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  notificationToast: {
    position: 'absolute',
    bottom: spacing[3],
    left: spacing[3],
    right: spacing[3],
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...shadows.md,
    zIndex: 110,
  },
  toastDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brandCream,
  },
  toastText: {
    fontSize: 10.5,
    fontWeight: fontWeights.bold,
    color: colors.white,
    letterSpacing: 0.2,
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: Platform.OS === 'ios' ? spacing[6] : spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...shadows.lg,
    gap: spacing[2],
  },
  controlsBar: {
    marginTop: 2,
  },
  startBtn: {
    backgroundColor: colors.brandCream,
    borderWidth: 1.5,
    borderColor: colors.brandCreamDark,
    paddingVertical: spacing[3],
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    ...shadows.sm,
  },
  startBtnText: {
    fontSize: 12,
    fontWeight: fontWeights.extrabold,
    color: colors.black,
    letterSpacing: 0.8,
  },
  playbackButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  playbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.brandCream,
    paddingHorizontal: spacing[3],
    paddingVertical: 7,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
  },
  playbackBtnText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.black,
  },
  playbackBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing[3],
    paddingVertical: 7,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  playbackBtnTextSecondary: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  speedPillsRow: {
    flexDirection: 'row',
    marginLeft: 'auto',
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    padding: 2,
    gap: 2,
  },
  speedPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  speedPillActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  speedPillText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
  },
  speedPillTextActive: {
    color: colors.primaryDark,
  },
});
