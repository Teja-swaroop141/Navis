/**
 * SecondaryButton — Outlined high-contrast button in White & Black with subtle #FAEDCB hover feel
 */

import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { textStyles, fontWeights } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function SecondaryButton({ label, onPress, disabled, style, icon }: SecondaryButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.button, disabled && styles.disabled, style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {icon}
        <Text style={styles.label}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4] - 2,
    paddingHorizontal: spacing[6],
    borderRadius: radius['2xl'],
    borderWidth: 1.5,
    borderColor: colors.black,
    backgroundColor: colors.white,
  },
  label: {
    ...textStyles.labelLarge,
    fontWeight: fontWeights.bold,
    color: colors.black,
    letterSpacing: 0.4,
  },
  disabled: {
    opacity: 0.4,
  },
});
