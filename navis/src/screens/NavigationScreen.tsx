/**
 * NavigationScreen — the core map screen with GNSS toggle and DR demonstration
 *
 * This is the most important screen. It shows:
 * - A large map with trajectory overlays
 * - Status compact card at top
 * - Bottom floating control card with metrics and GNSS toggle
 * - Smooth visual transitions between GNSS_ACTIVE → DR → FUSED modes
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, ScrollView,
  Dimensions, StatusBar, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { textStyles, fontSizes, fontWeights } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { useNavigation } from '../state/NavigationContext';
import { useNavigationEngine } from '../hooks/useNavigationEngine';
import { useDemoMode } from '../hooks/useDemoMode';
import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';
import { StatusIndicator } from '../components/StatusIndicator';
import { GlassCard } from '../components/GlassCard';
import { LeafletMapView } from '../components/LeafletMapView';
import { haversineDistance } from '../services/sensorFusion';
import { DEMO_ROUTE } from '../constants/demoRoute';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { NavigationMode } from '../types';
import { useLiveSensors } from '../hooks/useLiveSensors';

type Props = NativeStackScreenProps<RootStackParamList, 'Navigation'>;

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.55;

function formatSpeed(val: number | null | undefined): string {
  if (!val) return '0.0';
  return (val * 3.6).toFixed(1); // m/s → km/h
}
function formatHeading(deg: number): string {
  return `${Math.round(deg)}°`;
}
function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
}
function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Compact status strip at the top
function StatusStrip({ mode }: { mode: NavigationMode }) {
  const config = {
    GNSS_ACTIVE: { gnss: 'ACTIVE', gnssColor: colors.gnssActive, mode: 'HIGHWAY GNSS' },
    GNSS_LOST: { gnss: 'LOST', gnssColor: colors.gnssLost, mode: 'TUNNEL OUTAGE' },
    DEAD_RECKONING: { gnss: 'LOST', gnssColor: colors.gnssLost, mode: 'DEAD RECKONING' },
    GNSS_RECOVERING: { gnss: 'RESTORING', gnssColor: colors.recovering, mode: 'SENSOR FUSION' },
    FUSED: { gnss: 'ACTIVE', gnssColor: colors.gnssActive, mode: 'GNSS + INS FUSED' },
  }[mode];

  return (
    <View style={statusStyles.strip}>
      <View style={statusStyles.item}>
        <Text style={statusStyles.label}>GNSS</Text>
        <View style={statusStyles.valueRow}>
          <View style={[statusStyles.dot, { backgroundColor: config.gnssColor }]} />
          <Text style={[statusStyles.value, { color: config.gnssColor }]}>{config.gnss}</Text>
        </View>
      </View>
      <View style={statusStyles.divider} />
      <View style={statusStyles.item}>
        <Text style={statusStyles.label}>INS / IMU</Text>
        <View style={statusStyles.valueRow}>
          <View style={[statusStyles.dot, { backgroundColor: colors.gnssActive }]} />
          <Text style={[statusStyles.value, { color: colors.gnssActive }]}>ACTIVE</Text>
        </View>
      </View>
      <View style={statusStyles.divider} />
      <View style={statusStyles.item}>
        <Text style={statusStyles.label}>MODE</Text>
        <Text style={[statusStyles.modeText]}>{config.mode}</Text>
      </View>
    </View>
  );
}

const statusStyles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    alignItems: 'center',
    gap: spacing[4],
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  label: { fontSize: 9, fontWeight: fontWeights.bold, color: colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  value: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, letterSpacing: 0.3 },
  modeText: { fontSize: 9, fontWeight: fontWeights.bold, color: colors.primary, letterSpacing: 0.5, textAlign: 'center' },
  divider: { width: 1, height: 28, backgroundColor: colors.borderLight },
});

// Bottom control card — shows mode metrics and buttons based on mode
function ControlCard({
  mode,
  appMode,
  gnssData,
  drState,
  totalDrivenDistance,
  onDisableGNSS,
  onEnableGNSS,
  onStop,
}: {
  mode: NavigationMode;
  appMode: 'LIVE' | 'DEMO' | 'IDLE';
  gnssData: any;
  drState: any;
  totalDrivenDistance: number;
  onDisableGNSS?: () => void;
  onEnableGNSS?: () => void;
  onStop: () => void;
}) {
  const isDR = mode === 'DEAD_RECKONING' || mode === 'GNSS_LOST';
  const isRecovering = mode === 'GNSS_RECOVERING';
  const isFused = mode === 'FUSED';
  const bgColor = isDR ? colors.deadReckoningSurface : isFused ? colors.fusedSurface : colors.surface;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }).start();
  }, [mode]);

  const rawSpeed = gnssData?.speed ?? drState?.velocity ?? 0;
  const speed = (rawSpeed * 3.6).toFixed(1);
  const heading = gnssData?.heading ?? drState?.heading ?? 0;
  const accuracy = gnssData?.accuracy?.toFixed(1) ?? '--';
  const drError = drState?.estimatedError ? drState.estimatedError.toFixed(1) : '0.0';
  const drDuration = drState?.elapsedTime ? formatDuration(drState.elapsedTime) : '00:00';
  const distanceFormatted = formatDistance(totalDrivenDistance);

  return (
    <Animated.View style={[styles.controlCard, { backgroundColor: bgColor, opacity: slideAnim }]}>
      {/* Title row */}
      <View style={styles.cardHeader}>
        <View style={{ gap: 2 }}>
          <Text style={styles.cardTitle}>
            {isDR ? 'TUNNEL / UNDERPASS OUTAGE' : isRecovering ? 'SENSOR FUSION' : isFused ? 'HIGHWAY NAVIGATION' : 'NAVIGATION SESSION'}
          </Text>
          {isDR && <Text style={styles.cardSubtitle}>Inertial Dead Reckoning Active</Text>}
          {isRecovering && <Text style={styles.cardSubtitle}>Fusing GNSS & INS trajectories…</Text>}
        </View>
        <StatusBadge mode={mode} small />
      </View>

      {/* Status indicators */}
      {isDR && (
        <View style={styles.statusRow}>
          <StatusIndicator label="VEHICLE INS ACTIVE" active color={colors.gnssActive} pulse />
          <StatusIndicator label="GNSS SIGNAL LOST" active={false} color={colors.gnssLost} />
        </View>
      )}

      {/* Metrics grid */}
      <View style={styles.metricsGrid}>
        <MetricCard label="Speed" value={speed} unit="km/h" />
        <MetricCard label="Heading" value={formatHeading(heading)} />
        {isDR ? (
          <>
            <MetricCard label="DR Error" value={`~${drError}m`} accent={colors.deadReckoning} />
            <MetricCard label="Duration" value={drDuration} />
          </>
        ) : isFused ? (
          <>
            <MetricCard label="Distance" value={distanceFormatted} />
            <MetricCard label="Accuracy" value={`±${accuracy}m`} accent={colors.gnssActive} />
          </>
        ) : (
          <>
            <MetricCard label="Accuracy" value={`±${accuracy}m`} />
            <MetricCard label="Distance" value={distanceFormatted} />
          </>
        )}
      </View>

      {/* DEMO mode action buttons (Disable / Restore GNSS toggle) */}
      {appMode === 'DEMO' ? (
        <View style={styles.demoButtonsContainer}>
          <View style={styles.buttonRow}>
            {isDR ? (
              <TouchableOpacity
                style={[styles.gnssButton, styles.gnssButtonRestore]}
                onPress={onEnableGNSS}
                activeOpacity={0.85}
              >
                <Feather name="zap" size={14} color={colors.black} />
                <Text style={[styles.gnssButtonText, { color: colors.black }]}>RESTORE GNSS</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.gnssButton, styles.gnssButtonDisable]}
                onPress={onDisableGNSS}
                activeOpacity={0.85}
              >
                <Feather name="wifi-off" size={14} color={colors.white} />
                <Text style={[styles.gnssButtonText, { color: colors.white }]}>DISABLE GNSS</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.stopSmallButton} onPress={onStop} activeOpacity={0.85}>
              <Feather name="square" size={10} color={colors.black} />
              <Text style={styles.stopSmallText}>END</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* LIVE mode: Stop session button */
        <TouchableOpacity style={styles.stopFullButton} onPress={onStop} activeOpacity={0.85}>
          <Feather name="square" size={14} color={colors.white} />
          <Text style={styles.stopFullText}>STOP SESSION</Text>
        </TouchableOpacity>
      )}

      {isDR && (
        <View style={styles.drNoteRow}>
          <Feather name="info" size={12} color={colors.primary} />
          <Text style={styles.drNote}>
            Vehicle position computed in real-time from IMU sensors
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

export function NavigationScreen({ navigation, route }: Props) {
  const { mode: appMode } = route.params;
  const { state } = useNavigation();
  const engine = useNavigationEngine();
  const demo = useDemoMode();
  const [isStarted, setIsStarted] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const statusMessageAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Auto-start
    const init = async () => {
      if (appMode === 'DEMO') {
        demo.start();
      } else {
        await engine.startNavigation('LIVE');
      }
      setIsStarted(true);
    };
    init();

    return () => {
      if (appMode === 'DEMO') {
        demo.pause();
      } else {
        engine.stopNavigation();
      }
    };
  }, []);

  // Animate status message on change
  useEffect(() => {
    statusMessageAnim.setValue(0);
    Animated.sequence([
      Animated.timing(statusMessageAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(statusMessageAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [state.statusMessage]);

  const startPos = state.trajectory[0]?.position ?? DEMO_ROUTE.startPosition;
  const gnssTrajectory = state.trajectory.filter(p => p.type === 'GNSS').map(p => p.position);
  const drTrajectory = state.trajectory.filter(p => p.type === 'DR').map(p => p.position);
  const fusedTrajectory = state.trajectory.filter(p => p.type === 'FUSED').map(p => p.position);

  const totalDrivenDistance = React.useMemo(() => {
    if (state.trajectory.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < state.trajectory.length; i++) {
      sum += haversineDistance(state.trajectory[i - 1].position, state.trajectory[i].position);
    }
    return sum;
  }, [state.trajectory]);

  const markerLabel = state.mode === 'DEAD_RECKONING' ? 'DR'
    : state.mode === 'FUSED' ? 'FUSED'
    : 'GNSS';

  const markerColor = state.mode === 'DEAD_RECKONING' ? colors.markerDR
    : state.mode === 'FUSED' ? colors.markerFused
    : colors.markerGNSS;

  const liveSensors = useLiveSensors();

  const handleDisableGNSS = () => {
    if (appMode === 'DEMO') {
      demo.manualDisableGNSS();
    } else {
      engine.disableGNSS();
    }
  };

  const handleEnableGNSS = () => {
    if (appMode === 'DEMO') {
      demo.manualEnableGNSS();
    } else {
      engine.enableGNSS();
    }
  };

  const handleStop = () => {
    demo.pause();
    engine.stopNavigation();
    navigation.navigate('Performance');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Map */}
      <View style={styles.mapContainer}>
        <LeafletMapView
          initialCenter={startPos}
          currentPosition={state.currentPosition}
          gnssTrajectory={gnssTrajectory}
          drTrajectory={drTrajectory}
          fusedTrajectory={fusedTrajectory}
          markerLabel={markerLabel}
          markerColor={markerColor}
          onMapReady={() => setMapReady(true)}
        />

        {/* Back button overlay */}
        <TouchableOpacity style={styles.backOverlay} onPress={() => navigation.goBack()}>
          <Text style={styles.backOverlayText}>‹</Text>
        </TouchableOpacity>

        {/* Status message toast */}
        <Animated.View style={[styles.statusToast, { opacity: statusMessageAnim }]}>
          <Text style={styles.statusToastText}>{state.statusMessage}</Text>
        </Animated.View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: colors.trajectoryGNSS }]} />
            <Text style={styles.legendLabel}>GNSS</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: colors.trajectoryDR }]} />
            <Text style={styles.legendLabel}>DR</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: colors.trajectoryFused }]} />
            <Text style={styles.legendLabel}>Fused</Text>
          </View>
        </View>

        {/* Simulation badge */}
        {engine.isSimulated && (
          <View style={styles.simBadge}>
            <Text style={styles.simBadgeText}>DEMO STREAM</Text>
          </View>
        )}
      </View>

      {/* Status strip */}
      <StatusStrip mode={state.mode} />

      {/* Control card */}
      <View style={styles.controlWrapper}>
        <ControlCard
          mode={state.mode}
          appMode={appMode}
          gnssData={state.gnssData}
          drState={state.deadReckoning}
          totalDrivenDistance={totalDrivenDistance}
          onDisableGNSS={handleDisableGNSS}
          onEnableGNSS={handleEnableGNSS}
          onStop={handleStop}
        />

        {/* Live sensor mini-strip (LIVE mode only) */}
        {appMode === 'LIVE' && liveSensors.imu && (
          <View style={styles.sensorStrip}>
            <View style={styles.sensorStripItem}>
              <Text style={styles.sensorStripLabel}>ACC·X</Text>
              <Text style={styles.sensorStripValue}>
                {liveSensors.imu.accelerometer.x.toFixed(2)}
              </Text>
            </View>
            <View style={styles.sensorStripDivider} />
            <View style={styles.sensorStripItem}>
              <Text style={styles.sensorStripLabel}>GYRO·Z</Text>
              <Text style={styles.sensorStripValue}>
                {liveSensors.imu.gyroscope.z.toFixed(3)}
              </Text>
            </View>
            <View style={styles.sensorStripDivider} />
            <View style={styles.sensorStripItem}>
              <Text style={styles.sensorStripLabel}>HDG</Text>
              <Text style={styles.sensorStripValue}>
                {liveSensors.imu.heading.toFixed(0)}°
              </Text>
            </View>
            <View style={styles.sensorStripDivider} />
            <View style={styles.sensorStripItem}>
              <Text style={styles.sensorStripLabel}>GPS</Text>
              <Text style={[styles.sensorStripValue, { color: liveSensors.gnss ? colors.gnssActive : colors.gnssLost }]}>
                {liveSensors.gnss ? 'FIX' : 'WAIT'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  mapContainer: {
    height: MAP_HEIGHT,
    position: 'relative',
    backgroundColor: colors.white,
  },
  map: { ...StyleSheet.absoluteFill },

  backOverlay: {
    position: 'absolute',
    top: 52,
    left: spacing[4],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  backOverlayText: { fontSize: 24, color: colors.black, fontWeight: '300', lineHeight: 28 },

  statusToast: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  statusToastText: {
    ...textStyles.labelSmall,
    color: colors.surface,
    letterSpacing: 0.3,
  },

  legend: {
    position: 'absolute',
    bottom: spacing[3],
    left: spacing[3],
    flexDirection: 'row',
    gap: spacing[3],
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
  legendLabel: { fontSize: 10, fontWeight: fontWeights.semibold, color: colors.textSecondary },

  simBadge: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    backgroundColor: colors.deadReckoning,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  simBadgeText: { fontSize: 9, fontWeight: fontWeights.bold, color: colors.surface, letterSpacing: 1 },

  markerOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    ...shadows.sm,
  },
  markerText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.surface,
    letterSpacing: 0.5,
  },

  controlWrapper: {
    flex: 1,
  },
  controlCard: {
    margin: spacing[4],
    borderRadius: radius['2xl'],
    padding: spacing[5],
    gap: spacing[4],
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    ...textStyles.labelLarge,
    color: colors.textPrimary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardSubtitle: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing[5],
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  demoButtonsContainer: {
    gap: spacing[2],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'center',
  },
  gnssButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.xl,
  },
  gnssButtonDisable: {
    backgroundColor: colors.black,
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  gnssButtonRestore: {
    backgroundColor: colors.brandCream,
    borderWidth: 1.5,
    borderColor: colors.brandCreamDark,
  },
  gnssButtonIcon: {
    fontSize: 16,
  },
  gnssButtonText: {
    ...textStyles.labelMedium,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.6,
  },
  stopSmallButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSmallText: {
    ...textStyles.labelSmall,
    color: colors.black,
    fontWeight: fontWeights.bold,
  },
  stopFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: radius.xl,
    backgroundColor: colors.black,
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  stopFullIcon: { fontSize: 14, color: colors.white },
  stopFullText: {
    ...textStyles.labelLarge,
    color: colors.white,
    letterSpacing: 0.6,
  },
  drNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  drNote: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  sensorStrip: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  sensorStripItem: { alignItems: 'center', gap: 2 },
  sensorStripLabel: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sensorStripValue: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  sensorStripDivider: { width: 1, height: 24, backgroundColor: colors.borderLight },
});
