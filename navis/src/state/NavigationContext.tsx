/**
 * Navigation State Context
 *
 * Provides the global navigation state machine to the entire app.
 * Uses useReducer for predictable state transitions.
 */

import React, { createContext, useContext, useReducer, useRef, useCallback } from 'react';
import {
  NavigationState,
  NavigationMode,
  AppMode,
  GNSSData,
  IMUData,
  TrajectoryPoint,
  PerformanceMetrics,
  LatLng,
  DeadReckoningState,
  FusionState,
} from '../types';

// ─── Initial State ────────────────────────────────────────────────────────────
const initialDRState: DeadReckoningState = {
  position: { latitude: 0, longitude: 0 },
  velocity: 0,
  heading: 0,
  distanceTraveled: 0,
  elapsedTime: 0,
  estimatedError: 0,
  isActive: false,
  stepCount: 0,
};

const initialState: NavigationState = {
  mode: 'GNSS_ACTIVE',
  appMode: 'IDLE',
  gnssEnabled: true,
  gnssData: null,
  imuData: null,
  deadReckoning: initialDRState,
  fusion: null,
  currentPosition: null,
  trajectory: [],
  outageStartTime: null,
  outageEndTime: null,
  totalDistance: 0,
  sessionStartTime: null,
  isNavigating: false,
  statusMessage: 'Ready to navigate',
};

// ─── Action Types ─────────────────────────────────────────────────────────────
type Action =
  | { type: 'START_NAVIGATION'; mode: AppMode }
  | { type: 'STOP_NAVIGATION' }
  | { type: 'UPDATE_GNSS'; data: GNSSData }
  | { type: 'UPDATE_IMU'; data: IMUData }
  | { type: 'UPDATE_DR'; state: DeadReckoningState }
  | { type: 'UPDATE_FUSION'; state: FusionState }
  | { type: 'DISABLE_GNSS' }
  | { type: 'ENABLE_GNSS' }
  | { type: 'SET_MODE'; mode: NavigationMode }
  | { type: 'SET_STATUS'; message: string }
  | { type: 'ADD_TRAJECTORY_POINT'; point: TrajectoryPoint }
  | { type: 'RESET' }
  | { type: 'SET_CURRENT_POSITION'; position: LatLng };

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state: NavigationState, action: Action): NavigationState {
  switch (action.type) {
    case 'START_NAVIGATION':
      return {
        ...state,
        appMode: action.mode,
        isNavigating: true,
        sessionStartTime: Date.now(),
        trajectory: [],
        mode: 'GNSS_ACTIVE',
        gnssEnabled: true,
        statusMessage: 'Navigation started',
      };

    case 'STOP_NAVIGATION':
      return {
        ...state,
        isNavigating: false,
        statusMessage: 'Navigation stopped',
      };

    case 'UPDATE_GNSS':
      return {
        ...state,
        gnssData: action.data,
        currentPosition: state.gnssEnabled && state.mode === 'GNSS_ACTIVE'
          ? { latitude: action.data.latitude, longitude: action.data.longitude }
          : state.currentPosition,
      };

    case 'UPDATE_IMU':
      return { ...state, imuData: action.data };

    case 'UPDATE_DR':
      return {
        ...state,
        deadReckoning: action.state,
        currentPosition: state.mode === 'DEAD_RECKONING' || state.mode === 'GNSS_LOST'
          ? action.state.position
          : state.currentPosition,
      };

    case 'UPDATE_FUSION':
      return {
        ...state,
        fusion: action.state,
        currentPosition: state.mode === 'FUSED'
          ? action.state.fusedPosition
          : state.currentPosition,
      };

    case 'DISABLE_GNSS':
      return {
        ...state,
        gnssEnabled: false,
        mode: 'GNSS_LOST',
        outageStartTime: Date.now(),
        statusMessage: 'GNSS signal lost — switching to Dead Reckoning',
      };

    case 'ENABLE_GNSS':
      return {
        ...state,
        gnssEnabled: true,
        mode: 'GNSS_RECOVERING',
        outageEndTime: Date.now(),
        statusMessage: 'GNSS restored — applying sensor fusion',
      };

    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'SET_STATUS':
      return { ...state, statusMessage: action.message };

    case 'ADD_TRAJECTORY_POINT':
      return {
        ...state,
        trajectory: [...state.trajectory, action.point],
      };

    case 'SET_CURRENT_POSITION':
      return { ...state, currentPosition: action.position };

    case 'RESET':
      return {
        ...initialState,
        imuData: state.imuData, // keep sensor data flowing
      };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface NavigationContextType {
  state: NavigationState;
  dispatch: React.Dispatch<Action>;
  getPerformanceMetrics: () => PerformanceMetrics;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const getPerformanceMetrics = useCallback((): PerformanceMetrics => {
    const outageDuration = state.outageStartTime && state.outageEndTime
      ? (state.outageEndTime - state.outageStartTime) / 1000
      : state.outageStartTime
        ? (Date.now() - state.outageStartTime) / 1000
        : 0;

    const gnssDuration = state.sessionStartTime
      ? (Date.now() - state.sessionStartTime) / 1000 - outageDuration
      : 0;

    return {
      gnssDuration: Math.max(0, gnssDuration),
      outageDuration,
      totalDistance: state.deadReckoning.distanceTraveled,
      maxDRError: state.deadReckoning.estimatedError,
      finalPositionError: state.fusion?.finalError ?? state.deadReckoning.estimatedError,
      recoveryTime: 2.3, // approximate from fusion animation
      sensorUpdateRate: 10, // 10 Hz
      correctionApplied: state.fusion?.correctionApplied ?? 0,
    };
  }, [state]);

  return (
    <NavigationContext.Provider value={{ state, dispatch, getPerformanceMetrics }}>
      {children}
    </NavigationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
}
