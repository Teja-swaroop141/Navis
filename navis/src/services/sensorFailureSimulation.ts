/**
 * sensorFailureSimulation.ts
 *
 * Dedicated simulation engine for "SENSOR FAILURE DURING DEAD RECKONING" scenario.
 *
 * Demonstrates:
 * 1. NORMAL GNSS NAVIGATION
 * 2. GNSS LOSS (Tunnel Entrance)
 * 3. DEAD RECKONING ACTIVATED (Inertial Navigation)
 * 4. SENSOR FAILURE (User disables Gyroscope / Accelerometer / Magnetometer)
 * 5. ADAPTIVE NAVIGATION (DR adapts to remaining sensor inputs; vehicle continues moving)
 * 6. SECOND SENSOR FAILURE (Max 2 sensors disabled simultaneously)
 * 7. DEGRADED BUT CONTINUOUS NAVIGATION (Calculates real error vs ground truth)
 * 8. SENSOR RESTORATION (Recalibration and reintroduction into fusion pipeline)
 * 9. NORMAL SENSOR FUSION & COMPLETION (Highway resumption & summary metrics)
 *
 * Adheres to:
 * - Vehicle NEVER stops moving during sensor failures
 * - Strict maximum 2 sensor failures simultaneously
 * - Dynamic ground truth vs estimated DR error computation (Haversine)
 * - 100% compatible with SimulationMapView (Three.js 3D Driving perspective)
 */

import {
  SIMULATION_ROUTE,
  LatLng,
  haversineDistance,
  lerpLatLng,
} from '../data/simulationRoute';
import { deadReckoningEngine } from './deadReckoningEngine';
import { SensorType, SensorStatusState, SensorAvailability } from '../types';

export type ScenarioSimulationState =
  | 'IDLE'
  | 'STARTING'
  | 'GNSS_ACTIVE'
  | 'APPROACHING_TUNNEL'
  | 'GNSS_LOST'
  | 'DEAD_RECKONING'
  | 'TUNNEL_EXIT'
  | 'GNSS_RECOVERING'
  | 'FUSED'
  | 'COMPLETED';

export type SpeedMultiplier = 0.5 | 1 | 2;

export interface SensorStatusMap {
  accelerometer: SensorStatusState;
  gyroscope: SensorStatusState;
  magnetometer: SensorStatusState;
}

export interface ScenarioSimulationFrame {
  state: ScenarioSimulationState;
  carPosition: LatLng;
  groundTruthPosition: LatLng;
  carHeading: number;
  carSpeedKmh: number;
  routeProgressPercent: number;
  totalDrivenMeters: number;

  // GNSS & IMU State
  gnssAvailable: boolean;
  gnssStatusText: 'ACTIVE' | 'LOST' | 'RESTORED' | 'STANDBY';
  imuStatusText: 'ACTIVE' | 'DEGRADED' | 'STANDBY';
  navigationModeText: string;
  positionSource: 'GNSS SATELLITE' | 'INERTIAL ESTIMATE' | 'SENSOR FUSION' | 'STANDBY';
  fusionStateText: 'NORMAL' | 'ADAPTIVE' | 'FUSED' | 'STANDBY';

  // Sensor Availability
  sensorStatus: SensorStatusMap;
  disabledSensors: SensorType[];
  availableSensorsCount: number;

  // Tunnel Metrics
  isInsideTunnel: boolean;
  isApproachingTunnel: boolean;
  tunnelProgressPercent: number;
  tunnelDrivenMeters: number;
  tunnelLengthMeters: number;
  timeWithoutGNSSSec: number;

  // Trajectories
  gnssTrajectory: LatLng[];
  drTrajectory: LatLng[];
  fusedTrajectory: LatLng[];

  // Drift & Error Metrics (Model-generated ground-truth vs estimated)
  drDisplacementMeters: number;
  drErrorMeters: number;
  distanceDuringFailureMeters: number;
  fusionCorrectionApplied: number;
  statusNotification: string | null;

  // Controls
  speedMultiplier: SpeedMultiplier;
  isPaused: boolean;
}

