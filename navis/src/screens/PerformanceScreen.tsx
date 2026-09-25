/**
 * PerformanceScreen — post-session results dashboard
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Animated, StatusBar, Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { textStyles, fontSizes, fontWeights } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { useNavigation } from '../state/NavigationContext';
import { GlassCard } from '../components/GlassCard';
import { SectionHeader } from '../components/SectionHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Performance'>;

const { width } = Dimensions.get('window');

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  color?: string;
  icon?: keyof typeof Feather.glyphMap;
  delay?: number;
}

function StatCard({ label, value, unit, color = colors.primary, icon, delay = 0 }: StatCardProps) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 14, delay } as any),
    ]).start();
  }, []);

  return (
    <Animated.View style={[statStyles.card, { opacity: fade, transform: [{ translateY: slide }] }]}>
      {icon && <Feather name={icon} size={22} color={color} style={statStyles.iconEl as any} />}
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      {unit && <Text style={statStyles.unit}>{unit}</Text>}
      <Text style={statStyles.label}>{label}</Text>
    </Animated.View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[5],
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderColor: colors.borderLight,
    width: (width - spacing[5] * 2 - spacing[4]) / 2,
    ...shadows.sm,
  },
  icon: { fontSize: 24, marginBottom: 4 },
  iconEl: { marginBottom: 4 },
  value: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: -0.5,
  },
  unit: {
    ...textStyles.caption,
    color: colors.textTertiary,
    marginTop: -2,
  },
  label: {
    ...textStyles.labelSmall,
    color: colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

// Mini trajectory comparison chart
function TrajectoryLegend() {
  const items = [
    { color: colors.trajectoryGNSS, label: 'GNSS Path', style: 'solid' },
    { color: colors.trajectoryDR, label: 'Dead Reckoning', style: 'dashed' },
    { color: colors.trajectoryFused, label: 'Fused Path', style: 'solid' },
    { color: colors.trajectoryReference, label: 'Reference', style: 'dotted' },
  ];

  return (
    <View style={legendStyles.container}>
      {items.map((item) => (
        <View key={item.label} style={legendStyles.item}>
          <View style={[legendStyles.line, { backgroundColor: item.color }]} />
          <Text style={legendStyles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const legendStyles = StyleSheet.create({
  container: { gap: spacing[2] },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  line: { width: 28, height: 3, borderRadius: 2 },
  label: { ...textStyles.bodySmall, color: colors.textSecondary, fontWeight: fontWeights.medium },
});

export function PerformanceScreen({ navigation }: Props) {
  const { state, getPerformanceMetrics } = useNavigation();
  const metrics = getPerformanceMetrics();

  const headerFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const formatSec = (s: number) => `${s.toFixed(0)}`;
  const formatM = (m: number) => `${m.toFixed(1)}`;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <View style={styles.headerTop}>
            <View style={styles.successBadge}>
              <Feather name="check-circle" size={18} color={colors.gnssActive} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Navigation Performance</Text>
              <Text style={styles.headerSub}>Session complete</Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="radio"
            label="GNSS Outage Duration"
            value={formatSec(metrics.outageDuration)}
            unit="sec"
            color={colors.gnssLost}
            delay={0}
          />
          <StatCard
            icon="map"
            label="Distance Covered"
            value={formatM(metrics.totalDistance)}
            unit="m"
            color={colors.primary}
            delay={80}
          />
          <StatCard
            icon="alert-triangle"
            label="Max DR Error"
            value={formatM(metrics.maxDRError)}
            unit="m"
            color={colors.deadReckoning}
            delay={160}
          />
          <StatCard
            icon="target"
            label="Final Position Error"
            value={formatM(metrics.finalPositionError)}
            unit="m"
            color={colors.recovering}
            delay={240}
          />
          <StatCard
            icon="zap"
            label="Recovery Time"
            value={formatM(metrics.recoveryTime)}
            unit="sec"
            color={colors.gnssActive}
            delay={320}
          />
          <StatCard
            icon="bar-chart-2"
            label="Sensor Update Rate"
            value={`${metrics.sensorUpdateRate}`}
            unit="Hz"
            color={colors.fused}
            delay={400}
          />
        </View>

        {/* Correction applied */}
        <GlassCard elevated>
          <Text style={styles.sectionTitle}>Fusion Correction</Text>
          <View style={styles.correctionRow}>
            <View style={styles.corrPoint}>
              <Text style={styles.corrLabel}>DR Position</Text>
              <Text style={styles.corrValue}>{`${state.deadReckoning.position.latitude.toFixed(5)}`}</Text>
              <Text style={styles.corrValue}>{`${state.deadReckoning.position.longitude.toFixed(5)}`}</Text>
            </View>
            <View style={styles.corrArrow}>
              <Text style={styles.corrArrowText}>→</Text>
              <Text style={styles.corrArrowSub}>{formatM(metrics.correctionApplied)} m</Text>
            </View>
            <View style={styles.corrPoint}>
              <Text style={styles.corrLabel}>Fused Position</Text>
              <Text style={[styles.corrValue, { color: colors.gnssActive }]}>
                {state.fusion ? `${state.fusion.fusedPosition.latitude.toFixed(5)}` : state.gnssData ? `${state.gnssData.latitude.toFixed(5)}` : '--'}
              </Text>
              <Text style={[styles.corrValue, { color: colors.gnssActive }]}>
                {state.fusion ? `${state.fusion.fusedPosition.longitude.toFixed(5)}` : state.gnssData ? `${state.gnssData.longitude.toFixed(5)}` : '--'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Trajectory legend */}
        <GlassCard elevated>
          <Text style={styles.sectionTitle}>Trajectory Analysis</Text>
          <TrajectoryLegend />
          <View style={styles.trajectoryStats}>
            <View style={styles.trajStat}>
              <Text style={styles.trajStatLabel}>GNSS Points</Text>
              <Text style={[styles.trajStatValue, { color: colors.trajectoryGNSS }]}>
                {state.trajectory.filter(p => p.type === 'GNSS').length}
              </Text>
            </View>
            <View style={styles.trajStat}>
              <Text style={styles.trajStatLabel}>DR Points</Text>
              <Text style={[styles.trajStatValue, { color: colors.trajectoryDR }]}>
                {state.trajectory.filter(p => p.type === 'DR').length}
              </Text>
            </View>
            <View style={styles.trajStat}>
              <Text style={styles.trajStatLabel}>Fused Points</Text>
              <Text style={[styles.trajStatValue, { color: colors.trajectoryFused }]}>
                {state.trajectory.filter(p => p.type === 'FUSED').length}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Mode summary */}
        <GlassCard>
          <Text style={styles.sectionTitle}>Session Summary</Text>
          <View style={styles.modeFlow}>
            {[
              { label: 'GNSS Active', color: colors.gnssActive },
              { label: '→', color: colors.textTertiary },
              { label: 'GNSS Lost', color: colors.gnssLost },
              { label: '→', color: colors.textTertiary },
              { label: 'Dead Reckoning', color: colors.deadReckoning },
              { label: '→', color: colors.textTertiary },
              { label: 'GNSS Restored', color: colors.recovering },
              { label: '→', color: colors.textTertiary },
              { label: 'Fused', color: colors.fused },
            ].map((item, i) => (
              <Text key={i} style={[styles.flowItem, { color: item.color }]}>{item.label}</Text>
            ))}
          </View>
        </GlassCard>

        {/* Actions */}
        <View style={styles.actions}>
          <PrimaryButton
            label="Restart Demonstration"
            onPress={() => {
              navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
            }}
          />
          <SecondaryButton
            label="Back to Home"
            onPress={() => navigation.navigate('Home')}
          />
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
    gap: spacing[5],
  },
  header: { gap: spacing[3] },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  successBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gnssActiveSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: { fontSize: 22, color: colors.gnssActive },
  headerText: { gap: 2 },
  headerTitle: { ...textStyles.headingLarge, color: colors.textPrimary },
  headerSub: { ...textStyles.bodySmall, color: colors.textSecondary },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },

  sectionTitle: {
    ...textStyles.labelLarge,
    color: colors.textPrimary,
    marginBottom: spacing[4],
  },

  correctionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  corrPoint: { gap: 4, flex: 1 },
  corrLabel: { ...textStyles.caption, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  corrValue: { fontSize: 11, fontFamily: 'monospace', color: colors.textPrimary, fontWeight: fontWeights.semibold },
  corrArrow: { alignItems: 'center', gap: 2, paddingHorizontal: spacing[2] },
  corrArrowText: { fontSize: fontSizes.xl, color: colors.primary },
  corrArrowSub: { ...textStyles.caption, color: colors.primary, fontWeight: fontWeights.semibold },

  trajectoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  trajStat: { alignItems: 'center', gap: 2 },
  trajStatLabel: { ...textStyles.caption, color: colors.textTertiary },
  trajStatValue: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold },

  modeFlow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[1],
  },
  flowItem: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold },

  actions: { gap: spacing[3] },
  spacer: { height: spacing[8] },
});
