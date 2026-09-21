import { TextStyle } from 'react-native';

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 19,
  xl: 22,
  '2xl': 26,
  '3xl': 30,
  '4xl': 36,
  '5xl': 44,
};

export const fontWeights: Record<string, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const lineHeights = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
};

export const letterSpacings = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1.0,
  widest: 1.5,
};

// Prebuilt text styles
export const textStyles = {
  displayLarge: {
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.extrabold,
    letterSpacing: letterSpacings.tight,
    lineHeight: fontSizes['4xl'] * lineHeights.tight,
  } as TextStyle,

  displayMedium: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tight,
    lineHeight: fontSizes['3xl'] * lineHeights.tight,
  } as TextStyle,

  headingLarge: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tight,
    lineHeight: fontSizes['2xl'] * lineHeights.snug,
  } as TextStyle,

  headingMedium: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.tight,
    lineHeight: fontSizes.xl * lineHeights.snug,
  } as TextStyle,

  headingSmall: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.lg * lineHeights.snug,
  } as TextStyle,

  bodyLarge: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.md * lineHeights.normal,
  } as TextStyle,

  bodyMedium: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.base * lineHeights.normal,
  } as TextStyle,

  bodySmall: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.sm * lineHeights.normal,
  } as TextStyle,

  labelLarge: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.wide,
    lineHeight: fontSizes.base * lineHeights.tight,
  } as TextStyle,

  labelMedium: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.wide,
    lineHeight: fontSizes.sm * lineHeights.tight,
  } as TextStyle,

  labelSmall: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.wider,
    lineHeight: fontSizes.xs * lineHeights.tight,
  } as TextStyle,

  caption: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
    lineHeight: fontSizes.xs * lineHeights.normal,
  } as TextStyle,
};
