// Design system colors — premium lavender/indigo palette
export const colors = {
  // Primary palette
  primary: '#6366F1',        // Indigo-500
  primaryLight: '#818CF8',   // Indigo-400
  primaryDark: '#4F46E5',    // Indigo-600
  primarySurface: '#EEF2FF', // Indigo-50

  // Secondary
  secondary: '#8B5CF6',      // Violet-500
  secondaryLight: '#A78BFA', // Violet-400
  secondarySurface: '#F5F3FF',

  // Background
  background: '#FAFAFE',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  lavender: '#F0EFFE',       // Very soft lavender
  lavenderMid: '#E0DDFB',

  // Text
  textPrimary: '#0F0E2A',    // Near black navy
  textSecondary: '#6B7280',  // Cool gray
  textTertiary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  // Status colors
  gnssActive: '#10B981',     // Emerald green
  gnssLost: '#EF4444',       // Red
  deadReckoning: '#F59E0B',  // Amber
  recovering: '#8B5CF6',     // Violet
  fused: '#6366F1',          // Indigo

  // Status surfaces
  gnssActiveSurface: '#ECFDF5',
  gnssLostSurface: '#FEF2F2',
  deadReckoningSurface: '#FFFBEB',
  fusedSurface: '#EEF2FF',

  // Trajectories
  trajectoryGNSS: '#6366F1',
  trajectoryDR: '#F59E0B',
  trajectoryFused: '#10B981',
  trajectoryReference: '#9CA3AF',

  // UI
  border: '#E8E7F5',
  borderLight: '#F3F2FC',
  divider: '#F1F0FA',
  shadow: 'rgba(99, 102, 241, 0.12)',
  shadowDark: 'rgba(15, 14, 42, 0.08)',
  overlay: 'rgba(15, 14, 42, 0.5)',
  glass: 'rgba(255, 255, 255, 0.85)',

  // Map
  markerGNSS: '#6366F1',
  markerDR: '#F59E0B',
  markerFused: '#10B981',

  // Danger / Warning / Success
  danger: '#EF4444',
  dangerSurface: '#FEF2F2',
  warning: '#F59E0B',
  warningSurface: '#FFFBEB',
  success: '#10B981',
  successSurface: '#ECFDF5',

  // Neutral
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
};

export type ColorKey = keyof typeof colors;
