/**
 * SimulationMapView.tsx
 *
 * High-performance OpenStreetMap component powered by Leaflet in WebView.
 *
 * Specific simulation capabilities:
 * - Official OpenStreetMap tile layer: https://tile.openstreetmap.org/{z}/{x}/{y}.png
 * - Display: "© OpenStreetMap contributors"
 * - Road route background with explicit tunnel sector
 * - Visible Tunnel Entrance and Tunnel Exit portals with arches & distance markers
 * - Translucent tunnel canopy / tube corridor overlay
 * - Real-time vehicle marker with heading rotation and navigation mode pulse
 * - Three distinct trajectory polylines:
 *     1. GNSS Path (Indigo solid) - stops at tunnel entrance
 *     2. Dead Reckoning Path (Amber dashed) - traverses tunnel
 *     3. Fused Path (Emerald green solid) - resumes after tunnel exit
 * - Dynamic camera:
 *     - Smooth car follow
 *     - Zooms out when approaching tunnel to display entrance and road ahead
 *     - Fits complete route bounds when simulation finishes
 * - In-tunnel ambient dark effect
 */

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { LatLng, SIMULATION_ROUTE } from '../data/simulationRoute';
import { SimulationFrame } from '../services/simulationEngine';
import { colors } from '../theme/colors';

interface SimulationMapViewProps {
  frame: SimulationFrame;
  isPresentationMode?: boolean;
  style?: object;
  onMapReady?: () => void;
}

