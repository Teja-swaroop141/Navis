/**
 * simulationEngine.ts
 *
 * Dedicated controller for the GNSS Dead Reckoning Tunnel Navigation Simulation.
 * Implements the explicit 10-state state machine:
 * IDLE → STARTING → GNSS_ACTIVE → APPROACHING_TUNNEL → GNSS_LOST →
 * DEAD_RECKONING → TUNNEL_EXIT → GNSS_RECOVERING → FUSED → COMPLETED
 *
 * Responsibilities:
 * - Route management and smooth continuous position interpolation
 * - Car speed, heading, and route progress tracking
 * - Realistic Dead Reckoning position generation during GNSS outage
 * - Sensor fusion position correction upon tunnel exit
 * - Trajectory separation (GNSS polyline, DR polyline, Fused polyline)
 * - Deterministic, repeatable lifecycle (pause, resume, restart, speed multipliers)
 */

import {
  SIMULATION_ROUTE,
  LatLng,
  RouteWaypoint,
  haversineDistance,
  calculateBearing,
  lerpLatLng,
} from '../data/simulationRoute';

export type SimulationState =
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

export interface SimulationFrame {
  state: SimulationState;
  carPosition: LatLng;
  carHeading: number;
  carSpeedKmh: number;
  routeProgressPercent: number; // 0 - 100
  totalDrivenMeters: number;

  // GNSS & Sensor State
  gnssAvailable: boolean;
  gnssStatusText: 'ACTIVE' | 'LOST' | 'RESTORED' | 'STANDBY';
  imuStatusText: 'ACTIVE' | 'CALIBRATING' | 'STANDBY';
  navigationModeText: string;
  positionSource: 'GNSS SATELLITE' | 'INERTIAL ESTIMATE' | 'SENSOR FUSION' | 'STANDBY';

  // Tunnel Metrics
  isInsideTunnel: boolean;
  isApproachingTunnel: boolean;
  tunnelProgressPercent: number; // 0 - 100
  tunnelDrivenMeters: number;
  tunnelLengthMeters: number;
  timeWithoutGNSSSec: number;

  // Trajectories
  gnssTrajectory: LatLng[];
  drTrajectory: LatLng[];
  fusedTrajectory: LatLng[];

  // Correction details
  drDisplacementMeters: number;
  fusionCorrectionApplied: number;
  statusNotification: string | null;

  // Controls
  speedMultiplier: SpeedMultiplier;
  isPaused: boolean;
}

export interface SimulationSummary {
  gnssOutageDurationSec: number;
  distanceWithoutGNSSMeters: number;
  maxDRDisplacementMeters: number;
  finalDRErrorMeters: number;
  recoveryStatus: 'SUCCESSFUL' | 'FAILED';
  positionFusionStatus: 'COMPLETED' | 'IN_PROGRESS';
  totalRouteDistanceMeters: number;
}

type FrameListener = (frame: SimulationFrame) => void;
type CompletionListener = (summary: SimulationSummary) => void;

export class SimulationEngine {
  private state: SimulationState = 'IDLE';
  private speedMultiplier: SpeedMultiplier = 1;
  private isPaused: boolean = false;
  private intervalId: any = null;

  // Navigation progression
  private currentDistance: number = 0; // meters traveled along route
  private totalDistance: number = SIMULATION_ROUTE.totalDistanceMeters;
  private currentWaypointIndex: number = 0;

  // Current visual position & kinematics
  private currentPos: LatLng = { ...SIMULATION_ROUTE.start };
  private currentHeading: number = SIMULATION_ROUTE.waypoints[0]?.heading ?? 268;
  private currentSpeedKmh: number = 44.0;

  // Trajectory segments
  private gnssTrajectory: LatLng[] = [];
  private drTrajectory: LatLng[] = [];
  private fusedTrajectory: LatLng[] = [];

  // Outage / DR tracking
  private outageStartTime: number = 0;
  private outageDurationSec: number = 0;
  private drDrivenMeters: number = 0;
  private maxDrDisplacement: number = 0;
  private lastKnownGNSSPos: LatLng | null = null;
  private drOffsetLat: number = 0;
  private drOffsetLng: number = 0;

  // Recovery / Fusion tracking
  private fusionProgress: number = 0; // 0 -> 1
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

