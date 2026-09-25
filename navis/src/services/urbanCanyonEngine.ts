/**
 * urbanCanyonEngine.ts
 *
 * Dedicated controller for the Urban Canyon GNSS Degradation scenario.
 * GNSS is never fully lost — it becomes noisy, biased, and jumpy due to multipath.
 * NAVIS continues a smooth estimate via IMU / dead reckoning and motion continuity,
 * then gradually re-aligns as GNSS quality recovers outside the canyon.
 *
 * Independent of the Tunnel simulationEngine singleton.
 */

import { haversineDistance, lerpLatLng, type LatLng } from '../data/simulationRoute';
import { offsetMeters, URBAN_CANYON_ROUTE } from '../data/urbanCanyonRoute';
import type { SpeedMultiplier } from './simulationEngine';

export type UrbanCanyonState =
  | 'IDLE'
  | 'STARTING'
  | 'GNSS_ACTIVE'
  | 'ENTERING_CANYON'
  | 'GNSS_DEGRADED'
  | 'NAVIS_ESTIMATION'
  | 'EXIT_RECOVERY'
  | 'GNSS_RECOVERING'
  | 'FUSED'
  | 'COMPLETED';

export type UrbanCanyonPhase =
  | 'PHASE 1 — NORMAL'
  | 'PHASE 2 — ENTERING URBAN CANYON'
  | 'PHASE 3 — GNSS DEGRADED'
  | 'PHASE 4 — NAVIS ESTIMATION'
  | 'PHASE 5 — EXIT / GNSS RECOVERY'
  | 'STANDBY'
  | 'COMPLETED';

export type LiveGnssStatus =
  | 'NORMAL GNSS'
  | 'DEGRADED GNSS'
  | 'MULTIPATH / POSITION UNCERTAINTY'
  | 'GNSS RECOVERING'
  | 'STANDBY';

export interface UrbanCanyonFrame {
  state: UrbanCanyonState;
  phaseLabel: UrbanCanyonPhase;
  liveStatus: LiveGnssStatus;

  carPosition: LatLng;
  groundTruthPosition: LatLng;
  gnssPosition: LatLng;
  navisPosition: LatLng;
  carHeading: number;
  carSpeedKmh: number;
  routeProgressPercent: number;
  totalDrivenMeters: number;

  gnssAvailable: boolean;
  gnssReliable: boolean;
  gnssAccuracyM: number;
  navisAccuracyM: number;
  gnssSignalQuality: number; // 0-100
  gnssSignalQualityLabel: 'HIGH' | 'MEDIUM' | 'LOW';
  navisConfidence: number; // 0-100
  gnssPositionErrorM: number;
  navisPositionErrorM: number;
  gnssContribution: number; // 0-100
  imuDrContribution: number; // 0-100

  isInsideCanyon: boolean;
  isApproachingCanyon: boolean;
  canyonProgressPercent: number;
  canyonDrivenMeters: number;
  canyonLengthMeters: number;

  groundTruthTrajectory: LatLng[];
  gnssTrajectory: LatLng[];
  navisTrajectory: LatLng[];

  statusNotification: string | null;
  speedMultiplier: SpeedMultiplier;
  isPaused: boolean;
}

export interface UrbanCanyonSummary {
  canyonDurationSec: number;
  canyonDistanceMeters: number;
  peakGnssErrorM: number;
  peakNavisErrorM: number;
  meanGnssErrorInCanyonM: number;
  meanNavisErrorInCanyonM: number;
  recoveryStatus: 'SUCCESSFUL' | 'FAILED';
  totalRouteDistanceMeters: number;
}