function buildSimulationHtml(center: LatLng): string {
  const routeNodes = SIMULATION_ROUTE.waypoints.map(w => [w.position.latitude, w.position.longitude]);
  const tunnelNodes = SIMULATION_ROUTE.tunnelRoute.map(n => [n.latitude, n.longitude]);
  const entrance = SIMULATION_ROUTE.tunnelEntrance;
  const exit = SIMULATION_ROUTE.tunnelExit;
  const start = SIMULATION_ROUTE.start;
  const dest = SIMULATION_ROUTE.destination;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #0b0f19; overflow: hidden; }

    /* ── 3D Viewport Scene ─────────────────────────────────────────────── */
    #viewport3d {
      width: 100%;
      height: 100%;
      perspective: 850px;
      perspective-origin: 50% 55%;
      position: relative;
      overflow: hidden;
      background: radial-gradient(circle at 50% 20%, #1e1e38 0%, #0b0f19 100%);
    }

    #map-stage {
      width: 100%;
      height: 120%;
      position: absolute;
      top: -10%;
      transform-origin: 50% 65%;
      transform: rotateX(20deg);
      transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
      will-change: transform;
    }

    #map-stage.approach-tilt {
      transform: rotateX(26deg) scale(1.02);
    }
    #map-stage.tunnel-tilt {
      transform: rotateX(32deg) scale(1.04);
    }

    #map {
      width: 100%;
      height: 100%;
      background: #0b0f19;
    }

    /* ── 3D Overhead Grid & Atmosphere ────────────────────────────────── */
    .grid-horizon {
      position: absolute;
      top: 0; left: 0; right: 0; height: 35%;
      background: linear-gradient(180deg, rgba(11,15,25,0.95) 0%, rgba(11,15,25,0.0) 100%);
      pointer-events: none;
      z-index: 550;
    }

    /* ── 3D Portal & Marker Badges ───────────────────────────────────── */
    .portal-marker { background: transparent; border: none; }
    .portal-wrap {
      display: flex; flex-direction: column; align-items: center;
      pointer-events: none;
      filter: drop-shadow(0 8px 16px rgba(0,0,0,0.7));
    }
    .portal-arch {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      color: #fde68a;
      padding: 5px 12px;
      border-radius: 9px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.8px;
      border: 2px solid #f59e0b;
      box-shadow: 0 0 16px rgba(245,158,11,0.5), inset 0 1px 2px rgba(255,255,255,0.3);
      white-space: nowrap;
      display: flex; align-items: center; gap: 6px;
      text-transform: uppercase;
    }
    .portal-exit-arch {
      background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
      border-color: #10b981;
      color: #a7f3d0;
      box-shadow: 0 0 16px rgba(16,185,129,0.5), inset 0 1px 2px rgba(255,255,255,0.3);
    }
    .portal-pin {
      width: 0; height: 0;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-top: 9px solid #f59e0b;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    }
    .portal-exit-pin { border-top-color: #10b981; }

    .flag-wrap {
      background: linear-gradient(135deg, #1e293b, #0f172a);
      color: #f8fafc;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
      border: 1.5px solid rgba(255,255,255,0.4);
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      white-space: nowrap;
    }

    /* ── Realistic 3D Car Marker ──────────────────────────────────────── */
    .car-marker-container { background: transparent; border: none; }
    .car-3d-wrapper {
      position: relative;
      width: 72px;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Dynamic Headlight Light Beams Cone */
    .headlight-beams {
      position: absolute;
      width: 90px;
      height: 120px;
      top: -85px;
      left: calc(50% - 45px);
      background: linear-gradient(180deg, rgba(254, 240, 138, 0.35) 0%, rgba(254, 240, 138, 0.08) 55%, transparent 100%);
      clip-path: polygon(36% 100%, 64% 100%, 100% 0%, 0% 0%);
      pointer-events: none;
      filter: blur(2px);
      z-index: 10;
    }

    /* Radial Ground Shadow */
    .car-ground-shadow {
      position: absolute;
      width: 38px;
      height: 22px;
      background: radial-gradient(ellipse, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.0) 75%);
      border-radius: 50%;
      top: 32px;
      z-index: 1;
    }

    /* Radar / Positioning Ping Ring */
    .car-radar-ring {
      position: absolute;
      width: 58px;
      height: 58px;
      border-radius: 50%;
      opacity: 0;
      animation: sonarPulse 2s ease-out infinite;
      pointer-events: none;
      z-index: 2;
    }
    @keyframes sonarPulse {
      0%   { transform: scale(0.4); opacity: 0.8; }
      50%  { opacity: 0.3; }
      100% { transform: scale(2.0); opacity: 0; }
    }

    /* Car Rotator Container */
    .car-rotator {
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 5;
      transition: transform 0.12s linear;
    }

    /* Mode Pill Badge */
    .mode-pill {
      position: absolute;
      bottom: -4px;
      padding: 2px 7px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 8px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 0.6px;
      border: 1.5px solid rgba(255,255,255,0.7);
      box-shadow: 0 3px 8px rgba(0,0,0,0.45);
      white-space: nowrap;
      z-index: 20;
      text-transform: uppercase;
      transition: background-color 0.3s ease;
    }

    /* ── In-Tunnel 3D Dark Environment & Interior Road Beacons ──────── */
    #tunnel-atmosphere {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: radial-gradient(circle at 50% 60%, rgba(15, 12, 35, 0.4) 0%, rgba(5, 3, 15, 0.85) 100%);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.8s ease-in-out;
      z-index: 450;
    }
    #tunnel-atmosphere.active { opacity: 1; }

    /* Overhead 3D HUD telemetry banner */
    #hud-telemetry {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(99, 102, 241, 0.5);
      box-shadow: 0 4px 14px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 6px 10px;
      display: flex;
      gap: 12px;
      z-index: 600;
      pointer-events: none;
      backdrop-filter: blur(6px);
    }
    .hud-stat { display: flex; flex-direction: column; }
    .hud-stat-title { font-size: 7px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .hud-stat-val { font-size: 11px; font-weight: 900; color: #38bdf8; font-family: monospace; }
  </style>
</head>
<body>
  <div id="viewport3d">
    <div id="map-stage">
      <div id="map"></div>
      <div id="tunnel-atmosphere"></div>
    </div>
    <div class="grid-horizon"></div>

    <!-- Real-time HUD Telemetry -->
    <div id="hud-telemetry">
      <div class="hud-stat">
        <span class="hud-stat-title">GNSS SATS</span>
        <span class="hud-stat-val" id="hud-sats">14 🛰️</span>
      </div>
      <div class="hud-stat">
        <span class="hud-stat-title">DR DISPL</span>
        <span class="hud-stat-val" id="hud-drift">0.0 m</span>
      </div>
      <div class="hud-stat">
        <span class="hud-stat-title">IMU FUSION</span>
        <span class="hud-stat-val" id="hud-mode" style="color: #4ade80;">ACTIVE</span>
      </div>
    </div>
  </div>

  <script>
    var mapStage = document.getElementById('map-stage');
    var tunnelAtmosphere = document.getElementById('tunnel-atmosphere');
    var hudSats = document.getElementById('hud-sats');
    var hudDrift = document.getElementById('hud-drift');
    var hudMode = document.getElementById('hud-mode');

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true
    }).setView([${center.latitude}, ${center.longitude}], 17);

    // Dark sleek OpenStreetMap tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
      opacity: 0.95
    }).addTo(map);

    // ── 1. Full Road Geometry ──────────────────────────────────────────
    var plannedRouteNodes = ${JSON.stringify(routeNodes)};
    
    // Road border/shadow for 3D depth
    L.polyline(plannedRouteNodes, {
      color: '#020617', weight: 16, opacity: 0.45,
      lineCap: 'round', lineJoin: 'round'
    }).addTo(map);
    
    // Main asphalt road
    var plannedRouteLine = L.polyline(plannedRouteNodes, {
      color: '#334155', weight: 11, opacity: 0.9,
      lineCap: 'round', lineJoin: 'round'
    }).addTo(map);
    
    // Center divider dash
    L.polyline(plannedRouteNodes, {
      color: '#cbd5e1', weight: 2.2, opacity: 0.7,
      dashArray: '10, 8'
    }).addTo(map);

    // ── 2. 3D Tunnel Tube Infrastructure ─────────────────────────────
    var tunnelNodes = ${JSON.stringify(tunnelNodes)};
    
    // Tunnel concrete casing
    L.polyline(tunnelNodes, {
      color: '#090514', weight: 22, opacity: 0.8, lineCap: 'square'
    }).addTo(map);
    
    // Interior tunnel roadway
    L.polyline(tunnelNodes, {
      color: '#1e1b4b', weight: 14, opacity: 0.95, lineCap: 'square'
    }).addTo(map);
    
    // Amber tunnel centerline
    L.polyline(tunnelNodes, {
      color: '#f59e0b', weight: 2.5, opacity: 0.9, dashArray: '6, 6'
    }).addTo(map);

    // ── 3. Start, Tunnel Entrance, Exit & Destination Markers ─────────
    var entranceIcon = L.divIcon({
      className: 'portal-marker',
      html: '<div class="portal-wrap">' +
            '<div class="portal-arch">⚠️ TUNNEL ENTRANCE · 320m</div>' +
            '<div class="portal-pin"></div></div>',
      iconSize: [190, 36], iconAnchor: [95, 36]
    });
    L.marker([${entrance.latitude}, ${entrance.longitude}], { icon: entranceIcon }).addTo(map);

    var exitIcon = L.divIcon({
      className: 'portal-marker',
      html: '<div class="portal-wrap">' +
            '<div class="portal-arch portal-exit-arch">✨ TUNNEL EXIT · GNSS RESTORED</div>' +
            '<div class="portal-pin portal-exit-pin"></div></div>',
      iconSize: [225, 36], iconAnchor: [112, 36]
    });
    L.marker([${exit.latitude}, ${exit.longitude}], { icon: exitIcon }).addTo(map);

    var startIcon = L.divIcon({
      className: 'portal-marker',
      html: '<div class="flag-wrap">🏁 START</div>',
      iconSize: [66, 24], iconAnchor: [33, 24]
    });
    L.marker([${start.latitude}, ${start.longitude}], { icon: startIcon }).addTo(map);

    var destIcon = L.divIcon({
      className: 'portal-marker',
      html: '<div class="flag-wrap">🏁 DESTINATION</div>',
      iconSize: [100, 24], iconAnchor: [50, 24]
    });
    L.marker([${dest.latitude}, ${dest.longitude}], { icon: destIcon }).addTo(map);

    // ── 4. High-Visibility Trajectory Polylines with Glow ─────────────
    var gnssPolyline = L.polyline([], { color: '#6366f1', weight: 5, opacity: 0.95, lineCap: 'round' }).addTo(map);
    var drPolyline   = L.polyline([], { color: '#f59e0b', weight: 5, opacity: 0.95, dashArray: '8, 7', lineCap: 'round' }).addTo(map);
    var fusedPolyline= L.polyline([], { color: '#10b981', weight: 5, opacity: 0.95, lineCap: 'round' }).addTo(map);

    // ── 5. Detailed 3D Car Model SVG ──────────────────────────────────
    var carMarker = null;
    var currentMode = '';
    var lastHeading = 0;

    function build3DCarSvg(bodyColor) {
      return '<svg width="34" height="34" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<!-- 4 Wheels -->' +
        '<rect x="4" y="6" width="4" height="7" rx="1.5" fill="#0f172a"/>' +
        '<rect x="30" y="6" width="4" height="7" rx="1.5" fill="#0f172a"/>' +
        '<rect x="4" y="24" width="4" height="7" rx="1.5" fill="#0f172a"/>' +
        '<rect x="30" y="24" width="4" height="7" rx="1.5" fill="#0f172a"/>' +
        '<!-- Main 3D Car Body Shell -->' +
        '<rect x="7" y="4" width="24" height="30" rx="6" fill="' + bodyColor + '" stroke="#0f172a" stroke-width="1.2"/>' +
        '<!-- Roof & Windshield Glass Layer -->' +
        '<rect x="10" y="10" width="18" height="15" rx="3" fill="#1e293b"/>' +
        '<path d="M11 11L13 14H25L27 11H11Z" fill="#94a3b8" fill-opacity="0.8"/>' +
        '<rect x="12" y="15" width="14" height="7" rx="1.5" fill="#334155"/>' +
        '<path d="M11 24L13 22H25L27 24H11Z" fill="#94a3b8" fill-opacity="0.6"/>' +
        '<!-- Bright Xenon Headlights -->' +
        '<ellipse cx="10" cy="5.5" rx="2.5" ry="1.5" fill="#fef08a"/>' +
        '<ellipse cx="28" cy="5.5" rx="2.5" ry="1.5" fill="#fef08a"/>' +
        '<!-- LED Taillights -->' +
        '<rect x="9" y="32.5" width="5" height="1.5" rx="0.5" fill="#ef4444"/>' +
        '<rect x="24" y="32.5" width="5" height="1.5" rx="0.5" fill="#ef4444"/>' +
      '</svg>';
    }

    function createCarElement(heading, color, label) {
      return '<div class="car-3d-wrapper">' +
        '<div class="car-ground-shadow"></div>' +
        '<div class="car-radar-ring" style="border: 2px solid ' + color + ';"></div>' +
        '<div class="car-rotator" style="transform: rotate(' + heading + 'deg);">' +
          '<div class="headlight-beams"></div>' +
          build3DCarSvg(color) +
        '</div>' +
        '<div class="mode-pill" style="background-color: ' + color + '; box-shadow: 0 0 10px ' + color + '99;">' + label + '</div>' +
      '</div>';
    }

    function updateSimulationMap(data) {
      if (!data) return;

      // Update trajectory paths
      if (data.gnss) gnssPolyline.setLatLngs(data.gnss);
      if (data.dr) drPolyline.setLatLngs(data.dr);
      if (data.fused) fusedPolyline.setLatLngs(data.fused);

      // 3D Perspective Tilt Transitions
      if (data.isInsideTunnel) {
        mapStage.className = 'tunnel-tilt';
        tunnelAtmosphere.classList.add('active');
        if (hudSats) hudSats.textContent = '0 🚫 (BLOCKED)';
        if (hudMode) { hudMode.textContent = 'DEAD RECKONING'; hudMode.style.color = '#f59e0b'; }
      } else if (data.isApproachingTunnel) {
        mapStage.className = 'approach-tilt';
        tunnelAtmosphere.classList.remove('active');
        if (hudSats) hudSats.textContent = '14 🛰️';
        if (hudMode) { hudMode.textContent = 'GNSS + IMU'; hudMode.style.color = '#4ade80'; }
      } else {
        mapStage.className = '';
        tunnelAtmosphere.classList.remove('active');
        if (hudSats) hudSats.textContent = '14 🛰️';
        if (hudMode) { hudMode.textContent = 'GNSS + IMU'; hudMode.style.color = '#4ade80'; }
      }

      if (data.driftMeters !== undefined && hudDrift) {
        hudDrift.textContent = Number(data.driftMeters).toFixed(1) + ' m';
      }

      // Finish state
      if (data.state === 'COMPLETED') {
        mapStage.className = '';
        map.fitBounds(plannedRouteLine.getBounds(), { padding: [50, 50], animate: true, duration: 1.0 });
        if (hudMode) { hudMode.textContent = 'COMPLETED'; hudMode.style.color = '#38bdf8'; }
      }

      // Car position and camera
      if (data.position) {
        var latlng = [data.position[0], data.position[1]];
        var heading = data.heading || 0;
        var mode = data.state || 'GNSS_ACTIVE';
        var label = data.label || 'GNSS';
        var color = data.color || '#4f46e5';

        if (!carMarker) {
          currentMode = mode;
          lastHeading = heading;
          carMarker = L.marker(latlng, {
            icon: L.divIcon({
              className: 'car-marker-container',
              html: createCarElement(heading, color, label),
              iconSize: [72, 72],
              iconAnchor: [36, 36]
            }),
            zIndexOffset: 3000
          }).addTo(map);
        } else {
          carMarker.setLatLng(latlng);
          if (mode !== currentMode || Math.abs(heading - lastHeading) > 3) {
            currentMode = mode;
            lastHeading = heading;
            carMarker.setIcon(L.divIcon({
              className: 'car-marker-container',
              html: createCarElement(heading, color, label),
              iconSize: [72, 72],
              iconAnchor: [36, 36]
            }));
          }
        }

        // Camera follow
        if (data.state !== 'COMPLETED') {
          var targetZoom = 17;
          if (data.isApproachingTunnel) targetZoom = 16.0;
          else if (data.isInsideTunnel) targetZoom = 16.8;

          if (Math.abs(map.getZoom() - targetZoom) > 0.1) {
            map.setView(latlng, targetZoom, { animate: true, duration: 0.6 });
          } else {
            map.panTo(latlng, { animate: true, duration: 0.25 });
          }
        }
      }
    }

    window.updateSimulationMap = updateSimulationMap;

    document.addEventListener('message', function(e) {
      try { updateSimulationMap(JSON.parse(e.data)); } catch(err) {}
    });
    window.addEventListener('message', function(e) {
      try { updateSimulationMap(JSON.parse(e.data)); } catch(err) {}
    });

    setTimeout(function() {
      map.invalidateSize();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('ready');
      }
    }, 250);
  </script>
