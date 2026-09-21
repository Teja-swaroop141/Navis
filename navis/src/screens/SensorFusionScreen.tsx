/**
 * SensorFusionScreen — visualization of GNSS + DR combination
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
import { haversineDistance } from '../services/sensorFusion';

function FusionPipelineStep({ from, to, label, active }: {
  from: string; to: string; label: string; active: boolean;
}) {
  const pulse = useRef(new Animated.Value(active ? 1 : 0.3)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      Animated.timing(pulse, { toValue: 0.25, duration: 300, useNativeDriver: true }).start();
    }
  }, [active]);

  return (
    <Animated.View style={[fusStyles.step, { opacity: pulse }]}>
      <View style={fusStyles.stepRow}>
        <View style={[fusStyles.stepNode, { borderColor: active ? colors.primary : colors.border }]}>
          <Text style={[fusStyles.stepNodeText, active && { color: colors.primary }]}>{from}</Text>
        </View>
        <View style={fusStyles.stepConnector}>
          <Text style={[fusStyles.stepLabel, active && { color: colors.primary }]}>{label}</Text>
          <View style={[fusStyles.connectorLine, { backgroundColor: active ? colors.primary : colors.border }]} />
        </View>
        <View style={[fusStyles.stepNode, { borderColor: active ? colors.gnssActive : colors.border }]}>
          <Text style={[fusStyles.stepNodeText, active && { color: colors.gnssActive }]}>{to}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const fusStyles = StyleSheet.create({
  step: {
    paddingVertical: spacing[2],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  stepNode: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    minWidth: 80,
  },
  stepNodeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  stepConnector: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  stepLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    fontWeight: fontWeights.medium,
    textAlign: 'center',
  },
  connectorLine: {
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
});

// Three-marker display
function MarkerComparison({ gnssPos, drPos, fusedPos }: {
  gnssPos: { lat: number; lon: number } | null;
  drPos: { lat: number; lon: number };
  fusedPos: { lat: number; lon: number } | null;
}) {
  return (
    <View style={markerStyles.row}>
      <View style={markerStyles.markerBlock}>
        <View style={[markerStyles.dot, { backgroundColor: colors.markerGNSS }]}>
          <Text style={markerStyles.dotText}>G</Text>
        </View>
        <Text style={markerStyles.markerLabel}>GNSS</Text>
        <Text style={markerStyles.markerCoord}>{gnssPos?.lat.toFixed(5) ?? '--'}</Text>
        <Text style={markerStyles.markerCoord}>{gnssPos?.lon.toFixed(5) ?? '--'}</Text>
      </View>

      <View style={markerStyles.markerBlock}>
        <View style={[markerStyles.dot, { backgroundColor: colors.markerDR }]}>
          <Text style={markerStyles.dotText}>D</Text>
        </View>
        <Text style={markerStyles.markerLabel}>DR</Text>
        <Text style={markerStyles.markerCoord}>{drPos.lat.toFixed(5)}</Text>
        <Text style={markerStyles.markerCoord}>{drPos.lon.toFixed(5)}</Text>
      </View>

      <View style={markerStyles.markerBlock}>
        <View style={[markerStyles.dot, { backgroundColor: colors.markerFused }]}>
          <Text style={markerStyles.dotText}>F</Text>
        </View>
        <Text style={markerStyles.markerLabel}>FUSED</Text>
        <Text style={markerStyles.markerCoord}>{fusedPos?.lat.toFixed(5) ?? '--'}</Text>
        <Text style={markerStyles.markerCoord}>{fusedPos?.lon.toFixed(5) ?? '--'}</Text>
      </View>
    </View>
  );
}

const markerStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  markerBlock: { alignItems: 'center', gap: spacing[2] },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  dotText: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.surface },
  markerLabel: { ...textStyles.labelSmall, color: colors.textSecondary, letterSpacing: 1 },
  markerCoord: { fontSize: 10, fontFamily: 'monospace', color: colors.textSecondary },
});

export function SensorFusionScreen() {
  const { state } = useNavigation();
  const fusion = state.fusion;
  const dr = state.deadReckoning;
  const gnss = state.gnssData;
  const isFusing = state.mode === 'GNSS_RECOVERING' || state.mode === 'FUSED';

  const drPos = { lat: dr.position.latitude, lon: dr.position.longitude };
  const gnssPos = gnss ? { lat: gnss.latitude, lon: gnss.longitude } : null;
  const fusedPos = fusion ? { lat: fusion.fusedPosition.latitude, lon: fusion.fusedPosition.longitude } : null;

  const separation = gnssPos && drPos
    ? haversineDistance(
        { latitude: gnssPos.lat, longitude: gnssPos.lon },
        { latitude: drPos.lat, longitude: drPos.lon }
      )
    : 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          title="Sensor Fusion"
          subtitle="GNSS + Dead Reckoning combination"
          right={<StatusBadge mode={state.mode} small />}
        />

        {/* Fusion pipeline */}
        <GlassCard elevated>
          <Text style={styles.cardTitle}>Fusion Pipeline</Text>
          <View style={styles.pipeline}>
            <View style={styles.pipelineInputs}>
              <View style={[styles.inputChip, { backgroundColor: colors.primarySurface }]}>
                <Text style={[styles.inputChipText, { color: colors.primary }]}>GNSS POSITION</Text>
              </View>
              <Text style={styles.plus}>+</Text>
              <View style={[styles.inputChip, { backgroundColor: colors.deadReckoningSurface }]}>
                <Text style={[styles.inputChipText, { color: colors.deadReckoning }]}>DR POSITION</Text>
              </View>
            </View>

            <View style={styles.pipelineArrow}>
              <View style={styles.arrowLine} />
              <Text style={styles.arrowHead}>↓</Text>
            </View>

            <View style={[styles.pipelineStep, { backgroundColor: colors.lavender }]}>
              <Text style={[styles.pipelineStepText, { color: colors.primary }]}>ERROR ESTIMATION</Text>
              <Text style={styles.pipelineStepSub}>
                Separation: {separation.toFixed(2)} m
              </Text>
            </View>

            <View style={styles.pipelineArrow}>
              <View style={styles.arrowLine} />
              <Text style={styles.arrowHead}>↓</Text>
            </View>

            <View style={[styles.pipelineStep, { backgroundColor: isFusing ? colors.primarySurface : colors.gray100 }]}>
              <Text style={[styles.pipelineStepText, { color: isFusing ? colors.primary : colors.textTertiary }]}>
                WEIGHTED FUSION
              </Text>
              <Text style={styles.pipelineStepSub}>
                GNSS: {fusion ? `${(fusion.gnssWeight * 100).toFixed(0)}%` : '--'}  ·  DR: {fusion ? `${(fusion.drWeight * 100).toFixed(0)}%` : '--'}
              </Text>
            </View>

            <View style={styles.pipelineArrow}>
              <View style={styles.arrowLine} />
              <Text style={styles.arrowHead}>↓</Text>
            </View>

            <View style={[styles.pipelineStep, { backgroundColor: isFusing ? colors.gnssActiveSurface : colors.gray100 }]}>
              <Text style={[styles.pipelineStepText, { color: isFusing ? colors.gnssActive : colors.textTertiary }]}>
                CORRECTED POSITION
              </Text>
              <Text style={styles.pipelineStepSub}>
                Error: {fusion ? `${fusion.finalError.toFixed(2)} m` : '--'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Marker comparison */}
        <GlassCard elevated>
          <Text style={styles.cardTitle}>Position Markers</Text>
          <MarkerComparison gnssPos={gnssPos} drPos={drPos} fusedPos={fusedPos} />
        </GlassCard>

        {/* Detailed metrics */}
        <GlassCard elevated>
          <Text style={styles.cardTitle}>Fusion Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>DR Error</Text>
              <Text style={[styles.metricValue, { color: colors.deadReckoning }]}>
                {dr.estimatedError.toFixed(2)} m
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>GNSS Accuracy</Text>
              <Text style={[styles.metricValue, { color: colors.gnssActive }]}>
                {gnss?.accuracy?.toFixed(2) ?? '--'} m
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>GNSS Weight</Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>
                {fusion ? `${(fusion.gnssWeight * 100).toFixed(0)}%` : '--'}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>DR Weight</Text>
              <Text style={[styles.metricValue, { color: colors.secondary }]}>
                {fusion ? `${(fusion.drWeight * 100).toFixed(0)}%` : '--'}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Correction Applied</Text>
              <Text style={[styles.metricValue, { color: colors.recovering }]}>
                {fusion ? `${fusion.correctionApplied.toFixed(2)} m` : '--'}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Final Error</Text>
              <Text style={[styles.metricValue, { color: colors.fused }]}>
                {fusion ? `${fusion.finalError.toFixed(2)} m` : '--'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {!isFusing && (
          <View style={styles.infoNote}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Fusion activates when GNSS is restored after a DR period. Navigate to the Navigation screen and trigger a GNSS outage cycle to see fusion in action.
            </Text>
          </View>
        )}

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
  cardTitle: {
    ...textStyles.labelLarge,
    color: colors.textPrimary,
    marginBottom: spacing[5],
  },
  pipeline: { gap: 0, alignItems: 'center' },
  pipelineInputs: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  inputChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  inputChipText: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, letterSpacing: 0.8 },
  plus: { fontSize: fontSizes.xl, color: colors.textTertiary, fontWeight: fontWeights.bold },
  pipelineArrow: { alignItems: 'center', gap: 0 },
  arrowLine: { width: 2, height: 16, backgroundColor: colors.borderLight },
  arrowHead: { fontSize: fontSizes.lg, color: colors.border, marginTop: -4 },
  pipelineStep: {
    width: '100%',
    padding: spacing[4],
    borderRadius: radius.xl,
    alignItems: 'center',
    gap: 4,
  },
  pipelineStepText: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, letterSpacing: 0.8 },
  pipelineStepSub: { ...textStyles.caption, color: colors.textTertiary },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  metricItem: { width: '44%', gap: 2 },
  metricLabel: { ...textStyles.caption, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, letterSpacing: -0.3 },

  infoNote: {
    flexDirection: 'row',
    gap: spacing[2],
    backgroundColor: colors.lavender,
    padding: spacing[4],
    borderRadius: radius.xl,
    alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 16 },
  infoText: { ...textStyles.bodySmall, color: colors.textSecondary, flex: 1, lineHeight: 20 },
  spacer: { height: spacing[8] },
});
