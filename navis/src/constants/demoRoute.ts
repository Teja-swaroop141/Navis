/**
 * demoRoute.ts — High-speed automotive driving simulation on the Bengaluru–Mysuru Expressway (NH 275).
 *
 * Real-world OpenStreetMap highway corridor between Bengaluru and Mysuru:
 * - Direct OSM centerline nodes on Bengaluru–Mysuru Expressway
 * - Vehicle cruising speed: 55–65 km/h (automotive navigation dynamics)
 * - Zone 1 (0–40%):   Open Expressway GNSS Navigation
 * - Zone 2 (40–70%):  Highway Underpass / Tunnel GNSS Outage → Vehicle IMU Dead Reckoning (~1.5–2.5m lane drift)
 * - Zone 3 (70–100%): Emerging from Underpass → Sensor Fusion convergence back to lane center
 */

import { DemoRoute, DemoRoutePoint, LatLng } from '../types';

// Direct OpenStreetMap verified motorway centerline waypoints of Bengaluru–Mysuru Expressway (NH 275)
const EXPRESSWAY_WAYPOINTS: LatLng[] = [
  { latitude: 12.784302, longitude: 77.372228 }, // NH 275 Expressway Entry (NE)
  { latitude: 12.783960, longitude: 77.371943 },
  { latitude: 12.783711, longitude: 77.371740 },
  { latitude: 12.783090, longitude: 77.371216 },
  { latitude: 12.781934, longitude: 77.370207 },
  { latitude: 12.781288, longitude: 77.369649 }, // Expressway Mainline
  { latitude: 12.780740, longitude: 77.369088 },
  { latitude: 12.779970, longitude: 77.367986 },
  { latitude: 12.779694, longitude: 77.367482 },
  { latitude: 12.778100, longitude: 77.364467 }, // Passing Kempanahalli Junction
  { latitude: 12.777439, longitude: 77.362949 },
  { latitude: 12.777224, longitude: 77.362567 },
  { latitude: 12.775852, longitude: 77.359624 }, // Expressway Flyover
  { latitude: 12.772402, longitude: 77.354234 }, // Approaching Underpass
  { latitude: 12.769704, longitude: 77.343764 }, // Tunnel / Underpass Sector
  { latitude: 12.769239, longitude: 77.340137 },
  { latitude: 12.768860, longitude: 77.337572 },
  { latitude: 12.767768, longitude: 77.334428 }, // Emerging from Underpass
  { latitude: 12.764352, longitude: 77.330253 }, // Expressway Section
  { latitude: 12.760673, longitude: 77.326807 },
  { latitude: 12.757699, longitude: 77.323940 },
  { latitude: 12.755778, longitude: 77.321472 }, // SW Exit (Ramanagara Sector)
];

// Helper: Calculate great-circle bearing between two LatLngs in degrees (0-360)
function calculateBearing(p1: LatLng, p2: LatLng): number {
  const lat1 = (p1.latitude * Math.PI) / 180;
  const lat2 = (p2.latitude * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

// Generate smooth road-snapped automotive route points
function generateHighwayRoute(totalPoints = 60): DemoRoutePoint[] {
  const points: DemoRoutePoint[] = [];
  const outageStart = 24; // Index 24: Vehicle enters underpass / tunnel (GNSS Lost)
  const outageEnd = 42;   // Index 42: Vehicle emerges from underpass (GNSS Recovered)

  // Calculate segment lengths
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < EXPRESSWAY_WAYPOINTS.length - 1; i++) {
    const dLat = EXPRESSWAY_WAYPOINTS[i + 1].latitude - EXPRESSWAY_WAYPOINTS[i].latitude;
    const dLon = EXPRESSWAY_WAYPOINTS[i + 1].longitude - EXPRESSWAY_WAYPOINTS[i].longitude;
    const len = Math.sqrt(dLat * dLat + dLon * dLon);
    segmentLengths.push(len);
    totalLength += len;
  }

  for (let i = 0; i < totalPoints; i++) {
    const t = i / (totalPoints - 1);
    const targetDist = t * totalLength;

    // Find corresponding segment
    let accum = 0;
    let segIdx = 0;
    while (segIdx < segmentLengths.length - 1 && accum + segmentLengths[segIdx] < targetDist) {
      accum += segmentLengths[segIdx];
      segIdx++;
    }

    const segStart = EXPRESSWAY_WAYPOINTS[segIdx];
    const segEnd = EXPRESSWAY_WAYPOINTS[segIdx + 1];
    const segLen = segmentLengths[segIdx] || 0.0001;
    const segT = Math.min(1, Math.max(0, (targetDist - accum) / segLen));

    // Road-aligned coordinate
    const lat = segStart.latitude + (segEnd.latitude - segStart.latitude) * segT;
    const lon = segStart.longitude + (segEnd.longitude - segStart.longitude) * segT;
    const heading = calculateBearing(segStart, segEnd);

    // Car cruising speed in m/s: 16.2 m/s ≈ 58.3 km/h
    const speed = 16.2 + 0.8 * Math.sin(i * 0.4);
    const gnssAvailable = i < outageStart || i >= outageEnd;

    points.push({
      position: { latitude: lat, longitude: lon },
      heading: Math.round(heading * 10) / 10,
      speed: Math.round(speed * 10) / 10,
      gnssAvailable,
      timestamp: i * 1200,
    });
  }

  return points;
}

const routePoints = generateHighwayRoute(60);

export const DEMO_ROUTE: DemoRoute = {
  name: 'Bengaluru–Mysuru Expressway (NH 275)',
  startPosition: routePoints[0].position,
  points: routePoints,
  outageStartIndex: 24,
  outageEndIndex: 42,
};

// Generate realistic automotive vehicle IMU data
export function generateSimulatedIMU(routeIndex: number, heading: number, speed: number) {
  const noise = (mag = 0.02) => (Math.random() - 0.5) * mag;
  const gravityZ = 9.81;

  return {
    accelerometer: {
      x: noise(0.04), // Low lateral chassis vibration on smooth expressway
      y: 0.15 + noise(0.05), // Subtle engine forward propulsion
      z: gravityZ + noise(0.06), // Gravity + chassis vertical damping
      timestamp: Date.now(),
    },
    gyroscope: {
      x: noise(0.005),
      y: noise(0.005),
      z: noise(0.008), // Highway yaw stability
      timestamp: Date.now(),
    },
    magnetometer: {
      x: 23.4 + noise(0.8),
      y: -6.5 + noise(0.8),
      z: 42.1 + noise(0.8),
      timestamp: Date.now(),
    },
    heading,
    pitch: 0.6 + noise(0.5),
    roll: 0.4 + noise(0.5),
    isSimulated: true,
  };
}

// Generate realistic GNSS data for vehicle driving (speed in m/s)
export function generateSimulatedGNSS(point: DemoRoutePoint) {
  const noise = (mag: number) => (Math.random() - 0.5) * mag;
  return {
    latitude: point.position.latitude + noise(0.000008),
    longitude: point.position.longitude + noise(0.000008),
    altitude: 730 + noise(1.0),
    speed: point.speed, // in m/s (e.g. 16.2 m/s = 58.3 km/h)
    heading: point.heading,
    accuracy: 1.5 + Math.random() * 0.6, // High accuracy 1.5m - 2.1m
    timestamp: Date.now(),
    isAvailable: point.gnssAvailable,
    satelliteCount: 14 + Math.floor(Math.random() * 4),
  };
}