type FrameListener = (frame: UrbanCanyonFrame) => void;
type CompletionListener = (summary: UrbanCanyonSummary) => void;

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function signedHash(n: number): number {
  return hash01(n) * 2 - 1;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerpVal(current: number, target: number, speed: number): number {
  return current + (target - current) * clamp(speed, 0, 1);
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = (b - a) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return a + diff * t;
}

export class UrbanCanyonEngine {
  private state: UrbanCanyonState = 'IDLE';
  private speedMultiplier: SpeedMultiplier = 1;
  private isPaused: boolean = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private currentDistance: number = 0;
  private totalDistance: number = URBAN_CANYON_ROUTE.totalDistanceMeters;
  private currentHeading: number = URBAN_CANYON_ROUTE.waypoints[0]?.heading ?? 210;
  private currentSpeedKmh: number = 40.0;

  private gtPos: LatLng = { ...URBAN_CANYON_ROUTE.start };
  private gnssPos: LatLng = { ...URBAN_CANYON_ROUTE.start };
  private navisPos: LatLng = { ...URBAN_CANYON_ROUTE.start };
  private filteredGnssPos: LatLng = { ...URBAN_CANYON_ROUTE.start };
  private prevGt: LatLng = { ...URBAN_CANYON_ROUTE.start };

  private gtTrajectory: LatLng[] = [];
  private gnssTrajectory: LatLng[] = [];
  private navisTrajectory: LatLng[] = [];

  private gnssAccuracyM: number = 3.0;
  private navisAccuracyM: number = 2.4;
  private gnssQuality: number = 95;
  private navisConfidence: number = 94;
  private gnssErrorM: number = 2.5;
  private navisErrorM: number = 2.2;
  private gnssContribution: number = 84;
  private imuContribution: number = 16;

  private canyonDrivenMeters: number = 0;
  private canyonDurationSec: number = 0;
  private peakGnssError: number = 0;
  private peakNavisError: number = 0;
  private canyonErrorSumGnss: number = 0;
  private canyonErrorSumNavis: number = 0;
  private canyonErrorSamples: number = 0;
  private lastJumpBucket: number = -1;
  private jumpAlong: number = 0;
  private jumpLateral: number = 0;

  private recoveryBlend: number = 0;
  private activeNotification: string | null = null;
  private notificationClearTimer: ReturnType<typeof setTimeout> | null = null;

  private frameListeners: Set<FrameListener> = new Set();
  private completionListeners: Set<CompletionListener> = new Set();

  constructor() {
    this.resetState();
  }

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
        this.setNotification('Normal GNSS • Urban approach');
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

  private startLoop(): void {
    this.stopLoop();
    const tickIntervalMs = 40;
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
    this.gtPos = { ...URBAN_CANYON_ROUTE.start };
    this.gnssPos = { ...URBAN_CANYON_ROUTE.start };
    this.navisPos = { ...URBAN_CANYON_ROUTE.start };
    this.filteredGnssPos = { ...URBAN_CANYON_ROUTE.start };
    this.prevGt = { ...URBAN_CANYON_ROUTE.start };
    this.currentHeading = URBAN_CANYON_ROUTE.waypoints[0]?.heading ?? 210;
    this.currentSpeedKmh = 40.0;

    this.gtTrajectory = [{ ...URBAN_CANYON_ROUTE.start }];
    this.gnssTrajectory = [{ ...URBAN_CANYON_ROUTE.start }];
    this.navisTrajectory = [{ ...URBAN_CANYON_ROUTE.start }];

    this.gnssAccuracyM = 3.0;
    this.navisAccuracyM = 2.4;
    this.gnssQuality = 95;
    this.navisConfidence = 94;
    this.gnssErrorM = 2.5;
    this.navisErrorM = 2.2;
    this.gnssContribution = 84;
    this.imuContribution = 16;

    this.canyonDrivenMeters = 0;
    this.canyonDurationSec = 0;
    this.peakGnssError = 0;
    this.peakNavisError = 0;
    this.canyonErrorSumGnss = 0;
    this.canyonErrorSumNavis = 0;
    this.canyonErrorSamples = 0;
    this.lastJumpBucket = -1;
    this.jumpAlong = 0;
    this.jumpLateral = 0;
    this.recoveryBlend = 0;
    this.activeNotification = null;

    if (this.notificationClearTimer) {
      clearTimeout(this.notificationClearTimer);
      this.notificationClearTimer = null;
    }
  }

  private tick(dt: number): void {
    if (this.isPaused || this.state === 'IDLE' || this.state === 'COMPLETED') return;

    const effectiveVirtualSpeed = 36 * this.speedMultiplier;
    this.currentDistance += effectiveVirtualSpeed * dt;

    if (this.currentDistance >= this.totalDistance) {
      this.currentDistance = this.totalDistance;
      this.gtPos = { ...URBAN_CANYON_ROUTE.destination };
      this.gnssPos = { ...this.gtPos };
      this.navisPos = { ...this.gtPos };
      this.gtTrajectory.push({ ...this.gtPos });
      this.gnssTrajectory.push({ ...this.gnssPos });
      this.navisTrajectory.push({ ...this.navisPos });
      this.transitionTo('COMPLETED');
      this.stopLoop();
      this.setNotification('Destination reached • GNSS quality restored');
      this.notifyCompletion();
      this.notifyFrame();
      return;
    }

    const wp = this.interpolateRouteAtDistance(this.currentDistance);
    this.gtPos = wp.pos;
    const targetHeading = wp.heading;
    this.currentHeading = lerpAngle(this.currentHeading, targetHeading, Math.min(1, dt * 8));

    const targetSpeedKmh = wp.speed * 3.6;
    this.currentSpeedKmh = Math.round(lerpVal(this.currentSpeedKmh, targetSpeedKmh, Math.min(1, dt * 3.0)) * 10) / 10;

    const entrance = URBAN_CANYON_ROUTE.canyonEntranceDistance;
    const exit = URBAN_CANYON_ROUTE.canyonExitDistance;
    const approach = URBAN_CANYON_ROUTE.approachCanyonDistance;
    const dist = this.currentDistance;

    let degrade = 0;
    if (dist >= approach && dist < entrance) {
      degrade = smoothstep(approach, entrance, dist) * 0.35;
    } else if (dist >= entrance && dist < exit) {
      const inner = (dist - entrance) / Math.max(1, exit - entrance);
      degrade = 0.35 + 0.65 * Math.sin(Math.min(1, inner) * Math.PI * 0.92);
      degrade = clamp(degrade, 0.35, 1);
    } else if (dist >= exit && dist < exit + 220) {
      degrade = 1 - smoothstep(exit, exit + 220, dist);
    }

    this.updateGnss(degrade);
    this.updateNavis(degrade, dt);
    this.updateMetrics(degrade, dt);
    this.updateStateMachine(dist, approach, entrance, exit);

    const lastGt = this.gtTrajectory[this.gtTrajectory.length - 1];
    const lastGnss = this.gnssTrajectory[this.gnssTrajectory.length - 1];
    if (!lastGt || haversineDistance(lastGt, this.gtPos) >= 6) {
      this.gtTrajectory.push({ ...this.gtPos });
      this.navisTrajectory.push({ ...this.navisPos });
    }
    if (!lastGnss || haversineDistance(lastGnss, this.gnssPos) >= 4) {
      this.gnssTrajectory.push({ ...this.gnssPos });
    }

    if (dist >= entrance && dist <= exit) {
      this.canyonDrivenMeters = dist - entrance;
      this.canyonDurationSec = Math.round((this.canyonDrivenMeters / 38) * 10) / 10;
      this.canyonErrorSumGnss += this.gnssErrorM;
      this.canyonErrorSumNavis += this.navisErrorM;
      this.canyonErrorSamples += 1;
      this.peakGnssError = Math.max(this.peakGnssError, this.gnssErrorM);
      this.peakNavisError = Math.max(this.peakNavisError, this.navisErrorM);
    }

    this.prevGt = { ...this.gtPos };
    this.notifyFrame();
  }

  private updateGnss(degrade: number): void {
    const d = this.currentDistance;
    const jitterAlong = signedHash(d * 0.31) * (1.2 + 7.5 * degrade);
    const jitterLat = signedHash(d * 0.27 + 40) * (1.0 + 9.0 * degrade);
    const wanderAlong = Math.sin(d * 0.011) * 2.2 * degrade;
    const wanderLat = Math.cos(d * 0.0085 + 1.1) * 3.4 * degrade;

    const bucket = Math.floor(d / 38);
    if (bucket !== this.lastJumpBucket) {
      this.lastJumpBucket = bucket;
      if (degrade > 0.45 && hash01(bucket * 17.3) > 0.72) {
        this.jumpAlong = signedHash(bucket * 4.1) * (6 + 8 * degrade);
        this.jumpLateral = signedHash(bucket * 9.7 + 3) * (7 + 10 * degrade);
      } else {
        this.jumpAlong *= 0.35;
        this.jumpLateral *= 0.35;
      }
    }

    const jumpScale = degrade > 0.4 ? 1 : degrade / 0.4;
    const along = jitterAlong + wanderAlong + this.jumpAlong * jumpScale;
    const lateral = jitterLat + wanderLat + this.jumpLateral * jumpScale;

    this.gnssPos = offsetMeters(this.gtPos, this.currentHeading, along, lateral);
  }

  private updateNavis(degrade: number, dt: number): void {
    const motionNorth = this.gtPos.latitude - this.prevGt.latitude;
    const motionEast = this.gtPos.longitude - this.prevGt.longitude;

    const canyonRatio = clamp(
      (this.currentDistance - URBAN_CANYON_ROUTE.canyonEntranceDistance) /
        Math.max(1, URBAN_CANYON_ROUTE.canyonLengthMeters),
      0,
      1
    );
    const driftEnvelope = degrade * Math.sin(Math.min(1, canyonRatio) * Math.PI);
    const driftLat = driftEnvelope * 3.8;
    const driftAlong = driftEnvelope * 1.4 * Math.sin(this.currentDistance * 0.015);
    const drifted = offsetMeters(this.gtPos, this.currentHeading, driftAlong, driftLat);

    const inertial: LatLng = {
      latitude: this.navisPos.latitude + motionNorth,
      longitude: this.navisPos.longitude + motionEast,
    };

    this.filteredGnssPos = lerpLatLng(this.filteredGnssPos, this.gnssPos, Math.min(1, dt * 1.2));

    if (degrade < 0.18) {
      const blended = lerpLatLng(this.navisPos, this.gtPos, 0.42);
      this.navisPos = lerpLatLng(blended, drifted, 0.15);
    } else {
      const gnssTrust = 0.04 + (1 - degrade) * 0.08;
      const motionHold = lerpLatLng(inertial, drifted, 0.55);
      this.navisPos = lerpLatLng(motionHold, this.filteredGnssPos, gnssTrust);

      if (this.state === 'EXIT_RECOVERY' || this.state === 'GNSS_RECOVERING' || this.state === 'FUSED') {
        this.recoveryBlend = clamp(this.recoveryBlend + dt * 0.45, 0, 1);
        this.navisPos = lerpLatLng(this.navisPos, this.gtPos, 0.08 + this.recoveryBlend * 0.18);
      }
    }
  }

  private updateMetrics(degrade: number, dt: number): void {
    const d = this.currentDistance;

    const ripple1 = Math.sin(d * 0.04) * 0.12;
    const ripple2 = Math.cos(d * 0.03 + 1.2) * 0.15;
    const ripple3 = Math.sin(d * 0.025 + 2.5) * 1.5;
    const ripple4 = Math.cos(d * 0.035 + 0.8) * 0.8;

    const targetGnssError = 2.5 + degrade * 14.2 + degrade * (Math.sin(d * 0.03) * 1.2 + ripple1);
    const targetNavisError = 2.2 + degrade * 3.4 + degrade * (Math.cos(d * 0.02 + 0.8) * 0.3);

    const targetGnssAcc = 3.0 + degrade * 16.5 + ripple2 * (1 + degrade * 2);
    const targetNavisAcc = 2.4 + degrade * 2.8 + ripple1 * (1 + degrade);

    const targetGnssQuality = 95 - degrade * 48 + ripple3;
    const targetNavisConf = 94.5 - degrade * 12.5 + ripple4;

    const targetGnssContrib = 84 - degrade * 56;

    const rate = Math.min(1, dt * 2.5);
    this.gnssErrorM = Math.round(lerpVal(this.gnssErrorM, targetGnssError, rate) * 10) / 10;
    this.navisErrorM = Math.round(lerpVal(this.navisErrorM, targetNavisError, rate) * 10) / 10;
    this.gnssAccuracyM = Math.round(lerpVal(this.gnssAccuracyM, targetGnssAcc, rate) * 10) / 10;
    this.navisAccuracyM = Math.round(lerpVal(this.navisAccuracyM, targetNavisAcc, rate) * 10) / 10;

    this.gnssQuality = Math.round(clamp(lerpVal(this.gnssQuality, targetGnssQuality, rate), 15, 98));
    this.navisConfidence = Math.round(clamp(lerpVal(this.navisConfidence, targetNavisConf, rate), 60, 98));

    this.gnssContribution = Math.round(clamp(lerpVal(this.gnssContribution, targetGnssContrib, rate), 18, 88));
    this.imuContribution = 100 - this.gnssContribution;
  }

  private updateStateMachine(dist: number, approach: number, entrance: number, exit: number): void {
    if (dist >= approach && dist < entrance) {
      if (this.state === 'GNSS_ACTIVE' || this.state === 'STARTING') {
        this.transitionTo('ENTERING_CANYON');
        this.setNotification('Entering urban canyon • GNSS quality dropping');
      }
    } else if (dist >= entrance && dist < exit) {
      const inner = (dist - entrance) / Math.max(1, exit - entrance);
      if (this.state === 'ENTERING_CANYON' || this.state === 'GNSS_ACTIVE') {
        this.transitionTo('GNSS_DEGRADED');
        this.setNotification('GNSS degraded • Multipath active');
      } else if (this.state === 'GNSS_DEGRADED' && inner > 0.22) {
        this.transitionTo('NAVIS_ESTIMATION');
        this.setNotification('NAVIS estimating with IMU / dead reckoning');
      }
    } else if (dist >= exit && dist < exit + 220) {
      if (this.state === 'NAVIS_ESTIMATION' || this.state === 'GNSS_DEGRADED') {
        this.transitionTo('EXIT_RECOVERY');
        this.setNotification('Exiting canyon • GNSS recovering');
        setTimeout(() => {
          if (this.state === 'EXIT_RECOVERY') {
            this.transitionTo('GNSS_RECOVERING');
          }
        }, 400);
      }
    } else if (dist >= exit + 220) {
      if (this.state === 'GNSS_RECOVERING' || this.state === 'EXIT_RECOVERY') {
        this.transitionTo('FUSED');
        this.setNotification('GNSS quality restored • NAVIS re-aligned');
      }
    }
  }

  private interpolateRouteAtDistance(targetDist: number): { pos: LatLng; heading: number; speed: number } {
    const waypoints = URBAN_CANYON_ROUTE.waypoints;
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
    const clampedT = clamp(t, 0, 1);
    return {
      pos: lerpLatLng(p1.position, p2.position, clampedT),
      heading: lerpAngle(p1.heading, p2.heading, clampedT),
      speed: p1.speed + (p2.speed - p1.speed) * clampedT,
    };
  }

  private transitionTo(newState: UrbanCanyonState): void {
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

  public getCurrentFrame(): UrbanCanyonFrame {
    const progressPercent = clamp((this.currentDistance / this.totalDistance) * 100, 0, 100);
    const isInsideCanyon = this.state === 'GNSS_DEGRADED' || this.state === 'NAVIS_ESTIMATION';
    const isApproaching = this.state === 'ENTERING_CANYON';
    const canyonProgress = clamp(
      (this.canyonDrivenMeters / URBAN_CANYON_ROUTE.canyonLengthMeters) * 100,
      0,
      100
    );

    let qualityLabel: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    if (this.gnssQuality < 40) qualityLabel = 'LOW';
    else if (this.gnssQuality < 70) qualityLabel = 'MEDIUM';

    return {
      state: this.state,
      phaseLabel: this.phaseForState(this.state),
      liveStatus: this.statusForState(this.state),
      carPosition: this.navisPos,
      groundTruthPosition: this.gtPos,
      gnssPosition: this.gnssPos,
      navisPosition: this.navisPos,
      carHeading: this.currentHeading,
      carSpeedKmh: this.currentSpeedKmh,
      routeProgressPercent: Math.round(progressPercent * 10) / 10,
      totalDrivenMeters: Math.round(this.currentDistance),
      gnssAvailable: true,
      gnssReliable: this.gnssQuality >= 70,
      gnssAccuracyM: this.gnssAccuracyM,
      navisAccuracyM: this.navisAccuracyM,
      gnssSignalQuality: this.gnssQuality,
      gnssSignalQualityLabel: qualityLabel,
      navisConfidence: this.navisConfidence,
      gnssPositionErrorM: this.gnssErrorM,
      navisPositionErrorM: this.navisErrorM,
      gnssContribution: this.gnssContribution,
      imuDrContribution: this.imuContribution,
      isInsideCanyon,
      isApproachingCanyon: isApproaching,
      canyonProgressPercent: Math.round(canyonProgress),
      canyonDrivenMeters: Math.round(this.canyonDrivenMeters),
      canyonLengthMeters: URBAN_CANYON_ROUTE.canyonLengthMeters,
      groundTruthTrajectory: [...this.gtTrajectory],
      gnssTrajectory: [...this.gnssTrajectory],
      navisTrajectory: [...this.navisTrajectory],
      statusNotification: this.activeNotification,
      speedMultiplier: this.speedMultiplier,
      isPaused: this.isPaused,
    };
  }

  private phaseForState(state: UrbanCanyonState): UrbanCanyonPhase {
    switch (state) {
      case 'IDLE':
        return 'STANDBY';
      case 'STARTING':
      case 'GNSS_ACTIVE':
        return 'PHASE 1 — NORMAL';
      case 'ENTERING_CANYON':
        return 'PHASE 2 — ENTERING URBAN CANYON';
      case 'GNSS_DEGRADED':
        return 'PHASE 3 — GNSS DEGRADED';
      case 'NAVIS_ESTIMATION':
        return 'PHASE 4 — NAVIS ESTIMATION';
      case 'EXIT_RECOVERY':
      case 'GNSS_RECOVERING':
        return 'PHASE 5 — EXIT / GNSS RECOVERY';
      case 'FUSED':
        return 'PHASE 1 — NORMAL';
      case 'COMPLETED':
        return 'COMPLETED';
    }
  }

  private statusForState(state: UrbanCanyonState): LiveGnssStatus {
    switch (state) {
      case 'IDLE':
        return 'STANDBY';
      case 'STARTING':
      case 'GNSS_ACTIVE':
      case 'FUSED':
      case 'COMPLETED':
        return 'NORMAL GNSS';
      case 'ENTERING_CANYON':
        return 'DEGRADED GNSS';
      case 'GNSS_DEGRADED':
        return 'DEGRADED GNSS';
      case 'NAVIS_ESTIMATION':
        return 'MULTIPATH / POSITION UNCERTAINTY';
      case 'EXIT_RECOVERY':
      case 'GNSS_RECOVERING':
        return 'GNSS RECOVERING';
    }
  }

  private notifyFrame(): void {
    const frame = this.getCurrentFrame();
    this.frameListeners.forEach((listener) => listener(frame));
  }

  private notifyCompletion(): void {
    const samples = Math.max(1, this.canyonErrorSamples);
    const summary: UrbanCanyonSummary = {
      canyonDurationSec: this.canyonDurationSec > 0 ? this.canyonDurationSec : 11.2,
      canyonDistanceMeters: Math.round(
        this.canyonDrivenMeters > 0 ? this.canyonDrivenMeters : URBAN_CANYON_ROUTE.canyonLengthMeters
      ),
      peakGnssErrorM: Math.round((this.peakGnssError || 18.4) * 10) / 10,
      peakNavisErrorM: Math.round((this.peakNavisError || 6.2) * 10) / 10,
      meanGnssErrorInCanyonM: Math.round((this.canyonErrorSumGnss / samples) * 10) / 10,
      meanNavisErrorInCanyonM: Math.round((this.canyonErrorSumNavis / samples) * 10) / 10,
      recoveryStatus: 'SUCCESSFUL',
      totalRouteDistanceMeters: URBAN_CANYON_ROUTE.totalDistanceMeters,
    };
    this.completionListeners.forEach((listener) => listener(summary));
  }
}

export const urbanCanyonEngine = new UrbanCanyonEngine();
