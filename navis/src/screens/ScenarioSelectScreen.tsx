/**
 * ScenarioSelectScreen
 *
 * Chooses between Tunnel GNSS Outage and Urban Canyon GNSS Degradation.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { colors } from '../theme/colors';
import { textStyles, fontSizes, fontWeights } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { NavigationHeader } from '../components/NavigationHeader';

type Props = { navigation: any };

export function ScenarioSelectScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <NavigationHeader
        title="Scenarios"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={styles.headline}>Simulation Scenarios</Text>
          <Text style={styles.subheadline}>
            Each scenario is independent. Tunnel demonstrates a complete GNSS outage. Urban Canyon keeps GNSS on, but unreliable.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Simulation')}
          activeOpacity={0.88}
        >
          <View style={styles.iconWrap}>
            <Text style={styles.emoji}>🚗</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>Tunnel GNSS Outage</Text>
              <View style={styles.pill}>
                <Text style={styles.pillText}>OUTAGE</Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>
              GNSS becomes unavailable inside the tunnel. Dead reckoning carries the vehicle through, then fusion recovers at the exit.
            </Text>
            <Text style={styles.cardMeta}>GNSS = unavailable</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.cardCanyon]}
          onPress={() => navigation.navigate('UrbanCanyon')}
          activeOpacity={0.88}
        >
          <View style={[styles.iconWrap, styles.iconWrapCanyon]}>
            <Text style={styles.emoji}>🏙️</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <Text style={[styles.cardTitle, styles.cardTitleCanyon]}>Urban Canyon GNSS Degradation</Text>
              <View style={[styles.pill, styles.pillCanyon]}>
                <Text style={styles.pillText}>DEGRADED</Text>
              </View>
            </View>
            <Text style={[styles.cardDesc, styles.cardDescCanyon]}>
              GNSS stays on but jumps and drifts between tall buildings. NAVIS holds a smoother estimate with IMU / dead reckoning.
            </Text>
            <Text style={[styles.cardMeta, styles.cardMetaCanyon]}>GNSS = available but unreliable</Text>
          </View>
          <Text style={[styles.arrow, styles.arrowCanyon]}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[12],
    gap: spacing[4],
  },
  headerSection: { gap: spacing[2], marginBottom: spacing[2] },
  headline: {
    ...textStyles.headingLarge,
    color: colors.textPrimary,
  },
  subheadline: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderRadius: radius.xl,
    padding: spacing[4],
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    gap: spacing[3],
    ...shadows.sm,
  },
  cardCanyon: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapCanyon: {
    backgroundColor: '#E0E7FF',
  },
  emoji: { fontSize: 22 },
  cardBody: { flex: 1, gap: 4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardTitle: {
    ...textStyles.labelLarge,
    color: '#4C1D95',
    fontWeight: fontWeights.bold,
  },
  cardTitleCanyon: {
    color: '#312E81',
  },
  pill: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.sm,
  },
  pillCanyon: {
    backgroundColor: '#4F46E5',
  },
  pillText: {
    fontSize: 8,
    fontWeight: fontWeights.extrabold,
    color: colors.surface,
    letterSpacing: 0.5,
  },
  cardDesc: {
    fontSize: fontSizes.xs,
    color: '#6D28D9',
    lineHeight: 16,
  },
  cardDescCanyon: {
    color: '#4338CA',
  },
  cardMeta: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#7C3AED',
    marginTop: 2,
  },
  cardMetaCanyon: {
    color: '#4F46E5',
  },
  arrow: {
    fontSize: 24,
    color: '#8B5CF6',
    fontWeight: '300',
  },
  arrowCanyon: {
    color: '#4F46E5',
  },
});
