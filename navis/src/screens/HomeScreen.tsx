/**
 * HomeScreen
 *
 * Premium landing page inspired by the reference design's visual philosophy:
 * clean whites, lavender accents, floating cards, and spacious layout.
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Animated, TouchableOpacity,
  Dimensions, StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { textStyles, fontWeights, fontSizes } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { GlassCard } from '../components/GlassCard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

const { width, height } = Dimensions.get('window');

type Props = { navigation: any };

// Mini map visual — animated circles simulating location markers
function MiniMapVisual() {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const markerBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse1, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();

    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse2, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(pulse2, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    }, 900);

    Animated.loop(
      Animated.sequence([
        Animated.timing(markerBounce, { toValue: -6, duration: 900, useNativeDriver: true }),
        Animated.timing(markerBounce, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const pulseScale1 = pulse1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const pulseOpacity1 = pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
  const pulseScale2 = pulse2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const pulseOpacity2 = pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <View style={mapStyles.container}>
      {/* Background gradient pattern (simulated map tiles) */}
      <View style={mapStyles.mapBg} />
      <View style={mapStyles.gridH1} />
      <View style={mapStyles.gridH2} />
      <View style={mapStyles.gridV1} />
      <View style={mapStyles.gridV2} />

      {/* Route lines */}
      <View style={mapStyles.routeGNSS} />
      <View style={mapStyles.routeDR} />

      {/* Pulse rings */}
      <Animated.View style={[mapStyles.pulseRing, { transform: [{ scale: pulseScale1 }], opacity: pulseOpacity1 }]} />
      <Animated.View style={[mapStyles.pulseRing, { transform: [{ scale: pulseScale2 }], opacity: pulseOpacity2 }]} />

      {/* Location marker */}
      <Animated.View style={[mapStyles.markerContainer, { transform: [{ translateY: markerBounce }] }]}>
        <View style={mapStyles.markerDot} />
        <View style={mapStyles.markerStem} />
      </Animated.View>

      {/* Labels */}
      <View style={mapStyles.labelGNSS}>
        <View style={[mapStyles.labelDot, { backgroundColor: colors.trajectoryGNSS }]} />
        <Text style={mapStyles.labelText}>GNSS</Text>
      </View>
      <View style={mapStyles.labelDR}>
        <View style={[mapStyles.labelDot, { backgroundColor: colors.trajectoryDR }]} />
        <Text style={mapStyles.labelText}>Dead Reckoning</Text>
      </View>
    </View>
  );
}

const mapStyles = StyleSheet.create({
  container: {
    height: 200,
    width: '100%',
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EEF0F8',
  },
  mapBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E8EBF5',
  },
  gridH1: { position: 'absolute', left: 0, right: 0, top: '35%', height: 1, backgroundColor: 'rgba(180,185,210,0.6)' },
  gridH2: { position: 'absolute', left: 0, right: 0, top: '65%', height: 1, backgroundColor: 'rgba(180,185,210,0.6)' },
  gridV1: { position: 'absolute', top: 0, bottom: 0, left: '35%', width: 1, backgroundColor: 'rgba(180,185,210,0.6)' },
  gridV2: { position: 'absolute', top: 0, bottom: 0, left: '65%', width: 1, backgroundColor: 'rgba(180,185,210,0.6)' },

  routeGNSS: {
    position: 'absolute',
    bottom: 55, left: 30, right: 80,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.trajectoryGNSS,
    transform: [{ rotate: '-12deg' }],
    opacity: 0.9,
  },
  routeDR: {
    position: 'absolute',
    bottom: 45, left: 90, right: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.trajectoryDR,
    transform: [{ rotate: '-8deg' }],
    opacity: 0.7,
    borderStyle: 'dashed',
  },

  pulseRing: {
    position: 'absolute',
    top: '35%',
    left: '52%',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    marginTop: -20,
    marginLeft: -20,
  },
  markerContainer: {
    position: 'absolute',
    top: '28%',
    left: '52%',
    alignItems: 'center',
    marginLeft: -12,
  },
  markerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  markerStem: {
    width: 3,
    height: 8,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  labelGNSS: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  labelDR: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  labelDot: { width: 6, height: 6, borderRadius: 3 },
  labelText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
});

// Feature items
const features = [
  {
    icon: 'radio',
    title: 'GNSS Resilience',
    desc: 'Continue navigation during signal loss.',
    color: colors.primarySurface,
  },
  {
    icon: 'link',
    title: 'Smart Sensor Fusion',
    desc: 'Combine GNSS and smartphone IMU data.',
    color: colors.secondarySurface,
  },
  {
    icon: 'map-pin',
    title: 'Real-Time Positioning',
    desc: 'Track movement continuously.',
    color: '#F0FDF4',
  },
];

