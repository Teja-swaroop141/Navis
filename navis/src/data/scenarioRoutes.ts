/**
 * scenarioRoutes.ts
 *
 * Predefined routes and route milestones for NavDR Scenarios.
 * Reuses the OpenStreetMap-based arterial road and tunnel corridor from the existing Simulation.
 */

import {
  SIMULATION_ROUTE,
  LatLng,
  RouteWaypoint,
  SimulationRouteDefinition,
  haversineDistance,
  calculateBearing,
  lerpLatLng,
} from './simulationRoute';

export {
  SIMULATION_ROUTE,
  LatLng,
  RouteWaypoint,
  SimulationRouteDefinition,
  haversineDistance,
  calculateBearing,
  lerpLatLng,
};

export interface ScenarioDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  status: 'READY' | 'COMING_SOON';
  category: 'IMU Failure' | 'GNSS Outage' | 'Multi-Sensor';
  route: SimulationRouteDefinition;
  tags: string[];
}

export const SENSOR_FAILURE_SCENARIO: ScenarioDefinition = {
  id: 'sensor-failure-dr',
  title: 'SENSOR FAILURE',
  subtitle: 'Test navigation when one or more IMU sensors become unavailable.',
  description:
    'Demonstrates real-world IMU sensor dropouts during GNSS-denied navigation. Observe adaptive sensor fusion maintaining vehicle trajectory and continuous dead reckoning positioning even under single or dual sensor loss.',
  status: 'READY',
  category: 'IMU Failure',
  route: SIMULATION_ROUTE,
  tags: ['Dead Reckoning', 'Adaptive Fusion', 'Degraded State', 'Sensor Recovery'],
};

export const FUTURE_SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'gnss-failure',
    title: 'GNSS FAILURE',
    subtitle: 'Simulate urban canyons, multi-path reflections, and complete GNSS blackout.',
    description: 'Explore navigation handling when GNSS satellite reception is completely blocked by high-rise city infrastructure.',
    status: 'COMING_SOON',
    category: 'GNSS Outage',
    route: SIMULATION_ROUTE,
    tags: ['Urban Canyon', 'Multipath', 'Blackout'],
  },
  {
    id: 'multi-sensor-failure',
    title: 'MULTI-SENSOR FAILURE',
    subtitle: 'Test edge cases when simultaneous sensor dropouts and GNSS outages occur.',
    description: 'Evaluates dead-reckoning survival under adverse combined hardware degradation.',
    status: 'COMING_SOON',
    category: 'Multi-Sensor',
    route: SIMULATION_ROUTE,
    tags: ['Adverse Hardware', 'Redundancy', 'Fail-Safe'],
  },
];
