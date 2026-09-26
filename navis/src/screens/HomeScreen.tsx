/**
 * HomeScreen.tsx — NAVIS Executive Landing Screen
 * 
 * Strict Color Theme:
 * - Brand Cream: #FAEDCB
 * - Pure White: #FFFFFF
 * - Deep Onyx Black: #000000
 * - Monochrome Gray Tones
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { textStyles, fontWeights, fontSizes } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { GlassCard } from '../components/GlassCard';
import { NavisLogo } from '../components/NavisLogo';

const { width } = Dimensions.get('window');

type Props = { navigation: any };

// High-tech Inertial Navigation Radar & Trajectory Visualizer
function MiniMapVisual() {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const markerBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse ring 1
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse1, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();

    // Pulse ring 2 (offset)
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse2, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulse2, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    }, 1000);

    // Radar scan sweep
    Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 1,
        duration: 3200,
        useNativeDriver: true,
      })
    ).start();

    // Subtle position marker float
    Animated.loop(
      Animated.sequence([
        Animated.timing(markerBounce, { toValue: -4, duration: 1100, useNativeDriver: true }),
        Animated.timing(markerBounce, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const pulseScale1 = pulse1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const pulseOpacity1 = pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });
  const pulseScale2 = pulse2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const pulseOpacity2 = pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });
  const sweepRotation = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={mapStyles.container}>
      {/* Background Matrix Grid */}
      <View style={mapStyles.gridLayer}>
        <View style={mapStyles.gridCircleOuter} />
        <View style={mapStyles.gridCircleMiddle} />
        <View style={mapStyles.gridCircleInner} />
        <View style={mapStyles.crosshairH} />
        <View style={mapStyles.crosshairV} />
      </View>

      {/* Radar Sweep Arc */}
      <Animated.View
        style={[
          mapStyles.radarSweep,
          {
            transform: [{ rotate: sweepRotation }],
          },
        ]}
      />

      {/* Trajectory Vectors */}
      {/* Primary GNSS Route Line (Solid Black) */}
      <View style={mapStyles.routeGNSS} />
      {/* Dead Reckoning Inertial Path (Dashed #FAEDCB Cream Line) */}
      <View style={mapStyles.routeDR} />

      {/* Expanding Radar Pulses */}
      <Animated.View
        style={[
          mapStyles.pulseRing,
          { transform: [{ scale: pulseScale1 }], opacity: pulseOpacity1 },
        ]}
      />
      <Animated.View
        style={[
          mapStyles.pulseRing,
          { transform: [{ scale: pulseScale2 }], opacity: pulseOpacity2 },
        ]}
      />

      {/* Real-time Inertial Heading Marker */}
      <Animated.View
        style={[
          mapStyles.markerContainer,
          { transform: [{ translateY: markerBounce }] },
        ]}
      >
        <View style={mapStyles.markerArrow}>
          <Feather name="navigation" size={18} color={colors.black} style={{ transform: [{ rotate: '45deg' }] }} />
        </View>
        <View style={mapStyles.markerPulseDot} />
      </Animated.View>

      {/* Status Badges */}
      <View style={mapStyles.labelGNSS}>
        <View style={mapStyles.labelDotGNSS} />
        <Text style={mapStyles.labelTextGNSS}>GNSS FIX</Text>
      </View>

      <View style={mapStyles.labelDR}>
        <View style={mapStyles.labelDotDR} />
        <Text style={mapStyles.labelTextDR}>INS READY</Text>
      </View>

      <View style={mapStyles.coordinateOverlay}>
        <Text style={mapStyles.coordinateText}>37.7749° N, 122.4194° W</Text>
      </View>
    </View>
  );
}