export interface ScenarioSummary {
  failedSensors: SensorType[];
  gnssOutageDurationSec: number;
  distanceDuringFailureMeters: number;
  maxDRErrorMeters: number;
  navigationContinuity: 'MAINTAINED';
  sensorsRestored: boolean;
  totalRouteDistanceMeters: number;
}

type FrameListener = (frame: ScenarioSimulationFrame) => void;
type CompletionListener = (summary: ScenarioSummary) => void;

export class SensorFailureSimulationEngine {
  private state: ScenarioSimulationState = 'IDLE';
  private speedMultiplier: SpeedMultiplier = 1;
  private isPaused: boolean = false;
  private intervalId: any = null;

  // Route progression
  private currentDistance: number = 0;
  private totalDistance: number = SIMULATION_ROUTE.totalDistanceMeters;

  // Vehicle coordinates
  private groundTruthPos: LatLng = { ...SIMULATION_ROUTE.start };
  private estimatedDrPos: LatLng = { ...SIMULATION_ROUTE.start };
  private currentPos: LatLng = { ...SIMULATION_ROUTE.start };
  private currentHeading: number = SIMULATION_ROUTE.waypoints[0]?.heading ?? 268;
  private currentSpeedKmh: number = 44.0;

  // Sensor state tracking
  private sensorStatus: SensorStatusMap = {
    accelerometer: 'ACTIVE',
    gyroscope: 'ACTIVE',
    magnetometer: 'ACTIVE',
  };
  private disabledSensors: SensorType[] = [];
  private restoringSensors: Set<SensorType> = new Set();
  private allFailedSensorsEver: Set<SensorType> = new Set();

  // Outage / Failure metrics
  private outageStartTime: number = 0;
  private outageDurationSec: number = 0;
  private drDrivenMeters: number = 0;
  private distanceDuringFailureMeters: number = 0;
  private maxDRErrorMeters: number = 0;

  // Dynamic DR error offsets (ground-truth vs DR estimate)
  private drOffsetLat: number = 0;
  private drOffsetLng: number = 0;
  private headingDriftAccumulator: number = 0; // degrees
  private speedDriftAccumulator: number = 0;   // m/s lag

  // Trajectories
  private gnssTrajectory: LatLng[] = [];
  private drTrajectory: LatLng[] = [];
  private fusedTrajectory: LatLng[] = [];

  // Recovery tracking
  private fusionProgress: number = 0;
  private fusionCorrectionMeters: number = 0;

  // Notifications
  private activeNotification: string | null = null;
  private notificationClearTimer: any = null;

  // Listeners
  private frameListeners: Set<FrameListener> = new Set();
  private completionListeners: Set<CompletionListener> = new Set();

  constructor() {
    this.resetState();
  }

  // ─── Control Methods ────────────────────────────────────────────────────────

  public start(): void {
    if (this.state !== 'IDLE' && this.state !== 'COMPLETED') {
      if (this.isPaused) {
        this.resume();
        return;
      }
      return;
    }

    this.resetState();
    this.transitionTo('STARTING');

    setTimeout(() => {
      if (this.state === 'STARTING') {
        this.transitionTo('GNSS_ACTIVE');
        this.setNotification('GNSS Navigation Active • All Sensors Online');
        this.startLoop();
      }
    }, 400);
  }

  public pause(): void {
    if (this.isPaused || this.state === 'IDLE' || this.state === 'COMPLETED') return;
    this.isPaused = true;
    this.stopLoop();
    this.notifyFrame();
  }

