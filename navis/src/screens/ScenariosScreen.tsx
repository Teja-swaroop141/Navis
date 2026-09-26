/**
 * ScenariosScreen.tsx
 *
 * Scenarios landing screen.
 * Displays navigation scenarios designed to test edge cases in dead reckoning.
 *
 * Header: "Scenarios"
 * Subtitle: "Explore how navigation responds to real-world sensor failures."
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Animated,
} from 'react-native';
import { colors } from '../theme/colors';
import { textStyles, fontWeights, fontSizes } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { NavigationHeader } from '../components/NavigationHeader';
import { ScenarioCard } from '../components/ScenarioCard';
import { Feather } from '@expo/vector-icons';
import {
  SENSOR_FAILURE_SCENARIO,
  ScenarioDefinition,
} from '../data/scenarioRoutes';

type Props = {
  navigation: any;
};

export function ScenariosScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
    ]).start();
  }, []);

  const handleRunScenario = (scenario: ScenarioDefinition) => {
    if (scenario.id === 'sensor-failure-dr') {
      navigation.navigate('SensorFailureScenario');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Top Header */}
      <NavigationHeader
        title="Scenarios"
        onBack={
          navigation.canGoBack()
            ? () => navigation.goBack()
            : undefined
        }
        right={
          <View style={styles.headerBadge}>
            <View style={styles.headerBadgeDot} />
            <Text style={styles.headerBadgeText}>EDGE CASES</Text>
          </View>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Intro Header */}
        <Animated.View style={[styles.introHeader, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.iconCircle}>
            <Feather name="activity" size={24} color={colors.black} />
          </View>
          <View style={styles.introTexts}>
            <Text style={styles.mainTitle}>Navigation Scenarios</Text>
            <Text style={styles.subtitle}>
              Explore how navigation responds to real-world sensor failures.
            </Text>
          </View>
        </Animated.View>

        {/* Informative Banner */}
        <Animated.View style={[styles.bannerCard, { opacity: fadeAnim }]}>
          <Feather name="shield" size={20} color={colors.black} />
          <View style={styles.bannerTexts}>
            <Text style={styles.bannerTitle}>Resilience Testing</Text>
            <Text style={styles.bannerBody}>
              Test how smartphone IMU sensors handle unexpected hardware loss, step degradation, and gyroscope yaw rate failures while continuing dead reckoning.
            </Text>
          </View>
        </Animated.View>

        {/* Section: Available Scenarios */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ACTIVE SCENARIOS</Text>
            <Text style={styles.sectionCount}>1 READY</Text>
          </View>

          {/* First Scenario: SENSOR FAILURE */}
          <ScenarioCard
            scenario={SENSOR_FAILURE_SCENARIO}
            onRun={() => handleRunScenario(SENSOR_FAILURE_SCENARIO)}
          />
        </Animated.View>



        <View style={styles.spacer} />
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[5],
  },
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[2],
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.brandCream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.brandCreamDark,
  },
  iconEmoji: {
    fontSize: 24,
  },
  introTexts: {
    flex: 1,
    gap: 4,
  },
  mainTitle: {
    ...textStyles.headingLarge,
    color: colors.textPrimary,
  },
  subtitle: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.surface,
    padding: spacing[4],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bannerEmoji: {
    fontSize: 20,
  },
  bannerTexts: {
    flex: 1,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  bannerBody: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  spacer: {
    height: spacing[6],
  },
});
