/**
 * urbanCanyonRoute.ts
 *
 * Predefined Midtown Manhattan corridor for the Urban Canyon GNSS Degradation scenario.
 * Vehicle travels south on 6th Avenue (Avenue of the Americas) through a dense
 * high-rise canyon, then continues toward Herald Square.
 *
 * GNSS remains available throughout — it degrades (multipath / noise), it is never cut.
 */

import {
  LatLng,
  haversineDistance,
  calculateBearing,
  lerpLatLng,
} from './simulationRoute';

export interface UrbanCanyonWaypoint {
  position: LatLng;
  heading: number;
  speed: number;
  roadName: string;
  isCanyon: boolean;
  distanceFromStart: number;
}

export interface BuildingFootprint {
  id: string;
  name: string;
  coordinates: LatLng[];
}

export interface UrbanCanyonRouteDefinition {
  name: string;
  cityName: string;
  totalDistanceMeters: number;
  canyonLengthMeters: number;
  canyonEntranceDistance: number;
  canyonExitDistance: number;
  approachCanyonDistance: number;
  start: LatLng;
  canyonEntrance: LatLng;
  canyonExit: LatLng;
  destination: LatLng;
  roadNodes: LatLng[];
  canyonNodes: LatLng[];
  buildings: BuildingFootprint[];
  waypoints: UrbanCanyonWaypoint[];
}

const START_POINT: LatLng = { latitude: 40.76190, longitude: -73.97748 }; // 6th Ave & 51st
const CANYON_IN: LatLng = { latitude: 40.75895, longitude: -73.97952 }; // ~47th St
const MID_CANYON: LatLng = { latitude: 40.75485, longitude: -73.98235 };
const CANYON_OUT: LatLng = { latitude: 40.75090, longitude: -73.98515 }; // ~36th St
const DEST_POINT: LatLng = { latitude: 40.74735, longitude: -73.98795 }; // Herald Square approach

const ROAD_NODES: LatLng[] = [
  START_POINT,
  { latitude: 40.76055, longitude: -73.97842 }, // 49th
  CANYON_IN,
  { latitude: 40.75710, longitude: -73.98080 }, // 44th
  { latitude: 40.75595, longitude: -73.98160 }, // slight dogleg / 42nd
  MID_CANYON,
  { latitude: 40.75270, longitude: -73.98385 }, // 39th
  CANYON_OUT,
  { latitude: 40.74920, longitude: -73.98640 },
  DEST_POINT,
];

function metersToLatLng(origin: LatLng, northMeters: number, eastMeters: number): LatLng {
  const latPerM = 1 / 111111;
  const lngPerM = 1 / (111111 * Math.cos((origin.latitude * Math.PI) / 180));
  return {
    latitude: origin.latitude + northMeters * latPerM,
    longitude: origin.longitude + eastMeters * lngPerM,
  };
}

function rectAround(center: LatLng, halfWidthM: number, halfDepthM: number, yawDeg: number): LatLng[] {
  const yaw = (yawDeg * Math.PI) / 180;
  const corners = [
    { n: halfDepthM, e: -halfWidthM },
    { n: halfDepthM, e: halfWidthM },
    { n: -halfDepthM, e: halfWidthM },
    { n: -halfDepthM, e: -halfWidthM },
  ];
  return corners.map((c) => {
    const n = c.n * Math.cos(yaw) - c.e * Math.sin(yaw);
    const e = c.n * Math.sin(yaw) + c.e * Math.cos(yaw);
    return metersToLatLng(center, n, e);
  });
}

function offsetAlongBearing(origin: LatLng, bearingDeg: number, meters: number, lateralMeters: number): LatLng {
  const b = (bearingDeg * Math.PI) / 180;
  const north = Math.cos(b) * meters + Math.cos(b + Math.PI / 2) * lateralMeters;
  const east = Math.sin(b) * meters + Math.sin(b + Math.PI / 2) * lateralMeters;
  return metersToLatLng(origin, north, east);
}

function buildBuildings(): BuildingFootprint[] {
  const buildings: BuildingFootprint[] = [];
  let id = 0;

  for (let i = 0; i < ROAD_NODES.length - 1; i++) {
    const a = ROAD_NODES[i];
    const b = ROAD_NODES[i + 1];
    const bearing = calculateBearing(a, b);
    const segDist = haversineDistance(a, b);
    const blocks = Math.max(2, Math.round(segDist / 70));

    for (let k = 0; k < blocks; k++) {
      const t = (k + 0.5) / blocks;
      const center = lerpLatLng(a, b, t);
      const leftCenter = offsetAlongBearing(center, bearing, 0, 38);
      const rightCenter = offsetAlongBearing(center, bearing, 0, -38);
      const depth = 22 + ((k * 7 + i * 3) % 14);
      const width = 18 + ((k * 5 + i * 2) % 10);

      buildings.push({
        id: `L${id}`,
        name: 'West Block',
        coordinates: rectAround(leftCenter, width, depth, bearing),
      });
      id += 1;
      buildings.push({
        id: `R${id}`,
        name: 'East Block',
        coordinates: rectAround(rightCenter, width, depth, bearing),
      });
      id += 1;
    }
  }

  return buildings;
}

