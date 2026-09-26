/**
 * colors.ts — NAVIS Brand Design System
 * 
 * Strict Color Theme:
 * - Brand Cream: #FAEDCB
 * - Pure White: #FFFFFF
 * - Deep Onyx Black: #000000
 * - Monochrome Gray Tones (strictly black-to-white spectrum)
 * 
 * Simulation Colors: Kept intact for scientific trajectory demonstration.
 */

export const colors = {
  // Brand Cream Highlight (#FAEDCB)
  brandCream: '#FAEDCB',
  brandCreamDark: '#E5D6A7',
  brandCreamLight: '#FDFCF7',
  brandCreamSurface: '#FAEDCB',

  // Monochromatic Fundamentals
  black: '#000000',
  blackSoft: '#121212',
  blackMuted: '#1E1E1E',
  blackCard: '#0A0A0A',
  blackBorder: '#262626',

  white: '#FFFFFF',
  whiteSoft: '#FAFAFA',
  whiteMuted: '#F5F5F5',
  whiteBorder: '#E5E5E5',

  // Primary Palette (High-contrast Black & Cream)
  primary: '#000000',
  primaryLight: '#262626',
  primaryDark: '#000000',
  primarySurface: '#FAEDCB',

  // Primary Yellow / Cream CTAs & Badges (#FAEDCB)
  primaryYellow: '#FAEDCB',
  primaryYellowDark: '#DEC886',
  primaryYellowLight: '#FDFCF7',
  yellowSurface: '#FAEDCB',
  yellowText: '#000000',

  // Secondary Palette
  secondary: '#FAEDCB',
  secondaryLight: '#FDFCF7',
  secondarySurface: '#FAEDCB',

  // Highlight Accents
  accentLime: '#000000',
  accentLimeLight: '#FAEDCB',
  accentLimeText: '#000000',

  // Background Gradients & Surfaces
  gradientStart: '#FAEDCB',
  gradientMiddle: '#FDFCF7',
  gradientEnd: '#FFFFFF',

  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSecondary: '#F8F8F8',
  lavender: '#FAEDCB',
  lavenderMid: '#F5EEDC',

  // Text
  textPrimary: '#000000',
  textSecondary: '#404040',
  textTertiary: '#737373',
  textOnPrimary: '#FFFFFF',
  textOnCream: '#000000',

  // Status colors (Black, White, and #FAEDCB)
  gnssActive: '#000000',
  gnssLost: '#737373',
  deadReckoning: '#000000',
  recovering: '#000000',
  fused: '#000000',

  // Status surfaces
  gnssActiveSurface: '#FAEDCB',
  gnssLostSurface: '#F4F4F5',
  deadReckoningSurface: '#FAEDCB',
  fusedSurface: '#FAEDCB',

  // UI
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  borderDark: '#000000',
  borderCream: '#FAEDCB',
  divider: '#E5E5E5',
  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowDark: 'rgba(0, 0, 0, 0.16)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  glass: 'rgba(255, 255, 255, 0.96)',

  // Trajectories (for map overlays & charts)
  trajectoryGNSS: '#000000',
  trajectoryDR: '#FAEDCB',
  trajectoryFused: '#000000',
  trajectoryReference: '#A3A3A3',

  // Map markers
  markerGNSS: '#000000',
  markerDR: '#FAEDCB',
  markerFused: '#000000',

  // Danger / Warning / Success (Monochrome + Cream)
  danger: '#000000',
  dangerSurface: '#F4F4F5',
  warning: '#FAEDCB',
  warningSurface: '#FAEDCB',
  success: '#000000',
  successSurface: '#FAEDCB',

  // Neutral Grays (Monochromatic spectrum)
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#E5E5E5',
  gray300: '#D4D4D4',
  gray400: '#A3A3A3',
  gray500: '#737373',

  // SIMULATION PRESERVED COLORS (kept unchanged per instructions: "let the simulation color be unchanged")
  simGNSS: '#4F46E5',
  simDR: '#F59E0B',
  simFused: '#10B981',
  simTunnel: '#6366F1',
};

export type ColorKey = keyof typeof colors;
