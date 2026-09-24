/**
 * GNSS Manager
 *
 * Manages the GPS/location subscription.
 *
 * Movement Detection & Stationary Jitter Filter:
 * Suppresses GPS drift noise when stationary. Updates location and trajectory
 * only when actual physical displacement occurs (distance threshold >= 1.5m or speed > 1.2 km/h).
 */

import * as Location from 'expo-location';
import { GNSSData, LatLng } from '../types';
import { generateSimulatedGNSS, DEMO_ROUTE } from '../constants/demoRoute';

type GNSSCallback = (data: GNSSData) => void;

function calcDistanceMeters(pos1: LatLng, pos2: LatLng): number {
  const R = 6371000;
  const dLat = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
  const dLon = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pos1.latitude * Math.PI) / 180) *
      Math.cos((pos2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class GNSSManager {
  private subscription: Location.LocationSubscription | null = null;
  private callback: GNSSCallback | null = null;
  private gnssEnabled: boolean = true;
  private isSimulated: boolean = false;
  private simulationInterval: ReturnType<typeof setInterval> | null = null;
  private demoIndex: number = 0;
  private lastPosition: LatLng | null = null;
  private isMoving: boolean = false;

  /**
   * Request location permissions and start listening.
   * Falls back to simulated GNSS if unavailable.
   */
  async start(callback: GNSSCallback): Promise<boolean> {
    this.callback = callback;
    this.lastPosition = null;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.warn('[GNSSManager] Location permission denied, using simulation');
        this.startSimulation();
        return false;
      }

      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 800,
          distanceInterval: 1.0, // Minimum 1.0m movement for OS update
        },
        (location) => {
          const speedKmH = (location.coords.speed ?? 0) * 3.6;
          const currentPos: LatLng = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          // Movement filtering logic
          let shouldUpdatePosition = false;
          if (!this.lastPosition) {
            shouldUpdatePosition = true;
            this.lastPosition = currentPos;
          } else {
            const displacement = calcDistanceMeters(this.lastPosition, currentPos);
            // Update only if displacement is at least 1.5 meters OR speed indicates movement (> 1.2 km/h)
            if (displacement >= 1.5 || speedKmH > 1.2) {
              shouldUpdatePosition = true;
              this.lastPosition = currentPos;
              this.isMoving = true;
            } else {
              this.isMoving = false;
            }
          }

          const data: GNSSData = {
            latitude: shouldUpdatePosition ? currentPos.latitude : (this.lastPosition?.latitude ?? currentPos.latitude),
            longitude: shouldUpdatePosition ? currentPos.longitude : (this.lastPosition?.longitude ?? currentPos.longitude),
            altitude: location.coords.altitude ?? 0,
            speed: this.isMoving ? speedKmH : 0.0,
            heading: location.coords.heading ?? 0,
            accuracy: location.coords.accuracy ?? 99,
            timestamp: location.timestamp,
            isAvailable: true,
            satelliteCount: undefined,
          };

          // Only pass to navigation engine if GNSS is software-enabled
          if (this.gnssEnabled && this.callback) {
            this.callback(data);
          }
        }
      );

      this.isSimulated = false;
      return true;
    } catch (error) {
      console.warn('[GNSSManager] Error starting location, using simulation:', error);
      this.startSimulation();
      return false;
    }
  }

  /**
   * Start simulated GNSS (for demo mode or when real GPS unavailable).
   */
  startSimulation(): void {
    this.isSimulated = true;
    this.demoIndex = 0;

    this.simulationInterval = setInterval(() => {
      const idx = this.demoIndex % DEMO_ROUTE.points.length;
      const point = DEMO_ROUTE.points[idx];
      const data = generateSimulatedGNSS(point);

      if (this.gnssEnabled && this.callback) {
        this.callback({
          ...data,
          isAvailable: true,
        });
      }

      this.demoIndex++;
    }, 1000);
  }

  /**
   * Stop all GNSS listening.
   */
  stop(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  /**
   * Software-disable GNSS input to the navigation engine.
   */
  setEnabled(enabled: boolean): void {
    this.gnssEnabled = enabled;
  }

  isEnabled(): boolean {
    return this.gnssEnabled;
  }

  isUsingSimulation(): boolean {
    return this.isSimulated;
  }

  getIsMoving(): boolean {
    return this.isMoving;
  }
}

export const gnssManager = new GNSSManager();
