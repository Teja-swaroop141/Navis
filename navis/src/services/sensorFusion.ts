/**
 * Sensor Fusion Service
 *
 * Combines GNSS position and Dead Reckoning position when GNSS is recovered.
 * Uses a weighted average (simplified Kalman-lite approach):
 *   - Weight GNSS by accuracy (lower accuracy → lower weight)
 *   - Weight DR by accumulated error (higher error → lower weight)
 *
 * Future: Replace with a full Extended Kalman Filter implementation,
 * optionally via a FastAPI Python backend.
 */

import { LatLng, FusionState, GNSSData, DeadReckoningState } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute the distance in meters between two lat/lng points (Haversine).
 */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;

  const sinA = Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(sinA), Math.sqrt(1 - sinA));
}

/**
 * Interpolate between two LatLng positions.
 */
export function lerpLatLng(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

// ─── Fusion Engine ────────────────────────────────────────────────────────────
export class SensorFusionEngine {
  private fusionProgress: number = 0; // 0 → 1 animation progress
  private fusionStep: number = 0.05;  // How fast correction animates

  /**
   * Compute the fused position from GNSS and DR estimates.
   *
   * @param gnss     Current GNSS data
   * @param dr       Current dead reckoning state
   * @param existing Previous fusion state (for smooth animation)
   */
  fuse(gnss: GNSSData, dr: DeadReckoningState, existing: FusionState | null): FusionState {
    const gnssPos: LatLng = { latitude: gnss.latitude, longitude: gnss.longitude };
    const drPos: LatLng = { ...dr.position };

    // Error distance between GNSS and DR
    const separation = haversineDistance(gnssPos, drPos);

    // Compute weights based on confidence
    // GNSS weight increases as accuracy improves (lower accuracy value = better)
    const gnssConfidence = 1 / Math.max(gnss.accuracy, 1);
    // DR weight decreases as accumulated error grows
    const drConfidence = 1 / Math.max(dr.estimatedError + 1, 1);

    const totalConf = gnssConfidence + drConfidence;
    const gnssWeight = gnssConfidence / totalConf;
    const drWeight = drConfidence / totalConf;

    // Weighted fused position
    const rawFusedPos: LatLng = {
      latitude: gnssWeight * gnssPos.latitude + drWeight * drPos.latitude,
      longitude: gnssWeight * gnssPos.longitude + drWeight * drPos.longitude,
    };

    // Smoothly animate the correction (incrementally move toward fused position)
    this.fusionProgress = Math.min(1, this.fusionProgress + this.fusionStep);
    const animatedFused = existing
      ? lerpLatLng(existing.fusedPosition, rawFusedPos, this.fusionProgress)
      : rawFusedPos;

    // Correction vector (approximate, 2D)
    const correctionVector = {
      x: gnssPos.latitude - drPos.latitude,
      y: gnssPos.longitude - drPos.longitude,
      z: 0,
    };

    const finalError = haversineDistance(animatedFused, gnssPos);
    const correctionApplied = haversineDistance(drPos, animatedFused);

    return {
      gnssPosition: gnssPos,
      drPosition: drPos,
      fusedPosition: animatedFused,
      gnssWeight,
      drWeight,
      correctionVector,
      finalError,
      correctionApplied,
      isActive: true,
    };
  }

  /**
   * Reset fusion animation progress (call when entering new outage cycle).
   */
  resetProgress(): void {
    this.fusionProgress = 0;
  }

  /**
   * Get how far along the correction animation is (0–1).
   */
  getProgress(): number {
    return this.fusionProgress;
  }
}

export const sensorFusionEngine = new SensorFusionEngine();
