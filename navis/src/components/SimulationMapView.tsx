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
    html, body, #map { width: 100%; height: 100%; background: #e2e8f0; overflow: hidden; }

    /* Custom Portal Markers */
    .portal-marker {
      background: transparent;
      border: none;
    }
    .portal-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate3d(0, 0, 0);
      pointer-events: none;
    }
    .portal-arch {
      background: #1e1b4b;
      color: #fde68a;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.6px;
      border: 1.5px solid #f59e0b;
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .portal-pin {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid #1e1b4b;
    }

    /* Start & Finish Flags */
    .flag-wrap {
      background: #0f172a;
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0.5px;
      border: 1px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      white-space: nowrap;
    }

    /* Dynamic Car Marker */
    .car-marker-container {
      background: transparent;
      border: none;
    }
    .car-wrapper {
      position: relative;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .car-pulse {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      opacity: 0.35;
      animation: carPulse 1.6s ease-out infinite;
      pointer-events: none;
    }
    @keyframes carPulse {
      0% { transform: scale(0.6); opacity: 0.7; }
      100% { transform: scale(1.5); opacity: 0; }
    }
    .car-disc {
      position: relative;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      border: 2.5px solid #4f46e5;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.3s ease;
    }
    .car-rotator {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.12s linear;
    }
    .mode-badge {
      position: absolute;
      bottom: -6px;
      padding: 1px 5px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 8px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.5px;
      border: 1px solid #ffffff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      white-space: nowrap;
      transition: background-color 0.3s ease;
    }

    /* Tunnel Ambient Overlay */
    #tunnel-ambient {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at center, rgba(30, 27, 75, 0.28) 0%, rgba(15, 23, 42, 0.48) 100%);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.6s ease-in-out;
      z-index: 500;
    }
    #tunnel-ambient.active {
      opacity: 1;
    }

    /* Attribution Styling */
    .leaflet-control-attribution {
      font-size: 8px !important;
      background: rgba(255,255,255,0.75) !important;
      padding: 1px 6px !important;
      border-top-left-radius: 4px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="tunnel-ambient"></div>

  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView([${center.latitude}, ${center.longitude}], 16.5);

    // Official OpenStreetMap Tile Server
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // 1. Predefined Route Underlay (Full Road Geometry)
    var plannedRouteNodes = ${JSON.stringify(routeNodes)};
    var plannedRouteLine = L.polyline(plannedRouteNodes, {
      color: '#CBD5E1',
      weight: 8,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // 2. Tunnel Section Corridor Highlight (Darker Tube)
    var tunnelNodes = ${JSON.stringify(tunnelNodes)};
    var tunnelOutline = L.polyline(tunnelNodes, {
      color: '#1E1B4B',
      weight: 12,
      opacity: 0.55,
      lineCap: 'butt'
    }).addTo(map);

    var tunnelCenterline = L.polyline(tunnelNodes, {
      color: '#F59E0B',
      weight: 3,
      opacity: 0.9,
      dashArray: '6, 6'
    }).addTo(map);

    // 3. Tunnel Portal Markers
    var entranceIcon = L.divIcon({
      className: 'portal-marker',
      html: '<div class="portal-wrap"><div class="portal-arch">TUNNEL ENTRANCE [ 320m ]</div><div class="portal-pin"></div></div>',
      iconSize: [160, 28],
      iconAnchor: [80, 28]
    });
    L.marker([${entrance.latitude}, ${entrance.longitude}], { icon: entranceIcon }).addTo(map);

    var exitIcon = L.divIcon({
      className: 'portal-marker',
      html: '<div class="portal-wrap"><div class="portal-arch">TUNNEL EXIT</div><div class="portal-pin"></div></div>',
      iconSize: [100, 28],
      iconAnchor: [50, 28]
    });
    L.marker([${exit.latitude}, ${exit.longitude}], { icon: exitIcon }).addTo(map);

    // Start / Finish Markers
    var startIcon = L.divIcon({
      className: 'portal-marker',
      html: '<div class="flag-wrap">🏁 START</div>',
      iconSize: [60, 20],
      iconAnchor: [30, 20]
    });
    L.marker([${start.latitude}, ${start.longitude}], { icon: startIcon }).addTo(map);

    var destIcon = L.divIcon({
      className: 'portal-marker',
      html: '<div class="flag-wrap">🏁 DESTINATION</div>',
      iconSize: [80, 20],
      iconAnchor: [40, 20]
    });
    L.marker([${dest.latitude}, ${dest.longitude}], { icon: destIcon }).addTo(map);

    // 4. Trajectory Lines
    var gnssPolyline = L.polyline([], { color: '#4F46E5', weight: 4.5, opacity: 0.95 }).addTo(map);
    var drPolyline   = L.polyline([], { color: '#F59E0B', weight: 4.0, opacity: 0.95, dashArray: '7, 6' }).addTo(map);
    var fusedPolyline= L.polyline([], { color: '#10B981', weight: 4.5, opacity: 0.95 }).addTo(map);

    // 5. Dynamic Car Marker State
    var carMarker = null;
    var currentMode = '';
    var ambientOverlay = document.getElementById('tunnel-ambient');

    function makeCarHtml(heading, mode, color, label, isPresentation) {
      var scale = isPresentation ? 'scale(1.2)' : 'scale(1.0)';
      return '<div class="car-wrapper" style="transform:' + scale + ';">' +
        '<div class="car-pulse" style="background:' + color + ';"></div>' +
        '<div class="car-disc" style="border-color:' + color + ';">' +
          '<div class="car-rotator" style="transform:rotate(' + heading + 'deg);">' +
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none">' +
              '<path d="M12 2L18 9H15V19C15 20.1 14.1 21 13 21H11C9.9 21 9 20.1 9 19V9H6L12 2Z" fill="' + color + '"/>' +
              '<path d="M10 10H14V13H10V10Z" fill="#FFFFFF" fill-opacity="0.9"/>' +
              '<circle cx="8.5" cy="8" r="1.3" fill="#FBBF24"/>' +
              '<circle cx="15.5" cy="8" r="1.3" fill="#FBBF24"/>' +
            '</svg>' +
          '</div>' +
        '</div>' +
        '<div class="mode-badge" style="background:' + color + ';">' + label + '</div>' +
      '</div>';
    }

    var lastHeading = 0;
    var lastZoomState = 'NORMAL';

    function updateSimulationMap(data) {
      if (!data) return;

      // Update trajectory paths
      if (data.gnss) gnssPolyline.setLatLngs(data.gnss);
      if (data.dr) drPolyline.setLatLngs(data.dr);
      if (data.fused) fusedPolyline.setLatLngs(data.fused);

      // Tunnel ambient dark overlay
      if (data.isInsideTunnel) {
        ambientOverlay.classList.add('active');
      } else {
        ambientOverlay.classList.remove('active');
      }

      // Completed: Fit entire route bounds
      if (data.state === 'COMPLETED') {
        map.fitBounds(plannedRouteLine.getBounds(), { padding: [50, 50], animate: true, duration: 1.0 });
      }

      // Update vehicle marker & camera
      if (data.position) {
        var latlng = [data.position[0], data.position[1]];
        var heading = data.heading || 0;
        var mode = data.state || 'GNSS_ACTIVE';
        var label = data.label || 'GNSS';
        var color = data.color || '#4F46E5';
        var isPresentation = data.isPresentation || false;

        if (!carMarker) {
          currentMode = mode;
          lastHeading = heading;
          carMarker = L.marker(latlng, {
            icon: L.divIcon({
              className: 'car-marker-container',
              html: makeCarHtml(heading, mode, color, label, isPresentation),
              iconSize: [48, 48],
              iconAnchor: [24, 24]
            }),
            zIndexOffset: 1000
          }).addTo(map);
        } else {
          carMarker.setLatLng(latlng);

          // Update icon if mode changed or heading changed significantly
          if (mode !== currentMode || Math.abs(heading - lastHeading) > 3) {
            currentMode = mode;
            lastHeading = heading;
            carMarker.setIcon(L.divIcon({
              className: 'car-marker-container',
              html: makeCarHtml(heading, mode, color, label, isPresentation),
              iconSize: [48, 48],
              iconAnchor: [24, 24]
            }));
          }
        }

        // Camera follow logic
        if (data.state !== 'COMPLETED') {
          // Camera zoom adjustments
          var targetZoom = 16.5;
          if (data.isApproachingTunnel) {
            targetZoom = 15.6; // Slightly zoom out so tunnel entrance is visible ahead
          } else if (data.isInsideTunnel) {
            targetZoom = 16.2;
          }

          if (map.getZoom() !== targetZoom) {
            map.setView(latlng, targetZoom, { animate: true, duration: 0.5 });
          } else {
            map.panTo(latlng, { animate: true, duration: 0.35 });
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
