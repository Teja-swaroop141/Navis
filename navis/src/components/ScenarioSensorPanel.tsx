/**
 * ScenarioSensorPanel.tsx
 *
 * Interactive sensor failure control tab and expanded panel.
 *
 * Rules:
 * - Appears ONLY after Dead Reckoning has activated.
 * - Floating tab: "SENSORS   0 / 2" (unobtrusive, does not cover vehicle).
 * - Compact expandable modal/sheet for:
 *   - Accelerometer [ Disable ] / [ Restore ]
 *   - Gyroscope     [ Disable ] / [ Restore ]
 *   - Magnetometer  [ Disable ] / [ Restore ]
 * - Strictly enforces maximum TWO disabled sensors simultaneously.
 * - When 2 are disabled, all other Disable buttons become disabled and displays
 *   "Maximum 2 sensors can be disabled."
 * - Restoring shows ↻ RESTORING state before ● ACTIVE.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { fontSizes, fontWeights, textStyles } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { SensorType, SensorStatusState } from '../types';
import { SensorStatusMap } from '../services/sensorFailureSimulation';
import { Feather } from '@expo/vector-icons';

interface ScenarioSensorPanelProps {
  isVisible: boolean; // only true when DR is active
  isExpanded: boolean;
  onToggleExpanded: () => void;
  sensorStatus: SensorStatusMap;
  disabledSensors: SensorType[];
  onDisableSensor: (sensor: SensorType) => void;
  onRestoreSensor: (sensor: SensorType) => void;
}

interface SensorConfig {
  key: SensorType;
  name: string;
  icon: keyof typeof Feather.glyphMap;
  role: string;
  engineAction: string;
}

const SENSORS: SensorConfig[] = [
  { 
    key: 'accelerometer', 
    name: 'Accelerometer', 
    icon: 'activity', 
    role: 'Velocity & Speed Integration',
    engineAction: 'Speed decay model engaged. Coasting velocity assumed.'
  },
  { 
    key: 'gyroscope', 
    name: 'Gyroscope', 
    icon: 'compass', 
    role: 'Yaw Rate & Angular Turn Tracking',
    engineAction: 'Yaw tracking lost. Relying on magnetometer heuristics.'
  },
  { 
    key: 'magnetometer', 
    name: 'Magnetometer', 
    icon: 'navigation', 
    role: 'Compass Heading & Azimuth Reference',
    engineAction: 'Absolute heading lost. Gyro bias drifting.'
  },
];

export function ScenarioSensorPanel({
  isVisible,
  isExpanded,
  onToggleExpanded,
  sensorStatus,
  disabledSensors,
  onDisableSensor,
  onRestoreSensor,
}: ScenarioSensorPanelProps) {
  const disabledCount = disabledSensors.length;
  const isMaxReached = disabledCount >= 2;

  // Pulse animation for tab when failures occur
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (disabledCount > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 250, useNativeDriver: true }),
        Animated.spring(pulseAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
  }, [disabledCount]);

  if (!isVisible) {
    return null;
  }

  // Floating tab indicator badge color
  const tabBadgeColor =
    disabledCount === 0
      ? colors.gnssActive
      : disabledCount === 1
      ? colors.warning
      : colors.danger;

  return (
    <>
      {/* ─── 1. Small Floating SENSORS Tab ───────────────────────────────── */}
      <Animated.View style={[styles.floatingTabContainer, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={[styles.floatingTab, disabledCount > 0 && styles.floatingTabWithFault]}
          onPress={onToggleExpanded}
          activeOpacity={0.88}
        >
          <View style={styles.floatingTabLeft}>
            <View style={[styles.tabStatusDot, { backgroundColor: tabBadgeColor }]} />
            <Text style={styles.floatingTabTitle}>SENSORS</Text>
          </View>

          <View style={[styles.tabCountPill, disabledCount > 0 && styles.tabCountPillActive]}>
            <Text style={[styles.tabCountText, disabledCount > 0 && styles.tabCountTextActive]}>
              {disabledCount} / 2
            </Text>
          </View>

          <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textTertiary} />
        </TouchableOpacity>
      </Animated.View>

      {/* ─── 2. Expanded Sensor Control Modal / Bottom Sheet ───────────────── */}
      <Modal
        visible={isExpanded}
        transparent={true}
        animationType="fade"
        onRequestClose={onToggleExpanded}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onToggleExpanded}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSuperTitle}>IMU HARDWARE CONTROL</Text>
                <Text style={styles.modalTitle}>SENSOR STATUS</Text>
              </View>

              <View style={styles.modalHeaderRight}>
                <View
                  style={[
                    styles.disabledCountBadge,
                    disabledCount === 0
                      ? styles.countBadgeNormal
                      : disabledCount === 1
                      ? styles.countBadgeWarning
                      : styles.countBadgeDanger,
                  ]}
                >
                  <Text
                    style={[
                      styles.disabledCountText,
                      disabledCount === 0
                        ? styles.countTextNormal
                        : disabledCount === 1
                        ? styles.countTextWarning
                        : styles.countTextDanger,
                    ]}
                  >
                    Disabled: {disabledCount} / 2
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onToggleExpanded}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Instruction description */}
            <Text style={styles.instructionText}>
              Disable up to 2 IMU sensors to observe how dead-reckoning navigation adapts in real time.
            </Text>

            {/* Max 2 Sensors Disabled Notice */}
            {isMaxReached && (
              <View style={styles.warningBanner}>
                <Feather name="alert-triangle" size={14} color="#92400E" />
                <Text style={styles.warningText}>
                  Maximum 2 sensors can be disabled. At least one sensor is required for dead reckoning continuity.
                </Text>
              </View>
            )}

            {/* Sensor Items List */}
            <View style={styles.sensorList}>
              {SENSORS.map((s) => {
                const status = sensorStatus[s.key];
                const isActive = status === 'ACTIVE';
                const isFailed = status === 'FAILED';
                const isRestoring = status === 'RESTORING';

                return (
                  <View
                    key={s.key}
                    style={[
                      styles.sensorCard,
                      isFailed && styles.sensorCardFailed,
                      isRestoring && styles.sensorCardRestoring,
                    ]}
                  >
                    <View style={styles.sensorCardLeft}>
                      <View style={styles.sensorIconCircle}>
                        <Feather name={s.icon} size={17} color={colors.primaryDark} />
                      </View>
                      <View style={styles.sensorDetails}>
                        <Text style={styles.sensorName}>{s.name}</Text>
                        <Text style={styles.sensorRole}>{s.role}</Text>
                        {isFailed && (
                          <Text style={styles.sensorActionText}>{s.engineAction}</Text>
                        )}

                        {/* Status Label */}
                        <View style={styles.statusRow}>
                          <View
                            style={[
                              styles.liveDot,
                              isActive && styles.dotActive,
                              isFailed && styles.dotFailed,
                              isRestoring && styles.dotRestoring,
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusLabel,
                              isActive && styles.statusTextActive,
                              isFailed && styles.statusTextFailed,
                              isRestoring && styles.statusTextRestoring,
                            ]}
                          >
                            {isActive ? 'ACTIVE' : isFailed ? 'FAILED' : 'RESTORING...'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Action Button */}
                    <View style={styles.actionBtnWrap}>
                      {isActive ? (
                        <TouchableOpacity
                          style={[
                            styles.btnDisable,
                            isMaxReached && styles.btnDisableDisabled,
                          ]}
                          onPress={() => onDisableSensor(s.key)}
                          disabled={isMaxReached}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.btnDisableText,
                              isMaxReached && styles.btnDisableTextDisabled,
                            ]}
                          >
                            Disable
                          </Text>
                        </TouchableOpacity>
                      ) : isFailed ? (
                        <TouchableOpacity
                          style={styles.btnRestore}
                          onPress={() => onRestoreSensor(s.key)}
                          activeOpacity={0.8}
                        >
                          <Feather name="refresh-cw" size={11} color={colors.textOnPrimary} />
                          <Text style={styles.btnRestoreText}>Restore</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.btnRestoring}>
                          <Feather name="loader" size={11} color={colors.textSecondary} />
                          <Text style={styles.btnRestoringText}>Restoring...</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Bottom Dismiss Button */}
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={onToggleExpanded}
              activeOpacity={0.85}
            >
              <Feather name="x" size={13} color={colors.primaryDark} />
              <Text style={styles.dismissBtnText}>Close Panel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Floating Tab ────────────────────────────────────────────────────────────
  floatingTabContainer: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    zIndex: 120,
  },
  floatingTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: radius.full,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3] + 2,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    gap: spacing[2],
    ...shadows.md,
  },
  floatingTabWithFault: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: '#FFFFFF',
  },
  floatingTabLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  floatingTabTitle: {
    fontSize: 11,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  tabCountPill: {
    backgroundColor: colors.lavender,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  tabCountPillActive: {
    backgroundColor: colors.warningSurface,
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.primaryDark,
  },
  tabCountTextActive: {
    color: colors.warning,
  },
  tabChevron: {
    marginLeft: 2,
  },

  // ── Modal Backdrop & Card ──────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 14, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.xl,
    gap: spacing[4],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing[3],
  },
  modalSuperTitle: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.8,
  },
  modalTitle: {
    ...textStyles.headingMedium,
    color: colors.textPrimary,
    marginTop: 2,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  disabledCountBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  countBadgeNormal: {
    backgroundColor: colors.primarySurface,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  countBadgeWarning: {
    backgroundColor: colors.warningSurface,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  countBadgeDanger: {
    backgroundColor: colors.dangerSurface,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  disabledCountText: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 0.4,
  },
  countTextNormal: { color: colors.primaryDark },
  countTextWarning: { color: '#B45309' },
  countTextDanger: { color: colors.danger },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  instructionText: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // ── Warning Banner ─────────────────────────────────────────────────────────
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.warningSurface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2] + 2,
    borderRadius: radius.md,
    borderLeftWidth: 3.5,
    borderLeftColor: colors.warning,
  },
  warningIcon: { fontSize: 14 },
  warningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#92400E',
    lineHeight: 16,
  },

  // ── Sensor List & Cards ────────────────────────────────────────────────────
  sensorList: {
    gap: spacing[3],
  },
  sensorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
    padding: spacing[3] + 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sensorCardFailed: {
    backgroundColor: colors.dangerSurface,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  sensorCardRestoring: {
    backgroundColor: colors.warningSurface,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  sensorCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  sensorIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  sensorEmoji: { fontSize: 17 },
  sensorDetails: { flex: 1, gap: 2 },
  sensorName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  sensorRole: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  sensorActionText: {
    fontSize: 9.5,
    color: colors.danger,
    marginTop: 2,
    fontStyle: 'italic',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: { backgroundColor: colors.gnssActive },
  dotFailed: { backgroundColor: colors.danger },
  dotRestoring: { backgroundColor: colors.warning },
  statusLabel: {
    fontSize: 9.5,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 0.5,
  },
  statusTextActive: { color: colors.gnssActive },
  statusTextFailed: { color: colors.danger },
  statusTextRestoring: { color: colors.warning },

  // ── Action Buttons ─────────────────────────────────────────────────────────
  actionBtnWrap: {
    marginLeft: spacing[2],
  },
  btnDisable: {
    backgroundColor: colors.dangerSurface,
    borderWidth: 1.2,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: spacing[3] + 2,
    paddingVertical: 7,
    borderRadius: radius.lg,
  },
  btnDisableDisabled: {
    opacity: 0.35,
    borderColor: colors.border,
  },
  btnDisableText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.danger,
    letterSpacing: 0.3,
  },
  btnDisableTextDisabled: {
    color: colors.textTertiary,
  },
  btnRestore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing[3] + 2,
    paddingVertical: 7,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  btnRestoreText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.textOnPrimary,
    letterSpacing: 0.3,
  },
  btnRestoring: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.gray200,
    paddingHorizontal: spacing[3],
    paddingVertical: 7,
    borderRadius: radius.lg,
  },
  btnRestoringText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },

  // ── Dismiss Button ─────────────────────────────────────────────────────────
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.xl,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dismissBtnText: {
    ...textStyles.labelMedium,
    color: colors.primaryDark,
    fontWeight: fontWeights.bold,
  },
});
