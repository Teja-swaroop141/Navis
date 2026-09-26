/**
 * ScenarioCard.tsx
 *
 * Card component displaying a navigation scenario.
 * Matches #FAEDCB, White, and Black theme tokens.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { textStyles, fontWeights, fontSizes } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { PrimaryButton } from './PrimaryButton';
import { GlassCard } from './GlassCard';
import { ScenarioDefinition } from '../data/scenarioRoutes';

interface ScenarioCardProps {
  scenario: ScenarioDefinition;
  onRun: () => void;
}

export function ScenarioCard({ scenario, onRun }: ScenarioCardProps) {
  const isReady = scenario.status === 'READY';

  return (
    <GlassCard style={styles.card} padding={spacing[5]}>
      {/* Header row with Title and Status Pill */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryDot, { backgroundColor: isReady ? colors.black : colors.gray400 }]} />
            <Text style={styles.categoryText}>{scenario.category.toUpperCase()}</Text>
          </View>
          <Text style={styles.title}>{scenario.title}</Text>
        </View>

        <View style={[styles.statusPill, isReady ? styles.statusPillReady : styles.statusPillSoon]}>
          <View style={[styles.statusDot, isReady ? styles.statusDotReady : styles.statusDotSoon]} />
          <Text style={[styles.statusText, isReady ? styles.statusTextReady : styles.statusTextSoon]}>
            {isReady ? 'READY' : 'COMING SOON'}
          </Text>
        </View>
      </View>

      {/* Subtitle & Description */}
      <Text style={styles.subtitle}>{scenario.subtitle}</Text>
      <Text style={styles.description}>{scenario.description}</Text>

      {/* Tags */}
      <View style={styles.tagsRow}>
        {scenario.tags.map((tag) => (
          <View key={tag} style={styles.tagPill}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        {isReady ? (
          <PrimaryButton
            label="Run Scenario"
            onPress={onRun}
            icon={<Feather name="play" size={14} color={colors.black} />}
          />
        ) : (
          <TouchableOpacity
            style={styles.disabledBtn}
            disabled={true}
            activeOpacity={1}
          >
            <Text style={styles.disabledBtnText}>Coming Soon</Text>
          </TouchableOpacity>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[4],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius['2xl'],
    ...shadows.md,
    gap: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  titleGroup: {
    flex: 1,
    gap: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    color: colors.black,
    letterSpacing: 0.8,
  },
  title: {
    ...textStyles.headingMedium,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 6,
    borderWidth: 1,
  },
  statusPillReady: {
    backgroundColor: colors.brandCream,
    borderColor: colors.brandCreamDark,
  },
  statusPillSoon: {
    backgroundColor: colors.gray100,
    borderColor: colors.border,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotReady: {
    backgroundColor: colors.black,
  },
  statusDotSoon: {
    backgroundColor: colors.gray400,
  },
  statusText: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 0.6,
  },
  statusTextReady: {
    color: colors.black,
  },
  statusTextSoon: {
    color: colors.textTertiary,
  },
  subtitle: {
    ...textStyles.bodyMedium,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  description: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: 2,
  },
  tagPill: {
    backgroundColor: colors.brandCream,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
  },
  tagText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.black,
    letterSpacing: 0.2,
  },
  actionContainer: {
    marginTop: spacing[2],
  },
  disabledBtn: {
    paddingVertical: spacing[3] + 2,
    borderRadius: radius.xl,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledBtnText: {
    ...textStyles.labelMedium,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
});
