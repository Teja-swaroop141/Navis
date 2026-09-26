/**
 * DeadReckoningScreen — technical visualization of the DR algorithm pipeline
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, StatusBar } from 'react-native';
import { colors } from '../theme/colors';
import { textStyles, fontSizes, fontWeights } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { useNavigation } from '../state/NavigationContext';
import { GlassCard } from '../components/GlassCard';
import { SectionHeader } from '../components/SectionHeader';
import { StatusBadge } from '../components/StatusBadge';

// Pipeline step component
function PipelineStep({ label, value, color, active, isLast }: {
  label: string; value?: string; color: string; active: boolean; isLast?: boolean;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [active]);

  return (
    <View style={pipelineStyles.stepContainer}>
      <View style={pipelineStyles.stepRow}>
        <Animated.View style={[pipelineStyles.stepDot, { backgroundColor: color, opacity: active ? pulse : 0.3 }]} />
        <View style={pipelineStyles.stepContent}>
          <Text style={[pipelineStyles.stepLabel, active && { color: colors.textPrimary }]}>{label}</Text>
          {value && <Text style={[pipelineStyles.stepValue, { color }]}>{value}</Text>}
        </View>
      </View>
      {!isLast && <View style={pipelineStyles.connector} />}
    </View>
  );
}

const pipelineStyles = StyleSheet.create({
  stepContainer: { alignItems: 'flex-start' },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: spacing[2],
  },
  stepContent: { gap: 2 },
  stepLabel: {
    ...textStyles.labelMedium,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stepValue: {
    ...textStyles.bodySmall,
    fontWeight: fontWeights.semibold,
  },
  connector: {
    width: 2,
    height: 16,
    backgroundColor: colors.borderLight,
    marginLeft: spacing[2] + 5,
  },
});

// Mini live trajectory canvas
function MiniTrajectory({ trajectory }: { trajectory: Array<{ x: number; y: number }> }) {
  const W = 280;
  const H = 120;
  const padding = 16;

  if (trajectory.length < 2) {
    return (
      <View style={[miniTrajStyles.canvas, { width: W, height: H }]}>
        <Text style={miniTrajStyles.emptyText}>Waiting for trajectory…</Text>
      </View>
    );
  }

  const xs = trajectory.map(p => p.x);
  const ys = trajectory.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const toScreen = (p: { x: number; y: number }) => ({
    x: padding + ((p.x - minX) / rangeX) * (W - 2 * padding),
    y: H - padding - ((p.y - minY) / rangeY) * (H - 2 * padding),
  });

  return (
    <View style={[miniTrajStyles.canvas, { width: W, height: H }]}>
      {trajectory.slice(0, -1).map((p, i) => {
        const a = toScreen(p);
        const b = toScreen(trajectory[i + 1]);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        return (
          <View
            key={i}
            style={[
              miniTrajStyles.segment,
              {
                left: a.x,
                top: a.y,
                width: len,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}
      {/* Current position dot */}
      {trajectory.length > 0 && (() => {
        const last = toScreen(trajectory[trajectory.length - 1]);
        return (
          <View style={[miniTrajStyles.currentDot, { left: last.x - 5, top: last.y - 5 }]} />
        );
      })()}
    </View>
  );
}

const miniTrajStyles = StyleSheet.create({
  canvas: {
    backgroundColor: colors.gray100,
    borderRadius: radius.lg,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  segment: {
    position: 'absolute',
    height: 3,
    backgroundColor: colors.brandCreamDark,
    borderRadius: 1.5,
    transformOrigin: 'left center',
  },
  currentDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.black,
    borderWidth: 2,
    borderColor: colors.brandCream,
  },
  emptyText: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 48,
  },
});

