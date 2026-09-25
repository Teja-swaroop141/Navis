/**
 * SimulationScreen.tsx
 *
 * Dedicated GNSS Dead Reckoning Tunnel Simulation Screen.
 *
 * Demonstrates the core resilient positioning thesis:
 * GNSS AVAILABLE → CAR APPROACHES TUNNEL → GNSS SIGNAL LOST →
 * DEAD RECKONING ACTIVATED → CAR CONTINUES MOVING → CAR EXITS TUNNEL →
 * GNSS SIGNAL RESTORED → POSITION CORRECTED → GNSS + IMU NAVIGATION.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { fontSizes, fontWeights, textStyles } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { NavigationHeader } from '../components/NavigationHeader';
import { SimulationMapView } from '../components/SimulationMapView';
import { SimulationStatus } from '../components/SimulationStatus';
import { SimulationControls } from '../components/SimulationControls';
import { TunnelIndicator } from '../components/TunnelIndicator';
import { SimulationResults } from '../components/SimulationResults';
import {
  simulationEngine,
  SimulationFrame,
  SimulationSummary,
  SpeedMultiplier,
} from '../services/simulationEngine';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = {
  navigation: any;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function SimulationScreen({ navigation }: Props) {
  const [frame, setFrame] = useState<SimulationFrame>(simulationEngine.getCurrentFrame());
  const [summary, setSummary] = useState<SimulationSummary | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);

  // Status notification animated toast
  const toastAnim = useRef(new Animated.Value(0)).current;
  const prevNotificationRef = useRef<string | null>(null);

  useEffect(() => {
    // Subscribe to frame ticks
    const unsubFrame = simulationEngine.subscribe((newFrame) => {
      setFrame(newFrame);
    });

    // Subscribe to completion
    const unsubComplete = simulationEngine.onComplete((res) => {
      setSummary(res);
    });

    return () => {
      unsubFrame();
      unsubComplete();
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
    simulationEngine.start();
  };

  const handlePause = () => {
    simulationEngine.pause();
  };

  const handleResume = () => {
    simulationEngine.resume();
  };

  const handleRestart = () => {
    setSummary(null);
    simulationEngine.restart();
  };

  const handleForkPause = () => {
    simulationEngine.pause();
  };

  const handleForkResume = () => {
    simulationEngine.resume();
  };

  const handleSpeedSelect = (spd: SpeedMultiplier) => {
    simulationEngine.setSpeedMultiplier(spd);
  };

  const handleTogglePresentation = () => {
    setIsPresentationMode(prev => !prev);
  };

  const handleRunAgain = () => {
    setSummary(null);
    simulationEngine.restart();
  };

  const isCompleted = frame.state === 'COMPLETED' && summary !== null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
      <NavigationHeader
        title="Simulation"
        onBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('HomeTab');
          }
        }}
        right={
          <View style={styles.headerBadge}>
            <View style={styles.headerBadgeDot} />
            <Text style={styles.headerBadgeText}>OSM</Text>
          </View>
        }
      />

      {/* Main Map Canvas */}
      <View style={styles.mapContainer}>
        <SimulationMapView
          frame={frame}
          isPresentationMode={isPresentationMode}
          style={StyleSheet.absoluteFill}
          onForkDecisionPause={handleForkPause}
          onForkDecisionResume={handleForkResume}
        />

        {/* Legend Overlay */}
        <View style={styles.legendOverlay}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBar, { backgroundColor: '#4F46E5' }]} />
            <Text style={styles.legendText}>GNSS</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBar, styles.legendBarDashed, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Dead Reckoning</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBar, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Fused</Text>
          </View>
        </View>

        {/* Notification Toast Overlay */}
        {frame.statusNotification && (
          <Animated.View style={[styles.notificationToast, { opacity: toastAnim }]}>
            <View style={styles.toastDot} />
            <Text style={styles.toastText}>{frame.statusNotification}</Text>
          </Animated.View>
        )}
      </View>

      {/* Bottom Floating Control Panel */}
      <View style={[styles.bottomSheet, isPresentationMode && styles.bottomSheetPresentation]}>
        {/* Tunnel Indicator (Approaching banner or In-tunnel progress) */}
        <TunnelIndicator
          isApproaching={frame.isApproachingTunnel}
          isInsideTunnel={frame.isInsideTunnel}
          tunnelProgressPercent={frame.tunnelProgressPercent}
          tunnelDrivenMeters={frame.tunnelDrivenMeters}
          tunnelLengthMeters={frame.tunnelLengthMeters}
          timeWithoutGNSSSec={frame.timeWithoutGNSSSec}
        />

        {/* Post-Run Result Card or Live Status */}
        {isCompleted ? (
          <SimulationResults
            summary={summary}
            onRunAgain={handleRunAgain}
          />
        ) : (
          <>
            <SimulationStatus
              frame={frame}
              isPresentationMode={isPresentationMode}
            />

            <SimulationControls
              state={frame.state}
              isPaused={frame.isPaused}
              speedMultiplier={frame.speedMultiplier}
              isPresentationMode={isPresentationMode}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onRestart={handleRestart}
              onTogglePresentationMode={handleTogglePresentation}
              onSelectSpeed={handleSpeedSelect}
            />
          </>
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
    color: colors.primary,
    letterSpacing: 0.5,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  legendOverlay: {
    position: 'absolute',
    bottom: spacing[3],
    left: spacing[3],
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
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
    gap: 5,
  },
  legendBar: {
    width: 14,
    height: 4,
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
    top: spacing[3],
    left: spacing[3],
    right: 180,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...shadows.md,
  },
  toastDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  toastText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.surface,
    letterSpacing: 0.2,
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
  },
  bottomSheetPresentation: {
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
});
