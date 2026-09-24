/**
 * simulationRoute.ts
 *
 * Predefined realistic road route based on OpenStreetMap geometry.
 * Follows an urban arterial road passing through an official road tunnel
 * (San Francisco Broadway Tunnel corridor - Powell St → Mason St → Broadway Tunnel → Hyde St → Van Ness Ave).
 *
 * Route characteristics:
 * - Start Point: Broadway & Columbus Ave
 * - Pre-tunnel: Multi-lane urban road with intersections (Stockton, Powell, Mason)
 * - Tunnel Entrance: Broadway East Portal (tagged tunnel entrance)
 * - Tunnel: 420m enclosed underground segment (GNSS-denied zone)
 * - Tunnel Exit: Broadway West Portal (Hyde St)
 * - Post-tunnel: Road with intersections (Larkin, Polk, Van Ness)
 * - Destination: Broadway & Van Ness Avenue
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteWaypoint {
  position: LatLng;
  heading: number;         // degrees (0-360)
  speed: number;           // m/s (~42-48 km/h)
  roadName: string;
  intersection?: string;
  isTunnel: boolean;
  distanceFromStart: number; // meters
}

export interface SimulationRouteDefinition {
  name: string;
  cityName: string;
  totalDistanceMeters: number;
  tunnelLengthMeters: number;
  tunnelEntranceDistance: number;
  tunnelExitDistance: number;
  approachTunnelDistance: number;

  start: LatLng;
  preTunnelRoute: LatLng[];
  tunnelEntrance: LatLng;
  tunnelRoute: LatLng[];
  tunnelExit: LatLng;
  postTunnelRoute: LatLng[];
  destination: LatLng;

  waypoints: RouteWaypoint[];
}

// ─── Mathematical Helpers ────────────────────────────────────────────────────

export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;

  const sinA = Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(sinA), Math.sqrt(1 - sinA));
}

export function calculateBearing(a: LatLng, b: LatLng): number {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

export function lerpLatLng(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

// ─── Key Route Control Points (Verified OpenStreetMap nodes) ────────────────

const START_POINT: LatLng = { latitude: 37.798020, longitude: -122.405500 }; // Broadway & Columbus Ave
const ENTRANCE_POINT: LatLng = { latitude: 37.797820, longitude: -122.412100 }; // East Tunnel Portal (Mason / Taylor)
const EXIT_POINT: LatLng = { latitude: 37.797680, longitude: -122.416800 }; // West Tunnel Portal (Hyde St)
const DESTINATION_POINT: LatLng = { latitude: 37.797520, longitude: -122.423500 }; // Broadway & Van Ness Ave

// Road waypoints before tunnel
const PRE_TUNNEL_NODES: LatLng[] = [
  { latitude: 37.798020, longitude: -122.405500 }, // Start: Broadway & Columbus Ave
  { latitude: 37.797990, longitude: -122.406800 }, // Int: Stockton St
  { latitude: 37.797950, longitude: -122.408500 }, // Mid-block
  { latitude: 37.797910, longitude: -122.410100 }, // Int: Powell St
  { latitude: 37.797870, longitude: -122.411400 }, // Approaching Mason St
  { latitude: 37.797830, longitude: -122.412000 }, // Tunnel approach zone
];

// Road waypoints inside tunnel
const TUNNEL_NODES: LatLng[] = [
  { latitude: 37.797820, longitude: -122.412100 }, // East Portal Entrance
  { latitude: 37.797800, longitude: -122.412900 }, // Inside: Under Taylor St
  { latitude: 37.797775, longitude: -122.413800 }, // Inside: Mid-tunnel chamber
  { latitude: 37.797745, longitude: -122.414800 }, // Inside: Under Jones St
  { latitude: 37.797715, longitude: -122.415800 }, // Inside: Under Leavenworth St
  { latitude: 37.797680, longitude: -122.416800 }, // West Portal Exit
];

// Road waypoints after tunnel
const POST_TUNNEL_NODES: LatLng[] = [
  { latitude: 37.797680, longitude: -122.416800 }, // West Portal Exit
  { latitude: 37.797650, longitude: -122.417800 }, // Int: Hyde St
  { latitude: 37.797620, longitude: -122.419200 }, // Int: Larkin St
  { latitude: 37.797580, longitude: -122.420800 }, // Int: Polk St
  { latitude: 37.797545, longitude: -122.422200 }, // Approaching Van Ness
  { latitude: 37.797520, longitude: -122.423500 }, // Destination: Van Ness Ave
];

// ─── Generate Dense Waypoints for Buttery Smooth Motion ──────────────────────

function buildWaypoints(): RouteWaypoint[] {
  // Combine all control nodes sequentially
  const allNodes: { pos: LatLng; isTunnel: boolean; roadName: string }[] = [];

  for (let i = 0; i < PRE_TUNNEL_NODES.length; i++) {
    allNodes.push({ pos: PRE_TUNNEL_NODES[i], isTunnel: false, roadName: 'Broadway' });
  }
  // Avoid duplicating entrance
  for (let i = 1; i < TUNNEL_NODES.length; i++) {
    allNodes.push({ pos: TUNNEL_NODES[i], isTunnel: true, roadName: 'Broadway Tunnel' });
  }
  // Avoid duplicating exit
  for (let i = 1; i < POST_TUNNEL_NODES.length; i++) {
    allNodes.push({ pos: POST_TUNNEL_NODES[i], isTunnel: false, roadName: 'Broadway' });
  }

  // Subdivide segments into dense ~5-10m steps for smooth 30-60fps animation
  const result: RouteWaypoint[] = [];
  let cumulativeDist = 0;

  for (let i = 0; i < allNodes.length - 1; i++) {
    const p1 = allNodes[i].pos;
    const p2 = allNodes[i + 1].pos;
    const segDist = haversineDistance(p1, p2);
    const segBearing = calculateBearing(p1, p2);
    const isTunnelSeg = allNodes[i].isTunnel || allNodes[i + 1].isTunnel;
    const road = isTunnelSeg ? 'Broadway Tunnel' : 'Broadway';

    // Subdivisions (~8m per step)
    const steps = Math.max(4, Math.round(segDist / 8));

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const interpPos = lerpLatLng(p1, p2, t);
      const dist = cumulativeDist + segDist * t;
      // Normal cruising speed ~12 m/s (43.2 km/h)
      const speed = 12.0 + Math.sin(dist * 0.05) * 0.8;

      result.push({
        position: interpPos,
        heading: Math.round(segBearing * 10) / 10,
        speed: Math.round(speed * 10) / 10,
        roadName: road,
        isTunnel: isTunnelSeg,
        distanceFromStart: Math.round(dist * 10) / 10,
      });
    }

    cumulativeDist += segDist;
  }

  // Final destination point
  const lastNode = allNodes[allNodes.length - 1];
  const prevWp = result[result.length - 1];
  result.push({
    position: lastNode.pos,
    heading: prevWp ? prevWp.heading : 268,
    speed: 0,
    roadName: 'Broadway & Van Ness Ave',
    isTunnel: false,
    distanceFromStart: Math.round(cumulativeDist * 10) / 10,
  });

  return result;
}

const denseWaypoints = buildWaypoints();

// Calculate exact tunnel entrance and exit distances
const tunnelStartWp = denseWaypoints.find(w => w.isTunnel) || denseWaypoints[Math.floor(denseWaypoints.length * 0.35)];
const tunnelEndWp = [...denseWaypoints].reverse().find(w => w.isTunnel) || denseWaypoints[Math.floor(denseWaypoints.length * 0.65)];

const entranceDist = tunnelStartWp.distanceFromStart;
const exitDist = tunnelEndWp.distanceFromStart;
const tunnelLen = Math.round(exitDist - entranceDist);
const totalDist = denseWaypoints[denseWaypoints.length - 1].distanceFromStart;
const approachDist = Math.max(0, entranceDist - 120); // 120m before entrance

export const SIMULATION_ROUTE: SimulationRouteDefinition = {
  name: 'Broadway Tunnel Urban Corridor',
  cityName: 'San Francisco, CA',
  totalDistanceMeters: Math.round(totalDist),
  tunnelLengthMeters: tunnelLen,
  tunnelEntranceDistance: Math.round(entranceDist),
  tunnelExitDistance: Math.round(exitDist),
  approachTunnelDistance: Math.round(approachDist),

  start: START_POINT,
  preTunnelRoute: PRE_TUNNEL_NODES,
  tunnelEntrance: ENTRANCE_POINT,
  tunnelRoute: TUNNEL_NODES,
  tunnelExit: EXIT_POINT,
  postTunnelRoute: POST_TUNNEL_NODES,
  destination: DESTINATION_POINT,

  waypoints: denseWaypoints,
};
