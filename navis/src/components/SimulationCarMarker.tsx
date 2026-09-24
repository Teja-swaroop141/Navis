/**
 * SimulationCarMarker.tsx
 *
 * Visual representation of the simulated vehicle:
 * - Direction-oriented aerodynamic vehicle marker
 * - Dynamic heading rotation
 * - Pulsing navigation-state ring (GNSS green, DR amber/purple, Fused emerald)
 * - Presentation mode scale boost
 * - Also provides SVG/HTML generator for the Leaflet OpenStreetMap layer
 */

import React from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { colors } from '../theme/colors';
import { SimulationState } from '../services/simulationEngine';

interface SimulationCarMarkerProps {
  heading: number; // degrees 0-360
  state: SimulationState;
  isPresentationMode?: boolean;
}

export function SimulationCarMarker({
  heading,
  state,
  isPresentationMode = false,
}: SimulationCarMarkerProps) {
  const isDR = state === 'DEAD_RECKONING' || state === 'GNSS_LOST';
  const isRecovering = state === 'TUNNEL_EXIT' || state === 'GNSS_RECOVERING';
  const isFused = state === 'FUSED' || state === 'COMPLETED';

  const markerColor = isDR ? '#8B5CF6' : isRecovering ? '#F59E0B' : isFused ? '#10B981' : colors.primary;
  const pulseColor = isDR ? 'rgba(139, 92, 246, 0.4)' : isFused ? 'rgba(16, 185, 129, 0.4)' : 'rgba(99, 102, 241, 0.35)';

  const scale = isPresentationMode ? 1.25 : 1.0;

  return (
    <View style={[styles.wrap, { transform: [{ scale }] }]}>
      {/* Outer Pulse Ring */}
      <View style={[styles.pulseRing, { backgroundColor: pulseColor }]} />

      {/* Rotating Vehicle Container */}
      <View style={[styles.vehicleBody, { transform: [{ rotate: `${heading}deg` }], borderColor: markerColor }]}>
        {/* Forward Heading Arrow */}
        <View style={[styles.arrowHead, { borderBottomColor: markerColor }]} />
        {/* Car Cabin Roof */}
        <View style={styles.roof} />
        {/* Headlight beams */}
        <View style={styles.headlightLeft} />
        <View style={styles.headlightRight} />
      </View>

      {/* Mode Tag */}
      <View style={[styles.modeTag, { backgroundColor: markerColor }]}>
        <Text style={styles.modeTagText}>
          {isDR ? 'DR' : isFused ? 'FUSED' : 'GNSS'}
        </Text>
      </View>
    </View>
  );
}

/**
 * Returns HTML string representation for the Leaflet DivIcon on OpenStreetMap
 */
export function generateCarMarkerLeafletHtml(heading: number, state: SimulationState, isPresentation: boolean): string {
  const isDR = state === 'DEAD_RECKONING' || state === 'GNSS_LOST';
  const isRecovering = state === 'TUNNEL_EXIT' || state === 'GNSS_RECOVERING';
  const isFused = state === 'FUSED' || state === 'COMPLETED';

  const accentColor = isDR ? '#8B5CF6' : isRecovering ? '#F59E0B' : isFused ? '#10B981' : '#4F46E5';
  const label = isDR ? 'DR' : isRecovering ? 'FUSING' : isFused ? 'FUSED' : 'GNSS';
  const scale = isPresentation ? 'scale(1.2)' : 'scale(1.0)';

  return `
    <div style="position:relative; width:48px; height:48px; display:flex; align-items:center; justify-content:center; transform:${scale};">
      <div style="position:absolute; width:44px; height:44px; border-radius:50%; background:${accentColor}; opacity:0.25; animation:carPulse 1.8s ease-out infinite;"></div>
      <div style="position:relative; width:34px; height:34px; border-radius:50%; background:#ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.3); border:2.5px solid ${accentColor}; display:flex; align-items:center; justify-content:center; transform:rotate(${heading}deg); transition:transform 0.15s ease-out;">
        <!-- Vehicle icon pointing UP (0deg north) -->
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="display:block;">
          <path d="M12 2L17 9H15V19C15 20.1 14.1 21 13 21H11C9.9 21 9 20.1 9 19V9H7L12 2Z" fill="${accentColor}" />
          <!-- Windshield -->
          <path d="M10 10H14V13H10V10Z" fill="#FFFFFF" fill-opacity="0.9" />
          <!-- Headlights -->
          <circle cx="8" cy="8" r="1.2" fill="#FBBF24" />
          <circle cx="16" cy="8" r="1.2" fill="#FBBF24" />
        </svg>
      </div>
      <div style="position:absolute; bottom:-6px; background:${accentColor}; color:#ffffff; font-size:8px; font-weight:800; padding:1px 5px; border-radius:4px; letter-spacing:0.5px; border:1px solid #ffffff; box-shadow:0 1px 4px rgba(0,0,0,0.25); white-space:nowrap;">
        ${label}
      </div>
    </div>
  `;
}

const styles = StyleSheet.create({
  wrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  vehicleBody: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -4,
  },
  roof: {
    width: 8,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 2,
    marginTop: 2,
  },
  headlightLeft: {
    position: 'absolute',
    top: 4,
    left: 7,
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#FBBF24',
  },
  headlightRight: {
    position: 'absolute',
    top: 4,
    right: 7,
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#FBBF24',
  },
  modeTag: {
    position: 'absolute',
    bottom: -4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  modeTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: 0.5,
  },
});
