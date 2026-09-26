/**
 * NavigationHeader — top app bar with back button and title
 * Styled to match warm cream app aesthetic
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { textStyles } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface NavigationHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  transparent?: boolean;
}

export function NavigationHeader({ title, onBack, right, transparent = false }: NavigationHeaderProps) {
  if (transparent) {
    return (
      <View style={[styles.container, styles.transparent]}>
        <View style={styles.left}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="chevron-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.title, styles.titleDark]}>{title}</Text>
        <View style={styles.right}>{right}</View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[colors.brandCream, colors.brandCreamLight, colors.background]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <View style={styles.left}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>{right}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
  },
  right: {
    width: 40,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: spacing[1],
  },
  title: {
    ...textStyles.headingSmall,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  titleDark: {
    color: colors.textPrimary,
  },
});