export function HomeScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
              <Feather name="navigation" size={18} color={colors.surface} />
            </View>
            <Text style={styles.logoText}>NAVIS</Text>
          </View>
          <Text style={styles.headline}>Navigate with{'\n'}Confidence</Text>
          <Text style={styles.subheadline}>
            Continuous positioning even when GNSS signals disappear.
          </Text>
        </Animated.View>

        {/* Map visual card */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <GlassCard style={styles.mapCard} padding={spacing[4]}>
            <MiniMapVisual />
            <View style={styles.mapCardFooter}>
              <View>
                <Text style={styles.mapCardTitle}>Dead Reckoning Navigation</Text>
                <Text style={styles.mapCardSub}>GNSS + IMU sensor fusion</Text>
              </View>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>LIVE</Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View style={[styles.ctaSection, { opacity: fadeAnim }]}>
          <PrimaryButton
            label="Start Live Navigation"
            onPress={() => navigation.navigate('ModeSelection')}
          />
          <SecondaryButton
            label="Demonstration Mode"
            onPress={() => navigation.navigate('ModeSelection')}
          />
          <TouchableOpacity
            style={styles.simulationBanner}
            onPress={() => navigation.navigate('Simulation')}
            activeOpacity={0.88}
          >
            <View style={styles.simulationBannerLeft}>
              <View style={styles.simulationBannerIcon}>
                <Feather name="play-circle" size={20} color={colors.primary} />
              </View>
              <View style={styles.simulationBannerTexts}>
                <View style={styles.simulationBannerBadgeRow}>
                  <Text style={styles.simulationBannerTitle}>Tunnel GNSS Outage</Text>
                  <View style={styles.simPill}>
                    <Text style={styles.simPillText}>SIMULATION</Text>
                  </View>
                </View>
                <Text style={styles.simulationBannerSubtitle}>
                  OpenStreetMap road dead reckoning demonstration
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#8B5CF6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.simulationBanner}
            onPress={() => navigation.navigate('Scenarios')}
            activeOpacity={0.88}
          >
            <View style={styles.simulationBannerLeft}>
              <View style={[styles.simulationBannerIcon, { backgroundColor: colors.lavender }]}>
                <Feather name="activity" size={20} color={colors.primary} />
              </View>
              <View style={styles.simulationBannerTexts}>
                <View style={styles.simulationBannerBadgeRow}>
                  <Text style={styles.simulationBannerTitle}>Sensor Failure Scenarios</Text>
                  <View style={[styles.simPill, { backgroundColor: colors.primarySurface }]}>
                    <Text style={[styles.simPillText, { color: colors.primaryDark }]}>SCENARIOS</Text>
                  </View>
                </View>
                <Text style={styles.simulationBannerSubtitle}>
                  Adaptive dead reckoning under IMU sensor dropouts
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#8B5CF6" />
          </TouchableOpacity>
        </Animated.View>

        {/* Features */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.featuresTitle}>Why NAVIS</Text>
          {features.map((f) => (
            <View key={f.title} style={[styles.featureCard, { backgroundColor: f.color }]}>
              <View style={styles.featureIcon}>
                <Feather name={f.icon as any} size={22} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
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
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[10],
    paddingBottom: spacing[10],
    gap: spacing[6],
  },
  header: { gap: spacing[3] },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: { color: colors.surface, fontSize: 18 },
  logoText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 3,
  },
  headline: {
    ...textStyles.displayMedium,
    color: colors.textPrimary,
  },
  subheadline: {
    ...textStyles.bodyLarge,
    color: colors.textSecondary,
    lineHeight: 24,
  },

  mapCard: { overflow: 'hidden' },
  mapCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[4],
  },
  mapCardTitle: {
    ...textStyles.labelLarge,
    color: colors.textPrimary,
  },
  mapCardSub: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.gnssActiveSurface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gnssActive,
  },
  activeBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.gnssActive,
    letterSpacing: 1,
  },

  ctaSection: { gap: spacing[3] },

  simulationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF5FF',
    borderRadius: radius.xl,
    padding: spacing[4],
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    marginTop: spacing[1],
    ...shadows.sm,
  },
  simulationBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  simulationBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulationBannerEmoji: {
    fontSize: 20,
  },
  simulationBannerTexts: {
    flex: 1,
    gap: 2,
  },
  simulationBannerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  simulationBannerTitle: {
    ...textStyles.labelLarge,
    color: '#4C1D95',
    fontWeight: fontWeights.bold,
  },
  simPill: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.sm,
  },
  simPillText: {
    fontSize: 8,
    fontWeight: fontWeights.extrabold,
    color: colors.surface,
    letterSpacing: 0.5,
  },
  simulationBannerSubtitle: {
    fontSize: fontSizes.xs,
    color: '#6D28D9',
  },
  simulationBannerArrow: {
    fontSize: 24,
    color: '#8B5CF6',
    fontWeight: '300',
    marginLeft: spacing[2],
  },

  featuresTitle: {
    ...textStyles.headingSmall,
    color: colors.textPrimary,
    marginBottom: spacing[4],
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[4],
    borderRadius: radius.xl,
    marginBottom: spacing[3],
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  featureEmoji: { fontSize: 22 },
  featureText: { flex: 1, gap: spacing[1] },
  featureTitle: {
    ...textStyles.labelLarge,
    color: colors.textPrimary,
  },
  featureDesc: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
  spacer: { height: spacing[8] },
});
