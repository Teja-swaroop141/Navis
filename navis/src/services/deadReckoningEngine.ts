/**
 * Dead Reckoning Engine
 *
 * Estimates position when GNSS is unavailable using:
 *   - Accelerometer (step detection + linear acceleration)
 *   - Gyroscope (heading rate)
 *   - Magnetometer (absolute heading reference)
 *
 * Algorithm:
 *   1. Remove gravity from accelerometer using a low-pass filter
 *   2. Detect steps using peak detection on vertical acceleration
 *   3. Update heading from gyroscope integration + magnetometer correction
 *   4. Compute velocity from step length model
 *   5. Integrate velocity to get displacement
 *   6. Add displacement to last known position
 *
 * This is a simplified prototype engine, designed to be replaced by a
 * full INS/Kalman filter implementation (optionally via FastAPI backend).
 */

import { LatLng, Vec3, AccelerometerData, GyroscopeData, MagnetometerData, DeadReckoningState, SensorAvailability } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────
const STEP_LENGTH_M = 0.72;          // Average step length in meters
const STEP_DETECT_THRESHOLD = 1.2;  // Acceleration magnitude delta for step
const GRAVITY = 9.81;
const LOW_PASS_ALPHA = 0.1;          // Low-pass filter coefficient
const GYRO_HEADING_WEIGHT = 0.7;     // How much gyro contributes to heading
const MAG_HEADING_WEIGHT = 0.3;      // How much magnetometer contributes
const ERROR_GROWTH_RATE = 0.05;      // Meters of error per meter traveled

// ─── Engine State ─────────────────────────────────────────────────────────────
interface EngineState {
  gravity: Vec3;
  linearAccel: Vec3;
  prevAccelMag: number;
  stepDetected: boolean;
  heading: number;                  // degrees
  headingRate: number;              // deg/s from gyro
  velocity: number;                 // m/s
  lastTimestamp: number;
  position: LatLng;
  distanceTraveled: number;
  stepCount: number;
  cumulativeError: number;
}

export class DeadReckoningEngine {
  private state: EngineState;
  private startTime: number = 0;
  private isActive: boolean = false;
  private sensorAvailability: SensorAvailability = {
    accelerometer: true,
    gyroscope: true,
    magnetometer: true,
  };

  constructor() {
    this.state = {
      gravity: { x: 0, y: 0, z: GRAVITY },
      linearAccel: { x: 0, y: 0, z: 0 },
      prevAccelMag: 0,
      stepDetected: false,
      heading: 0,
      headingRate: 0,
      velocity: 0,
      lastTimestamp: 0,
      position: { latitude: 0, longitude: 0 },
      distanceTraveled: 0,
      stepCount: 0,
      cumulativeError: 0,
    };
  }

  /**
   * Initialize the engine with the last known GNSS position and heading.
   */
  start(lastKnownPosition: LatLng, lastKnownHeading: number, lastKnownVelocity: number): void {
    this.state.position = { ...lastKnownPosition };
    this.state.heading = lastKnownHeading;
    this.state.velocity = lastKnownVelocity;
    this.state.distanceTraveled = 0;
    this.state.stepCount = 0;
    this.state.cumulativeError = 0;
    this.state.lastTimestamp = Date.now();
    this.startTime = Date.now();
    this.isActive = true;
  }

  /**
   * Configure sensor availability for adaptive dead reckoning.
   */
  setSensorAvailability(availability: SensorAvailability): void {
    this.sensorAvailability = { ...availability };
  }

  getSensorAvailability(): SensorAvailability {
    return { ...this.sensorAvailability };
  }

  /**
   * Reset the engine.
   */
  stop(): void {
    this.isActive = false;
  }

