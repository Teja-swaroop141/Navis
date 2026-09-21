/**
 * GNSS Manager
 *
 * Manages the GPS/location subscription.
 *
 * IMPORTANT: The "GNSS enable/disable" toggle here is a SOFTWARE-LEVEL toggle.
 * It does NOT disable the phone's OS location service.
 * It merely controls whether the navigation engine receives GNSS updates.
 *
 * This allows the phone to continue collecting location data while the
 * navigation engine uses dead reckoning.
 */

import * as Location from 'expo-location';
import { GNSSData } from '../types';
import { generateSimulatedGNSS, DEMO_ROUTE } from '../constants/demoRoute';

type GNSSCallback = (data: GNSSData) => void;

export class GNSSManager {
  private subscription: Location.LocationSubscription | null = null;
  private callback: GNSSCallback | null = null;
  private gnssEnabled: boolean = true;      // Software toggle
  private isSimulated: boolean = false;
  private simulationInterval: ReturnType<typeof setInterval> | null = null;
  private demoIndex: number = 0;

  /**
   * Request location permissions and start listening.
   * Falls back to simulated GNSS if unavailable.
   */
  async start(callback: GNSSCallback): Promise<boolean> {
    this.callback = callback;

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
          timeInterval: 1000,
          distanceInterval: 0.5,
        },
        (location) => {
          const data: GNSSData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude ?? 0,
            speed: (location.coords.speed ?? 0) * 3.6, // m/s → km/h for display
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
   * The OS continues collecting location data internally.
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
}

export const gnssManager = new GNSSManager();
