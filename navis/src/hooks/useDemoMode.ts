/**
 * useDemoMode hook
 *
 * Runs the deterministic demo route simulation.
 * Advances through pre-programmed route points at regular intervals.
 * Automatically triggers GNSS outage and recovery at predefined route indices.
 */

import { useRef, useCallback, useEffect } from 'react';
import { useNavigation } from '../state/NavigationContext';
import { DEMO_ROUTE, generateSimulatedIMU, generateSimulatedGNSS } from '../constants/demoRoute';
import { deadReckoningEngine } from '../services/deadReckoningEngine';
import { sensorFusionEngine } from '../services/sensorFusion';
import { TrajectoryPoint, GNSSData } from '../types';

const STEP_INTERVAL_MS = 1500; // Advance one route point every 1.5 seconds

export function useDemoMode() {
  const { state, dispatch } = useNavigation();
  const stateRef = useRef(state);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const gnssEnabledRef = useRef<boolean>(true);

  // Keep stateRef up to date to prevent stale closures in interval
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const pause = useCallback(() => {
    isRunningRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    // Clear any previous interval to prevent duplicate timers
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    indexRef.current = 0;
    isRunningRef.current = true;
    gnssEnabledRef.current = true;

    sensorFusionEngine.resetProgress();
    dispatch({ type: 'START_NAVIGATION', mode: 'DEMO' });
    dispatch({ type: 'SET_CURRENT_POSITION', position: DEMO_ROUTE.startPosition });

    intervalRef.current = setInterval(() => {
      if (!isRunningRef.current) return;

      const idx = indexRef.current;
      const point = DEMO_ROUTE.points[idx];

      if (!point) {
        // Route complete
        pause();
        dispatch({ type: 'SET_STATUS', message: 'Demo route complete' });
        return;
      }

      const currentMode = stateRef.current.mode;
      const imuData = generateSimulatedIMU(idx, point.heading, point.speed);
      const gnssData = generateSimulatedGNSS(point);

      // Always update IMU
      dispatch({ type: 'UPDATE_IMU', data: { ...imuData } });

      // Process IMU for DR
      if (deadReckoningEngine.getState().isActive) {
        deadReckoningEngine.processAccelerometer(imuData.accelerometer);
        deadReckoningEngine.processGyroscope(imuData.gyroscope);
        deadReckoningEngine.processMagnetometer(imuData.magnetometer);
        deadReckoningEngine.simulateStep(point.heading, point.speed * 1.5);
      }

      if (gnssEnabledRef.current && (currentMode === 'GNSS_ACTIVE' || currentMode === 'FUSED')) {
        // GNSS ACTIVE mode
        dispatch({ type: 'UPDATE_GNSS', data: gnssData as GNSSData });
        dispatch({ type: 'SET_CURRENT_POSITION', position: point.position });

        const traj: TrajectoryPoint = {
          position: { ...point.position },
          type: 'GNSS',
          timestamp: Date.now(),
          mode: 'GNSS_ACTIVE',
        };
        dispatch({ type: 'ADD_TRAJECTORY_POINT', point: traj });

        // Auto-trigger GNSS loss at outage start index
        if (idx === DEMO_ROUTE.outageStartIndex) {
          gnssEnabledRef.current = false;
          dispatch({ type: 'DISABLE_GNSS' });

          // Initialize DR from this position
          deadReckoningEngine.start(point.position, point.heading, point.speed);

          setTimeout(() => {
            dispatch({ type: 'SET_MODE', mode: 'DEAD_RECKONING' });
            dispatch({ type: 'SET_STATUS', message: 'Dead Reckoning active — tracking with IMU' });
          }, 1000);
        }
      } else if (!gnssEnabledRef.current && currentMode !== 'GNSS_RECOVERING' && currentMode !== 'FUSED') {
        // DEAD RECKONING mode
        const drState = deadReckoningEngine.getState();
        dispatch({ type: 'UPDATE_DR', state: drState });
        dispatch({ type: 'SET_CURRENT_POSITION', position: drState.position });

        const traj: TrajectoryPoint = {
          position: { ...drState.position },
          type: 'DR',
          timestamp: Date.now(),
          mode: 'DEAD_RECKONING',
        };
        dispatch({ type: 'ADD_TRAJECTORY_POINT', point: traj });

        // Auto-restore GNSS at recovery index
        if (idx === DEMO_ROUTE.outageEndIndex) {
          gnssEnabledRef.current = true;
          dispatch({ type: 'ENABLE_GNSS' });
          sensorFusionEngine.resetProgress();
        }
      } else if (gnssEnabledRef.current && (currentMode === 'GNSS_RECOVERING' || currentMode === 'FUSED')) {
        // FUSION mode
        dispatch({ type: 'UPDATE_GNSS', data: gnssData as GNSSData });
        const drState = deadReckoningEngine.getState();
        const fusionState = sensorFusionEngine.fuse(gnssData as GNSSData, drState, stateRef.current.fusion);
        dispatch({ type: 'UPDATE_FUSION', state: fusionState });
        dispatch({ type: 'SET_CURRENT_POSITION', position: fusionState.fusedPosition });

        const traj: TrajectoryPoint = {
          position: { ...fusionState.fusedPosition },
          type: 'FUSED',
          timestamp: Date.now(),
          mode: 'FUSED',
        };
        dispatch({ type: 'ADD_TRAJECTORY_POINT', point: traj });

        if (sensorFusionEngine.getProgress() > 0.8 && currentMode !== 'FUSED') {
          dispatch({ type: 'SET_MODE', mode: 'FUSED' });
          dispatch({ type: 'SET_STATUS', message: 'Navigation synchronized — GNSS + IMU fused' });
        }
      }

      indexRef.current = idx + 1;
    }, STEP_INTERVAL_MS);
  }, [dispatch, pause]);

  const resume = useCallback(() => {
    if (!isRunningRef.current) {
      isRunningRef.current = true;
      start();
    }
  }, [start]);

  const manualDisableGNSS = useCallback(() => {
    gnssEnabledRef.current = false;
    const drState = deadReckoningEngine.getState();
    const currentPos = drState.isActive ? drState.position : DEMO_ROUTE.points[indexRef.current]?.position ?? DEMO_ROUTE.startPosition;

    if (!drState.isActive) {
      const currentPoint = DEMO_ROUTE.points[indexRef.current] ?? DEMO_ROUTE.points[0];
      deadReckoningEngine.start(currentPos, currentPoint.heading, currentPoint.speed);
    }

    dispatch({ type: 'DISABLE_GNSS' });
    setTimeout(() => {
      dispatch({ type: 'SET_MODE', mode: 'DEAD_RECKONING' });
      dispatch({ type: 'SET_STATUS', message: 'Dead Reckoning active — tracking with IMU' });
    }, 1000);
  }, [dispatch]);

  const manualEnableGNSS = useCallback(() => {
    gnssEnabledRef.current = true;
    dispatch({ type: 'ENABLE_GNSS' });
    sensorFusionEngine.resetProgress();
  }, [dispatch]);

  const reset = useCallback(() => {
    pause();
    indexRef.current = 0;
    gnssEnabledRef.current = true;
    deadReckoningEngine.stop();
    sensorFusionEngine.resetProgress();
    dispatch({ type: 'RESET' });
  }, [pause, dispatch]);

  useEffect(() => {
    return () => {
      pause();
    };
  }, [pause]);

  const progress = DEMO_ROUTE.points.length > 0
    ? Math.min(1, indexRef.current / DEMO_ROUTE.points.length)
    : 0;

  return {
    start,
    pause,
    resume,
    reset,
    manualDisableGNSS,
    manualEnableGNSS,
    isRunning: isRunningRef.current,
    progress,
    totalPoints: DEMO_ROUTE.points.length,
    currentIndex: indexRef.current,
  };
}
