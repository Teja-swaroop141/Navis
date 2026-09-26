/**
 * UrbanCanyonScreen.tsx
 *
 * Dedicated Urban Canyon GNSS Degradation simulation screen with 3D driving view
 * and interactive NAVIS decision explanation overlay modal.
 * Independent of SimulationScreen / tunnel engine.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
import { fontWeights } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { NavigationHeader } from '../components/NavigationHeader';
import { UrbanCanyonMapView } from '../components/UrbanCanyonMapView';
import { UrbanCanyonStatus } from '../components/UrbanCanyonStatus';
import { UrbanCanyonIndicator } from '../components/UrbanCanyonIndicator';
import { UrbanCanyonResults } from '../components/UrbanCanyonResults';
import { SimulationControls } from '../components/SimulationControls';
import { UrbanCanyonDecisionModal } from '../components/UrbanCanyonDecisionModal';
import {
  urbanCanyonEngine,
  UrbanCanyonFrame,
  UrbanCanyonSummary,
} from '../services/urbanCanyonEngine';
import { SpeedMultiplier } from '../services/simulationEngine';

type Props = {
  navigation: any;
};

export function UrbanCanyonScreen({ navigation }: Props) {
  const [frame, setFrame] = useState<UrbanCanyonFrame>(urbanCanyonEngine.getCurrentFrame());
  const [summary, setSummary] = useState<UrbanCanyonSummary | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const prevNotificationRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubFrame = urbanCanyonEngine.subscribe((newFrame) => {
      setFrame(newFrame);
    });
    const unsubComplete = urbanCanyonEngine.onComplete((res) => {
      setSummary(res);
    });
    return () => {
      unsubFrame();
      unsubComplete();
    };
  }, []);

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

  const handleStart = () => {
    setSummary(null);
    urbanCanyonEngine.start();
  };
  const handlePause = () => urbanCanyonEngine.pause();
  const handleResume = () => urbanCanyonEngine.resume();
  const handleRestart = () => {
    setSummary(null);
    urbanCanyonEngine.restart();
  };
  const handleSpeedSelect = (spd: SpeedMultiplier) => urbanCanyonEngine.setSpeedMultiplier(spd);
  const handleTogglePresentation = () => setIsPresentationMode((prev) => !prev);
  const handleRunAgain = () => {
    setSummary(null);
    urbanCanyonEngine.restart();
  };

  const isCompleted = frame.state === 'COMPLETED' && summary !== null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <NavigationHeader
        title="Urban Canyon 3D"
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
            <Text style={styles.headerBadgeText}>3D DRIVING</Text>
          </View>
        }
      />

      <View style={styles.mapContainer}>
        <UrbanCanyonMapView
          frame={frame}
          isPresentationMode={isPresentationMode}
          style={StyleSheet.absoluteFill}
        />

        {frame.statusNotification && (
          <Animated.View style={[styles.notificationToast, { opacity: toastAnim }]}>
            <View style={styles.toastDot} />
            <Text style={styles.toastText}>{frame.statusNotification}</Text>
          </Animated.View>
        )}
      </View>

      <View style={[styles.bottomSheet, isPresentationMode && styles.bottomSheetPresentation]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          style={styles.bottomScroll}
        >
          <UrbanCanyonIndicator
            isApproaching={frame.isApproachingCanyon}
            isInsideCanyon={frame.isInsideCanyon}
            canyonProgressPercent={frame.canyonProgressPercent}
            canyonDrivenMeters={frame.canyonDrivenMeters}
            canyonLengthMeters={frame.canyonLengthMeters}
            liveStatus={frame.liveStatus}
          />

          {isCompleted ? (
            <UrbanCanyonResults summary={summary} onRunAgain={handleRunAgain} />
          ) : (
            <>
              <UrbanCanyonStatus frame={frame} isPresentationMode={isPresentationMode} />
              <SimulationControls
                state={frame.state as any}
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
        </ScrollView>
      </View>

      {/* Root Overlay: Dims full screen (map + bottomSheet) with highest z-index */}
      <UrbanCanyonDecisionModal state={frame.state} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
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
  notificationToast: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    right: 170,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...shadows.md,
    zIndex: 100,
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
    maxHeight: '48%',
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
  bottomScroll: {
    flexGrow: 0,
  },
});
