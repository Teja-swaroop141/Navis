/**
 * SimulationControls.tsx
 *
 * Floating control panel providing:
 * - Primary Action: [ START SIMULATION ]
 * - Runtime Actions: [ PAUSE ] / [ RESUME ] / [ RESTART ]
 * - Speed Multipliers: 0.5× | 1× | 2×
 * - Presentation Mode toggle
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { fontSizes, fontWeights, textStyles } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { SpeedMultiplier } from '../services/simulationEngine';

interface SimulationControlsProps {
  state: string;
  isPaused: boolean;
  speedMultiplier: SpeedMultiplier;
  isPresentationMode: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onTogglePresentationMode: () => void;
  onSelectSpeed: (speed: SpeedMultiplier) => void;
}

export function SimulationControls({
  state,
  isPaused,
  speedMultiplier,
  isPresentationMode,
  onStart,
  onPause,
  onResume,
  onRestart,
  onTogglePresentationMode,
  onSelectSpeed,
}: SimulationControlsProps) {
  const isIdle = state === 'IDLE';
  const isCompleted = state === 'COMPLETED';
  const isRunning = !isIdle && !isCompleted;

  if (isIdle) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={onStart}
          activeOpacity={0.88}
        >
          <Text style={styles.startIcon}>▶</Text>
          <Text style={styles.startText}>START SIMULATION</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        {/* Speed Selector */}
        {!isPresentationMode && (
          <View style={styles.speedGroup}>
            {([0.5, 1, 2] as SpeedMultiplier[]).map((spd) => {
              const active = speedMultiplier === spd;
              return (
                <TouchableOpacity
                  key={spd}
                  style={[styles.speedBtn, active && styles.speedBtnActive]}
                  onPress={() => onSelectSpeed(spd)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.speedText, active && styles.speedTextActive]}>
                    {spd}×
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          {isRunning && (
            isPaused ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.resumeBtn]}
                onPress={onResume}
                activeOpacity={0.85}
              >
                <Text style={styles.resumeIcon}>▶</Text>
                <Text style={styles.resumeText}>RESUME</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.pauseBtn]}
                onPress={onPause}
                activeOpacity={0.85}
              >
                <Text style={styles.pauseIcon}>⏸</Text>
                <Text style={styles.pauseText}>PAUSE</Text>
              </TouchableOpacity>
            )
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.restartBtn]}
            onPress={onRestart}
            activeOpacity={0.85}
          >
            <Text style={styles.restartIcon}>↺</Text>
            <Text style={styles.restartText}>RESTART</Text>
          </TouchableOpacity>
        </View>

        {/* Presentation Mode Toggle */}
        <TouchableOpacity
          style={[styles.presentBtn, isPresentationMode && styles.presentBtnActive]}
          onPress={onTogglePresentationMode}
          activeOpacity={0.8}
        >
          <Text style={[styles.presentIcon, isPresentationMode && styles.presentIconActive]}>
            {isPresentationMode ? '✦' : '✧'}
          </Text>
          <Text style={[styles.presentText, isPresentationMode && styles.presentTextActive]}>
            {isPresentationMode ? 'Demo ON' : 'Presentation'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: spacing[2],
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    gap: spacing[2],
    ...shadows.md,
  },
  startIcon: {
    color: colors.surface,
    fontSize: 14,
    marginRight: 2,
  },
  startText: {
    ...textStyles.labelLarge,
    color: colors.surface,
    fontWeight: fontWeights.bold,
    letterSpacing: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  speedGroup: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: radius.lg,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  speedBtn: {
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  speedBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  speedText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  speedTextActive: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
    justifyContent: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    gap: 5,
  },
  pauseBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  pauseIcon: {
    fontSize: 11,
    color: colors.warning,
  },
  pauseText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.warning,
    letterSpacing: 0.5,
  },
  resumeBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resumeIcon: {
    fontSize: 10,
    color: colors.success,
  },
  resumeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.success,
    letterSpacing: 0.5,
  },
  restartBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restartIcon: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: -1,
  },
  restartText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  presentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.lavender,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  presentBtnActive: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primaryLight,
  },
  presentIcon: {
    fontSize: 12,
    color: colors.primary,
  },
  presentIconActive: {
    color: colors.primaryDark,
  },
  presentText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.3,
  },
  presentTextActive: {
    color: colors.primaryDark,
  },
});
