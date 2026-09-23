/**
 * useNavigationEngine hook
 *
 * Orchestrates sensors, GNSS, dead reckoning, and fusion.
 * Updates the global navigation state machine.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useNavigation } from '../state/NavigationContext';
import { sensorManager } from '../services/sensorManager';
import { gnssManager } from '../services/gnssManager';
import { deadReckoningEngine } from '../services/deadReckoningEngine';
import { sensorFusionEngine } from '../services/sensorFusion';
import { GNSSData, IMUData, TrajectoryPoint } from '../types';

export function useNavigationEngine() {
  const { state, dispatch } = useNavigation();
  const lastGNSSRef = useRef<GNSSData | null>(null);
  const drUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleGNSSUpdate = useCallback((data: GNSSData) => {
    lastGNSSRef.current = data;
    dispatch({ type: 'UPDATE_GNSS', data });

    if (state.mode === 'GNSS_ACTIVE') {
      const point: TrajectoryPoint = {
        position: { latitude: data.latitude, longitude: data.longitude },
        type: 'GNSS',
        timestamp: Date.now(),
        mode: 'GNSS_ACTIVE',
      };
      dispatch({ type: 'ADD_TRAJECTORY_POINT', point });
    }

    // When GNSS is recovering, apply fusion
    if (state.mode === 'GNSS_RECOVERING') {
      const drState = deadReckoningEngine.getState();
      const fusionState = sensorFusionEngine.fuse(data, drState, state.fusion);
      dispatch({ type: 'UPDATE_FUSION', state: fusionState });

      const point: TrajectoryPoint = {
        position: fusionState.fusedPosition,
        type: 'FUSED',
        timestamp: Date.now(),
        mode: 'FUSED',
      };
      dispatch({ type: 'ADD_TRAJECTORY_POINT', point });

      // After fusion stabilizes, move to fully FUSED mode
      if (sensorFusionEngine.getProgress() > 0.8) {
        dispatch({ type: 'SET_MODE', mode: 'FUSED' });
        dispatch({ type: 'SET_STATUS', message: 'Navigation synchronized — GNSS + IMU fused' });
      }
    }
  }, [state.mode, state.fusion, dispatch]);

  const handleIMUUpdate = useCallback((data: IMUData) => {
    dispatch({ type: 'UPDATE_IMU', data });

    // Feed sensors to dead reckoning engine
    if (state.mode === 'DEAD_RECKONING' || state.mode === 'GNSS_LOST') {
      deadReckoningEngine.processAccelerometer(data.accelerometer);
      deadReckoningEngine.processGyroscope(data.gyroscope);
      deadReckoningEngine.processMagnetometer(data.magnetometer);
    }
  }, [state.mode, dispatch]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const startNavigation = useCallback(async (mode: 'LIVE' | 'DEMO') => {
    if (mode === 'DEMO') return;
    dispatch({ type: 'START_NAVIGATION', mode: 'LIVE' });
    sensorFusionEngine.resetProgress();

    // Start sensors
    await sensorManager.start(handleIMUUpdate);
    await gnssManager.start(handleGNSSUpdate);

    if (drUpdateInterval.current) clearInterval(drUpdateInterval.current);

    // Start DR state update interval
    drUpdateInterval.current = setInterval(() => {
      if (deadReckoningEngine.getState().isActive) {
        const drState = deadReckoningEngine.getState();
        dispatch({ type: 'UPDATE_DR', state: drState });

        if (stateRef.current.mode === 'DEAD_RECKONING') {
          const point: TrajectoryPoint = {
            position: drState.position,
            type: 'DR',
            timestamp: Date.now(),
            mode: 'DEAD_RECKONING',
          };
          dispatch({ type: 'ADD_TRAJECTORY_POINT', point });
        }
      }
    }, 500);
  }, [handleGNSSUpdate, handleIMUUpdate, dispatch]);

  const stopNavigation = useCallback(() => {
    dispatch({ type: 'STOP_NAVIGATION' });
    sensorManager.stop();
    gnssManager.stop();
    deadReckoningEngine.stop();
    if (drUpdateInterval.current) clearInterval(drUpdateInterval.current);
  }, [dispatch]);

  const disableGNSS = useCallback(() => {
    if (lastGNSSRef.current) {
      // Initialize DR from last known GNSS position
      const heading = lastGNSSRef.current.heading;
      const speed = lastGNSSRef.current.speed / 3.6; // km/h → m/s
      deadReckoningEngine.start(
        { latitude: lastGNSSRef.current.latitude, longitude: lastGNSSRef.current.longitude },
        heading,
        speed
      );
    }

    gnssManager.setEnabled(false);
    dispatch({ type: 'DISABLE_GNSS' });

    // Transition to active DR after brief lost state
    setTimeout(() => {
      dispatch({ type: 'SET_MODE', mode: 'DEAD_RECKONING' });
      dispatch({ type: 'SET_STATUS', message: 'Dead Reckoning active — tracking with IMU' });
    }, 1500);
  }, [dispatch]);

  const enableGNSS = useCallback(() => {
    gnssManager.setEnabled(true);
    dispatch({ type: 'ENABLE_GNSS' });
    sensorFusionEngine.resetProgress();

    setTimeout(() => {
      dispatch({ type: 'SET_STATUS', message: 'Correcting position…' });
    }, 500);
  }, [dispatch]);

  const reset = useCallback(() => {
    stopNavigation();
    deadReckoningEngine.stop();
    dispatch({ type: 'RESET' });
  }, [stopNavigation, dispatch]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (drUpdateInterval.current) clearInterval(drUpdateInterval.current);
    };
  }, []);

  return {
    startNavigation,
    stopNavigation,
    disableGNSS,
    enableGNSS,
    reset,
    isSimulated: sensorManager.isUsingSimulation() || gnssManager.isUsingSimulation(),
    sensorHealth: sensorManager.getHealth(),
  };
}