  public resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.startLoop();
    this.notifyFrame();
  }

  public restart(): void {
    this.stopLoop();
    this.resetState();
    this.start();
  }

  public reset(): void {
    this.stopLoop();
    this.resetState();
    this.notifyFrame();
  }

  public setSpeedMultiplier(multiplier: SpeedMultiplier): void {
    this.speedMultiplier = multiplier;
    this.notifyFrame();
  }

  public subscribe(listener: FrameListener): () => void {
    this.frameListeners.add(listener);
    listener(this.getCurrentFrame());
    return () => this.frameListeners.delete(listener);
  }

  public onComplete(listener: CompletionListener): () => void {
    this.completionListeners.add(listener);
    return () => this.completionListeners.delete(listener);
  }

  // ─── Sensor Fault Injection & Restoration ───────────────────────────────────

  /**
   * Disable an IMU sensor during dead reckoning.
   * Requirement 12: At most TWO sensors can be disabled simultaneously.
   */
  public disableSensor(sensor: SensorType): boolean {
    if (this.disabledSensors.includes(sensor)) {
      return false; // Already disabled
    }

    if (this.disabledSensors.length >= 2) {
      this.setNotification('Maximum 2 sensors can be disabled');
      this.notifyFrame();
      return false;
    }

    this.disabledSensors.push(sensor);
    this.allFailedSensorsEver.add(sensor);
    this.sensorStatus[sensor] = 'FAILED';

    // Update global DR engine sensor availability state
    this.syncSensorAvailabilityToEngine();

    // Human-friendly notification
    const sensorNames: Record<SensorType, string> = {
      gyroscope: 'Gyroscope',
      accelerometer: 'Accelerometer',
      magnetometer: 'Magnetometer',
    };
    const sName = sensorNames[sensor];

    if (this.disabledSensors.length === 1) {
      this.setNotification(`${sName} unavailable • Adaptive navigation active`);
    } else {
      this.setNotification('Sensor availability reduced • Adaptive navigation active');
    }

    this.notifyFrame();
    return true;
  }

  /**
   * Restore a previously failed sensor with simulated recalibration.
   */
  public restoreSensor(sensor: SensorType): void {
    if (!this.disabledSensors.includes(sensor) && this.sensorStatus[sensor] !== 'RESTORING') {
      return;
    }

    // Enter RESTORING state
    this.sensorStatus[sensor] = 'RESTORING';
    this.restoringSensors.add(sensor);
    this.notifyFrame();

    const sensorNames: Record<SensorType, string> = {
      gyroscope: 'Gyroscope',
      accelerometer: 'Accelerometer',
      magnetometer: 'Magnetometer',
    };
    const sName = sensorNames[sensor];

    // Simulated short recalibration period (1.4 seconds)
    setTimeout(() => {
      this.restoringSensors.delete(sensor);
      this.disabledSensors = this.disabledSensors.filter((s) => s !== sensor);
      this.sensorStatus[sensor] = 'ACTIVE';

      this.syncSensorAvailabilityToEngine();
      this.setNotification(`${sName} restored • Sensor Fusion updated`);
      this.notifyFrame();
    }, 1400);
  }

  private syncSensorAvailabilityToEngine(): void {
    const availability: SensorAvailability = {
      accelerometer: this.sensorStatus.accelerometer === 'ACTIVE',
      gyroscope: this.sensorStatus.gyroscope === 'ACTIVE',
      magnetometer: this.sensorStatus.magnetometer === 'ACTIVE',
    };
    deadReckoningEngine.setSensorAvailability(availability);
  }

  // ─── Simulation Step Loop ───────────────────────────────────────────────────

  private startLoop(): void {
    this.stopLoop();
    const tickIntervalMs = 40; // 25 fps
    this.intervalId = setInterval(() => {
      this.tick(tickIntervalMs / 1000);
    }, tickIntervalMs);
  }

  private stopLoop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private resetState(): void {
    this.stopLoop();
    this.state = 'IDLE';
    this.isPaused = false;
    this.currentDistance = 0;
    this.groundTruthPos = { ...SIMULATION_ROUTE.start };
    this.estimatedDrPos = { ...SIMULATION_ROUTE.start };
    this.currentPos = { ...SIMULATION_ROUTE.start };
    this.currentHeading = SIMULATION_ROUTE.waypoints[0]?.heading ?? 268;
    this.currentSpeedKmh = 44.0;

    this.sensorStatus = {
      accelerometer: 'ACTIVE',
      gyroscope: 'ACTIVE',
      magnetometer: 'ACTIVE',
    };
    this.disabledSensors = [];
    this.restoringSensors.clear();
    this.allFailedSensorsEver.clear();
    this.syncSensorAvailabilityToEngine();

    this.gnssTrajectory = [{ ...SIMULATION_ROUTE.start }];
    this.drTrajectory = [];
    this.fusedTrajectory = [];

    this.outageStartTime = 0;
    this.outageDurationSec = 0;
    this.drDrivenMeters = 0;
    this.distanceDuringFailureMeters = 0;
    this.maxDRErrorMeters = 0;

    this.drOffsetLat = 0;
    this.drOffsetLng = 0;
    this.headingDriftAccumulator = 0;
    this.speedDriftAccumulator = 0;

    this.fusionProgress = 0;
    this.fusionCorrectionMeters = 0;
    this.activeNotification = null;

    if (this.notificationClearTimer) {
      clearTimeout(this.notificationClearTimer);
      this.notificationClearTimer = null;
    }
  }

  private tick(dt: number): void {
    if (this.isPaused || this.state === 'IDLE' || this.state === 'COMPLETED') return;

    // Advance vehicle smoothly along route
    // Reduce virtual speed inside the tunnel to compensate for optical flow,
    // making the perceived visual speed feel equal to the open highway.
    const baseVirtualSpeed = (this.state === 'GNSS_LOST' || this.state === 'DEAD_RECKONING') ? 26 : 38;
    const effectiveVirtualSpeed = baseVirtualSpeed * this.speedMultiplier;
    const distanceStep = effectiveVirtualSpeed * dt;
    this.currentDistance += distanceStep;

    if (this.currentDistance >= this.totalDistance) {
      this.currentDistance = this.totalDistance;
      this.currentPos = { ...SIMULATION_ROUTE.destination };
      this.groundTruthPos = { ...SIMULATION_ROUTE.destination };
      this.fusedTrajectory.push({ ...this.currentPos });
      this.transitionTo('COMPLETED');
      this.stopLoop();
      this.setNotification('Destination Reached • Scenario Complete');
      this.notifyCompletion();
      this.notifyFrame();
      return;
    }

    // Interpolate ground truth road coordinate & heading
    const wp = this.interpolateRouteAtDistance(this.currentDistance);
    this.groundTruthPos = wp.pos;
    this.currentHeading = wp.heading;
    this.currentSpeedKmh = Math.round((wp.speed * 3.6 + Math.sin(this.currentDistance * 0.1) * 2) * 10) / 10;

    const entranceDist = SIMULATION_ROUTE.tunnelEntranceDistance; // 200m
    const exitDist = SIMULATION_ROUTE.tunnelExitDistance;       // 420m
    const approachDist = SIMULATION_ROUTE.approachTunnelDistance; // 140m

    // ── STAGE 1: Approaching Tunnel ──────────────────────────────────────────
    if (this.currentDistance >= approachDist && this.currentDistance < entranceDist) {
      if (this.state === 'GNSS_ACTIVE' || this.state === 'STARTING') {
        this.transitionTo('APPROACHING_TUNNEL');
        this.setNotification('Approaching GNSS-denied tunnel zone');
      }
      this.currentPos = { ...this.groundTruthPos };
      this.gnssTrajectory.push({ ...this.currentPos });
    }

    // ── STAGE 2: Inside Tunnel (GNSS Lost → Dead Reckoning) ───────────────────
    else if (this.currentDistance >= entranceDist && this.currentDistance < exitDist) {
      if (this.state !== 'GNSS_LOST' && this.state !== 'DEAD_RECKONING') {
        this.outageStartTime = Date.now();
        this.transitionTo('GNSS_LOST');
        this.setNotification('GNSS signal lost • Dead Reckoning activated');

        setTimeout(() => {
          if (this.state === 'GNSS_LOST') {
            this.transitionTo('DEAD_RECKONING');
          }
        }, 280);
      }

      this.drDrivenMeters = Math.max(0, this.currentDistance - entranceDist);
      const tunnelProgressRatio = Math.min(1, this.drDrivenMeters / SIMULATION_ROUTE.tunnelLengthMeters);
      this.outageDurationSec = Math.round(tunnelProgressRatio * 9.4 * 10) / 10;

      // Track distance driven during sensor failure
      if (this.disabledSensors.length > 0) {
        this.distanceDuringFailureMeters += distanceStep;
      }

      // ── Physical Dynamic Error Model based on Sensor Availability ───────────
      // Base nominal calibrated INS integration drift (~1.8m to 2.4m max across tunnel)
      const baseDisplacement = Math.sin(tunnelProgressRatio * Math.PI) * 0.000022; // ~2.2m

      let lateralErrorFactor = 1.0;
      let longitudinalErrorFactor = 0.0;

      const gyroFailed = this.sensorStatus.gyroscope === 'FAILED';
      const accelFailed = this.sensorStatus.accelerometer === 'FAILED';
      const magFailed = this.sensorStatus.magnetometer === 'FAILED';

      // 1. Gyroscope Failure:
      // Yaw rate integration is lost. Relies on magnetometer with compass noise & road curvature heuristics.
      // Lateral drift increases significantly around turns!
      if (gyroFailed) {
        lateralErrorFactor += 1.8 + Math.min(1.5, this.drDrivenMeters / 80);
        this.headingDriftAccumulator += 0.04 * this.speedMultiplier;
      }

      // 2. Accelerometer Failure:
      // Longitudinal acceleration integration lost. Relies on speed decay / constant velocity model.
      // Longitudinal along-track displacement error accumulates!
      if (accelFailed) {
        longitudinalErrorFactor += 0.000028 * (this.drDrivenMeters / 100);
        this.speedDriftAccumulator = Math.min(6.0, this.speedDriftAccumulator + 0.02);
      }

      // 3. Magnetometer Failure:
      // Absolute heading boundary lost. Gyro bias drifts unbounded.
      if (magFailed) {
        lateralErrorFactor += 0.8 + Math.min(0.8, this.drDrivenMeters / 120);
        this.headingDriftAccumulator += 0.02 * this.speedMultiplier;
      }

      // Multi-sensor compound error
      if (this.disabledSensors.length === 2) {
        lateralErrorFactor *= 1.35;
      }

      // Compute actual DR offsets
      this.drOffsetLat = baseDisplacement * 0.3 * lateralErrorFactor;
      this.drOffsetLng = baseDisplacement * 0.9 * lateralErrorFactor + longitudinalErrorFactor;

      const drEstimatedPos: LatLng = {
        latitude: this.groundTruthPos.latitude + this.drOffsetLat,
        longitude: this.groundTruthPos.longitude + this.drOffsetLng,
      };

      this.estimatedDrPos = drEstimatedPos;
      this.currentPos = drEstimatedPos;
      this.drTrajectory.push({ ...drEstimatedPos });

      // Calculate REAL un-hardcoded error distance between DR estimate and ground truth
      const actualError = haversineDistance(this.groundTruthPos, drEstimatedPos);
      if (actualError > this.maxDRErrorMeters) {
        this.maxDRErrorMeters = actualError;
      }
    }

    // ── STAGE 3: Tunnel Exit & Position Recovery ──────────────────────────────
    else if (this.currentDistance >= exitDist && this.currentDistance < exitDist + 160) {
      if (this.state === 'DEAD_RECKONING' || this.state === 'GNSS_LOST') {
        this.transitionTo('TUNNEL_EXIT');
        this.setNotification('GNSS restored • Smooth trajectory convergence');

        setTimeout(() => {
          if (this.state === 'TUNNEL_EXIT') {
            this.transitionTo('GNSS_RECOVERING');
          }
        }, 300);
      }

      // Smooth Position Fusion Convergence:
      // Animate the car from the DR drifted position back onto the accurate GNSS centerline
      const recoveryDistTraveled = this.currentDistance - exitDist;
      this.fusionProgress = Math.min(1, recoveryDistTraveled / 120);

      const currentDrOffsetLat = this.drOffsetLat * (1 - this.fusionProgress);
      const currentDrOffsetLng = this.drOffsetLng * (1 - this.fusionProgress);

      this.currentPos = {
        latitude: this.groundTruthPos.latitude + currentDrOffsetLat,
        longitude: this.groundTruthPos.longitude + currentDrOffsetLng,
      };

      this.fusionCorrectionMeters = haversineDistance(
        { latitude: this.groundTruthPos.latitude + this.drOffsetLat, longitude: this.groundTruthPos.longitude + this.drOffsetLng },
        this.currentPos
      );

      this.fusedTrajectory.push({ ...this.currentPos });
    }

    // ── STAGE 4: FUSED & Highway Navigation Resumed ───────────────────────────
    else if (this.currentDistance >= exitDist + 160) {
      if (this.state === 'GNSS_RECOVERING' || this.state === 'TUNNEL_EXIT') {
        this.transitionTo('FUSED');
        this.setNotification('Sensor Fusion Online • Continuous Navigation');
      }

      this.currentPos = { ...this.groundTruthPos };
      this.fusedTrajectory.push({ ...this.currentPos });
    }

    // ── Pre-tunnel Normal Driving ─────────────────────────────────────────────
    else {
      this.currentPos = { ...this.groundTruthPos };
      this.gnssTrajectory.push({ ...this.currentPos });
    }

    this.notifyFrame();
  }

  private transitionTo(newState: ScenarioSimulationState): void {
    this.state = newState;
    this.notifyFrame();
  }

  private setNotification(msg: string): void {
    this.activeNotification = msg;
    if (this.notificationClearTimer) {
      clearTimeout(this.notificationClearTimer);
    }
    this.notificationClearTimer = setTimeout(() => {
      if (this.activeNotification === msg) {
        this.activeNotification = null;
        this.notifyFrame();
      }
    }, 3200);
  }

  // ─── Mathematical Interpolation Along Route ─────────────────────────────────

  private interpolateRouteAtDistance(targetDist: number): { pos: LatLng; heading: number; speed: number } {
    const waypoints = SIMULATION_ROUTE.waypoints;
    if (targetDist <= 0) {
      return { pos: waypoints[0].position, heading: waypoints[0].heading, speed: waypoints[0].speed };
    }
    if (targetDist >= this.totalDistance) {
      const last = waypoints[waypoints.length - 1];
      return { pos: last.position, heading: last.heading, speed: 0 };
    }

    let low = 0;
    let high = waypoints.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (waypoints[mid].distanceFromStart <= targetDist) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const idx = Math.max(0, Math.min(waypoints.length - 2, high));
    const p1 = waypoints[idx];
    const p2 = waypoints[idx + 1];

    const segLen = p2.distanceFromStart - p1.distanceFromStart;
    const t = segLen > 0 ? (targetDist - p1.distanceFromStart) / segLen : 0;
    const clampedT = Math.max(0, Math.min(1, t));

    const pos = lerpLatLng(p1.position, p2.position, clampedT);
    const heading = p1.heading;
    const speed = p1.speed + (p2.speed - p1.speed) * clampedT;

    return { pos, heading, speed };
  }

  // ─── Frame Assembly & Notifiers ─────────────────────────────────────────────

  public getCurrentFrame(): ScenarioSimulationFrame {
    const progressPercent = Math.min(100, Math.max(0, (this.currentDistance / this.totalDistance) * 100));

    const isInsideTunnel = this.state === 'GNSS_LOST' || this.state === 'DEAD_RECKONING';
    const isApproaching = this.state === 'APPROACHING_TUNNEL';
    const tunnelProgressPercent = Math.min(100, Math.max(0, (this.drDrivenMeters / SIMULATION_ROUTE.tunnelLengthMeters) * 100));

    let gnssAvailable = true;
    let gnssStatusText: 'ACTIVE' | 'LOST' | 'RESTORED' | 'STANDBY' = 'ACTIVE';
    let navigationModeText = 'GNSS NAVIGATION';
    let positionSource: 'GNSS SATELLITE' | 'INERTIAL ESTIMATE' | 'SENSOR FUSION' | 'STANDBY' = 'GNSS SATELLITE';
    let fusionStateText: 'NORMAL' | 'ADAPTIVE' | 'FUSED' | 'STANDBY' = 'NORMAL';

    const hasFailedSensor = this.disabledSensors.length > 0;
    const imuStatusText: 'ACTIVE' | 'DEGRADED' | 'STANDBY' =
      this.state === 'IDLE' ? 'STANDBY' : hasFailedSensor ? 'DEGRADED' : 'ACTIVE';

    switch (this.state) {
      case 'IDLE':
        gnssAvailable = true;
        gnssStatusText = 'STANDBY';
        navigationModeText = 'STANDBY';
        positionSource = 'STANDBY';
        fusionStateText = 'STANDBY';
        break;
      case 'STARTING':
      case 'GNSS_ACTIVE':
      case 'APPROACHING_TUNNEL':
        gnssAvailable = true;
        gnssStatusText = 'ACTIVE';
        navigationModeText = 'GNSS NAVIGATION';
        positionSource = 'GNSS SATELLITE';
        fusionStateText = 'NORMAL';
        break;
      case 'GNSS_LOST':
      case 'DEAD_RECKONING':
        gnssAvailable = false;
        gnssStatusText = 'LOST';
        navigationModeText = 'DEAD RECKONING';
        positionSource = 'INERTIAL ESTIMATE';
        fusionStateText = hasFailedSensor ? 'ADAPTIVE' : 'NORMAL';
        break;
      case 'TUNNEL_EXIT':
      case 'GNSS_RECOVERING':
        gnssAvailable = true;
        gnssStatusText = 'RESTORED';
        navigationModeText = 'POSITION RECOVERY';
        positionSource = 'SENSOR FUSION';
        fusionStateText = 'FUSED';
        break;
      case 'FUSED':
      case 'COMPLETED':
        gnssAvailable = true;
        gnssStatusText = 'ACTIVE';
        navigationModeText = 'GNSS + IMU';
        positionSource = 'SENSOR FUSION';
        fusionStateText = 'FUSED';
        break;
    }

    // Compute live error between ground truth and current position
    const currentLiveError = isInsideTunnel
      ? haversineDistance(this.groundTruthPos, this.currentPos)
      : this.state === 'GNSS_RECOVERING'
      ? haversineDistance(this.groundTruthPos, this.currentPos)
      : 0;

    const availableCount = 3 - this.disabledSensors.length;

    return {
      state: this.state,
      carPosition: this.currentPos,
      groundTruthPosition: this.groundTruthPos,
      carHeading: this.currentHeading,
      carSpeedKmh: this.currentSpeedKmh,
      routeProgressPercent: Math.round(progressPercent * 10) / 10,
      totalDrivenMeters: Math.round(this.currentDistance),

      gnssAvailable,
      gnssStatusText,
      imuStatusText,
      navigationModeText,
      positionSource,
      fusionStateText,

      sensorStatus: { ...this.sensorStatus },
      disabledSensors: [...this.disabledSensors],
      availableSensorsCount: availableCount,

      isInsideTunnel,
      isApproachingTunnel: isApproaching,
      tunnelProgressPercent: Math.round(tunnelProgressPercent),
      tunnelDrivenMeters: Math.round(this.drDrivenMeters),
      tunnelLengthMeters: SIMULATION_ROUTE.tunnelLengthMeters,
      timeWithoutGNSSSec: this.outageDurationSec,

      gnssTrajectory: [...this.gnssTrajectory],
      drTrajectory: [...this.drTrajectory],
      fusedTrajectory: [...this.fusedTrajectory],

      drDisplacementMeters: Math.round(this.maxDRErrorMeters * 10) / 10,
      drErrorMeters: Math.round(currentLiveError * 10) / 10,
      distanceDuringFailureMeters: Math.round(this.distanceDuringFailureMeters),
      fusionCorrectionApplied: Math.round(this.fusionCorrectionMeters * 10) / 10,
      statusNotification: this.activeNotification,

      speedMultiplier: this.speedMultiplier,
      isPaused: this.isPaused,
    };
  }

  private notifyFrame(): void {
    const frame = this.getCurrentFrame();
    this.frameListeners.forEach((listener) => listener(frame));
  }

  private notifyCompletion(): void {
    const summary: ScenarioSummary = {
      failedSensors: Array.from(this.allFailedSensorsEver),
      gnssOutageDurationSec: this.outageDurationSec > 0 ? this.outageDurationSec : 8.4,
      distanceDuringFailureMeters: Math.round(this.distanceDuringFailureMeters),
      maxDRErrorMeters: Math.round((this.maxDRErrorMeters > 0 ? this.maxDRErrorMeters : 2.2) * 10) / 10,
      navigationContinuity: 'MAINTAINED',
      sensorsRestored: this.disabledSensors.length === 0,
      totalRouteDistanceMeters: SIMULATION_ROUTE.totalDistanceMeters,
    };

    this.completionListeners.forEach((listener) => listener(summary));
  }
}

// Singleton scenario engine instance
export const sensorFailureSimulation = new SensorFailureSimulationEngine();
