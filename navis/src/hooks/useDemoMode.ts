/**
 * useDemoMode hook
 *
 * Runs high-speed automotive driving simulation along Bengaluru–Mysuru Expressway (NH 275).
 * - Cruising speed: 55–65 km/h
 * - Zone 1: Open Highway GNSS Tracking
 * - Zone 2: Highway Underpass Outage → Inertial Dead Reckoning with realistic ~2–3.5m lane drift
 * - Zone 3: Exiting Underpass → Sensor Fusion convergence back to lane center
 */

import { useRef, useCallback, useEffect } from 'react';
import { useNavigation } from '../state/NavigationContext';
import { DEMO_ROUTE, generateSimulatedIMU, generateSimulatedGNSS } from '../constants/demoRoute';
import { deadReckoningEngine } from '../services/deadReckoningEngine';
import { sensorFusionEngine, haversineDistance } from '../services/sensorFusion';
import { TrajectoryPoint, GNSSData, LatLng } from '../types';

const STEP_INTERVAL_MS = 1200; // 1.2s per highway step (car traveling ~19m per tick at ~58 km/h)

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
        dispatch({ type: 'SET_STATUS', message: 'Expressway demo route complete' });
        return;
      }

      const currentMode = stateRef.current.mode;
      const imuData = generateSimulatedIMU(idx, point.heading, point.speed);
      const gnssData = generateSimulatedGNSS(point);

      // Always update vehicle IMU stream
      dispatch({ type: 'UPDATE_IMU', data: { ...imuData } });

      if (gnssEnabledRef.current && (currentMode === 'GNSS_ACTIVE' || currentMode === 'FUSED')) {
        // ─── ZONE 1: OPEN HIGHWAY GNSS (Strictly on Expressway Lane) ───────────
        dispatch({ type: 'UPDATE_GNSS', data: gnssData as GNSSData });
        dispatch({ type: 'SET_CURRENT_POSITION', position: point.position });

        const traj: TrajectoryPoint = {
          position: { ...point.position },
          type: 'GNSS',
          timestamp: Date.now(),
          mode: 'GNSS_ACTIVE',
        };
        dispatch({ type: 'ADD_TRAJECTORY_POINT', point: traj });

        // Auto-trigger underpass GNSS loss at outage start index
        if (idx === DEMO_ROUTE.outageStartIndex) {
          gnssEnabledRef.current = false;
          dispatch({ type: 'DISABLE_GNSS' });

          deadReckoningEngine.start(point.position, point.heading, point.speed);

          setTimeout(() => {
            dispatch({ type: 'SET_MODE', mode: 'DEAD_RECKONING' });
            dispatch({ type: 'SET_STATUS', message: 'Underpass Outage — Vehicle INS Tracking Active' });
          }, 600);
        }
      } else if (!gnssEnabledRef.current && currentMode !== 'GNSS_RECOVERING' && currentMode !== 'FUSED') {
        // ─── ZONE 2: HIGHWAY UNDERPASS / TUNNEL DEAD RECKONING ─────────────────
        const outageStep = idx - DEMO_ROUTE.outageStartIndex;

        // Controlled automotive PDR drift (smooth ~2.0m - 3.2m lateral drift inside highway corridor)
        const driftLateralM = 0.14 * outageStep + 0.2 * Math.sin(outageStep * 0.4);
        const driftForwardM = 0.05 * outageStep;

        const headingRad = (point.heading * Math.PI) / 180;
        const perpHeadingRad = headingRad + Math.PI / 2;
        const cosLat = Math.cos((point.position.latitude * Math.PI) / 180);

        const dLat = (driftForwardM * Math.cos(headingRad) + driftLateralM * Math.cos(perpHeadingRad)) / 111320;
        const dLon = (driftForwardM * Math.sin(headingRad) + driftLateralM * Math.sin(perpHeadingRad)) / (111320 * cosLat);

        const drPos: LatLng = {
          latitude: point.position.latitude + dLat,
          longitude: point.position.longitude + dLon,
        };

        const estimatedError = Math.sqrt(driftLateralM * driftLateralM + driftForwardM * driftForwardM);

        deadReckoningEngine.setManualState(drPos, point.heading, point.speed, outageStep + 1, estimatedError);
        const drState = deadReckoningEngine.getState();

        dispatch({ type: 'UPDATE_DR', state: drState });
        dispatch({ type: 'SET_CURRENT_POSITION', position: drPos });

        const traj: TrajectoryPoint = {
          position: drPos,
          type: 'DR',
          timestamp: Date.now(),
          mode: 'DEAD_RECKONING',
        };
        dispatch({ type: 'ADD_TRAJECTORY_POINT', point: traj });

        // Auto-restore GNSS when emerging from underpass
        if (idx === DEMO_ROUTE.outageEndIndex) {
          gnssEnabledRef.current = true;
          dispatch({ type: 'ENABLE_GNSS' });
          sensorFusionEngine.resetProgress();
        }
      } else if (gnssEnabledRef.current && (currentMode === 'GNSS_RECOVERING' || currentMode === 'FUSED')) {
        // ─── ZONE 3: SENSOR FUSION (Smooth Convergence Back to Lane Center) ────
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

        if (sensorFusionEngine.getProgress() > 0.75 && currentMode !== 'FUSED') {
          dispatch({ type: 'SET_MODE', mode: 'FUSED' });
          dispatch({ type: 'SET_STATUS', message: 'Navigation synchronized — GNSS + INS Fused' });
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
      dispatch({ type: 'SET_STATUS', message: 'Underpass Outage — Vehicle INS Tracking Active' });
    }, 600);
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
