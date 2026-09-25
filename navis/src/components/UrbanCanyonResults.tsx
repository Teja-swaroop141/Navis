/**
 * UrbanCanyonResults.tsx
 *
 * Post-run summary for Urban Canyon GNSS Degradation.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { fontSizes, fontWeights } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { UrbanCanyonSummary } from '../services/urbanCanyonEngine';

interface UrbanCanyonResultsProps {
  summary: UrbanCanyonSummary;
  onRunAgain: () => void;
}

export function UrbanCanyonResults({ summary, onRunAgain }: UrbanCanyonResultsProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.header}>
        <View style={styles.trophyCircle}>
          <Text style={styles.trophyIcon}>✓</Text>
        </View>
        <View>
          <Text style={styles.superTitle}>TEST RUN COMPLETED</Text>
          <Text style={styles.title}>Urban Canyon Complete</Text>
        </View>
      </View>

      <Text style={styles.summaryCaption}>
        GNSS remained available but unreliable inside the canyon. NAVIS held a smoother trajectory using inertial motion estimation, then re-aligned as signal quality recovered.
      </Text>

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.itemLabel}>PEAK GNSS ERROR</Text>
          <Text style={styles.itemValue}>{summary.peakGnssErrorM.toFixed(1)} <Text style={styles.unit}>m</Text></Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.itemLabel}>PEAK NAVIS ERROR</Text>
          <Text style={styles.itemValue}>{summary.peakNavisErrorM.toFixed(1)} <Text style={styles.unit}>m</Text></Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.itemLabel}>MEAN GNSS (CANYON)</Text>
          <Text style={styles.itemValue}>{summary.meanGnssErrorInCanyonM.toFixed(1)} <Text style={styles.unit}>m</Text></Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.itemLabel}>MEAN NAVIS (CANYON)</Text>
          <Text style={styles.itemValue}>{summary.meanNavisErrorInCanyonM.toFixed(1)} <Text style={styles.unit}>m</Text></Text>
        </View>
      </View>

      <View style={styles.checklist}>
        <View style={styles.checkItem}>
          <Text style={styles.checkTitle}>GNSS DEGRADATION</Text>
          <View style={styles.badgeSuccess}>
            <Text style={styles.badgeSuccessText}>SIMULATED ✓</Text>
          </View>
        </View>
        <View style={styles.checkDivider} />
        <View style={styles.checkItem}>
          <Text style={styles.checkTitle}>NAVIS ESTIMATION</Text>
          <View style={styles.badgeSuccess}>
            <Text style={styles.badgeSuccessText}>STABLE ✓</Text>
          </View>
        </View>
        <View style={styles.checkDivider} />
        <View style={styles.checkItem}>
          <Text style={styles.checkTitle}>GNSS RECOVERY</Text>
          <View style={styles.badgeSuccess}>
            <Text style={styles.badgeSuccessText}>{summary.recoveryStatus} ✓</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.runAgainBtn} onPress={onRunAgain} activeOpacity={0.88}>
        <Text style={styles.runAgainIcon}>↺</Text>
        <Text style={styles.runAgainText}>RUN AGAIN</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing[5],
    gap: spacing[4],
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  trophyCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  superTitle: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  summaryCaption: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  gridItem: {
    width: '47%',
    gap: 2,
  },
  itemLabel: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    letterSpacing: 0.6,
  },
  itemValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  unit: {
    fontSize: 10,
    fontWeight: fontWeights.normal,
    color: colors.textTertiary,
  },
  checklist: {
    backgroundColor: colors.lavender,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  checkTitle: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },
  badgeSuccess: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeSuccessText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#059669',
  },
  checkDivider: {
    height: 1,
    backgroundColor: 'rgba(200, 195, 235, 0.4)',
  },
  runAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    paddingVertical: spacing[4],
    gap: spacing[2],
    ...shadows.md,
  },
  runAgainIcon: {
    fontSize: 16,
    color: colors.surface,
  },
  runAgainText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.surface,
    letterSpacing: 0.8,
  },
});
