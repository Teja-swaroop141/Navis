// All shared TypeScript types for the GNSS Dead Reckoning Navigation System

// ─── Navigation State Machine ────────────────────────────────────────────────
export type NavigationMode = 'GNSS_ACTIVE' | 'GNSS_LOST' | 'DEAD_RECKONING' | 'GNSS_RECOVERING' | 'FUSED';

export type AppMode = 'LIVE' | 'DEMO' | 'IDLE';

// ─── Coordinates ─────────────────────────────────────────────────────────────
export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Position extends LatLng {
  altitude?: number;
  accuracy?: number;
  timestamp: number;
}

// ─── GNSS Data ───────────────────────────────────────────────────────────────
export interface GNSSData {
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;           // m/s
  heading: number;         // degrees
  accuracy: number;        // meters
  timestamp: number;       // ms epoch
  isAvailable: boolean;
  satelliteCount?: number;
}

// ─── IMU Sensor Data ─────────────────────────────────────────────────────────
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface AccelerometerData extends Vec3 {
  timestamp: number;
}

export interface GyroscopeData extends Vec3 {
  timestamp: number;
}

export interface MagnetometerData extends Vec3 {
  timestamp: number;
}

export interface IMUData {
  accelerometer: AccelerometerData;
  gyroscope: GyroscopeData;
  magnetometer: MagnetometerData;
  heading: number;   // computed from magnetometer
  pitch: number;
  roll: number;
  isSimulated: boolean;
}

// ─── Dead Reckoning State ────────────────────────────────────────────────────
export interface DeadReckoningState {
  position: LatLng;
  velocity: number;        // m/s
  heading: number;         // degrees
  distanceTraveled: number; // meters since DR started
  elapsedTime: number;     // seconds since DR started
  estimatedError: number;  // meters
  isActive: boolean;
  stepCount: number;
}

// ─── Sensor Fusion State ─────────────────────────────────────────────────────
export interface FusionState {
  gnssPosition: LatLng;
  drPosition: LatLng;
  fusedPosition: LatLng;
  gnssWeight: number;      // 0–1
  drWeight: number;        // 0–1
  correctionVector: Vec3;
  finalError: number;      // meters
  correctionApplied: number; // meters
  isActive: boolean;
}

// ─── Full Navigation State ────────────────────────────────────────────────────
export interface NavigationState {
  mode: NavigationMode;
  appMode: AppMode;
  gnssEnabled: boolean;    // software toggle
  gnssData: GNSSData | null;
  imuData: IMUData | null;
  deadReckoning: DeadReckoningState;
  fusion: FusionState | null;
  currentPosition: LatLng | null;
  trajectory: TrajectoryPoint[];
  outageStartTime: number | null;
  outageEndTime: number | null;
  totalDistance: number;
  sessionStartTime: number | null;
  isNavigating: boolean;
  statusMessage: string;
}

// ─── Trajectory ───────────────────────────────────────────────────────────────
export type TrajectoryType = 'GNSS' | 'DR' | 'FUSED' | 'REFERENCE';

export interface TrajectoryPoint {
  position: LatLng;
  type: TrajectoryType;
  timestamp: number;
  mode: NavigationMode;
}

// ─── Performance Metrics ─────────────────────────────────────────────────────
export interface PerformanceMetrics {
  gnssDuration: number;         // seconds with GNSS
  outageDuration: number;       // seconds in DR
  totalDistance: number;        // meters
  maxDRError: number;           // meters
  finalPositionError: number;   // meters
  recoveryTime: number;         // seconds
  sensorUpdateRate: number;     // Hz
  correctionApplied: number;    // meters
}

// ─── Demo Route ───────────────────────────────────────────────────────────────
export interface DemoRoutePoint {
  position: LatLng;
  heading: number;
  speed: number;          // m/s
  gnssAvailable: boolean;
  timestamp: number;      // relative ms from start
}

export interface DemoRoute {
  name: string;
  startPosition: LatLng;
  points: DemoRoutePoint[];
  outageStartIndex: number;
  outageEndIndex: number;
}

// ─── Sensor Health ────────────────────────────────────────────────────────────
export interface SensorHealth {
  gnss: boolean;
  accelerometer: boolean;
  gyroscope: boolean;
  magnetometer: boolean;
  isSimulated: boolean;
}
