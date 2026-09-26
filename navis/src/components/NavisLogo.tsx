/**
 * NavisLogo.tsx — Official NAVIS Aerospace & Automotive Navigation Brand Mark
 * 
 * Theme: #FAEDCB (Cream) + Pure White + Deep Onyx Black
 * Design: High-precision geometric navigation prism with directional vector,
 * inertial gyroscope reticle, and razor-sharp typographic lockup.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fontSizes, fontWeights } from '../theme/typography';

interface NavisLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'cream';
  showText?: boolean;
  showSubtitle?: boolean;
  subtitle?: string;
}

export function NavisLogo({
  size = 'md',
  variant = 'light',
  showText = true,
  showSubtitle = false,
  subtitle = 'DEAD RECKONING ENGINE',
}: NavisLogoProps) {
  const isDark = variant === 'dark';
  const isCream = variant === 'cream';

  // Sizing definitions
  const dimensions = {
    sm: { box: 34, icon: 16, fontSize: fontSizes.sm, subSize: 8, letterSpacing: 3 },
    md: { box: 44, icon: 22, fontSize: fontSizes.lg, subSize: 9, letterSpacing: 4 },
    lg: { box: 64, icon: 30, fontSize: fontSizes['2xl'], subSize: 10, letterSpacing: 6 },
    xl: { box: 96, icon: 46, fontSize: fontSizes['4xl'], subSize: 11, letterSpacing: 8 },
  }[size];

  // Visual tones
  const emblemBg = isDark ? colors.blackSoft : isCream ? colors.brandCream : colors.black;
  const emblemBorder = isDark ? colors.brandCream : isCream ? colors.brandCreamDark : colors.brandCream;
  const textColor = isDark ? colors.white : colors.black;
  const accentColor = isDark ? colors.brandCream : isCream ? colors.brandCreamDark : colors.brandCream;
  const subtitleColor = isDark ? colors.brandCreamDark : colors.textTertiary;

  return (
    <View style={styles.container}>
      {/* Geometric Emblem */}
      <View
        style={[
          styles.emblemContainer,
          {
            width: dimensions.box,
            height: dimensions.box,
            borderRadius: dimensions.box * 0.28,
            backgroundColor: emblemBg,
            borderColor: emblemBorder,
            borderWidth: size === 'xl' ? 2.5 : 1.5,
          },
        ]}
      >
        {/* Subtle geometric corner facets */}
        <View
          style={[
            styles.facetTopRight,
            {
              backgroundColor: isDark ? 'rgba(250, 237, 203, 0.15)' : 'rgba(250, 237, 203, 0.4)',
              width: dimensions.box * 0.5,
              height: dimensions.box * 0.5,
            },
          ]}
        />

        {/* Directional Navigation Vector Arrow / Reticle */}
        <View style={styles.centerIconWrapper}>
          <Feather
            name="navigation"
            size={dimensions.icon}
            color={isDark ? colors.brandCream : isCream ? colors.black : colors.brandCream}
            style={{ transform: [{ rotate: '45deg' }] }}
          />
        </View>

        {/* Precision coordinate dot */}
        <View
          style={[
            styles.coordinateDot,
            {
              backgroundColor: isDark ? colors.white : colors.black,
            },
          ]}
        />
      </View>

      {/* Typography Lockup */}
      {showText && (
        <View style={styles.textColumn}>
          <View style={styles.brandRow}>
            <Text
              style={[
                styles.brandTitle,
                {
                  fontSize: dimensions.fontSize,
                  color: textColor,
                  letterSpacing: dimensions.letterSpacing,
                },
              ]}
            >
              NAVIS
            </Text>
            <View
              style={[
                styles.brandDot,
                {
                  backgroundColor: accentColor,
                  width: size === 'xl' ? 8 : 6,
                  height: size === 'xl' ? 8 : 6,
                  borderRadius: 4,
                },
              ]}
            />
          </View>

          {showSubtitle && (
            <Text
              style={[
                styles.brandSubtitle,
                {
                  fontSize: dimensions.subSize,
                  color: subtitleColor,
                },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emblemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  facetTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: 100,
  },
  centerIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordinateDot: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  textColumn: {
    justifyContent: 'center',
    gap: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandTitle: {
    fontWeight: fontWeights.extrabold,
    fontFamily: 'System',
  },
  brandDot: {
    marginBottom: 2,
  },
  brandSubtitle: {
    fontWeight: fontWeights.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
