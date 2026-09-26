/**
 * colors.ts — NAVIS Brand Design System
 *
 * Exact Color Theme Adapted from Reference Mobile App Design:
 * - App Background: #FAF7F0 (warm ivory cream — pure white cards float softly)
 * - Cards & Panels: #FFFFFF (floating white rounded cards with delicate warm borders)
 * - Brand Accent: #FAEDCB (butter cream for primary CTA buttons, active pills, badges, header gradient)
 * - Text & Contours: #141416 (deep obsidian black for razor-sharp typography and high contrast)
 * - Secondary Text: #6E685F (warm muted gray)
 * - Soft Tints: #F6EEDC / #FDF9EE (inner containers, inactive chip backgrounds)
 *
 * Simulation Colors: Kept completely intact for 3D physics and trajectory demonstration.
 */

export const colors = {
  // Core Brand Cream (#FAEDCB)
  brandCream: '#FAEDCB',
  brandCreamDark: '#E0CE99',
  brandCreamLight: '#FDF8EE',
  brandCreamSurface: '#FAEDCB',
  brandCreamMuted: '#F5EBCE',

  // Deep Obsidian & Black Tones
  black: '#141416',
  blackSoft: '#1E1E22',
  blackMuted: '#2C2C32',
  blackCard: '#141416',
  blackBorder: '#28282E',

  // Pure White & Light Surfaces
  white: '#FFFFFF',
  whiteSoft: '#FCFBF9',
  whiteMuted: '#F7F4EE',
  whiteBorder: '#EFE8DC',

  // Primary Palette
  primary: '#141416',
  primaryLight: '#26262B',
  primaryDark: '#0D0D0E',
  primarySurface: '#FAEDCB',

  // CTA Accent Palette (#FAEDCB Cream)
  primaryYellow: '#FAEDCB',
  primaryYellowDark: '#E0CE99',
  primaryYellowLight: '#FDF8EE',
  yellowSurface: '#FAEDCB',
  yellowText: '#141416',

  // Secondary Palette
  secondary: '#FAEDCB',
  secondaryLight: '#FDF8EE',
  secondarySurface: '#FAEDCB',

  // Highlight Accents
  accentLime: '#141416',
  accentLimeLight: '#FAEDCB',
  accentLimeText: '#141416',

  // Background Gradients & Soft Washes
  gradientStart: '#FAEDCB',
  gradientMiddle: '#FCF6E8',
  gradientEnd: '#FAF7F0',

  // App Canvas & Surfaces (Warm Ivory Canvas with Floating White Cards)
  background: '#FAF7F0',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSecondary: '#F4ECE1',
  lavender: '#FAF2E4',
  lavenderMid: '#F2E6D2',

  // Typography Hierarchy
  textPrimary: '#141416',
  textSecondary: '#6E685F',
  textTertiary: '#9E978C',
  textOnPrimary: '#FFFFFF',
  textOnCream: '#141416',

  // Status & Navigation Mode Tokens
  gnssActive: '#141416',
  gnssLost: '#8C857B',
  deadReckoning: '#141416',
  recovering: '#141416',
  fused: '#141416',

  // Status Surfaces
  gnssActiveSurface: '#FAEDCB',
  gnssLostSurface: '#F0EBE2',
  deadReckoningSurface: '#FAEDCB',
  fusedSurface: '#FAEDCB',

  // Borders & Dividers
  border: '#EFE8DC',
  borderLight: '#F4EFE6',
  borderDark: '#141416',
  borderCream: '#E0CE99',
  divider: '#EFE8DC',
  shadow: 'rgba(120, 95, 40, 0.06)',
  shadowDark: 'rgba(120, 95, 40, 0.12)',
  overlay: 'rgba(20, 20, 22, 0.55)',
  glass: 'rgba(255, 255, 255, 0.98)',

  // Trajectories (2D map overlays & charts)
  trajectoryGNSS: '#141416',
  trajectoryDR: '#FAEDCB',
  trajectoryFused: '#141416',
  trajectoryReference: '#B4ADA3',

  // Map Markers
  markerGNSS: '#141416',
  markerDR: '#FAEDCB',
  markerFused: '#141416',

  // Feedback Surfaces (Monochrome + Cream)
  danger: '#141416',
  dangerSurface: '#F5EFE8',
  warning: '#FAEDCB',
  warningSurface: '#FDF7E7',
  success: '#141416',
  successSurface: '#FDF7E7',

  // Neutral Grays (Warm monochromatic spectrum)
  gray50: '#FAF8F4',
  gray100: '#F4EFE7',
  gray200: '#E9E2D6',
  gray300: '#D5CDBF',
  gray400: '#A9A193',
  gray500: '#6E685F',

  // SIMULATION PRESERVED COLORS (kept unchanged per user instructions: "let the simulation be unchanged")
  simGNSS: '#4F46E5',
  simDR: '#F59E0B',
  simFused: '#10B981',
  simTunnel: '#6366F1',
};

export type ColorKey = keyof typeof colors;
