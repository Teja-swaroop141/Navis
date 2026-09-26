/**
 * UrbanCanyonDecisionModal.tsx
 *
 * Cinematic automotive digital-twin decision explanation modal overlay.
 * Pauses simulation on decision events, dims backdrop over full screen,
 * and renders a centered, non-overlapping responsive card with scrollable body
 * and sticky footer button.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
import { fontSizes, fontWeights } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { UrbanCanyonState, urbanCanyonEngine } from '../services/urbanCanyonEngine';

interface UrbanCanyonDecisionModalProps {
  state: UrbanCanyonState;
  onDismiss?: () => void;
}

interface DecisionContent {
  id: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  title: string;
  subtitle: string;
  whatHappened: string;
  whyNavisResponded: string;
  decisionMade: string;
  techList: string[];
  buttonLabel: string;
}

const DECISIONS: Record<string, DecisionContent> = {
  ENTERING_CANYON: {
    id: 'ENTERING_CANYON',
    badge: '⚠ DEGRADATION DETECTED',
    badgeColor: colors.black,
    badgeBg: colors.brandCream,
    title: 'Entering Urban Canyon',
    subtitle: '6th Avenue Corridor • Manhattan',
    whatHappened: 'Vehicle entering dense high-rise corridor. Surrounding skyscraper walls obscure direct satellite line-of-sight.',
    whyNavisResponded: 'Multipath reflections and signal attenuation cause rapid drop in GNSS measurement accuracy.',
    decisionMade: 'NAVIS lowers raw GNSS weighting and initiates IMU Dead Reckoning fallback model.',
    techList: ['✓ Satellite Line-of-Sight Blocked', '✓ 6-DOF IMU Active', '✓ Motion Hold Initiated'],
    buttonLabel: 'NEXT DECISION →',
  },
  GNSS_DEGRADED: {
    id: 'GNSS_DEGRADED',
    badge: '🧠 SENSOR FUSION DECISION',
    badgeColor: colors.black,
    badgeBg: colors.brandCream,
    title: 'Multipath Rejection Active',
    subtitle: 'High-Rise Signal Reflection',
    whatHappened: 'Raw GNSS fix spiked with +18.4m position error due to multipath reflection off building glass facades.',
    whyNavisResponded: 'Raw GNSS position jumps violate vehicle physical acceleration and motion continuity constraints.',
    decisionMade: 'NAVIS rejects erroneous GNSS jumps and maintains trajectory using continuous inertial dead reckoning.',
    techList: ['✓ Erroneous GNSS Jump Rejected', '✓ Gyro Heading Lock', '✓ Velocity Vector Continuity'],
    buttonLabel: 'CONTINUE ESTIMATION →',
  },
  NAVIS_ESTIMATION: {
    id: 'NAVIS_ESTIMATION',
    badge: '📍 DEAD RECKONING MODEL',
    badgeColor: colors.black,
    badgeBg: colors.brandCream,
    title: 'Continuous Position Estimation',
    subtitle: 'Deep Urban Canyon Navigation',
    whatHappened: 'Vehicle traversing central high-rise canyon without reliable GNSS position fixes.',
    whyNavisResponded: 'Sensor fusion combines wheel speed, accelerometer, and high-rate gyro to compute smooth trajectory.',
    decisionMade: 'Vehicle position marker glides smoothly along true road center without jump or vibration.',
    techList: ['✓ 100 Hz IMU Integration', '✓ Bounded Drift Envelope', '✓ Smooth Lane Alignment'],
    buttonLabel: 'RESUME DRIVING →',
  },
  EXIT_RECOVERY: {
    id: 'EXIT_RECOVERY',
    badge: '✓ GNSS SIGNAL RECOVERY',
    badgeColor: colors.black,
    badgeBg: colors.brandCream,
    title: 'Exiting Urban Canyon',
    subtitle: 'Clear Sky Line-of-Sight Restored',
    whatHappened: 'Vehicle cleared dense building canyon. Direct satellite signals re-acquired with high SNR.',
    whyNavisResponded: 'Signal quality exceeds reliability threshold. NAVIS smoothly reintroduces GNSS corrections.',
    decisionMade: 'Gradually re-aligning sensor fusion weights: GNSS 84%, IMU/DR 16%.',
    techList: ['✓ High Signal Quality Restored', '✓ Smooth Re-Alignment', '✓ Zero-Discontinuity Fusion'],
    buttonLabel: 'COMPLETE DEMO →',
  },
};

export function UrbanCanyonDecisionModal({ state, onDismiss }: UrbanCanyonDecisionModalProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const seenStatesRef = useRef<Set<string>>(new Set());
  const animScale = useRef(new Animated.Value(0.92)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let key: string | null = null;
    if (state === 'ENTERING_CANYON') key = 'ENTERING_CANYON';
    else if (state === 'GNSS_DEGRADED') key = 'GNSS_DEGRADED';
    else if (state === 'NAVIS_ESTIMATION') key = 'NAVIS_ESTIMATION';
    else if (state === 'EXIT_RECOVERY' || state === 'GNSS_RECOVERING') key = 'EXIT_RECOVERY';

    if (key && !seenStatesRef.current.has(key)) {
      seenStatesRef.current.add(key);
      setActiveId(key);
      urbanCanyonEngine.pause();

      Animated.parallel([
        Animated.timing(animOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(animScale, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [state]);

  const handleNext = () => {
    Animated.timing(animOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setActiveId(null);
      animScale.setValue(0.92);
      onDismiss?.();
      urbanCanyonEngine.resume();
    });
  };

  if (!activeId || !DECISIONS[activeId]) return null;

  const content = DECISIONS[activeId];

  return (
    <Animated.View style={[styles.backdrop, { opacity: animOpacity }]}>
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [{ scale: animScale }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: content.badgeBg }]}>
            <Text style={[styles.badgeText, { color: content.badgeColor }]}>{content.badge}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={handleNext} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Content Body */}
        <ScrollView
          style={styles.cardScrollView}
          contentContainerStyle={styles.cardScrollContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          <View style={styles.titleSection}>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.subtitle}>{content.subtitle}</Text>
          </View>

          <View style={styles.bodyBox}>
            <View style={styles.itemRow}>
              <Text style={styles.itemLabel}>WHAT HAPPENED</Text>
              <Text style={styles.itemValue}>{content.whatHappened}</Text>
            </View>

            <View style={styles.itemRow}>
              <Text style={styles.itemLabel}>WHY NAVIS RESPONDED</Text>
              <Text style={styles.itemValue}>{content.whyNavisResponded}</Text>
            </View>

            <View style={styles.itemRow}>
              <Text style={styles.itemLabel}>NAVIS DECISION</Text>
              <Text style={[styles.itemValue, styles.decisionHighlight]}>{content.decisionMade}</Text>
            </View>
          </View>

          <View style={styles.techPillRow}>
            {content.techList.map((t, idx) => (
              <View key={idx} style={styles.techPill}>
                <Text style={styles.techPillText}>{t}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Sticky Footer */}
        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.actionBtnText}>{content.buttonLabel}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(20, 20, 22, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  cardContainer: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '82%',
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    ...shadows.lg,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 60px rgba(20, 20, 22, 0.25), 0 0 24px rgba(20, 20, 22, 0.08)',
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  badge: {
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  cardScrollView: {
    flexShrink: 1,
  },
  cardScrollContent: {
    padding: spacing[4],
    gap: spacing[3],
    backgroundColor: colors.surface,
  },
  titleSection: {
    gap: 3,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  bodyBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.xl,
    padding: spacing[3],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemRow: {
    gap: 3,
  },
  itemLabel: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 0.9,
  },
  itemValue: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 17,
  },
  decisionHighlight: {
    color: colors.black,
    fontWeight: fontWeights.semibold,
  },
  techPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  techPill: {
    backgroundColor: colors.brandCream,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
  },
  techPillText: {
    fontSize: 10,
    color: colors.black,
    fontWeight: fontWeights.semibold,
  },
  cardFooter: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionBtn: {
    backgroundColor: colors.black,
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.brandCream,
    letterSpacing: 0.8,
  },
});