const mapStyles = StyleSheet.create({
  container: {
    height: 210,
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.brandCreamDark,
  },
  gridLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCircleOuter: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: 'rgba(180, 150, 80, 0.25)',
  },
  gridCircleMiddle: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: 'rgba(180, 150, 80, 0.35)',
  },
  gridCircleInner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(180, 150, 80, 0.5)',
  },
  crosshairH: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(180, 150, 80, 0.2)',
  },
  crosshairV: {
    position: 'absolute',
    top: 20,
    bottom: 20,
    width: 1,
    backgroundColor: 'rgba(180, 150, 80, 0.2)',
  },
  radarSweep: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 90,
    height: 2,
    backgroundColor: colors.brandCream,
    opacity: 0.7,
    transformOrigin: 'left center',
  },
  routeGNSS: {
    position: 'absolute',
    bottom: 60,
    left: 40,
    right: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.black,
    transform: [{ rotate: '-14deg' }],
    opacity: 0.9,
  },
  routeDR: {
    position: 'absolute',
    bottom: 50,
    left: 120,
    right: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#C4A64B',
    transform: [{ rotate: '-6deg' }],
    opacity: 0.95,
  },
  pulseRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: colors.brandCreamDark,
    marginTop: -25,
    marginLeft: -25,
  },
  markerContainer: {
    position: 'absolute',
    top: '46%',
    left: '50%',
    alignItems: 'center',
    marginLeft: -15,
    marginTop: -15,
  },
  markerArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  markerPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.black,
    marginTop: 4,
  },
  labelGNSS: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  labelDotGNSS: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.black,
  },
  labelTextGNSS: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.black,
    letterSpacing: 0.6,
  },
  labelDR: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brandCream,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
    ...shadows.sm,
  },
  labelDotDR: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.black,
  },
  labelTextDR: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.black,
    letterSpacing: 0.6,
  },
  coordinateOverlay: {
    position: 'absolute',
    bottom: 8,
    left: spacing[3],
  },
  coordinateText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
});

// Features strictly styled in #FAEDCB, white, and black
const features = [
  {
    icon: 'shield',
    title: 'GNSS Blackout Resilience',
    desc: 'Seamlessly maintain high-precision vehicle tracking during underground tunnels, urban canyons, and satellite dropouts.',
  },
  {
    icon: 'cpu',
    title: 'Smart Inertial Fusion',
    desc: 'Combines smartphone accelerometer, gyroscope yaw rates, and magnetometer azimuth with extended Kalman estimation.',
  },
  {
    icon: 'compass',
    title: 'Real-Time Drift Rejection',
    desc: 'Integrated Zero-Velocity Updates (ZUPT) and non-holonomic motion constraints prevent dead reckoning position runaway.',
  },
];