export function DeadReckoningScreen() {
  const { state } = useNavigation();
  const dr = state.deadReckoning;
  const imu = state.imuData;
  const isDR = state.mode === 'DEAD_RECKONING';

  const accelMag = imu?.accelerometer
    ? Math.sqrt(imu.accelerometer.x ** 2 + imu.accelerometer.y ** 2 + imu.accelerometer.z ** 2) - 9.81
    : 0;

  // Convert DR trajectory to 2D relative coords for mini-graph
  const miniTraj = state.trajectory
    .filter(p => p.type === 'DR')
    .map((p, i, arr) => ({
      x: (p.position.longitude - arr[0].position.longitude) * 111320 * Math.cos(arr[0].position.latitude * Math.PI / 180),
      y: (p.position.latitude - arr[0].position.latitude) * 111320,
    }));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          title="Dead Reckoning Engine"
          subtitle="Real-time algorithm visualization"
          right={<StatusBadge mode={state.mode} small />}
        />

        {/* Algorithm pipeline */}
        <GlassCard elevated>
          <Text style={styles.pipelineTitle}>Processing Pipeline</Text>
          <PipelineStep label="Acceleration" value={`${Math.abs(accelMag).toFixed(3)} m/s²`} color={colors.primary} active={!!imu} />
          <PipelineStep label="Gravity Filtering" value="Low-pass α=0.1" color={colors.secondary} active={!!imu} />
          <PipelineStep label="Orientation" value={`${dr.heading.toFixed(1)}° heading`} color={colors.gnssActive} active={isDR || !!imu} />
          <PipelineStep label="Velocity" value={`${dr.velocity.toFixed(2)} m/s`} color={colors.deadReckoning} active={isDR} />
          <PipelineStep label="Distance" value={`${dr.distanceTraveled.toFixed(1)} m`} color={colors.recovering} active={isDR} />
          <PipelineStep label="Position" value={`${dr.position.latitude.toFixed(6)}, ${dr.position.longitude.toFixed(6)}`} color={colors.fused} active={isDR} isLast />
        </GlassCard>

        {/* Live values */}
        <GlassCard elevated>
          <Text style={styles.sectionTitle}>Live Engine Values</Text>
          <View style={styles.valueGrid}>
            <View style={styles.valueBlock}>
              <Text style={styles.valueLabel}>Acceleration</Text>
              <Text style={[styles.value, { color: colors.primary }]}>{Math.abs(accelMag).toFixed(3)}</Text>
              <Text style={styles.valueUnit}>m/s²</Text>
            </View>
            <View style={styles.valueBlock}>
              <Text style={styles.valueLabel}>Velocity</Text>
              <Text style={[styles.value, { color: colors.secondary }]}>{(dr.velocity * 3.6).toFixed(2)}</Text>
              <Text style={styles.valueUnit}>km/h</Text>
            </View>
            <View style={styles.valueBlock}>
              <Text style={styles.valueLabel}>Heading</Text>
              <Text style={[styles.value, { color: colors.gnssActive }]}>{dr.heading.toFixed(1)}°</Text>
              <Text style={styles.valueUnit}>degrees</Text>
            </View>
            <View style={styles.valueBlock}>
              <Text style={styles.valueLabel}>Steps</Text>
              <Text style={[styles.value, { color: colors.deadReckoning }]}>{dr.stepCount}</Text>
              <Text style={styles.valueUnit}>detected</Text>
            </View>
            <View style={styles.valueBlock}>
              <Text style={styles.valueLabel}>Distance</Text>
              <Text style={[styles.value, { color: colors.recovering }]}>{dr.distanceTraveled.toFixed(1)}</Text>
              <Text style={styles.valueUnit}>meters</Text>
            </View>
            <View style={styles.valueBlock}>
              <Text style={styles.valueLabel}>Est. Error</Text>
              <Text style={[styles.value, { color: colors.gnssLost }]}>~{dr.estimatedError.toFixed(1)}</Text>
              <Text style={styles.valueUnit}>meters</Text>
            </View>
            <View style={styles.valueBlock}>
              <Text style={styles.valueLabel}>DR Duration</Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>
                {Math.floor(dr.elapsedTime / 60).toString().padStart(2, '0')}:{Math.floor(dr.elapsedTime % 60).toString().padStart(2, '0')}
              </Text>
              <Text style={styles.valueUnit}>mm:ss</Text>
            </View>
            <View style={styles.valueBlock}>
              <Text style={styles.valueLabel}>DR Active</Text>
              <Text style={[styles.value, { color: dr.isActive ? colors.gnssActive : colors.gray400 }]}>
                {dr.isActive ? 'YES' : 'NO'}
              </Text>
              <Text style={styles.valueUnit}></Text>
            </View>
          </View>
        </GlassCard>

        {/* DR Position */}
        <GlassCard elevated>
          <Text style={styles.sectionTitle}>DR Position Estimate</Text>
          <View style={styles.positionBlock}>
            <View style={styles.posField}>
              <Text style={styles.posLabel}>Latitude</Text>
              <Text style={styles.posValue}>{dr.position.latitude.toFixed(7)}</Text>
            </View>
            <View style={styles.posField}>
              <Text style={styles.posLabel}>Longitude</Text>
              <Text style={styles.posValue}>{dr.position.longitude.toFixed(7)}</Text>
            </View>
          </View>
        </GlassCard>

        {/* Mini trajectory */}
        <GlassCard elevated>
          <Text style={styles.sectionTitle}>Dead Reckoning Trajectory</Text>
          <View style={styles.miniTrajContainer}>
            <MiniTrajectory trajectory={miniTraj} />
          </View>
          <Text style={styles.trajCaption}>
            {miniTraj.length} DR points plotted
          </Text>
        </GlassCard>

        {/* Algorithm notes */}
        <View style={styles.algorithmNote}>
          <Text style={styles.algorithmTitle}>Algorithm Notes</Text>
          <Text style={styles.algorithmText}>
            Step length: 0.72m avg • Error growth: ~5%/m • Gravity filter: α=0.1{'\n'}
            Heading fusion: 70% gyro + 30% magnetometer{'\n'}
            Position integration: 2D equirectangular approximation
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  pipelineTitle: {
    ...textStyles.labelMedium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[3],
  },
  sectionTitle: {
    ...textStyles.labelLarge,
    color: colors.textPrimary,
    marginBottom: spacing[4],
  },
  valueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  valueBlock: {
    width: '44%',
    gap: 2,
    paddingBottom: spacing[3],
  },
  valueLabel: {
    ...textStyles.labelSmall,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.5,
  },
  valueUnit: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  positionBlock: { gap: spacing[4] },
  posField: { gap: 2 },
  posLabel: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  posValue: {
    fontFamily: 'monospace',
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
    letterSpacing: 0.3,
  },
  miniTrajContainer: { alignItems: 'center' },
  trajCaption: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  algorithmNote: {
    backgroundColor: colors.lavender,
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[2],
  },
  algorithmTitle: {
    ...textStyles.labelMedium,
    color: colors.primary,
  },
  algorithmText: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  spacer: { height: spacing[8] },
});
