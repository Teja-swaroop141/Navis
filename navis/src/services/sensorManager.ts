/**
 * Sensor Manager
 *
 * Manages accelerometer, gyroscope, and magnetometer subscriptions.
 * Falls back to deterministic simulated data if sensors are unavailable
 * (e.g., running on an emulator or web).
 */

import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';
import { IMUData, AccelerometerData, GyroscopeData, MagnetometerData, SensorHealth } from '../types';
import { generateSimulatedIMU } from '../constants/demoRoute';

type IMUCallback = (data: IMUData) => void;

const UPDATE_INTERVAL_MS = 100; // 10 Hz

export class SensorManager {
  private accelSub: ReturnType<typeof Accelerometer.addListener> | null = null;
  private gyroSub: ReturnType<typeof Gyroscope.addListener> | null = null;
  private magSub: ReturnType<typeof Magnetometer.addListener> | null = null;

  private latestAccel: AccelerometerData = { x: 0, y: 0, z: 9.81, timestamp: Date.now() };
  private latestGyro: GyroscopeData = { x: 0, y: 0, z: 0, timestamp: Date.now() };
  private latestMag: MagnetometerData = { x: 21.4, y: -8.3, z: 41.2, timestamp: Date.now() };

  private callback: IMUCallback | null = null;
  private publishInterval: ReturnType<typeof setInterval> | null = null;
  private simInterval: ReturnType<typeof setInterval> | null = null;
  private isSimulated: boolean = false;
  private simStep: number = 0;
  private simulatedHeading: number = 45;

  private health: SensorHealth = {
    gnss: false,
    accelerometer: false,
    gyroscope: false,
    magnetometer: false,
    isSimulated: false,
  };

  async start(callback: IMUCallback): Promise<SensorHealth> {
    this.callback = callback;

    try {
      // Set update intervals
      Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
      Gyroscope.setUpdateInterval(UPDATE_INTERVAL_MS);
      Magnetometer.setUpdateInterval(UPDATE_INTERVAL_MS);

      // Check availability
      const [accelAvail, gyroAvail, magAvail] = await Promise.all([
        Accelerometer.isAvailableAsync(),
        Gyroscope.isAvailableAsync(),
        Magnetometer.isAvailableAsync(),
      ]);

      this.health.accelerometer = accelAvail;
      this.health.gyroscope = gyroAvail;
      this.health.magnetometer = magAvail;

      const anyReal = accelAvail || gyroAvail || magAvail;

      if (accelAvail) {
        this.accelSub = Accelerometer.addListener((data) => {
          this.latestAccel = { ...data, timestamp: Date.now() };
        });
      }

      if (gyroAvail) {
        this.gyroSub = Gyroscope.addListener((data) => {
          this.latestGyro = { ...data, timestamp: Date.now() };
        });
      }

      if (magAvail) {
        this.magSub = Magnetometer.addListener((data) => {
          this.latestMag = { ...data, timestamp: Date.now() };
        });
      }

      if (!anyReal) {
        this.startSimulation();
      } else {
        // Publish fused IMU data at regular intervals even with real sensors
        this.startPublishing();
      }

      this.isSimulated = !anyReal;
      this.health.isSimulated = !anyReal;

    } catch (error) {
      console.warn('[SensorManager] Error starting sensors, using simulation:', error);
      this.startSimulation();
      this.health = { gnss: false, accelerometer: false, gyroscope: false, magnetometer: false, isSimulated: true };
    }

    return this.health;
  }

  private startPublishing(): void {
    this.publishInterval = setInterval(() => {
      if (!this.callback) return;

      const heading = this.computeHeading(this.latestMag);

      this.callback({
        accelerometer: { ...this.latestAccel },
        gyroscope: { ...this.latestGyro },
        magnetometer: { ...this.latestMag },
        heading,
        pitch: this.computePitch(this.latestAccel),
        roll: this.computeRoll(this.latestAccel),
        isSimulated: false,
      });
    }, UPDATE_INTERVAL_MS);
  }

  private startSimulation(): void {
    this.isSimulated = true;
    this.simStep = 0;

    this.simInterval = setInterval(() => {
      if (!this.callback) return;

      this.simulatedHeading = (this.simulatedHeading + 0.5) % 360;
      const simData = generateSimulatedIMU(this.simStep, this.simulatedHeading, 1.3);

      this.latestAccel = simData.accelerometer;
      this.latestGyro = simData.gyroscope;
      this.latestMag = simData.magnetometer;

      this.callback({
        ...simData,
        isSimulated: true,
      });

      this.simStep++;
    }, UPDATE_INTERVAL_MS);
  }

  stop(): void {
    this.accelSub?.remove();
    this.gyroSub?.remove();
    this.magSub?.remove();
    if (this.publishInterval) clearInterval(this.publishInterval);
    if (this.simInterval) clearInterval(this.simInterval);
    this.accelSub = null;
    this.gyroSub = null;
    this.magSub = null;
    this.publishInterval = null;
    this.simInterval = null;
  }

  private computeHeading(mag: MagnetometerData): number {
    return ((Math.atan2(mag.y, mag.x) * 180) / Math.PI + 360) % 360;
  }

  private computePitch(accel: AccelerometerData): number {
    return (Math.atan2(accel.y, Math.sqrt(accel.x ** 2 + accel.z ** 2)) * 180) / Math.PI;
  }

  private computeRoll(accel: AccelerometerData): number {
    return (Math.atan2(accel.x, accel.z) * 180) / Math.PI;
  }

  getHealth(): SensorHealth {
    return { ...this.health };
  }

  isUsingSimulation(): boolean {
    return this.isSimulated;
  }
}

export const sensorManager = new SensorManager();