export function HomeScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 75, friction: 11 }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.brandCream} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Executive Header with #FAEDCB Warm Butter Cream Gradient */}
        <LinearGradient
          colors={[colors.brandCream, colors.brandCreamLight, colors.background]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.headerGradient}
        >
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Top Bar with new Logo and Status Badge */}
            <View style={styles.topBarRow}>
              <NavisLogo size="md" variant="light" showText={true} showSubtitle={true} subtitle="INERTIAL ENGINE" />
              
              <View style={styles.systemStatusBadge}>
                <View style={styles.systemStatusDot} />
                <Text style={styles.systemStatusText}>ONLINE</Text>
              </View>
            </View>

            {/* Headline */}
            <View style={styles.headlineBlock}>
              <Text style={styles.headline}>
                Precision Navigation{'\n'}Beyond Signals.
              </Text>
              <Text style={styles.subheadline}>
                Automotive-grade dead reckoning keeping you continuous when GNSS signals disappear.
              </Text>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Live Vector Radar Visual Card */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <GlassCard style={styles.mapCard} padding={spacing[4]}>
            <MiniMapVisual />
            <View style={styles.mapCardFooter}>
              <View style={{ gap: 2 }}>
                <Text style={styles.mapCardTitle}>Inertial Dead Reckoning</Text>
                <Text style={styles.mapCardSub}>GNSS + 9-DOF IMU Sensor Fusion Pipeline</Text>
              </View>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Primary CTA Buttons */}
        <Animated.View style={[styles.ctaSection, { opacity: fadeAnim }]}>
          <PrimaryButton
            label="Start Live Navigation"
            onPress={() => navigation.navigate('ModeSelection')}
            icon={<Feather name="navigation" size={16} color={colors.black} />}
          />
          <SecondaryButton
            label="Demonstration Mode"
            onPress={() => navigation.navigate('ModeSelection')}
            icon={<Feather name="play-circle" size={16} color={colors.black} />}
          />

          {/* 3D Tunnel Simulation Banner (Floating White Card & Cream Icon) */}
          <TouchableOpacity
            style={styles.simulationBanner}
            onPress={() => navigation.navigate('Simulation')}
            activeOpacity={0.88}
          >
            <View style={styles.simulationBannerLeft}>
              <View style={styles.simulationBannerIcon}>
                <Feather name="play" size={18} color={colors.black} />
              </View>
              <View style={styles.simulationBannerTexts}>
                <View style={styles.simulationBannerBadgeRow}>
                  <Text style={styles.simulationBannerTitle}>Tunnel GNSS Outage</Text>
                  <View style={styles.simPill}>
                    <Text style={styles.simPillText}>3D SIMULATION</Text>
                  </View>
                </View>
                <Text style={styles.simulationBannerSubtitle}>
                  Three.js 3D driving view with automatic fork decision heuristics
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={colors.black} />
          </TouchableOpacity>

          {/* Sensor Failure Scenarios Banner (White Card & Cream Border) */}
          <TouchableOpacity
            style={styles.scenarioBanner}
            onPress={() => navigation.navigate('Scenarios')}
            activeOpacity={0.88}
          >
            <View style={styles.simulationBannerLeft}>
              <View style={styles.scenarioBannerIcon}>
                <Feather name="alert-triangle" size={18} color={colors.black} />
              </View>
              <View style={styles.simulationBannerTexts}>
                <View style={styles.simulationBannerBadgeRow}>
                  <Text style={styles.scenarioBannerTitle}>Sensor Failure Scenarios</Text>
                  <View style={styles.scenarioPill}>
                    <Text style={styles.scenarioPillText}>EDGE CASES</Text>
                  </View>
                </View>
                <Text style={styles.scenarioBannerSubtitle}>
                  Adaptive resilience under accelerometer & gyro dropouts
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={colors.black} />
          </TouchableOpacity>
        </Animated.View>

        {/* Why NAVIS — Technical Capabilities */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.featuresTitle}>ENGINE ARCHITECTURE</Text>
            <View style={styles.sectionDividerLine} />
          </View>

          {features.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Feather name={f.icon as any} size={20} color={colors.black} />
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
    paddingTop: spacing[8],
    paddingBottom: spacing[12],
    gap: spacing[6],
  },
  headerGradient: {
    marginHorizontal: -spacing[5],
    marginTop: -spacing[8],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[10],
    paddingBottom: spacing[6],
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
  },
  header: { gap: spacing[4] },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing[2],
  },
  systemStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  systemStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.black,
  },
  systemStatusText: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.black,
    letterSpacing: 0.8,
  },
  headlineBlock: {
    gap: spacing[2],
  },
  headline: {
    ...textStyles.displayMedium,
    color: colors.black,
    fontWeight: fontWeights.extrabold,
    letterSpacing: -0.6,
  },
  subheadline: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  mapCard: {
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mapCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[4],
  },
  mapCardTitle: {
    ...textStyles.labelLarge,
    color: colors.black,
    fontWeight: fontWeights.bold,
  },
  mapCardSub: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brandCream,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.black,
  },
  activeBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.black,
    letterSpacing: 0.8,
  },

  ctaSection: { gap: spacing[3] },

  // Simulation & Scenario Floating White Cards
  simulationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing[4],
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: spacing[2],
    ...shadows.sm,
  },
  simulationBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  simulationBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    backgroundColor: colors.brandCream,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulationBannerTexts: {
    flex: 1,
    gap: 3,
  },
  simulationBannerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  simulationBannerTitle: {
    ...textStyles.labelLarge,
    color: colors.black,
    fontWeight: fontWeights.bold,
  },
  simPill: {
    backgroundColor: colors.brandCream,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
  },
  simPillText: {
    fontSize: 8,
    fontWeight: fontWeights.extrabold,
    color: colors.black,
    letterSpacing: 0.6,
  },
  simulationBannerSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  // Scenario White & Cream Banner
  scenarioBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing[4],
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  scenarioBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    backgroundColor: colors.brandCream,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scenarioBannerTitle: {
    ...textStyles.labelLarge,
    color: colors.black,
    fontWeight: fontWeights.bold,
  },
  scenarioPill: {
    backgroundColor: colors.brandCreamLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
  },
  scenarioPillText: {
    fontSize: 8,
    fontWeight: fontWeights.extrabold,
    color: colors.black,
    letterSpacing: 0.6,
  },
  scenarioBannerSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  featuresTitle: {
    fontSize: 11,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 1.2,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[4],
    padding: spacing[4],
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    backgroundColor: colors.brandCream,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, gap: spacing[1] },
  featureTitle: {
    ...textStyles.labelLarge,
    color: colors.black,
    fontWeight: fontWeights.bold,
  },
  featureDesc: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  spacer: { height: spacing[8] },
});
