/**
 * Demo Route — a deterministic, repeatable walking simulation route.
 * Simulates a ~500m walk in Bengaluru (MG Road area) with a GNSS outage zone.
 *
 * The route has 3 zones:
 *   Zone 1 (0–40%):   GNSS AVAILABLE
 *   Zone 2 (40–70%):  GNSS DENIED → Dead Reckoning
 *   Zone 3 (70–100%): GNSS RECOVERED → Fusion
 */

import { DemoRoute, DemoRoutePoint } from '../types';

// Base location: Bengaluru, MG Road area
const BASE_LAT = 12.9753;
const BASE_LON = 77.6057;

// Generate a realistic walking route with ~3 second intervals
function generateRoute(): DemoRoutePoint[] {
  const points: DemoRoutePoint[] = [];
  const totalPoints = 60; // ~3 min at 3s intervals
  const outageStart = 24; // index where GNSS goes off
  const outageEnd = 42;   // index where GNSS comes back

  for (let i = 0; i < totalPoints; i++) {
    const t = i / totalPoints;
    const timestamp = i * 3000; // 3 second intervals

    // Create a curved walking path (slight curve northeast then east)
    const angle = (Math.PI / 6) * t; // sweeps ~30 degrees
    const distance = i * 0.000045; // ~5m per step in degrees
    const lat = BASE_LAT + distance * Math.cos(angle);
    const lon = BASE_LON + distance * Math.sin(angle + 0.2);

    // Heading: starts NE (~45°), curves to E (~90°)
    const heading = 45 + t * 45;

    // Speed: normal walking ~1.2-1.4 m/s with slight variation
    const speed = 1.2 + 0.15 * Math.sin(i * 0.8);

    const gnssAvailable = i < outageStart || i >= outageEnd;

    points.push({
      position: { latitude: lat, longitude: lon },
      heading,
      speed,
      gnssAvailable,
      timestamp,
    });
  }

  return points;
}

const routePoints = generateRoute();

export const DEMO_ROUTE: DemoRoute = {
  name: 'MG Road Walking Demo',
  startPosition: { latitude: BASE_LAT, longitude: BASE_LON },
  points: routePoints,
  outageStartIndex: 24,
  outageEndIndex: 42,
};

// Generate simulated IMU data for each route point
export function generateSimulatedIMU(routeIndex: number, heading: number, speed: number) {
  const t = routeIndex * 0.5;
  const noise = () => (Math.random() - 0.5) * 0.04;

  // Simulate walking accelerometer (periodic bounce from footfalls)
  const walkCycle = Math.sin(t * 2.5);
  const gravityZ = 9.81;

  return {
    accelerometer: {
      x: 0.15 * walkCycle + noise(),
      y: 0.08 * Math.cos(t * 2.5) + noise(),
      z: gravityZ + 0.3 * Math.abs(walkCycle) + noise(),
      timestamp: Date.now(),
    },
    gyroscope: {
      x: 0.01 + noise() * 0.1,
      y: 0.02 + noise() * 0.1,
      z: (heading % 360) * 0.0001 + noise() * 0.05,
      timestamp: Date.now(),
    },
    magnetometer: {
      x: 21.4 + noise() * 2,
      y: -8.3 + noise() * 2,
      z: 41.2 + noise() * 2,
      timestamp: Date.now(),
    },
    heading,
    pitch: 2.1 + noise() * 3,
    roll: 1.3 + noise() * 3,
    isSimulated: true,
  };
}

// Pre-generated GNSS with noise (for comparison after recovery)
export function generateSimulatedGNSS(point: DemoRoutePoint) {
  const noise = (mag: number) => (Math.random() - 0.5) * mag;
  return {
    latitude: point.position.latitude + noise(0.00003),
    longitude: point.position.longitude + noise(0.00003),
    altitude: 921 + noise(5),
    speed: point.speed + noise(0.1),
    heading: point.heading + noise(5),
    accuracy: 3.5 + Math.random() * 2,
    timestamp: Date.now(),
    isAvailable: point.gnssAvailable,
    satelliteCount: 8 + Math.floor(Math.random() * 4),
  };
}