  // ─── Public Control Methods ───────────────────────────────────────────────

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

    // Smooth ramp-up from STARTING to GNSS_ACTIVE
    setTimeout(() => {
      if (this.state === 'STARTING') {
        this.transitionTo('GNSS_ACTIVE');
        this.setNotification('GNSS Navigation Active');
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

  // ─── Internal Simulation Engine Loop ───────────────────────────────────────

  private startLoop(): void {
    this.stopLoop();
    const tickIntervalMs = 40; // 25 updates per second
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
    this.currentWaypointIndex = 0;
    this.currentPos = { ...SIMULATION_ROUTE.start };
    this.currentHeading = SIMULATION_ROUTE.waypoints[0]?.heading ?? 268;
    this.currentSpeedKmh = 44.0;

    this.gnssTrajectory = [{ ...SIMULATION_ROUTE.start }];
    this.drTrajectory = [];
    this.fusedTrajectory = [];

    this.outageStartTime = 0;
    this.outageDurationSec = 0;
    this.drDrivenMeters = 0;
    this.maxDrDisplacement = 0;
    this.lastKnownGNSSPos = null;
    this.drOffsetLat = 0;
    this.drOffsetLng = 0;

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

    // Advance vehicle along route (virtual speed calibration: ~35m/s effective rate so route finishes in ~32s)
    const effectiveVirtualSpeed = 38 * this.speedMultiplier;
    this.currentDistance += effectiveVirtualSpeed * dt;

    if (this.currentDistance >= this.totalDistance) {
      this.currentDistance = this.totalDistance;
      this.currentPos = { ...SIMULATION_ROUTE.destination };
      this.fusedTrajectory.push({ ...this.currentPos });
      this.transitionTo('COMPLETED');
      this.stopLoop();
      this.setNotification('Destination Reached • Simulation Complete');
      this.notifyCompletion();
      this.notifyFrame();
      return;
    }

    // Find position and heading along route waypoints
    const wp = this.interpolateRouteAtDistance(this.currentDistance);
    const rawRoadPos = wp.pos;
    this.currentHeading = wp.heading;
    this.currentSpeedKmh = Math.round((wp.speed * 3.6 + Math.sin(this.currentDistance * 0.1) * 2) * 10) / 10;

    // Check state machine thresholds
    const entranceDist = SIMULATION_ROUTE.tunnelEntranceDistance;
    const exitDist = SIMULATION_ROUTE.tunnelExitDistance;
    const approachDist = SIMULATION_ROUTE.approachTunnelDistance;

    // State 1: APPROACHING_TUNNEL
    if (this.currentDistance >= approachDist && this.currentDistance < entranceDist) {
      if (this.state === 'GNSS_ACTIVE' || this.state === 'STARTING') {
        this.transitionTo('APPROACHING_TUNNEL');
        this.setNotification('Approaching GNSS-denied zone');
      }
    }

    // State 2: GNSS_LOST & DEAD_RECKONING (Car Enters Tunnel)
    if (this.currentDistance >= entranceDist && this.currentDistance < exitDist) {
      if (this.state !== 'GNSS_LOST' && this.state !== 'DEAD_RECKONING') {
        this.lastKnownGNSSPos = { ...rawRoadPos };
        this.outageStartTime = Date.now();
        this.transitionTo('GNSS_LOST');
        this.setNotification('GNSS signal lost • Dead Reckoning activated');

        // Immediate transition to DEAD_RECKONING
        setTimeout(() => {
          if (this.state === 'GNSS_LOST') {
            this.transitionTo('DEAD_RECKONING');
          }
        }, 300);
      }

      // Update DR outage duration and driven distance
      this.drDrivenMeters = Math.max(0, this.currentDistance - entranceDist);
      const elapsedMs = Date.now() - (this.outageStartTime || Date.now());
      // Calibrated simulated outage clock for realism (~8-10 seconds of tunnel transit)
      const tunnelProgressRatio = Math.min(1, this.drDrivenMeters / SIMULATION_ROUTE.tunnelLengthMeters);
      this.outageDurationSec = Math.round(tunnelProgressRatio * 9.4 * 10) / 10;

      // Realistic Inertial Dead Reckoning Drift
      // INS integration experiences slight gyro/accel drift (~1.5-2.2m lateral deviation over 400m)
      const driftMagnitude = Math.sin(tunnelProgressRatio * Math.PI) * 0.000022; // ~2.2m in degrees
      this.drOffsetLat = driftMagnitude * 0.3;
      this.drOffsetLng = driftMagnitude * 0.9;

      const drEstimatedPos: LatLng = {
        latitude: rawRoadPos.latitude + this.drOffsetLat,
        longitude: rawRoadPos.longitude + this.drOffsetLng,
      };

      this.currentPos = drEstimatedPos;
      this.drTrajectory.push({ ...drEstimatedPos });

      const displacement = haversineDistance(rawRoadPos, drEstimatedPos);
      if (displacement > this.maxDrDisplacement) {
        this.maxDrDisplacement = displacement;
      }
    }

    // State 3: TUNNEL_EXIT & GNSS_RECOVERING (Car Exits Tunnel)
    else if (this.currentDistance >= exitDist && this.currentDistance < exitDist + 180) {
      if (this.state === 'DEAD_RECKONING' || this.state === 'GNSS_LOST') {
        this.transitionTo('TUNNEL_EXIT');
        this.setNotification('GNSS signal restored • Correcting position...');

        setTimeout(() => {
          if (this.state === 'TUNNEL_EXIT') {
            this.transitionTo('GNSS_RECOVERING');
          }
        }, 350);
      }

      // Smooth Position Fusion Correction:
      // Animate the car from the DR drifted position back onto the accurate GNSS centerline
      const recoveryDistTraveled = this.currentDistance - exitDist;
      this.fusionProgress = Math.min(1, recoveryDistTraveled / 120);

      // Interpolate from DR offset to 0
      const currentDrOffsetLat = this.drOffsetLat * (1 - this.fusionProgress);
      const currentDrOffsetLng = this.drOffsetLng * (1 - this.fusionProgress);

      this.currentPos = {
        latitude: rawRoadPos.latitude + currentDrOffsetLat,
        longitude: rawRoadPos.longitude + currentDrOffsetLng,
      };

      this.fusionCorrectionMeters = haversineDistance(
        { latitude: rawRoadPos.latitude + this.drOffsetLat, longitude: rawRoadPos.longitude + this.drOffsetLng },
        this.currentPos
      );

      this.fusedTrajectory.push({ ...this.currentPos });
    }

    // State 4: FUSED & Normal Road Resumed
    else if (this.currentDistance >= exitDist + 180) {
      if (this.state === 'GNSS_RECOVERING' || this.state === 'TUNNEL_EXIT') {
        this.transitionTo('FUSED');
        this.setNotification('Position Fusion Active • Normal Highway Navigation');
      }

      this.currentPos = { ...rawRoadPos };
      this.fusedTrajectory.push({ ...this.currentPos });
    }

    // Pre-tunnel GNSS driving
    else if (this.currentDistance < entranceDist) {
      this.currentPos = { ...rawRoadPos };
      this.gnssTrajectory.push({ ...this.currentPos });
    }

    this.notifyFrame();
  }

  private transitionTo(newState: SimulationState): void {
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

  // ─── Mathematical Interpolation Along Route ───────────────────────────────

  private interpolateRouteAtDistance(targetDist: number): { pos: LatLng; heading: number; speed: number } {
    const waypoints = SIMULATION_ROUTE.waypoints;
    if (targetDist <= 0) {
      return { pos: waypoints[0].position, heading: waypoints[0].heading, speed: waypoints[0].speed };
    }
    if (targetDist >= this.totalDistance) {
      const last = waypoints[waypoints.length - 1];
      return { pos: last.position, heading: last.heading, speed: 0 };
    }

    // Binary / linear search for current segment
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

  // ─── Frame Assembly & Notifiers ───────────────────────────────────────────

  public getCurrentFrame(): SimulationFrame {
    const progressPercent = Math.min(100, Math.max(0, (this.currentDistance / this.totalDistance) * 100));

    // Tunnel metrics
    const isInsideTunnel = this.state === 'GNSS_LOST' || this.state === 'DEAD_RECKONING';
    const isApproaching = this.state === 'APPROACHING_TUNNEL';
    const tunnelProgressPercent = Math.min(100, Math.max(0, (this.drDrivenMeters / SIMULATION_ROUTE.tunnelLengthMeters) * 100));

    // Mode details based on current state
    let gnssAvailable = true;
    let gnssStatusText: 'ACTIVE' | 'LOST' | 'RESTORED' | 'STANDBY' = 'ACTIVE';
    let navigationModeText = 'GNSS NAVIGATION';
    let positionSource: 'GNSS SATELLITE' | 'INERTIAL ESTIMATE' | 'SENSOR FUSION' | 'STANDBY' = 'GNSS SATELLITE';

    switch (this.state) {
      case 'IDLE':
        gnssAvailable = true;
        gnssStatusText = 'STANDBY';
        navigationModeText = 'STANDBY';
        positionSource = 'STANDBY';
        break;
      case 'STARTING':
      case 'GNSS_ACTIVE':
      case 'APPROACHING_TUNNEL':
        gnssAvailable = true;
        gnssStatusText = 'ACTIVE';
        navigationModeText = 'GNSS NAVIGATION';
        positionSource = 'GNSS SATELLITE';
        break;
      case 'GNSS_LOST':
      case 'DEAD_RECKONING':
        gnssAvailable = false;
        gnssStatusText = 'LOST';
        navigationModeText = 'DEAD RECKONING';
        positionSource = 'INERTIAL ESTIMATE';
        break;
      case 'TUNNEL_EXIT':
      case 'GNSS_RECOVERING':
        gnssAvailable = true;
        gnssStatusText = 'RESTORED';
        navigationModeText = 'POSITION RECOVERY';
        positionSource = 'SENSOR FUSION';
        break;
      case 'FUSED':
      case 'COMPLETED':
        gnssAvailable = true;
        gnssStatusText = 'ACTIVE';
        navigationModeText = 'GNSS + IMU';
        positionSource = 'SENSOR FUSION';
        break;
    }

    return {
      state: this.state,
      carPosition: this.currentPos,
      carHeading: this.currentHeading,
      carSpeedKmh: this.currentSpeedKmh,
      routeProgressPercent: Math.round(progressPercent * 10) / 10,
      totalDrivenMeters: Math.round(this.currentDistance),

      gnssAvailable,
      gnssStatusText,
      imuStatusText: 'ACTIVE',
      navigationModeText,
      positionSource,

      isInsideTunnel,
      isApproachingTunnel: isApproaching,
      tunnelProgressPercent: Math.round(tunnelProgressPercent),
      tunnelDrivenMeters: Math.round(this.drDrivenMeters),
      tunnelLengthMeters: SIMULATION_ROUTE.tunnelLengthMeters,
      timeWithoutGNSSSec: this.outageDurationSec,

      gnssTrajectory: [...this.gnssTrajectory],
      drTrajectory: [...this.drTrajectory],
      fusedTrajectory: [...this.fusedTrajectory],

      drDisplacementMeters: Math.round(this.maxDrDisplacement * 10) / 10,
      fusionCorrectionApplied: Math.round(this.fusionCorrectionMeters * 10) / 10,
      statusNotification: this.activeNotification,

      speedMultiplier: this.speedMultiplier,
      isPaused: this.isPaused,
    };
  }

  private notifyFrame(): void {
    const frame = this.getCurrentFrame();
    this.frameListeners.forEach(listener => listener(frame));
  }

  private notifyCompletion(): void {
    const summary: SimulationSummary = {
      gnssOutageDurationSec: this.outageDurationSec > 0 ? this.outageDurationSec : 8.4,
      distanceWithoutGNSSMeters: Math.round(this.drDrivenMeters > 0 ? this.drDrivenMeters : SIMULATION_ROUTE.tunnelLengthMeters),
      maxDRDisplacementMeters: Math.round((this.maxDrDisplacement > 0 ? this.maxDrDisplacement : 2.1) * 10) / 10,
      finalDRErrorMeters: 0.2,
      recoveryStatus: 'SUCCESSFUL',
      positionFusionStatus: 'COMPLETED',
      totalRouteDistanceMeters: SIMULATION_ROUTE.totalDistanceMeters,
    };

    this.completionListeners.forEach(listener => listener(summary));
  }
}

// Export singleton instance for app-wide access
export const simulationEngine = new SimulationEngine();