</body>
</html>`;
}

export function SimulationMapView({
  frame,
  isPresentationMode = false,
  style,
  onMapReady,
}: SimulationMapViewProps) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  const initialCenter = SIMULATION_ROUTE.start;

  // Determine marker mode label & color
  const isDR = frame.state === 'DEAD_RECKONING' || frame.state === 'GNSS_LOST';
  const isRecovering = frame.state === 'TUNNEL_EXIT' || frame.state === 'GNSS_RECOVERING';
  const isFused = frame.state === 'FUSED' || frame.state === 'COMPLETED';

  const markerColor = isDR ? '#8B5CF6' : isRecovering ? '#F59E0B' : isFused ? '#10B981' : colors.primary;
  const markerLabel = isDR ? 'DR' : isRecovering ? 'FUSION' : isFused ? 'FUSED' : 'GNSS';

  const iframeRef = useRef<any>(null);

  const pushUpdate = useCallback(() => {
    const payload = {
      gnss: frame.gnssTrajectory.map(c => [c.latitude, c.longitude]),
      dr: frame.drTrajectory.map(c => [c.latitude, c.longitude]),
      fused: frame.fusedTrajectory.map(c => [c.latitude, c.longitude]),
      position: [frame.carPosition.latitude, frame.carPosition.longitude],
      heading: frame.carHeading,
      driftMeters: frame.drDisplacementMeters,
      state: frame.state,
      label: markerLabel,
      color: markerColor,
      isInsideTunnel: frame.isInsideTunnel,
      isApproachingTunnel: frame.isApproachingTunnel,
      isPresentation: isPresentationMode,
    };

    if (Platform.OS === 'web') {
      try {
        const win = iframeRef.current?.contentWindow;
        if (win && win.updateSimulationMap) {
          win.updateSimulationMap(payload);
        }
      } catch (err) {}
      return;
    }

    if (!webRef.current || !readyRef.current) return;
    const js = `if (window.updateSimulationMap) { window.updateSimulationMap(${JSON.stringify(payload)}); } true;`;
    webRef.current.injectJavaScript(js);
  }, [frame, markerColor, markerLabel, isPresentationMode]);

  useEffect(() => {
    pushUpdate();
  }, [pushUpdate]);

  const html = useMemo(() => buildSimulationHtml(initialCenter), []);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        {/* @ts-ignore Web iframe element */}
        <iframe
          ref={iframeRef}
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none' }}
          onLoad={() => {
            readyRef.current = true;
            onMapReady?.();
            pushUpdate();
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webRef}
        source={{ html, baseUrl: '' }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        mixedContentMode="always"
        onLoadEnd={() => {
          readyRef.current = true;
          onMapReady?.();
          pushUpdate();
        }}
        onMessage={(e) => {
          if (e.nativeEvent.data === 'ready') {
            readyRef.current = true;
            onMapReady?.();
            pushUpdate();
          }
        }}
        onError={() => {}}
        {...(Platform.OS === 'android' ? {
          allowFileAccessFromFileURLs: true,
          allowUniversalAccessFromFileURLs: true,
        } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  webview: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
});
