/**
 * ModeSelectionScreen
 *
 * Lets the user choose between Live Sensor Mode and Demonstration Mode.
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, ScrollView, StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { textStyles, fontSizes, fontWeights } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { NavigationHeader } from '../components/NavigationHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ModeSelection'>;

interface ModeCardProps {
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  buttonLabel: string;
  onPress: () => void;
  featured?: boolean;
  delay?: number;
}

function ModeCard({ title, subtitle, description, features, buttonLabel, onPress, featured, delay = 0 }: ModeCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12, delay } as any),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.modeCard,
      featured && styles.featuredCard,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
    ]}>
      {featured && (
        <View style={styles.featuredBadge}>
          <Feather name="star" size={10} color={colors.primaryLight} />
          <Text style={styles.featuredBadgeText}>Recommended for Demos</Text>
        </View>
      )}
      <Text style={[styles.modeTitle, featured && styles.modeTitleFeatured]}>{title}</Text>
      <Text style={[styles.modeSubtitle, featured && styles.modeSubtitleFeatured]}>{subtitle}</Text>
      <Text style={[styles.modeDesc, featured && styles.modeDescFeatured]}>{description}</Text>

      <View style={styles.featureList}>
        {features.map((f) => (
          <View key={f} style={styles.featureItem}>
            <Feather name="check" size={11} color={featured ? colors.primaryLight : colors.gnssActive} />
            <Text style={[styles.featureLabel, featured && styles.featureLabelFeatured]}>{f}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.modeButton, featured && styles.modeButtonFeatured]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={[styles.modeButtonText, featured && styles.modeButtonTextFeatured]}>
          {buttonLabel}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ModeSelectionScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <NavigationHeader title="Choose Mode" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={styles.headline}>Choose Navigation Mode</Text>
          <Text style={styles.subheadline}>
            Select how you want to experience GNSS Dead Reckoning navigation.
          </Text>
        </View>

        <ModeCard
          title="Live Sensor Mode"
          subtitle="Real smartphone sensors"
          description="Uses actual GNSS, accelerometer, gyroscope, and magnetometer data from your device."
          features={['GNSS positioning', 'Accelerometer', 'Gyroscope', 'Magnetometer']}
          buttonLabel="Start Live Mode"
          onPress={() => navigation.navigate('Navigation', { mode: 'LIVE' })}
          delay={0}
        />

        <ModeCard
          title="Demonstration Mode"
          subtitle="Controlled GNSS outage scenario"
          description="Predefined walking route with automatic GNSS outage and recovery — perfect for presentations."
          features={[
            'GNSS ON → GNSS OFF',
            'Dead Reckoning',
            'GNSS Restored',
            'Sensor Fusion + Correction',
          ]}
          buttonLabel="Start Demo"
          onPress={() => navigation.navigate('Navigation', { mode: 'DEMO' })}
          featured
          delay={150}
        />

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
    paddingBottom: spacing[12],
    gap: spacing[5],
  },
  headerSection: { gap: spacing[2] },
  headline: {
    ...textStyles.headingLarge,
    color: colors.textPrimary,
  },
  subheadline: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  modeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing[6],
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing[4],
    ...shadows.sm,
  },
  featuredCard: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
    ...shadows.lg,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
  },
  featuredBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
  },
  modeTitle: {
    ...textStyles.headingMedium,
    color: colors.textPrimary,
  },
  modeTitleFeatured: { color: colors.surface },
  modeSubtitle: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    marginTop: -spacing[2],
  },
  modeSubtitleFeatured: { color: 'rgba(255,255,255,0.65)' },
  modeDesc: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  modeDescFeatured: { color: 'rgba(255,255,255,0.75)' },

  featureList: { gap: spacing[2] },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  featureCheck: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    width: 16,
  },
  featureLabel: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  featureLabelFeatured: { color: 'rgba(255,255,255,0.85)' },

  modeButton: {
    backgroundColor: colors.primarySurface,
    borderRadius: radius.xl,
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginTop: spacing[2],
  },
  modeButtonFeatured: {
    backgroundColor: colors.surface,
  },
  modeButtonText: {
    ...textStyles.labelLarge,
    color: colors.primary,
  },
  modeButtonTextFeatured: { color: colors.primaryDark },
  spacer: { height: spacing[8] },
});
