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

export const URBAN_CANYON_SCENARIO: ScenarioDefinition = {
  id: 'urban-canyon',
  title: 'URBAN CANYON',
  subtitle: 'Experience GNSS multipath degradation through a dense high-rise city corridor.',
  description:
    'Simulates navigating a vehicle through a dense urban canyon where tall building structures cause multipath reflections and GNSS signal attenuation. NAVIS uses inertial dead reckoning to maintain a smooth position estimate throughout.',
  status: 'READY',
  category: 'GNSS Outage',
  route: SIMULATION_ROUTE,
  tags: ['Urban Canyon', 'Multipath', 'GNSS Degradation', 'IMU Fusion', '3D Driving'],
};

export const FUTURE_SCENARIOS: ScenarioDefinition[] = [
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
