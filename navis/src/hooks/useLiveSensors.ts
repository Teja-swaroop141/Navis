/**
 * useLiveSensors.ts
 *
 * Standalone hook that subscribes directly to hardware sensors
 * (Accelerometer, Gyroscope, Magnetometer, GPS) and provides
 * continuously updating live data, independent of the navigation engine.
 *
 * Used in:
 *  - SensorMonitorScreen  → always-on live display
 *  - NavigationScreen     → live sensor panel during LIVE mode
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { IMUData, GNSSData, AccelerometerData, GyroscopeData, MagnetometerData } from '../types';

const UPDATE_INTERVAL_MS = 150; // ~6.7 Hz — good balance of freshness vs battery

export interface LiveSensorData {
  imu: IMUData | null;
  gnss: GNSSData | null;
  hasRealSensors: boolean;
  hasRealGNSS: boolean;
}

function computeHeading(mag: MagnetometerData): number {
  return ((Math.atan2(mag.y, mag.x) * 180) / Math.PI + 360) % 360;
}
function computePitch(a: AccelerometerData): number {
  return (Math.atan2(a.y, Math.sqrt(a.x ** 2 + a.z ** 2)) * 180) / Math.PI;
}
function computeRoll(a: AccelerometerData): number {
  return (Math.atan2(a.x, a.z) * 180) / Math.PI;
}

export function useLiveSensors(): LiveSensorData {
  const [data, setData] = useState<LiveSensorData>({
    imu: null,
    gnss: null,
    hasRealSensors: false,
    hasRealGNSS: false,
  });

  // Mutable refs so the interval can always read latest values
  const accelRef = useRef<AccelerometerData>({ x: 0, y: 0, z: 9.81, timestamp: Date.now() });
  const gyroRef  = useRef<GyroscopeData>({ x: 0, y: 0, z: 0, timestamp: Date.now() });
  const magRef   = useRef<MagnetometerData>({ x: 21.4, y: -8.3, z: 41.2, timestamp: Date.now() });
  const realRef  = useRef(false);
  const simStepRef = useRef(0);
  const simHeadingRef = useRef(45);

  useEffect(() => {
    let accelSub: any = null;
    let gyroSub: any = null;
    let magSub: any = null;
    let gnssSub: Location.LocationSubscription | null = null;
    let publishInterval: any = null;
    let mounted = true;

    const startSensors = async () => {
      // ── IMU ──────────────────────────────────────────────────────────────
      try {
        Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
        Gyroscope.setUpdateInterval(UPDATE_INTERVAL_MS);
        Magnetometer.setUpdateInterval(UPDATE_INTERVAL_MS);

        const [aOk, gOk, mOk] = await Promise.all([
          Accelerometer.isAvailableAsync(),
          Gyroscope.isAvailableAsync(),
          Magnetometer.isAvailableAsync(),
        ]);

        realRef.current = aOk || gOk || mOk;

        if (aOk) accelSub = Accelerometer.addListener(d => { accelRef.current = { ...d, timestamp: Date.now() }; });
        if (gOk) gyroSub  = Gyroscope.addListener(d  => { gyroRef.current  = { ...d, timestamp: Date.now() }; });
        if (mOk) magSub   = Magnetometer.addListener(d=> { magRef.current   = { ...d, timestamp: Date.now() }; });

      } catch {
        realRef.current = false;
      }

      // ── GNSS ─────────────────────────────────────────────────────────────
      let hasRealGNSS = false;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          gnssSub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 1000,
              distanceInterval: 0,          // update even when stationary
            },
            (loc) => {
              if (!mounted) return;
              setData(prev => ({
                ...prev,
                gnss: {
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                  altitude: loc.coords.altitude ?? 0,
                  speed: (loc.coords.speed ?? 0) * 3.6,
                  heading: loc.coords.heading ?? 0,
                  accuracy: loc.coords.accuracy ?? 99,
                  timestamp: loc.timestamp,
                  isAvailable: true,
                  satelliteCount: undefined,
                },
                hasRealGNSS: true,
              }));
            },
          );
          hasRealGNSS = true;
        }
      } catch {
        hasRealGNSS = false;
      }

      // ── Publish Loop ──────────────────────────────────────────────────────
      publishInterval = setInterval(() => {
        if (!mounted) return;

        let imuData: IMUData;

        if (realRef.current) {
          const heading = computeHeading(magRef.current);
          imuData = {
            accelerometer: { ...accelRef.current },
            gyroscope:     { ...gyroRef.current  },
            magnetometer:  { ...magRef.current   },
            heading,
            pitch: computePitch(accelRef.current),
            roll:  computeRoll(accelRef.current),
            isSimulated: false,
          };
        } else {
          // Synthetic stream for emulators — gently oscillating to look live
          const t = simStepRef.current++ * 0.04;
          simHeadingRef.current = (simHeadingRef.current + 0.8) % 360;
          const acc: AccelerometerData = {
            x: 0.18 * Math.sin(t * 1.1),
            y: 0.12 * Math.cos(t * 0.7),
            z: 9.78 + 0.05 * Math.sin(t * 0.3),
            timestamp: Date.now(),
          };
          const gyr: GyroscopeData = {
            x: 0.002 * Math.cos(t * 1.5),
            y: 0.003 * Math.sin(t * 0.9),
            z: 0.001 + 0.001 * Math.cos(t),
            timestamp: Date.now(),
          };
          const mag: MagnetometerData = {
            x: 21.4 + 0.6 * Math.sin(t * 0.4),
            y: -8.3  + 0.4 * Math.cos(t * 0.6),
            z: 41.2  + 0.3 * Math.sin(t * 0.2),
            timestamp: Date.now(),
          };
          accelRef.current = acc;
          gyroRef.current  = gyr;
          magRef.current   = mag;
          imuData = {
            accelerometer: acc,
            gyroscope: gyr,
            magnetometer: mag,
            heading: simHeadingRef.current,
            pitch: computePitch(acc),
            roll:  computeRoll(acc),
            isSimulated: true,
          };
        }

        setData(prev => ({
          ...prev,
          imu: imuData,
          hasRealSensors: realRef.current,
        }));
      }, UPDATE_INTERVAL_MS);
    };

    startSensors();

    return () => {
      mounted = false;
      accelSub?.remove();
      gyroSub?.remove();
      magSub?.remove();
      gnssSub?.remove();
      if (publishInterval) clearInterval(publishInterval);
    };
  }, []);

  return data;
}