function buildWaypoints(): UrbanCanyonWaypoint[] {
  const result: UrbanCanyonWaypoint[] = [];
  let cumulativeDist = 0;
  const canyonInDistEstimate = (() => {
    let d = 0;
    for (let i = 0; i < ROAD_NODES.length - 1; i++) {
      const next = haversineDistance(ROAD_NODES[i], ROAD_NODES[i + 1]);
      if (ROAD_NODES[i + 1] === CANYON_IN || (ROAD_NODES[i].latitude === CANYON_IN.latitude && ROAD_NODES[i].longitude === CANYON_IN.longitude)) {
        return d;
      }
      d += next;
    }
    return 280;
  })();

  for (let i = 0; i < ROAD_NODES.length - 1; i++) {
    const p1 = ROAD_NODES[i];
    const p2 = ROAD_NODES[i + 1];
    const segDist = haversineDistance(p1, p2);
    const segBearing = calculateBearing(p1, p2);
    const steps = Math.max(4, Math.round(segDist / 8));

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const interpPos = lerpLatLng(p1, p2, t);
      const dist = cumulativeDist + segDist * t;
      const speed = 11.2 + Math.sin(dist * 0.04) * 0.7;
      const isCanyon = dist >= canyonInDistEstimate - 8;

      result.push({
        position: interpPos,
        heading: Math.round(segBearing * 10) / 10,
        speed: Math.round(speed * 10) / 10,
        roadName: '6th Avenue',
        isCanyon,
        distanceFromStart: Math.round(dist * 10) / 10,
      });
    }
    cumulativeDist += segDist;
  }

  const last = ROAD_NODES[ROAD_NODES.length - 1];
  const prev = result[result.length - 1];
  result.push({
    position: last,
    heading: prev ? prev.heading : 210,
    speed: 0,
    roadName: 'Herald Square',
    isCanyon: false,
    distanceFromStart: Math.round(cumulativeDist * 10) / 10,
  });

  return result;
}

const denseWaypoints = buildWaypoints();

function nearestDistance(target: LatLng): number {
  let best = denseWaypoints[0];
  let bestD = haversineDistance(target, best.position);
  for (const wp of denseWaypoints) {
    const d = haversineDistance(target, wp.position);
    if (d < bestD) {
      bestD = d;
      best = wp;
    }
  }
  return best.distanceFromStart;
}

const entranceDist = nearestDistance(CANYON_IN);
const exitDist = nearestDistance(CANYON_OUT);
const canyonLen = Math.round(exitDist - entranceDist);
const totalDist = denseWaypoints[denseWaypoints.length - 1].distanceFromStart;
const approachDist = Math.max(0, entranceDist - 140);

const canyonNodes = denseWaypoints
  .filter((w) => w.distanceFromStart >= entranceDist && w.distanceFromStart <= exitDist)
  .map((w) => w.position);

export const URBAN_CANYON_ROUTE: UrbanCanyonRouteDefinition = {
  name: '6th Avenue Urban Canyon',
  cityName: 'Manhattan, New York',
  totalDistanceMeters: Math.round(totalDist),
  canyonLengthMeters: canyonLen,
  canyonEntranceDistance: Math.round(entranceDist),
  canyonExitDistance: Math.round(exitDist),
  approachCanyonDistance: Math.round(approachDist),
  start: START_POINT,
  canyonEntrance: CANYON_IN,
  canyonExit: CANYON_OUT,
  destination: DEST_POINT,
  roadNodes: ROAD_NODES,
  canyonNodes: canyonNodes.length > 1 ? canyonNodes : [CANYON_IN, CANYON_OUT],
  buildings: buildBuildings(),
  waypoints: denseWaypoints.map((w) => ({
    ...w,
    isCanyon: w.distanceFromStart >= entranceDist && w.distanceFromStart <= exitDist,
  })),
};

export function offsetMeters(origin: LatLng, headingDeg: number, alongMeters: number, lateralMeters: number): LatLng {
  return offsetAlongBearing(origin, headingDeg, alongMeters, lateralMeters);
}
