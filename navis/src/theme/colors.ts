/**
 * colors.ts — NAVIS Brand Design System
 *
 * Color Theme (inspired by reference warm-cream app design):
 * - App Background: #FAF8F3 (warm light cream — white cards float above this)
 * - Cards/Surface: #FFFFFF (pure white floating panels)
 * - Brand Cream: #FAEDCB (CTA buttons, badges, active states)
 * - Deep Black: #1A1A1A (primary text, borders)
 *
 * Simulation Colors: Kept intact for scientific trajectory demonstration.
 */

export const colors = {
  // Brand Cream (#FAEDCB)
  brandCream: '#FAEDCB',
  brandCreamDark: '#E5D6A7',
  brandCreamLight: '#FDF9F0',
  brandCreamSurface: '#FAEDCB',

  // Monochromatic Fundamentals
  black: '#000000',
  blackSoft: '#121212',
  blackMuted: '#1E1E1E',
  blackCard: '#0A0A0A',
  blackBorder: '#262626',

  white: '#FFFFFF',
  whiteSoft: '#FAFAF8',
  whiteMuted: '#F5F3EE',
  whiteBorder: '#EDE8DF',

  // Primary Palette (High-contrast Black & Cream)
  primary: '#1A1A1A',
  primaryLight: '#262626',
  primaryDark: '#000000',
  primarySurface: '#FAEDCB',

  // Primary Yellow / Cream CTAs & Badges (#FAEDCB)
  primaryYellow: '#FAEDCB',
  primaryYellowDark: '#DEC886',
  primaryYellowLight: '#FDF9F0',
  yellowSurface: '#FAEDCB',
  yellowText: '#000000',

  // Secondary Palette
  secondary: '#FAEDCB',
  secondaryLight: '#FDF9F0',
  secondarySurface: '#FAEDCB',

  // Highlight Accents
  accentLime: '#1A1A1A',
  accentLimeLight: '#FAEDCB',
  accentLimeText: '#000000',

  // Background Gradients & Surfaces
  gradientStart: '#FAEDCB',
  gradientMiddle: '#FDF9F4',
  gradientEnd: '#FFFFFF',

  // App background: warm cream — floating white cards sit on top (reference design style)
  background: '#FAF8F3',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSecondary: '#F5F2EC',
  lavender: '#FDF5E6',
  lavenderMid: '#F5EEDC',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#525252',
  textTertiary: '#8A8A8A',
  textOnPrimary: '#FFFFFF',
  textOnCream: '#000000',

  // Status colors (Black, Cream, Gray spectrum)
  gnssActive: '#1A1A1A',
  gnssLost: '#8A8A8A',
  deadReckoning: '#1A1A1A',
  recovering: '#1A1A1A',
  fused: '#1A1A1A',

  // Status surfaces
  gnssActiveSurface: '#FAEDCB',
  gnssLostSurface: '#F0EDE8',
  deadReckoningSurface: '#FDF5E6',
  fusedSurface: '#FDF5E6',

  // UI
  border: '#EDE8DF',
  borderLight: '#F3EFE8',
  borderDark: '#000000',
  borderCream: '#FAEDCB',
  divider: '#EDE8DF',
  shadow: 'rgba(0, 0, 0, 0.06)',
  shadowDark: 'rgba(0, 0, 0, 0.12)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  glass: 'rgba(255, 255, 255, 0.96)',

  // Trajectories (for map overlays & charts)
  trajectoryGNSS: '#1A1A1A',
  trajectoryDR: '#FAEDCB',
  trajectoryFused: '#1A1A1A',
  trajectoryReference: '#A3A3A3',

  // Map markers
  markerGNSS: '#000000',
  markerDR: '#FAEDCB',
  markerFused: '#000000',

  // Danger / Warning / Success (Monochrome + Cream)
  danger: '#1A1A1A',
  dangerSurface: '#F0EDE8',
  warning: '#FAEDCB',
  warningSurface: '#FDF5E6',
  success: '#1A1A1A',
  successSurface: '#FDF5E6',

  // Neutral Grays (Warm monochromatic spectrum)
  gray50: '#FAF8F5',
  gray100: '#F3EFE8',
  gray200: '#E8E3D8',
  gray300: '#D4CEC2',
  gray400: '#A8A29A',
  gray500: '#737065',

  // SIMULATION PRESERVED COLORS (kept unchanged per instructions: "let the simulation color be unchanged")
  simGNSS: '#4F46E5',
  simDR: '#F59E0B',
  simFused: '#10B981',
  simTunnel: '#6366F1',
};

export type ColorKey = keyof typeof colors;