  /**
   * Process a new accelerometer reading.
   * Returns true if a step was detected.
   */
  processAccelerometer(data: AccelerometerData): boolean {
    if (!this.sensorAvailability.accelerometer) {
      return false;
    }

    // Low-pass filter to isolate gravity
    this.state.gravity.x = LOW_PASS_ALPHA * data.x + (1 - LOW_PASS_ALPHA) * this.state.gravity.x;
    this.state.gravity.y = LOW_PASS_ALPHA * data.y + (1 - LOW_PASS_ALPHA) * this.state.gravity.y;
    this.state.gravity.z = LOW_PASS_ALPHA * data.z + (1 - LOW_PASS_ALPHA) * this.state.gravity.z;

    // Remove gravity to get linear acceleration
    this.state.linearAccel = {
      x: data.x - this.state.gravity.x,
      y: data.y - this.state.gravity.y,
      z: data.z - this.state.gravity.z,
    };

    // Magnitude of linear acceleration
    const mag = Math.sqrt(
      this.state.linearAccel.x ** 2 +
      this.state.linearAccel.y ** 2 +
      this.state.linearAccel.z ** 2
    );

    // Simple peak detection for step counting
    let stepDetected = false;
    if (this.state.prevAccelMag < STEP_DETECT_THRESHOLD && mag >= STEP_DETECT_THRESHOLD) {
      stepDetected = true;
      this.state.stepCount++;
      this.state.stepDetected = true;

      // Update distance on step detection
      this.state.distanceTraveled += STEP_LENGTH_M;
      this.state.cumulativeError += STEP_LENGTH_M * ERROR_GROWTH_RATE;

      // Update position based on current heading
      this.updatePositionOnStep();
    } else {
      this.state.stepDetected = false;
    }

    this.state.prevAccelMag = mag;
    return stepDetected;
  }

  /**
   * Process gyroscope data to update heading rate.
   */
  processGyroscope(data: GyroscopeData): void {
    if (!this.isActive || !this.sensorAvailability.gyroscope) return;

    const now = Date.now();
    const dt = (now - this.state.lastTimestamp) / 1000; // seconds
    if (dt <= 0 || dt > 1) {
      this.state.lastTimestamp = now;
      return;
    }

    // Z-axis gyroscope gives rotation rate around vertical axis (yaw rate)
    // Convert rad/s to deg/s
    const yawRateDeg = (data.z * 180) / Math.PI;
    this.state.headingRate = yawRateDeg;

    // Integrate gyro to update heading
    const gyroHeading = this.state.heading + yawRateDeg * dt;
    this.state.heading = gyroHeading;
    this.state.lastTimestamp = now;
  }

  /**
   * Process magnetometer data to correct absolute heading.
   */
  processMagnetometer(data: MagnetometerData): void {
    if (!this.isActive || !this.sensorAvailability.magnetometer) return;

    // Compute magnetic heading from X and Y components
    const magHeading = ((Math.atan2(data.y, data.x) * 180) / Math.PI + 360) % 360;

    // Fuse gyro heading (drift) with mag heading (absolute but noisy)
    if (this.sensorAvailability.gyroscope) {
      this.state.heading =
        GYRO_HEADING_WEIGHT * this.state.heading +
        MAG_HEADING_WEIGHT * magHeading;
    } else {
      // Gyro unavailable: rely purely on magnetometer absolute heading
      this.state.heading = magHeading;
    }
    this.state.heading = ((this.state.heading % 360) + 360) % 360;
  }

  /**
   * Update position when a step is detected.
   * Converts heading + step length to lat/lng displacement.
   */
  private updatePositionOnStep(): void {
    const headingRad = (this.state.heading * Math.PI) / 180;
    const distDeg = STEP_LENGTH_M / 111320; // approximate meters per degree

    const dLat = distDeg * Math.cos(headingRad);
    const dLon = distDeg * Math.sin(headingRad) / Math.cos((this.state.position.latitude * Math.PI) / 180);

    this.state.position = {
      latitude: this.state.position.latitude + dLat,
      longitude: this.state.position.longitude + dLon,
    };
  }

  /**
   * Get current dead reckoning state snapshot.
   */
  getState(): DeadReckoningState {
    const elapsed = this.isActive ? (Date.now() - this.startTime) / 1000 : 0;

    return {
      position: { ...this.state.position },
      velocity: this.state.velocity,
      heading: this.state.heading,
      distanceTraveled: this.state.distanceTraveled,
      elapsedTime: elapsed,
      estimatedError: this.state.cumulativeError,
      isActive: this.isActive,
      stepCount: this.state.stepCount,
    };
  }

  /**
   * Get the linear acceleration magnitude (for display).
   */
  getLinearAccelMagnitude(): number {
    return Math.sqrt(
      this.state.linearAccel.x ** 2 +
      this.state.linearAccel.y ** 2 +
      this.state.linearAccel.z ** 2
    );
  }

  /**
   * Set simulated state directly (used during realistic demo road simulations).
   */
  setManualState(position: LatLng, heading: number, velocity: number, stepCount: number, estimatedError: number): void {
    this.state.position = { ...position };
    this.state.heading = heading;
    this.state.velocity = velocity;
    this.state.stepCount = stepCount;
    this.state.distanceTraveled = stepCount * STEP_LENGTH_M;
    this.state.cumulativeError = estimatedError;
    this.isActive = true;
  }
}

// Singleton engine instance
export const deadReckoningEngine = new DeadReckoningEngine();
